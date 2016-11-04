var d3        = require("d3");
var topojson  = require("topojson");
var worldjson = require("./world-110m.json");

/**
 * [WorldMap description]
 * @param  {[type]} parent  [description]
 * @param  object options   {
 *                            resolution : '110m' by default or '50m', // meter height above ground/surface
 *                          }
 *                           
 * @return {[type]}         [description]
 */
function WorldMap(parent, options) 
{
  if (!(this instanceof WorldMap))
  {
    return new WorldMap(parent, options);
  }

  options = options || {};

  this.parent        = d3.select(parent);
  this.width         = options.width  || 960;
  this.height        = options.height || 480;
  this.projection    = d3.geoEquirectangular().scale(this.height/Math.PI).translate([this.width/2, this.height/2]);

  this.canvas         = this.parent.append("canvas").attr("width", this.width).attr("height", this.height);
  this.context        = this.canvas.node().getContext("2d");

  this.path           = d3.geoPath().projection(this.projection).context(this.context);
  this.container      = this.canvas;
  // this.container      = this.parent.append("svg").attr("width", this.width).attr("height", this.height).attr('class', 'd3-map');
  // this.svg            = this.container.append("g");
  this._resources     = options.resources || [];
  this.resources      = {};
  this.last_transform = {x: 0, y: 0, k: 1};

  /*this._resources.push(
  {
    name:   'world', 
    src:    options.resolution == '50m'? "res/world-50m.json": "res/world-110m.json", 
    onload: function(map) { map.load_land(); } 
  } );*/

  if (options.zoom) this.enable_zoom();
  this.load(options.onload);   
}


WorldMap.prototype.load = function(ready) 
{
  var $this = this;
  var queue = d3.queue();

  this.resources.world = worldjson;
  this.load_land();

  this._resources.forEach(function (resource)
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

  if (ready) queue.await(function () { ready($this); });
}


WorldMap.prototype.load_land = function() 
{
  var world     = this.resources.world;
  var countries = world.objects.countries;

  // remove antartic
  countries.geometries =  countries.geometries.filter(function(d) { return d.id != 10; });

  this.lands    = topojson.merge(world, countries.geometries);
  this.boundary = topojson.mesh(world,  countries, function (a, b) { return a !== b; });

  this.draw();
}


WorldMap.prototype.draw = function()
{
  this.context.clearRect(0, 0, this.width, this.height);
  
  // draw lands
  this.context.beginPath();
  this.path(this.lands);
  this.context.fillStyle = '#ddd';
  this.context.fill();

  this.context.beginPath();
  this.path(this.boundary);
  this.context.strokeStyle = '#fff';
  this.context.stroke(); 
}


WorldMap.prototype.on = function() 
{
  this.container.on.apply(this.canvas, arguments);
}

/*--------------------------- zoom ---------------------------*/

WorldMap.prototype.enable_zoom = function() 
{
  var $this = this;
  // this.zoom.translateExtent([[-Infinity, v1[1]], [Infinity, v2[1]]]);

  this.zoom = d3.zoom().scaleExtent([1, 20]);//.translateExtent([[-Infinity, v1[1]], [Infinity, v2[1]]]);
  this.zoom.on("zoom", function () { $this.zoomed(); });
  this.container.call(this.zoom);
}

function mercatorBounds(projection) 
{
  var yaw   = projection.rotate()[0];
  var xymax = projection([-yaw+180-1e-6,-90]);
  var xymin = projection([-yaw-180+1e-6, 90]);
  
  return [xymin, xymax];
}


WorldMap.prototype.zoomed = function() 
{
  var transform = d3.event.transform;
  var dx        = transform.x - this.last_transform.x;
  var dy        = transform.y - this.last_transform.y;
  var tp        = this.projection.translate();
  var ts        = this.projection.scale();

  var b = mercatorBounds(this.projection);

    //      if (b[0][1] + dy > 0)           dy = -b[0][1];
    // else if (b[1][1] + dy < this.height) dy = this.height-b[1][1];

  this.projection.translate([tp[0], tp[1] +dy]);

  if (transform.k != this.last_transform.k) 
  {
    this.projection.scale(this.height/Math.PI*transform.k);

    // var v1 = this.projection([-180, 90]);
    // var v2 = this.projection([180, -90]);

    // this.zoom.translateExtent([[-Infinity, v1[1]], [Infinity, v2[1]]]);
  }
  else
  {
    var yaw = this.projection.rotate()[0];
    this.projection.rotate([yaw+ (360*dx/this.width)*1/transform.k, 0, 0]);
  }    

  this.last_transform = transform;
  this.draw(); 

  this.container.dispatch('zoom', {detail: {x: transform.x, y: transform.y , k: transform.k}});
}


WorldMap.prototype.reset_zoom = function() 
{
  this.container.call(this.zoom.transform, d3.zoomIdentity);
}


WorldMap.prototype.zoom_in = function(k) 
{
  this.container.call(this.zoom.scaleBy, k || 1.5);
}


WorldMap.prototype.zoom_out = function(k) 
{
  this.container.call(this.zoom.scaleBy, k || 1/1.5);
}


module.exports = WorldMap;