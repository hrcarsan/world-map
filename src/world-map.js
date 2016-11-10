var d3        = require("d3");
var topojson  = require("topojson");
var worldjson = require("./world-110m.json");

/**
 * Class that allow to create canvas views with draggable and zoomable world maps using the d3 library.
 * var WorldMap = require('./world-map');
 * 
 * @param  string containerId   id of the container element 
 * @param  object options       some util options, defaults: 
 * {
 *   width: 960,
 *   height: 480,
 *   zoom: false,
 *   resources: 
 *   [
 *     { 
 *       name: 'a',
 *       type: 'json',                        // also could be 'csv' 
 *       src: 'example.com/a.json',
 *       onload: function (map, resource) {}, // called after load the resource
 *       row: myOtherFunction,                // called for all row of the resource  
 *     }
 *   ], 
 *   onload: function (map) {},
 *   hideAntarctic: true,
 *   landsColor: '#ddd',
 *   landsBorder: '#fff'
 * }
 */
function WorldMap(containerId, options) 
{
  if (!(this instanceof WorldMap))
  {
    return new WorldMap(containerId, options);
  }

  this.setOptions(options);

  this.container        = d3.select("#"+containerId);
  this.width            = this.options.width;
  this.height           = this.options.height;
  this.initialScale     = this.height/Math.PI;
  this.initialTranslate = [this.width/2, this.height/2];
  this.projection       = d3.geoEquirectangular().scale(this.initialScale).translate(this.initialTranslate);
  this.canvas           = this.container.append("canvas").attr("width", this.width).attr("height", this.height);
  this.context          = this.canvas.node().getContext("2d");
  this.path             = d3.geoPath().projection(this.projection).context(this.context);
  this.resources        = {};

  if (this.options.zoom) this.enableZoom();

  this.load();   
}


WorldMap.prototype.setOptions = function (options)
{
  options = options || {};

  this.options =
  {
    width: 960,
    height: 480,
    resources: [],
    zoom: false,
    onload: null,
    hideAntarctic: true,
    landsColor: '#ddd',
    landsBorder: '#fff'
  }  

  for (key in options) this.options[key] = options[key];
}


WorldMap.prototype.load = function () 
{
  var $this  = this;
  var queue  = d3.queue();
  var onload = this.options.load;

  this.loadLand();

  // load user resources
  this.options.resources.forEach(function (resource)
  {    
    queue.defer(function (callback) 
    {
      var onload = function (d)
      {
        $this.resources[resource.name] = d;        
        if (resource.onload) resource.onload($this, d);
        callback();
      };

      switch(resource.type)
      {
        case 'csv': d3.csv(resource.src, resource.row, onload); break;
        default:    d3.json(resource.src, onload);              break;
      }
    }); 
  });

  if (onload) queue.await(function () { onload($this); });
}


WorldMap.prototype.loadLand = function() 
{
  var world     = worldjson;
  var countries = world.objects.countries;

  // hide antartic
  if (this.options.hideAntarctic)
  {
    countries.geometries = countries.geometries.filter(function(d) { return d.id != 10; });  
  }  

  this.resources.world = world;
  this.lands           = topojson.merge(world, countries.geometries);
  this.boundary        = topojson.mesh(world,  countries, function (a, b) { return a !== b; });

  this.draw();
}


WorldMap.prototype.draw = function()
{
  this.context.save();
  this.context.clearRect(0, 0, this.width, this.height);

  // apply zoom transformation
  if (d3.event && d3.event.transform)
  {
    var x      = d3.event.transform.x;
    var y      = d3.event.transform.y;
    var k      = d3.event.transform.k;
    var lambda = 360/this.width*1/k*x;

    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);

    this.context.translate(0, y);
    this.projection.rotate([lambda, 0, 0]);
    this.context.scale(k, k);

    this.context.lineWidth = 1/k;
  }
  
  // draw lands
  this.context.beginPath();
  this.path(this.lands);
  this.context.fillStyle = this.options.landsColor;
  this.context.fill();

  // draw boundaries
  this.context.beginPath();
  this.path(this.boundary);
  this.context.strokeStyle = this.options.landsBorder;
  this.context.stroke();
  this.context.restore(); 
}


WorldMap.prototype.on = function() 
{
  this.canvas.on.apply(this.canvas, arguments);
}


WorldMap.prototype.enableZoom = function() 
{
  var $this = this;

  this.zoom = d3.zoom().scaleExtent([1, 20]).translateExtent([[-Infinity, 0], [Infinity, this.height]]);
  this.zoom.on("zoom", function () { $this.draw(); });
  this.canvas.call(this.zoom);
}


WorldMap.prototype.resetZoom = function() 
{
  this.canvas.call(this.zoom.transform, d3.zoomIdentity);
}


WorldMap.prototype.zoomIn = function(k) 
{
  this.canvas.call(this.zoom.scaleBy, k || 1.5);
}


WorldMap.prototype.zoomOut = function(k) 
{
  this.canvas.call(this.zoom.scaleBy, k || 1/1.5);
}


module.exports = WorldMap;