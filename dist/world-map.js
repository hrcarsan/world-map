var WorldMap =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var d3        = __webpack_require__(1);
	var topojson  = __webpack_require__(2);
	var worldjson = __webpack_require__(3);

	/**
	 * Class that allow to create canvas views with draggable and zoomable world maps using the d3 library.
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
	 *       onLoad: function (map, resource) {}, // called after load the resource
	 *       row: myOtherFunction,                // called for all row of the resource  
	 *     }
	 *   ], 
	 *   onLoad: function (map) {},
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

	  var maxWidth = this.options.height*2;

	  this.container        = d3.select("#"+containerId);
	  this.width            = maxWidth < this.options.width? maxWidth: this.options.width;
	  this.height           = this.options.height;
	  this.initialScale     = this.height/Math.PI;
	  this.initialTranslate = [this.width/2, this.height/2];
	  this.projection       = d3.geoEquirectangular().scale(this.initialScale).translate(this.initialTranslate);
	  this.canvas           = this.container.append("canvas").attr("width", this.width).attr("height", this.height);
	  this.context          = this.canvas.node().getContext("2d");
	  this.path             = d3.geoPath().projection(this.projection).context(this.context);
	  this.resources        = {};
	  this.transform        = { x: 0, y: 0, k:1 };

	  if (this.options.zoom) this.enableZoom();

	  this.load();   
	}


	WorldMap.prototype.options =
	{
	  width: 960,
	  height: 480,
	  resources: [],
	  zoom: false,
	  onLoad: function (map) {},
	  hideAntarctic: true,
	  landsColor: '#ddd',
	  landsBorder: '#fff',
	  onDraw: function (map) {}
	}  


	WorldMap.prototype.setOptions = function (options)
	{
	  options = options || {}; 

	  for (key in options) this.options[key] = options[key];
	}


	WorldMap.prototype.load = function () 
	{
	  var $this  = this;
	  var queue  = d3.queue();

	  this.loadLand();

	  // load user resources
	  this.options.resources.forEach(function (resource)
	  {    
	    queue.defer(function (callback) 
	    {
	      var onload = function (d)
	      {
	        $this.resources[resource.name] = d;        
	        if (resource.onLoad) resource.onLoad($this, d);
	        callback();
	      };

	      switch(resource.type)
	      {
	        case 'csv': d3.csv(resource.src, resource.row, onload); break;
	        default:    d3.json(resource.src, onload);              break;
	      }
	    }); 
	  });

	  queue.await(function () { $this.options.onLoad($this); });
	}


	WorldMap.prototype.loadLand = function () 
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


	WorldMap.prototype.draw = function ()
	{
	  this.context.save();
	  this.context.clearRect(0, 0, this.width, this.height);

	  // apply zoom transformation
	  var x      = this.transform.x;
	  var y      = this.transform.y;
	  var k      = this.transform.k;
	  var lambda = 360/(this.height*2)*x*(1/k);

	  this.context.translate(0, y);
	  this.projection.rotate([lambda, 0, 0]);
	  this.context.scale(k, k);
	  this.context.lineWidth = 1/k;
	  
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

	  this.options.onDraw(this);
	  this.context.restore(); 
	}


	WorldMap.prototype.on = function () 
	{
	  this.canvas.on.apply(this.canvas, arguments);
	}


	WorldMap.prototype.enableZoom = function () 
	{
	  var $this = this;

	  this.zoom = d3.zoom().scaleExtent([1, 20]).translateExtent([[-Infinity, 0], [Infinity, this.height]]);
	  this.zoom.on("zoom", function () { $this.setTransform(d3.event.transform); });
	  this.canvas.call(this.zoom);
	}


	WorldMap.prototype.setTransform = function (transform)
	{
	  this.transform = transform;
	  this.draw();
	}


	WorldMap.prototype.resetZoom = function () 
	{
	  this.canvas.call(this.zoom.transform, d3.zoomIdentity);
	}


	WorldMap.prototype.zoomIn = function (k) 
	{
	  this.canvas.call(this.zoom.scaleBy, k || 1.5);
	}


	WorldMap.prototype.zoomOut = function (k) 
	{
	  this.canvas.call(this.zoom.scaleBy, k || 1/1.5);
	}


	module.exports = WorldMap;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// https://d3js.org Version 4.3.0. Copyright 2016 Mike Bostock.
	(function (global, factory) {
	   true ? factory(exports) :
	  typeof define === 'function' && define.amd ? define(['exports'], factory) :
	  (factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var version = "4.3.0";

	var ascending = function(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	};

	var bisector = function(compare) {
	  if (compare.length === 1) compare = ascendingComparator(compare);
	  return {
	    left: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) < 0) lo = mid + 1;
	        else hi = mid;
	      }
	      return lo;
	    },
	    right: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) > 0) hi = mid;
	        else lo = mid + 1;
	      }
	      return lo;
	    }
	  };
	};

	function ascendingComparator(f) {
	  return function(d, x) {
	    return ascending(f(d), x);
	  };
	}

	var ascendingBisect = bisector(ascending);
	var bisectRight = ascendingBisect.right;
	var bisectLeft = ascendingBisect.left;

	var descending = function(a, b) {
	  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	};

	var number = function(x) {
	  return x === null ? NaN : +x;
	};

	var variance = function(array, f) {
	  var n = array.length,
	      m = 0,
	      a,
	      d,
	      s = 0,
	      i = -1,
	      j = 0;

	  if (f == null) {
	    while (++i < n) {
	      if (!isNaN(a = number(array[i]))) {
	        d = a - m;
	        m += d / ++j;
	        s += d * (a - m);
	      }
	    }
	  }

	  else {
	    while (++i < n) {
	      if (!isNaN(a = number(f(array[i], i, array)))) {
	        d = a - m;
	        m += d / ++j;
	        s += d * (a - m);
	      }
	    }
	  }

	  if (j > 1) return s / (j - 1);
	};

	var deviation = function(array, f) {
	  var v = variance(array, f);
	  return v ? Math.sqrt(v) : v;
	};

	var extent = function(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b,
	      c;

	  if (f == null) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = c = b; break; }
	    while (++i < n) if ((b = array[i]) != null) {
	      if (a > b) a = b;
	      if (c < b) c = b;
	    }
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = c = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null) {
	      if (a > b) a = b;
	      if (c < b) c = b;
	    }
	  }

	  return [a, c];
	};

	var array = Array.prototype;

	var slice = array.slice;
	var map = array.map;

	var constant$1 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var identity = function(x) {
	  return x;
	};

	var range = function(start, stop, step) {
	  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

	  var i = -1,
	      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
	      range = new Array(n);

	  while (++i < n) {
	    range[i] = start + i * step;
	  }

	  return range;
	};

	var e10 = Math.sqrt(50);
	var e5 = Math.sqrt(10);
	var e2 = Math.sqrt(2);

	var ticks = function(start, stop, count) {
	  var step = tickStep(start, stop, count);
	  return range(
	    Math.ceil(start / step) * step,
	    Math.floor(stop / step) * step + step / 2, // inclusive
	    step
	  );
	};

	function tickStep(start, stop, count) {
	  var step0 = Math.abs(stop - start) / Math.max(0, count),
	      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
	      error = step0 / step1;
	  if (error >= e10) step1 *= 10;
	  else if (error >= e5) step1 *= 5;
	  else if (error >= e2) step1 *= 2;
	  return stop < start ? -step1 : step1;
	}

	var sturges = function(values) {
	  return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
	};

	var histogram = function() {
	  var value = identity,
	      domain = extent,
	      threshold = sturges;

	  function histogram(data) {
	    var i,
	        n = data.length,
	        x,
	        values = new Array(n);

	    for (i = 0; i < n; ++i) {
	      values[i] = value(data[i], i, data);
	    }

	    var xz = domain(values),
	        x0 = xz[0],
	        x1 = xz[1],
	        tz = threshold(values, x0, x1);

	    // Convert number of thresholds into uniform thresholds.
	    if (!Array.isArray(tz)) tz = ticks(x0, x1, tz);

	    // Remove any thresholds outside the domain.
	    var m = tz.length;
	    while (tz[0] <= x0) tz.shift(), --m;
	    while (tz[m - 1] >= x1) tz.pop(), --m;

	    var bins = new Array(m + 1),
	        bin;

	    // Initialize bins.
	    for (i = 0; i <= m; ++i) {
	      bin = bins[i] = [];
	      bin.x0 = i > 0 ? tz[i - 1] : x0;
	      bin.x1 = i < m ? tz[i] : x1;
	    }

	    // Assign data to bins by value, ignoring any outside the domain.
	    for (i = 0; i < n; ++i) {
	      x = values[i];
	      if (x0 <= x && x <= x1) {
	        bins[bisectRight(tz, x, 0, m)].push(data[i]);
	      }
	    }

	    return bins;
	  }

	  histogram.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant$1(_), histogram) : value;
	  };

	  histogram.domain = function(_) {
	    return arguments.length ? (domain = typeof _ === "function" ? _ : constant$1([_[0], _[1]]), histogram) : domain;
	  };

	  histogram.thresholds = function(_) {
	    return arguments.length ? (threshold = typeof _ === "function" ? _ : Array.isArray(_) ? constant$1(slice.call(_)) : constant$1(_), histogram) : threshold;
	  };

	  return histogram;
	};

	var threshold = function(array, p, f) {
	  if (f == null) f = number;
	  if (!(n = array.length)) return;
	  if ((p = +p) <= 0 || n < 2) return +f(array[0], 0, array);
	  if (p >= 1) return +f(array[n - 1], n - 1, array);
	  var n,
	      h = (n - 1) * p,
	      i = Math.floor(h),
	      a = +f(array[i], i, array),
	      b = +f(array[i + 1], i + 1, array);
	  return a + (b - a) * (h - i);
	};

	var freedmanDiaconis = function(values, min, max) {
	  values = map.call(values, number).sort(ascending);
	  return Math.ceil((max - min) / (2 * (threshold(values, 0.75) - threshold(values, 0.25)) * Math.pow(values.length, -1 / 3)));
	};

	var scott = function(values, min, max) {
	  return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(values.length, -1 / 3)));
	};

	var max = function(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b;

	  if (f == null) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = array[i]) != null && b > a) a = b;
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b > a) a = b;
	  }

	  return a;
	};

	var mean = function(array, f) {
	  var s = 0,
	      n = array.length,
	      a,
	      i = -1,
	      j = n;

	  if (f == null) {
	    while (++i < n) if (!isNaN(a = number(array[i]))) s += a; else --j;
	  }

	  else {
	    while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) s += a; else --j;
	  }

	  if (j) return s / j;
	};

	var median = function(array, f) {
	  var numbers = [],
	      n = array.length,
	      a,
	      i = -1;

	  if (f == null) {
	    while (++i < n) if (!isNaN(a = number(array[i]))) numbers.push(a);
	  }

	  else {
	    while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) numbers.push(a);
	  }

	  return threshold(numbers.sort(ascending), 0.5);
	};

	var merge = function(arrays) {
	  var n = arrays.length,
	      m,
	      i = -1,
	      j = 0,
	      merged,
	      array;

	  while (++i < n) j += arrays[i].length;
	  merged = new Array(j);

	  while (--n >= 0) {
	    array = arrays[n];
	    m = array.length;
	    while (--m >= 0) {
	      merged[--j] = array[m];
	    }
	  }

	  return merged;
	};

	var min = function(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b;

	  if (f == null) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = array[i]) != null && a > b) a = b;
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null && a > b) a = b;
	  }

	  return a;
	};

	var pairs = function(array) {
	  var i = 0, n = array.length - 1, p = array[0], pairs = new Array(n < 0 ? 0 : n);
	  while (i < n) pairs[i] = [p, p = array[++i]];
	  return pairs;
	};

	var permute = function(array, indexes) {
	  var i = indexes.length, permutes = new Array(i);
	  while (i--) permutes[i] = array[indexes[i]];
	  return permutes;
	};

	var scan = function(array, compare) {
	  if (!(n = array.length)) return;
	  var i = 0,
	      n,
	      j = 0,
	      xi,
	      xj = array[j];

	  if (!compare) compare = ascending;

	  while (++i < n) if (compare(xi = array[i], xj) < 0 || compare(xj, xj) !== 0) xj = xi, j = i;

	  if (compare(xj, xj) === 0) return j;
	};

	var shuffle = function(array, i0, i1) {
	  var m = (i1 == null ? array.length : i1) - (i0 = i0 == null ? 0 : +i0),
	      t,
	      i;

	  while (m) {
	    i = Math.random() * m-- | 0;
	    t = array[m + i0];
	    array[m + i0] = array[i + i0];
	    array[i + i0] = t;
	  }

	  return array;
	};

	var sum = function(array, f) {
	  var s = 0,
	      n = array.length,
	      a,
	      i = -1;

	  if (f == null) {
	    while (++i < n) if (a = +array[i]) s += a; // Note: zero and null are equivalent.
	  }

	  else {
	    while (++i < n) if (a = +f(array[i], i, array)) s += a;
	  }

	  return s;
	};

	var transpose = function(matrix) {
	  if (!(n = matrix.length)) return [];
	  for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
	    for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
	      row[j] = matrix[j][i];
	    }
	  }
	  return transpose;
	};

	function length(d) {
	  return d.length;
	}

	var zip = function() {
	  return transpose(arguments);
	};

	var prefix = "$";

	function Map() {}

	Map.prototype = map$1.prototype = {
	  constructor: Map,
	  has: function(key) {
	    return (prefix + key) in this;
	  },
	  get: function(key) {
	    return this[prefix + key];
	  },
	  set: function(key, value) {
	    this[prefix + key] = value;
	    return this;
	  },
	  remove: function(key) {
	    var property = prefix + key;
	    return property in this && delete this[property];
	  },
	  clear: function() {
	    for (var property in this) if (property[0] === prefix) delete this[property];
	  },
	  keys: function() {
	    var keys = [];
	    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
	    return keys;
	  },
	  values: function() {
	    var values = [];
	    for (var property in this) if (property[0] === prefix) values.push(this[property]);
	    return values;
	  },
	  entries: function() {
	    var entries = [];
	    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
	    return entries;
	  },
	  size: function() {
	    var size = 0;
	    for (var property in this) if (property[0] === prefix) ++size;
	    return size;
	  },
	  empty: function() {
	    for (var property in this) if (property[0] === prefix) return false;
	    return true;
	  },
	  each: function(f) {
	    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
	  }
	};

	function map$1(object, f) {
	  var map = new Map;

	  // Copy constructor.
	  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

	  // Index array by numeric index or specified key function.
	  else if (Array.isArray(object)) {
	    var i = -1,
	        n = object.length,
	        o;

	    if (f == null) while (++i < n) map.set(i, object[i]);
	    else while (++i < n) map.set(f(o = object[i], i, object), o);
	  }

	  // Convert object to map.
	  else if (object) for (var key in object) map.set(key, object[key]);

	  return map;
	}

	var nest = function() {
	  var keys = [],
	      sortKeys = [],
	      sortValues,
	      rollup,
	      nest;

	  function apply(array, depth, createResult, setResult) {
	    if (depth >= keys.length) return rollup != null
	        ? rollup(array) : (sortValues != null
	        ? array.sort(sortValues)
	        : array);

	    var i = -1,
	        n = array.length,
	        key = keys[depth++],
	        keyValue,
	        value,
	        valuesByKey = map$1(),
	        values,
	        result = createResult();

	    while (++i < n) {
	      if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
	        values.push(value);
	      } else {
	        valuesByKey.set(keyValue, [value]);
	      }
	    }

	    valuesByKey.each(function(values, key) {
	      setResult(result, key, apply(values, depth, createResult, setResult));
	    });

	    return result;
	  }

	  function entries(map, depth) {
	    if (++depth > keys.length) return map;
	    var array, sortKey = sortKeys[depth - 1];
	    if (rollup != null && depth >= keys.length) array = map.entries();
	    else array = [], map.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
	    return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
	  }

	  return nest = {
	    object: function(array) { return apply(array, 0, createObject, setObject); },
	    map: function(array) { return apply(array, 0, createMap, setMap); },
	    entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
	    key: function(d) { keys.push(d); return nest; },
	    sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
	    sortValues: function(order) { sortValues = order; return nest; },
	    rollup: function(f) { rollup = f; return nest; }
	  };
	};

	function createObject() {
	  return {};
	}

	function setObject(object, key, value) {
	  object[key] = value;
	}

	function createMap() {
	  return map$1();
	}

	function setMap(map, key, value) {
	  map.set(key, value);
	}

	function Set() {}

	var proto = map$1.prototype;

	Set.prototype = set.prototype = {
	  constructor: Set,
	  has: proto.has,
	  add: function(value) {
	    value += "";
	    this[prefix + value] = value;
	    return this;
	  },
	  remove: proto.remove,
	  clear: proto.clear,
	  values: proto.keys,
	  size: proto.size,
	  empty: proto.empty,
	  each: proto.each
	};

	function set(object, f) {
	  var set = new Set;

	  // Copy constructor.
	  if (object instanceof Set) object.each(function(value) { set.add(value); });

	  // Otherwise, assume it’s an array.
	  else if (object) {
	    var i = -1, n = object.length;
	    if (f == null) while (++i < n) set.add(object[i]);
	    else while (++i < n) set.add(f(object[i], i, object));
	  }

	  return set;
	}

	var keys = function(map) {
	  var keys = [];
	  for (var key in map) keys.push(key);
	  return keys;
	};

	var values = function(map) {
	  var values = [];
	  for (var key in map) values.push(map[key]);
	  return values;
	};

	var entries = function(map) {
	  var entries = [];
	  for (var key in map) entries.push({key: key, value: map[key]});
	  return entries;
	};

	var uniform = function(min, max) {
	  min = min == null ? 0 : +min;
	  max = max == null ? 1 : +max;
	  if (arguments.length === 1) max = min, min = 0;
	  else max -= min;
	  return function() {
	    return Math.random() * max + min;
	  };
	};

	var normal = function(mu, sigma) {
	  var x, r;
	  mu = mu == null ? 0 : +mu;
	  sigma = sigma == null ? 1 : +sigma;
	  return function() {
	    var y;

	    // If available, use the second previously-generated uniform random.
	    if (x != null) y = x, x = null;

	    // Otherwise, generate a new x and y.
	    else do {
	      x = Math.random() * 2 - 1;
	      y = Math.random() * 2 - 1;
	      r = x * x + y * y;
	    } while (!r || r > 1);

	    return mu + sigma * y * Math.sqrt(-2 * Math.log(r) / r);
	  };
	};

	var logNormal = function() {
	  var randomNormal = normal.apply(this, arguments);
	  return function() {
	    return Math.exp(randomNormal());
	  };
	};

	var irwinHall = function(n) {
	  return function() {
	    for (var sum = 0, i = 0; i < n; ++i) sum += Math.random();
	    return sum;
	  };
	};

	var bates = function(n) {
	  var randomIrwinHall = irwinHall(n);
	  return function() {
	    return randomIrwinHall() / n;
	  };
	};

	var exponential = function(lambda) {
	  return function() {
	    return -Math.log(1 - Math.random()) / lambda;
	  };
	};

	function linear(t) {
	  return +t;
	}

	function quadIn(t) {
	  return t * t;
	}

	function quadOut(t) {
	  return t * (2 - t);
	}

	function quadInOut(t) {
	  return ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2;
	}

	function cubicIn(t) {
	  return t * t * t;
	}

	function cubicOut(t) {
	  return --t * t * t + 1;
	}

	function cubicInOut(t) {
	  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	}

	var exponent = 3;

	var polyIn = (function custom(e) {
	  e = +e;

	  function polyIn(t) {
	    return Math.pow(t, e);
	  }

	  polyIn.exponent = custom;

	  return polyIn;
	})(exponent);

	var polyOut = (function custom(e) {
	  e = +e;

	  function polyOut(t) {
	    return 1 - Math.pow(1 - t, e);
	  }

	  polyOut.exponent = custom;

	  return polyOut;
	})(exponent);

	var polyInOut = (function custom(e) {
	  e = +e;

	  function polyInOut(t) {
	    return ((t *= 2) <= 1 ? Math.pow(t, e) : 2 - Math.pow(2 - t, e)) / 2;
	  }

	  polyInOut.exponent = custom;

	  return polyInOut;
	})(exponent);

	var pi = Math.PI;
	var halfPi = pi / 2;

	function sinIn(t) {
	  return 1 - Math.cos(t * halfPi);
	}

	function sinOut(t) {
	  return Math.sin(t * halfPi);
	}

	function sinInOut(t) {
	  return (1 - Math.cos(pi * t)) / 2;
	}

	function expIn(t) {
	  return Math.pow(2, 10 * t - 10);
	}

	function expOut(t) {
	  return 1 - Math.pow(2, -10 * t);
	}

	function expInOut(t) {
	  return ((t *= 2) <= 1 ? Math.pow(2, 10 * t - 10) : 2 - Math.pow(2, 10 - 10 * t)) / 2;
	}

	function circleIn(t) {
	  return 1 - Math.sqrt(1 - t * t);
	}

	function circleOut(t) {
	  return Math.sqrt(1 - --t * t);
	}

	function circleInOut(t) {
	  return ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2;
	}

	var b1 = 4 / 11;
	var b2 = 6 / 11;
	var b3 = 8 / 11;
	var b4 = 3 / 4;
	var b5 = 9 / 11;
	var b6 = 10 / 11;
	var b7 = 15 / 16;
	var b8 = 21 / 22;
	var b9 = 63 / 64;
	var b0 = 1 / b1 / b1;

	function bounceIn(t) {
	  return 1 - bounceOut(1 - t);
	}

	function bounceOut(t) {
	  return (t = +t) < b1 ? b0 * t * t : t < b3 ? b0 * (t -= b2) * t + b4 : t < b6 ? b0 * (t -= b5) * t + b7 : b0 * (t -= b8) * t + b9;
	}

	function bounceInOut(t) {
	  return ((t *= 2) <= 1 ? 1 - bounceOut(1 - t) : bounceOut(t - 1) + 1) / 2;
	}

	var overshoot = 1.70158;

	var backIn = (function custom(s) {
	  s = +s;

	  function backIn(t) {
	    return t * t * ((s + 1) * t - s);
	  }

	  backIn.overshoot = custom;

	  return backIn;
	})(overshoot);

	var backOut = (function custom(s) {
	  s = +s;

	  function backOut(t) {
	    return --t * t * ((s + 1) * t + s) + 1;
	  }

	  backOut.overshoot = custom;

	  return backOut;
	})(overshoot);

	var backInOut = (function custom(s) {
	  s = +s;

	  function backInOut(t) {
	    return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) : (t -= 2) * t * ((s + 1) * t + s) + 2) / 2;
	  }

	  backInOut.overshoot = custom;

	  return backInOut;
	})(overshoot);

	var tau = 2 * Math.PI;
	var amplitude = 1;
	var period = 0.3;

	var elasticIn = (function custom(a, p) {
	  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	  function elasticIn(t) {
	    return a * Math.pow(2, 10 * --t) * Math.sin((s - t) / p);
	  }

	  elasticIn.amplitude = function(a) { return custom(a, p * tau); };
	  elasticIn.period = function(p) { return custom(a, p); };

	  return elasticIn;
	})(amplitude, period);

	var elasticOut = (function custom(a, p) {
	  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	  function elasticOut(t) {
	    return 1 - a * Math.pow(2, -10 * (t = +t)) * Math.sin((t + s) / p);
	  }

	  elasticOut.amplitude = function(a) { return custom(a, p * tau); };
	  elasticOut.period = function(p) { return custom(a, p); };

	  return elasticOut;
	})(amplitude, period);

	var elasticInOut = (function custom(a, p) {
	  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

	  function elasticInOut(t) {
	    return ((t = t * 2 - 1) < 0
	        ? a * Math.pow(2, 10 * t) * Math.sin((s - t) / p)
	        : 2 - a * Math.pow(2, -10 * t) * Math.sin((s + t) / p)) / 2;
	  }

	  elasticInOut.amplitude = function(a) { return custom(a, p * tau); };
	  elasticInOut.period = function(p) { return custom(a, p); };

	  return elasticInOut;
	})(amplitude, period);

	var area = function(polygon) {
	  var i = -1,
	      n = polygon.length,
	      a,
	      b = polygon[n - 1],
	      area = 0;

	  while (++i < n) {
	    a = b;
	    b = polygon[i];
	    area += a[1] * b[0] - a[0] * b[1];
	  }

	  return area / 2;
	};

	var centroid = function(polygon) {
	  var i = -1,
	      n = polygon.length,
	      x = 0,
	      y = 0,
	      a,
	      b = polygon[n - 1],
	      c,
	      k = 0;

	  while (++i < n) {
	    a = b;
	    b = polygon[i];
	    k += c = a[0] * b[1] - b[0] * a[1];
	    x += (a[0] + b[0]) * c;
	    y += (a[1] + b[1]) * c;
	  }

	  return k *= 3, [x / k, y / k];
	};

	// Returns the 2D cross product of AB and AC vectors, i.e., the z-component of
	// the 3D cross product in a quadrant I Cartesian coordinate system (+x is
	// right, +y is up). Returns a positive value if ABC is counter-clockwise,
	// negative if clockwise, and zero if the points are collinear.
	var cross = function(a, b, c) {
	  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
	};

	function lexicographicOrder(a, b) {
	  return a[0] - b[0] || a[1] - b[1];
	}

	// Computes the upper convex hull per the monotone chain algorithm.
	// Assumes points.length >= 3, is sorted by x, unique in y.
	// Returns an array of indices into points in left-to-right order.
	function computeUpperHullIndexes(points) {
	  var n = points.length,
	      indexes = [0, 1],
	      size = 2;

	  for (var i = 2; i < n; ++i) {
	    while (size > 1 && cross(points[indexes[size - 2]], points[indexes[size - 1]], points[i]) <= 0) --size;
	    indexes[size++] = i;
	  }

	  return indexes.slice(0, size); // remove popped points
	}

	var hull = function(points) {
	  if ((n = points.length) < 3) return null;

	  var i,
	      n,
	      sortedPoints = new Array(n),
	      flippedPoints = new Array(n);

	  for (i = 0; i < n; ++i) sortedPoints[i] = [+points[i][0], +points[i][1], i];
	  sortedPoints.sort(lexicographicOrder);
	  for (i = 0; i < n; ++i) flippedPoints[i] = [sortedPoints[i][0], -sortedPoints[i][1]];

	  var upperIndexes = computeUpperHullIndexes(sortedPoints),
	      lowerIndexes = computeUpperHullIndexes(flippedPoints);

	  // Construct the hull polygon, removing possible duplicate endpoints.
	  var skipLeft = lowerIndexes[0] === upperIndexes[0],
	      skipRight = lowerIndexes[lowerIndexes.length - 1] === upperIndexes[upperIndexes.length - 1],
	      hull = [];

	  // Add upper hull in right-to-l order.
	  // Then add lower hull in left-to-right order.
	  for (i = upperIndexes.length - 1; i >= 0; --i) hull.push(points[sortedPoints[upperIndexes[i]][2]]);
	  for (i = +skipLeft; i < lowerIndexes.length - skipRight; ++i) hull.push(points[sortedPoints[lowerIndexes[i]][2]]);

	  return hull;
	};

	var contains = function(polygon, point) {
	  var n = polygon.length,
	      p = polygon[n - 1],
	      x = point[0], y = point[1],
	      x0 = p[0], y0 = p[1],
	      x1, y1,
	      inside = false;

	  for (var i = 0; i < n; ++i) {
	    p = polygon[i], x1 = p[0], y1 = p[1];
	    if (((y1 > y) !== (y0 > y)) && (x < (x0 - x1) * (y - y1) / (y0 - y1) + x1)) inside = !inside;
	    x0 = x1, y0 = y1;
	  }

	  return inside;
	};

	var length$1 = function(polygon) {
	  var i = -1,
	      n = polygon.length,
	      b = polygon[n - 1],
	      xa,
	      ya,
	      xb = b[0],
	      yb = b[1],
	      perimeter = 0;

	  while (++i < n) {
	    xa = xb;
	    ya = yb;
	    b = polygon[i];
	    xb = b[0];
	    yb = b[1];
	    xa -= xb;
	    ya -= yb;
	    perimeter += Math.sqrt(xa * xa + ya * ya);
	  }

	  return perimeter;
	};

	var pi$1 = Math.PI;
	var tau$1 = 2 * pi$1;
	var epsilon = 1e-6;
	var tauEpsilon = tau$1 - epsilon;

	function Path() {
	  this._x0 = this._y0 = // start of current subpath
	  this._x1 = this._y1 = null; // end of current subpath
	  this._ = [];
	}

	function path() {
	  return new Path;
	}

	Path.prototype = path.prototype = {
	  constructor: Path,
	  moveTo: function(x, y) {
	    this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y);
	  },
	  closePath: function() {
	    if (this._x1 !== null) {
	      this._x1 = this._x0, this._y1 = this._y0;
	      this._.push("Z");
	    }
	  },
	  lineTo: function(x, y) {
	    this._.push("L", this._x1 = +x, ",", this._y1 = +y);
	  },
	  quadraticCurveTo: function(x1, y1, x, y) {
	    this._.push("Q", +x1, ",", +y1, ",", this._x1 = +x, ",", this._y1 = +y);
	  },
	  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
	    this._.push("C", +x1, ",", +y1, ",", +x2, ",", +y2, ",", this._x1 = +x, ",", this._y1 = +y);
	  },
	  arcTo: function(x1, y1, x2, y2, r) {
	    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
	    var x0 = this._x1,
	        y0 = this._y1,
	        x21 = x2 - x1,
	        y21 = y2 - y1,
	        x01 = x0 - x1,
	        y01 = y0 - y1,
	        l01_2 = x01 * x01 + y01 * y01;

	    // Is the radius negative? Error.
	    if (r < 0) throw new Error("negative radius: " + r);

	    // Is this path empty? Move to (x1,y1).
	    if (this._x1 === null) {
	      this._.push(
	        "M", this._x1 = x1, ",", this._y1 = y1
	      );
	    }

	    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
	    else if (!(l01_2 > epsilon)) {}

	    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
	    // Equivalently, is (x1,y1) coincident with (x2,y2)?
	    // Or, is the radius zero? Line to (x1,y1).
	    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
	      this._.push(
	        "L", this._x1 = x1, ",", this._y1 = y1
	      );
	    }

	    // Otherwise, draw an arc!
	    else {
	      var x20 = x2 - x0,
	          y20 = y2 - y0,
	          l21_2 = x21 * x21 + y21 * y21,
	          l20_2 = x20 * x20 + y20 * y20,
	          l21 = Math.sqrt(l21_2),
	          l01 = Math.sqrt(l01_2),
	          l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
	          t01 = l / l01,
	          t21 = l / l21;

	      // If the start tangent is not coincident with (x0,y0), line to.
	      if (Math.abs(t01 - 1) > epsilon) {
	        this._.push(
	          "L", x1 + t01 * x01, ",", y1 + t01 * y01
	        );
	      }

	      this._.push(
	        "A", r, ",", r, ",0,0,", +(y01 * x20 > x01 * y20), ",", this._x1 = x1 + t21 * x21, ",", this._y1 = y1 + t21 * y21
	      );
	    }
	  },
	  arc: function(x, y, r, a0, a1, ccw) {
	    x = +x, y = +y, r = +r;
	    var dx = r * Math.cos(a0),
	        dy = r * Math.sin(a0),
	        x0 = x + dx,
	        y0 = y + dy,
	        cw = 1 ^ ccw,
	        da = ccw ? a0 - a1 : a1 - a0;

	    // Is the radius negative? Error.
	    if (r < 0) throw new Error("negative radius: " + r);

	    // Is this path empty? Move to (x0,y0).
	    if (this._x1 === null) {
	      this._.push(
	        "M", x0, ",", y0
	      );
	    }

	    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
	    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
	      this._.push(
	        "L", x0, ",", y0
	      );
	    }

	    // Is this arc empty? We’re done.
	    if (!r) return;

	    // Is this a complete circle? Draw two arcs to complete the circle.
	    if (da > tauEpsilon) {
	      this._.push(
	        "A", r, ",", r, ",0,1,", cw, ",", x - dx, ",", y - dy,
	        "A", r, ",", r, ",0,1,", cw, ",", this._x1 = x0, ",", this._y1 = y0
	      );
	    }

	    // Otherwise, draw an arc!
	    else {
	      if (da < 0) da = da % tau$1 + tau$1;
	      this._.push(
	        "A", r, ",", r, ",0,", +(da >= pi$1), ",", cw, ",", this._x1 = x + r * Math.cos(a1), ",", this._y1 = y + r * Math.sin(a1)
	      );
	    }
	  },
	  rect: function(x, y, w, h) {
	    this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y, "h", +w, "v", +h, "h", -w, "Z");
	  },
	  toString: function() {
	    return this._.join("");
	  }
	};

	var tree_add = function(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d);
	  return add(this.cover(x, y), x, y, d);
	};

	function add(tree, x, y, d) {
	  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      y0 = tree._y0,
	      x1 = tree._x1,
	      y1 = tree._y1,
	      xm,
	      ym,
	      xp,
	      yp,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  yp = +tree._y.call(null, node.data);
	  if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var d, i, n = data.length,
	      x,
	      y,
	      xz = new Array(n),
	      yz = new Array(n),
	      x0 = Infinity,
	      y0 = Infinity,
	      x1 = -Infinity,
	      y1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
	    xz[i] = x;
	    yz[i] = y;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	    if (y < y0) y0 = y;
	    if (y > y1) y1 = y;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;
	  if (y1 < y0) y0 = this._y0, y1 = this._y1;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0).cover(x1, y1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x, y) {
	  if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

	  var x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1;

	  // If the quadtree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing quadrant boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	    y1 = (y0 = Math.floor(y)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1 || y0 > y || y > y1) {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y1 = y0 + z, x > x1 || y > y1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y1 = y0 + z, x0 > x || y > y1);
	        break;
	      }
	      case 2: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y0 = y1 - z, x > x1 || y0 > y);
	        break;
	      }
	      case 3: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y0 = y1 - z, x0 > x || y0 > y);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the quadtree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
	};

	var Quad = function(node, x0, y0, x1, y1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.x1 = x1;
	  this.y1 = y1;
	};

	var tree_find = function(x, y, radius) {
	  var data,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1,
	      y1,
	      x2,
	      y2,
	      x3 = this._x1,
	      y3 = this._y1,
	      quads = [],
	      node = this._root,
	      q,
	      i;

	  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius, y0 = y - radius;
	    x3 = x + radius, y3 = y + radius;
	    radius *= radius;
	  }

	  while (q = quads.pop()) {

	    // Stop searching if this quadrant can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (y1 = q.y0) > y3
	        || (x2 = q.x1) < x0
	        || (y2 = q.y1) < y0) continue;

	    // Bisect the current quadrant.
	    if (node.length) {
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2;

	      quads.push(
	        new Quad(node[3], xm, ym, x2, y2),
	        new Quad(node[2], x1, ym, xm, y2),
	        new Quad(node[1], xm, y1, x2, ym),
	        new Quad(node[0], x1, y1, xm, ym)
	      );

	      // Visit the closest quadrant first.
	      if (i = (y >= ym) << 1 | (x >= xm)) {
	        q = quads[quads.length - 1];
	        quads[quads.length - 1] = quads[quads.length - 1 - i];
	        quads[quads.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var dx = x - +this._x.call(null, node.data),
	          dy = y - +this._y.call(null, node.data),
	          d2 = dx * dx + dy * dy;
	      if (d2 < radius) {
	        var d = Math.sqrt(radius = d2);
	        x0 = x - d, y0 = y - d;
	        x3 = x + d, y3 = y + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1,
	      x,
	      y,
	      xm,
	      ym,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1] || parent[2] || parent[3])
	      && node === (parent[3] || parent[2] || parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
	  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
	      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var quads = [], next = [], q;
	  if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.y0, q.x1, q.y1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function defaultY(d) {
	  return d[1];
	}

	var tree_y = function(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	};

	function quadtree(nodes, x, y) {
	  var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Quadtree(x, y, x0, y0, x1, y1) {
	  this._x = x;
	  this._y = y;
	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = quadtree.prototype = Quadtree.prototype;

	treeProto.copy = function() {
	  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(4)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 4; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;
	treeProto.y = tree_y;

	var slice$1 = [].slice;

	var noabort = {};

	function Queue(size) {
	  if (!(size >= 1)) throw new Error;
	  this._size = size;
	  this._call =
	  this._error = null;
	  this._tasks = [];
	  this._data = [];
	  this._waiting =
	  this._active =
	  this._ended =
	  this._start = 0; // inside a synchronous task callback?
	}

	Queue.prototype = queue.prototype = {
	  constructor: Queue,
	  defer: function(callback) {
	    if (typeof callback !== "function" || this._call) throw new Error;
	    if (this._error != null) return this;
	    var t = slice$1.call(arguments, 1);
	    t.push(callback);
	    ++this._waiting, this._tasks.push(t);
	    poke(this);
	    return this;
	  },
	  abort: function() {
	    if (this._error == null) abort(this, new Error("abort"));
	    return this;
	  },
	  await: function(callback) {
	    if (typeof callback !== "function" || this._call) throw new Error;
	    this._call = function(error, results) { callback.apply(null, [error].concat(results)); };
	    maybeNotify(this);
	    return this;
	  },
	  awaitAll: function(callback) {
	    if (typeof callback !== "function" || this._call) throw new Error;
	    this._call = callback;
	    maybeNotify(this);
	    return this;
	  }
	};

	function poke(q) {
	  if (!q._start) {
	    try { start(q); } // let the current task complete
	    catch (e) {
	      if (q._tasks[q._ended + q._active - 1]) abort(q, e); // task errored synchronously
	      else if (!q._data) throw e; // await callback errored synchronously
	    }
	  }
	}

	function start(q) {
	  while (q._start = q._waiting && q._active < q._size) {
	    var i = q._ended + q._active,
	        t = q._tasks[i],
	        j = t.length - 1,
	        c = t[j];
	    t[j] = end(q, i);
	    --q._waiting, ++q._active;
	    t = c.apply(null, t);
	    if (!q._tasks[i]) continue; // task finished synchronously
	    q._tasks[i] = t || noabort;
	  }
	}

	function end(q, i) {
	  return function(e, r) {
	    if (!q._tasks[i]) return; // ignore multiple callbacks
	    --q._active, ++q._ended;
	    q._tasks[i] = null;
	    if (q._error != null) return; // ignore secondary errors
	    if (e != null) {
	      abort(q, e);
	    } else {
	      q._data[i] = r;
	      if (q._waiting) poke(q);
	      else maybeNotify(q);
	    }
	  };
	}

	function abort(q, e) {
	  var i = q._tasks.length, t;
	  q._error = e; // ignore active callbacks
	  q._data = undefined; // allow gc
	  q._waiting = NaN; // prevent starting

	  while (--i >= 0) {
	    if (t = q._tasks[i]) {
	      q._tasks[i] = null;
	      if (t.abort) {
	        try { t.abort(); }
	        catch (e) { /* ignore */ }
	      }
	    }
	  }

	  q._active = NaN; // allow notification
	  maybeNotify(q);
	}

	function maybeNotify(q) {
	  if (!q._active && q._call) {
	    var d = q._data;
	    q._data = undefined; // allow gc
	    q._call(q._error, d);
	  }
	}

	function queue(concurrency) {
	  return new Queue(arguments.length ? +concurrency : Infinity);
	}

	var constant$2 = function(x) {
	  return function constant() {
	    return x;
	  };
	};

	var epsilon$1 = 1e-12;
	var pi$2 = Math.PI;
	var halfPi$1 = pi$2 / 2;
	var tau$2 = 2 * pi$2;

	function arcInnerRadius(d) {
	  return d.innerRadius;
	}

	function arcOuterRadius(d) {
	  return d.outerRadius;
	}

	function arcStartAngle(d) {
	  return d.startAngle;
	}

	function arcEndAngle(d) {
	  return d.endAngle;
	}

	function arcPadAngle(d) {
	  return d && d.padAngle; // Note: optional!
	}

	function asin(x) {
	  return x >= 1 ? halfPi$1 : x <= -1 ? -halfPi$1 : Math.asin(x);
	}

	function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
	  var x10 = x1 - x0, y10 = y1 - y0,
	      x32 = x3 - x2, y32 = y3 - y2,
	      t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
	  return [x0 + t * x10, y0 + t * y10];
	}

	// Compute perpendicular offset line of length rc.
	// http://mathworld.wolfram.com/Circle-LineIntersection.html
	function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
	  var x01 = x0 - x1,
	      y01 = y0 - y1,
	      lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
	      ox = lo * y01,
	      oy = -lo * x01,
	      x11 = x0 + ox,
	      y11 = y0 + oy,
	      x10 = x1 + ox,
	      y10 = y1 + oy,
	      x00 = (x11 + x10) / 2,
	      y00 = (y11 + y10) / 2,
	      dx = x10 - x11,
	      dy = y10 - y11,
	      d2 = dx * dx + dy * dy,
	      r = r1 - rc,
	      D = x11 * y10 - x10 * y11,
	      d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
	      cx0 = (D * dy - dx * d) / d2,
	      cy0 = (-D * dx - dy * d) / d2,
	      cx1 = (D * dy + dx * d) / d2,
	      cy1 = (-D * dx + dy * d) / d2,
	      dx0 = cx0 - x00,
	      dy0 = cy0 - y00,
	      dx1 = cx1 - x00,
	      dy1 = cy1 - y00;

	  // Pick the closer of the two intersection points.
	  // TODO Is there a faster way to determine which intersection to use?
	  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

	  return {
	    cx: cx0,
	    cy: cy0,
	    x01: -ox,
	    y01: -oy,
	    x11: cx0 * (r1 / r - 1),
	    y11: cy0 * (r1 / r - 1)
	  };
	}

	var arc = function() {
	  var innerRadius = arcInnerRadius,
	      outerRadius = arcOuterRadius,
	      cornerRadius = constant$2(0),
	      padRadius = null,
	      startAngle = arcStartAngle,
	      endAngle = arcEndAngle,
	      padAngle = arcPadAngle,
	      context = null;

	  function arc() {
	    var buffer,
	        r,
	        r0 = +innerRadius.apply(this, arguments),
	        r1 = +outerRadius.apply(this, arguments),
	        a0 = startAngle.apply(this, arguments) - halfPi$1,
	        a1 = endAngle.apply(this, arguments) - halfPi$1,
	        da = Math.abs(a1 - a0),
	        cw = a1 > a0;

	    if (!context) context = buffer = path();

	    // Ensure that the outer radius is always larger than the inner radius.
	    if (r1 < r0) r = r1, r1 = r0, r0 = r;

	    // Is it a point?
	    if (!(r1 > epsilon$1)) context.moveTo(0, 0);

	    // Or is it a circle or annulus?
	    else if (da > tau$2 - epsilon$1) {
	      context.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
	      context.arc(0, 0, r1, a0, a1, !cw);
	      if (r0 > epsilon$1) {
	        context.moveTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
	        context.arc(0, 0, r0, a1, a0, cw);
	      }
	    }

	    // Or is it a circular or annular sector?
	    else {
	      var a01 = a0,
	          a11 = a1,
	          a00 = a0,
	          a10 = a1,
	          da0 = da,
	          da1 = da,
	          ap = padAngle.apply(this, arguments) / 2,
	          rp = (ap > epsilon$1) && (padRadius ? +padRadius.apply(this, arguments) : Math.sqrt(r0 * r0 + r1 * r1)),
	          rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
	          rc0 = rc,
	          rc1 = rc,
	          t0,
	          t1;

	      // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
	      if (rp > epsilon$1) {
	        var p0 = asin(rp / r0 * Math.sin(ap)),
	            p1 = asin(rp / r1 * Math.sin(ap));
	        if ((da0 -= p0 * 2) > epsilon$1) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
	        else da0 = 0, a00 = a10 = (a0 + a1) / 2;
	        if ((da1 -= p1 * 2) > epsilon$1) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
	        else da1 = 0, a01 = a11 = (a0 + a1) / 2;
	      }

	      var x01 = r1 * Math.cos(a01),
	          y01 = r1 * Math.sin(a01),
	          x10 = r0 * Math.cos(a10),
	          y10 = r0 * Math.sin(a10);

	      // Apply rounded corners?
	      if (rc > epsilon$1) {
	        var x11 = r1 * Math.cos(a11),
	            y11 = r1 * Math.sin(a11),
	            x00 = r0 * Math.cos(a00),
	            y00 = r0 * Math.sin(a00);

	        // Restrict the corner radius according to the sector angle.
	        if (da < pi$2) {
	          var oc = da0 > epsilon$1 ? intersect(x01, y01, x00, y00, x11, y11, x10, y10) : [x10, y10],
	              ax = x01 - oc[0],
	              ay = y01 - oc[1],
	              bx = x11 - oc[0],
	              by = y11 - oc[1],
	              kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2),
	              lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
	          rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
	          rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
	        }
	      }

	      // Is the sector collapsed to a line?
	      if (!(da1 > epsilon$1)) context.moveTo(x01, y01);

	      // Does the sector’s outer ring have rounded corners?
	      else if (rc1 > epsilon$1) {
	        t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
	        t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

	        context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

	        // Have the corners merged?
	        if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

	        // Otherwise, draw the two corners and the ring.
	        else {
	          context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
	          context.arc(0, 0, r1, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
	          context.arc(t1.cx, t1.cy, rc1, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
	        }
	      }

	      // Or is the outer ring just a circular arc?
	      else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

	      // Is there no inner ring, and it’s a circular sector?
	      // Or perhaps it’s an annular sector collapsed due to padding?
	      if (!(r0 > epsilon$1) || !(da0 > epsilon$1)) context.lineTo(x10, y10);

	      // Does the sector’s inner ring (or point) have rounded corners?
	      else if (rc0 > epsilon$1) {
	        t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
	        t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

	        context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

	        // Have the corners merged?
	        if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

	        // Otherwise, draw the two corners and the ring.
	        else {
	          context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
	          context.arc(0, 0, r0, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
	          context.arc(t1.cx, t1.cy, rc0, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
	        }
	      }

	      // Or is the inner ring just a circular arc?
	      else context.arc(0, 0, r0, a10, a00, cw);
	    }

	    context.closePath();

	    if (buffer) return context = null, buffer + "" || null;
	  }

	  arc.centroid = function() {
	    var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
	        a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$2 / 2;
	    return [Math.cos(a) * r, Math.sin(a) * r];
	  };

	  arc.innerRadius = function(_) {
	    return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant$2(+_), arc) : innerRadius;
	  };

	  arc.outerRadius = function(_) {
	    return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant$2(+_), arc) : outerRadius;
	  };

	  arc.cornerRadius = function(_) {
	    return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant$2(+_), arc) : cornerRadius;
	  };

	  arc.padRadius = function(_) {
	    return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant$2(+_), arc) : padRadius;
	  };

	  arc.startAngle = function(_) {
	    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$2(+_), arc) : startAngle;
	  };

	  arc.endAngle = function(_) {
	    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$2(+_), arc) : endAngle;
	  };

	  arc.padAngle = function(_) {
	    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$2(+_), arc) : padAngle;
	  };

	  arc.context = function(_) {
	    return arguments.length ? ((context = _ == null ? null : _), arc) : context;
	  };

	  return arc;
	};

	function Linear(context) {
	  this._context = context;
	}

	Linear.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; // proceed
	      default: this._context.lineTo(x, y); break;
	    }
	  }
	};

	var curveLinear = function(context) {
	  return new Linear(context);
	};

	function x(p) {
	  return p[0];
	}

	function y(p) {
	  return p[1];
	}

	var line = function() {
	  var x$$1 = x,
	      y$$1 = y,
	      defined = constant$2(true),
	      context = null,
	      curve = curveLinear,
	      output = null;

	  function line(data) {
	    var i,
	        n = data.length,
	        d,
	        defined0 = false,
	        buffer;

	    if (context == null) output = curve(buffer = path());

	    for (i = 0; i <= n; ++i) {
	      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
	        if (defined0 = !defined0) output.lineStart();
	        else output.lineEnd();
	      }
	      if (defined0) output.point(+x$$1(d, i, data), +y$$1(d, i, data));
	    }

	    if (buffer) return output = null, buffer + "" || null;
	  }

	  line.x = function(_) {
	    return arguments.length ? (x$$1 = typeof _ === "function" ? _ : constant$2(+_), line) : x$$1;
	  };

	  line.y = function(_) {
	    return arguments.length ? (y$$1 = typeof _ === "function" ? _ : constant$2(+_), line) : y$$1;
	  };

	  line.defined = function(_) {
	    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$2(!!_), line) : defined;
	  };

	  line.curve = function(_) {
	    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
	  };

	  line.context = function(_) {
	    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
	  };

	  return line;
	};

	var area$1 = function() {
	  var x0 = x,
	      x1 = null,
	      y0 = constant$2(0),
	      y1 = y,
	      defined = constant$2(true),
	      context = null,
	      curve = curveLinear,
	      output = null;

	  function area(data) {
	    var i,
	        j,
	        k,
	        n = data.length,
	        d,
	        defined0 = false,
	        buffer,
	        x0z = new Array(n),
	        y0z = new Array(n);

	    if (context == null) output = curve(buffer = path());

	    for (i = 0; i <= n; ++i) {
	      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
	        if (defined0 = !defined0) {
	          j = i;
	          output.areaStart();
	          output.lineStart();
	        } else {
	          output.lineEnd();
	          output.lineStart();
	          for (k = i - 1; k >= j; --k) {
	            output.point(x0z[k], y0z[k]);
	          }
	          output.lineEnd();
	          output.areaEnd();
	        }
	      }
	      if (defined0) {
	        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
	        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
	      }
	    }

	    if (buffer) return output = null, buffer + "" || null;
	  }

	  function arealine() {
	    return line().defined(defined).curve(curve).context(context);
	  }

	  area.x = function(_) {
	    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$2(+_), x1 = null, area) : x0;
	  };

	  area.x0 = function(_) {
	    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$2(+_), area) : x0;
	  };

	  area.x1 = function(_) {
	    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant$2(+_), area) : x1;
	  };

	  area.y = function(_) {
	    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$2(+_), y1 = null, area) : y0;
	  };

	  area.y0 = function(_) {
	    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$2(+_), area) : y0;
	  };

	  area.y1 = function(_) {
	    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant$2(+_), area) : y1;
	  };

	  area.lineX0 =
	  area.lineY0 = function() {
	    return arealine().x(x0).y(y0);
	  };

	  area.lineY1 = function() {
	    return arealine().x(x0).y(y1);
	  };

	  area.lineX1 = function() {
	    return arealine().x(x1).y(y0);
	  };

	  area.defined = function(_) {
	    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$2(!!_), area) : defined;
	  };

	  area.curve = function(_) {
	    return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
	  };

	  area.context = function(_) {
	    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
	  };

	  return area;
	};

	var descending$1 = function(a, b) {
	  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	};

	var identity$1 = function(d) {
	  return d;
	};

	var pie = function() {
	  var value = identity$1,
	      sortValues = descending$1,
	      sort = null,
	      startAngle = constant$2(0),
	      endAngle = constant$2(tau$2),
	      padAngle = constant$2(0);

	  function pie(data) {
	    var i,
	        n = data.length,
	        j,
	        k,
	        sum = 0,
	        index = new Array(n),
	        arcs = new Array(n),
	        a0 = +startAngle.apply(this, arguments),
	        da = Math.min(tau$2, Math.max(-tau$2, endAngle.apply(this, arguments) - a0)),
	        a1,
	        p = Math.min(Math.abs(da) / n, padAngle.apply(this, arguments)),
	        pa = p * (da < 0 ? -1 : 1),
	        v;

	    for (i = 0; i < n; ++i) {
	      if ((v = arcs[index[i] = i] = +value(data[i], i, data)) > 0) {
	        sum += v;
	      }
	    }

	    // Optionally sort the arcs by previously-computed values or by data.
	    if (sortValues != null) index.sort(function(i, j) { return sortValues(arcs[i], arcs[j]); });
	    else if (sort != null) index.sort(function(i, j) { return sort(data[i], data[j]); });

	    // Compute the arcs! They are stored in the original data's order.
	    for (i = 0, k = sum ? (da - n * pa) / sum : 0; i < n; ++i, a0 = a1) {
	      j = index[i], v = arcs[j], a1 = a0 + (v > 0 ? v * k : 0) + pa, arcs[j] = {
	        data: data[j],
	        index: i,
	        value: v,
	        startAngle: a0,
	        endAngle: a1,
	        padAngle: p
	      };
	    }

	    return arcs;
	  }

	  pie.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant$2(+_), pie) : value;
	  };

	  pie.sortValues = function(_) {
	    return arguments.length ? (sortValues = _, sort = null, pie) : sortValues;
	  };

	  pie.sort = function(_) {
	    return arguments.length ? (sort = _, sortValues = null, pie) : sort;
	  };

	  pie.startAngle = function(_) {
	    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$2(+_), pie) : startAngle;
	  };

	  pie.endAngle = function(_) {
	    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$2(+_), pie) : endAngle;
	  };

	  pie.padAngle = function(_) {
	    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$2(+_), pie) : padAngle;
	  };

	  return pie;
	};

	var curveRadialLinear = curveRadial(curveLinear);

	function Radial(curve) {
	  this._curve = curve;
	}

	Radial.prototype = {
	  areaStart: function() {
	    this._curve.areaStart();
	  },
	  areaEnd: function() {
	    this._curve.areaEnd();
	  },
	  lineStart: function() {
	    this._curve.lineStart();
	  },
	  lineEnd: function() {
	    this._curve.lineEnd();
	  },
	  point: function(a, r) {
	    this._curve.point(r * Math.sin(a), r * -Math.cos(a));
	  }
	};

	function curveRadial(curve) {

	  function radial(context) {
	    return new Radial(curve(context));
	  }

	  radial._curve = curve;

	  return radial;
	}

	function radialLine(l) {
	  var c = l.curve;

	  l.angle = l.x, delete l.x;
	  l.radius = l.y, delete l.y;

	  l.curve = function(_) {
	    return arguments.length ? c(curveRadial(_)) : c()._curve;
	  };

	  return l;
	}

	var radialLine$1 = function() {
	  return radialLine(line().curve(curveRadialLinear));
	};

	var radialArea = function() {
	  var a = area$1().curve(curveRadialLinear),
	      c = a.curve,
	      x0 = a.lineX0,
	      x1 = a.lineX1,
	      y0 = a.lineY0,
	      y1 = a.lineY1;

	  a.angle = a.x, delete a.x;
	  a.startAngle = a.x0, delete a.x0;
	  a.endAngle = a.x1, delete a.x1;
	  a.radius = a.y, delete a.y;
	  a.innerRadius = a.y0, delete a.y0;
	  a.outerRadius = a.y1, delete a.y1;
	  a.lineStartAngle = function() { return radialLine(x0()); }, delete a.lineX0;
	  a.lineEndAngle = function() { return radialLine(x1()); }, delete a.lineX1;
	  a.lineInnerRadius = function() { return radialLine(y0()); }, delete a.lineY0;
	  a.lineOuterRadius = function() { return radialLine(y1()); }, delete a.lineY1;

	  a.curve = function(_) {
	    return arguments.length ? c(curveRadial(_)) : c()._curve;
	  };

	  return a;
	};

	var circle = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / pi$2);
	    context.moveTo(r, 0);
	    context.arc(0, 0, r, 0, tau$2);
	  }
	};

	var cross$1 = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / 5) / 2;
	    context.moveTo(-3 * r, -r);
	    context.lineTo(-r, -r);
	    context.lineTo(-r, -3 * r);
	    context.lineTo(r, -3 * r);
	    context.lineTo(r, -r);
	    context.lineTo(3 * r, -r);
	    context.lineTo(3 * r, r);
	    context.lineTo(r, r);
	    context.lineTo(r, 3 * r);
	    context.lineTo(-r, 3 * r);
	    context.lineTo(-r, r);
	    context.lineTo(-3 * r, r);
	    context.closePath();
	  }
	};

	var tan30 = Math.sqrt(1 / 3);
	var tan30_2 = tan30 * 2;

	var diamond = {
	  draw: function(context, size) {
	    var y = Math.sqrt(size / tan30_2),
	        x = y * tan30;
	    context.moveTo(0, -y);
	    context.lineTo(x, 0);
	    context.lineTo(0, y);
	    context.lineTo(-x, 0);
	    context.closePath();
	  }
	};

	var ka = 0.89081309152928522810;
	var kr = Math.sin(pi$2 / 10) / Math.sin(7 * pi$2 / 10);
	var kx = Math.sin(tau$2 / 10) * kr;
	var ky = -Math.cos(tau$2 / 10) * kr;

	var star = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size * ka),
	        x = kx * r,
	        y = ky * r;
	    context.moveTo(0, -r);
	    context.lineTo(x, y);
	    for (var i = 1; i < 5; ++i) {
	      var a = tau$2 * i / 5,
	          c = Math.cos(a),
	          s = Math.sin(a);
	      context.lineTo(s * r, -c * r);
	      context.lineTo(c * x - s * y, s * x + c * y);
	    }
	    context.closePath();
	  }
	};

	var square = {
	  draw: function(context, size) {
	    var w = Math.sqrt(size),
	        x = -w / 2;
	    context.rect(x, x, w, w);
	  }
	};

	var sqrt3 = Math.sqrt(3);

	var triangle = {
	  draw: function(context, size) {
	    var y = -Math.sqrt(size / (sqrt3 * 3));
	    context.moveTo(0, y * 2);
	    context.lineTo(-sqrt3 * y, -y);
	    context.lineTo(sqrt3 * y, -y);
	    context.closePath();
	  }
	};

	var c = -0.5;
	var s = Math.sqrt(3) / 2;
	var k = 1 / Math.sqrt(12);
	var a = (k / 2 + 1) * 3;

	var wye = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / a),
	        x0 = r / 2,
	        y0 = r * k,
	        x1 = x0,
	        y1 = r * k + r,
	        x2 = -x1,
	        y2 = y1;
	    context.moveTo(x0, y0);
	    context.lineTo(x1, y1);
	    context.lineTo(x2, y2);
	    context.lineTo(c * x0 - s * y0, s * x0 + c * y0);
	    context.lineTo(c * x1 - s * y1, s * x1 + c * y1);
	    context.lineTo(c * x2 - s * y2, s * x2 + c * y2);
	    context.lineTo(c * x0 + s * y0, c * y0 - s * x0);
	    context.lineTo(c * x1 + s * y1, c * y1 - s * x1);
	    context.lineTo(c * x2 + s * y2, c * y2 - s * x2);
	    context.closePath();
	  }
	};

	var symbols = [
	  circle,
	  cross$1,
	  diamond,
	  square,
	  star,
	  triangle,
	  wye
	];

	var symbol = function() {
	  var type = constant$2(circle),
	      size = constant$2(64),
	      context = null;

	  function symbol() {
	    var buffer;
	    if (!context) context = buffer = path();
	    type.apply(this, arguments).draw(context, +size.apply(this, arguments));
	    if (buffer) return context = null, buffer + "" || null;
	  }

	  symbol.type = function(_) {
	    return arguments.length ? (type = typeof _ === "function" ? _ : constant$2(_), symbol) : type;
	  };

	  symbol.size = function(_) {
	    return arguments.length ? (size = typeof _ === "function" ? _ : constant$2(+_), symbol) : size;
	  };

	  symbol.context = function(_) {
	    return arguments.length ? (context = _ == null ? null : _, symbol) : context;
	  };

	  return symbol;
	};

	var noop = function() {};

	function point(that, x, y) {
	  that._context.bezierCurveTo(
	    (2 * that._x0 + that._x1) / 3,
	    (2 * that._y0 + that._y1) / 3,
	    (that._x0 + 2 * that._x1) / 3,
	    (that._y0 + 2 * that._y1) / 3,
	    (that._x0 + 4 * that._x1 + x) / 6,
	    (that._y0 + 4 * that._y1 + y) / 6
	  );
	}

	function Basis(context) {
	  this._context = context;
	}

	Basis.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 3: point(this, this._x1, this._y1); // proceed
	      case 2: this._context.lineTo(this._x1, this._y1); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // proceed
	      default: point(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	var basis = function(context) {
	  return new Basis(context);
	};

	function BasisClosed(context) {
	  this._context = context;
	}

	BasisClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x2, this._y2);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3);
	        this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x2, this._y2);
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._x2 = x, this._y2 = y; break;
	      case 1: this._point = 2; this._x3 = x, this._y3 = y; break;
	      case 2: this._point = 3; this._x4 = x, this._y4 = y; this._context.moveTo((this._x0 + 4 * this._x1 + x) / 6, (this._y0 + 4 * this._y1 + y) / 6); break;
	      default: point(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	var basisClosed = function(context) {
	  return new BasisClosed(context);
	};

	function BasisOpen(context) {
	  this._context = context;
	}

	BasisOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; var x0 = (this._x0 + 4 * this._x1 + x) / 6, y0 = (this._y0 + 4 * this._y1 + y) / 6; this._line ? this._context.lineTo(x0, y0) : this._context.moveTo(x0, y0); break;
	      case 3: this._point = 4; // proceed
	      default: point(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	var basisOpen = function(context) {
	  return new BasisOpen(context);
	};

	function Bundle(context, beta) {
	  this._basis = new Basis(context);
	  this._beta = beta;
	}

	Bundle.prototype = {
	  lineStart: function() {
	    this._x = [];
	    this._y = [];
	    this._basis.lineStart();
	  },
	  lineEnd: function() {
	    var x = this._x,
	        y = this._y,
	        j = x.length - 1;

	    if (j > 0) {
	      var x0 = x[0],
	          y0 = y[0],
	          dx = x[j] - x0,
	          dy = y[j] - y0,
	          i = -1,
	          t;

	      while (++i <= j) {
	        t = i / j;
	        this._basis.point(
	          this._beta * x[i] + (1 - this._beta) * (x0 + t * dx),
	          this._beta * y[i] + (1 - this._beta) * (y0 + t * dy)
	        );
	      }
	    }

	    this._x = this._y = null;
	    this._basis.lineEnd();
	  },
	  point: function(x, y) {
	    this._x.push(+x);
	    this._y.push(+y);
	  }
	};

	var bundle = (function custom(beta) {

	  function bundle(context) {
	    return beta === 1 ? new Basis(context) : new Bundle(context, beta);
	  }

	  bundle.beta = function(beta) {
	    return custom(+beta);
	  };

	  return bundle;
	})(0.85);

	function point$1(that, x, y) {
	  that._context.bezierCurveTo(
	    that._x1 + that._k * (that._x2 - that._x0),
	    that._y1 + that._k * (that._y2 - that._y0),
	    that._x2 + that._k * (that._x1 - x),
	    that._y2 + that._k * (that._y1 - y),
	    that._x2,
	    that._y2
	  );
	}

	function Cardinal(context, tension) {
	  this._context = context;
	  this._k = (1 - tension) / 6;
	}

	Cardinal.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x2, this._y2); break;
	      case 3: point$1(this, this._x1, this._y1); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; this._x1 = x, this._y1 = y; break;
	      case 2: this._point = 3; // proceed
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var cardinal = (function custom(tension) {

	  function cardinal(context) {
	    return new Cardinal(context, tension);
	  }

	  cardinal.tension = function(tension) {
	    return custom(+tension);
	  };

	  return cardinal;
	})(0);

	function CardinalClosed(context, tension) {
	  this._context = context;
	  this._k = (1 - tension) / 6;
	}

	CardinalClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.lineTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        this.point(this._x5, this._y5);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
	      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
	      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var cardinalClosed = (function custom(tension) {

	  function cardinal(context) {
	    return new CardinalClosed(context, tension);
	  }

	  cardinal.tension = function(tension) {
	    return custom(+tension);
	  };

	  return cardinal;
	})(0);

	function CardinalOpen(context, tension) {
	  this._context = context;
	  this._k = (1 - tension) / 6;
	}

	CardinalOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
	      case 3: this._point = 4; // proceed
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var cardinalOpen = (function custom(tension) {

	  function cardinal(context) {
	    return new CardinalOpen(context, tension);
	  }

	  cardinal.tension = function(tension) {
	    return custom(+tension);
	  };

	  return cardinal;
	})(0);

	function point$2(that, x, y) {
	  var x1 = that._x1,
	      y1 = that._y1,
	      x2 = that._x2,
	      y2 = that._y2;

	  if (that._l01_a > epsilon$1) {
	    var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
	        n = 3 * that._l01_a * (that._l01_a + that._l12_a);
	    x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
	    y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
	  }

	  if (that._l23_a > epsilon$1) {
	    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
	        m = 3 * that._l23_a * (that._l23_a + that._l12_a);
	    x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
	    y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
	  }

	  that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
	}

	function CatmullRom(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRom.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x2, this._y2); break;
	      case 3: this.point(this._x2, this._y2); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; // proceed
	      default: point$2(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var catmullRom = (function custom(alpha) {

	  function catmullRom(context) {
	    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
	  }

	  catmullRom.alpha = function(alpha) {
	    return custom(+alpha);
	  };

	  return catmullRom;
	})(0.5);

	function CatmullRomClosed(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRomClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.lineTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        this.point(this._x5, this._y5);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
	      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
	      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
	      default: point$2(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var catmullRomClosed = (function custom(alpha) {

	  function catmullRom(context) {
	    return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
	  }

	  catmullRom.alpha = function(alpha) {
	    return custom(+alpha);
	  };

	  return catmullRom;
	})(0.5);

	function CatmullRomOpen(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRomOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
	      case 3: this._point = 4; // proceed
	      default: point$2(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	var catmullRomOpen = (function custom(alpha) {

	  function catmullRom(context) {
	    return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
	  }

	  catmullRom.alpha = function(alpha) {
	    return custom(+alpha);
	  };

	  return catmullRom;
	})(0.5);

	function LinearClosed(context) {
	  this._context = context;
	}

	LinearClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._point) this._context.closePath();
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    if (this._point) this._context.lineTo(x, y);
	    else this._point = 1, this._context.moveTo(x, y);
	  }
	};

	var linearClosed = function(context) {
	  return new LinearClosed(context);
	};

	function sign(x) {
	  return x < 0 ? -1 : 1;
	}

	// Calculate the slopes of the tangents (Hermite-type interpolation) based on
	// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
	// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
	// NOV(II), P. 443, 1990.
	function slope3(that, x2, y2) {
	  var h0 = that._x1 - that._x0,
	      h1 = x2 - that._x1,
	      s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
	      s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
	      p = (s0 * h1 + s1 * h0) / (h0 + h1);
	  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
	}

	// Calculate a one-sided slope.
	function slope2(that, t) {
	  var h = that._x1 - that._x0;
	  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
	}

	// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
	// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
	// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
	function point$3(that, t0, t1) {
	  var x0 = that._x0,
	      y0 = that._y0,
	      x1 = that._x1,
	      y1 = that._y1,
	      dx = (x1 - x0) / 3;
	  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
	}

	function MonotoneX(context) {
	  this._context = context;
	}

	MonotoneX.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 =
	    this._t0 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x1, this._y1); break;
	      case 3: point$3(this, this._t0, slope2(this, this._t0)); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    var t1 = NaN;

	    x = +x, y = +y;
	    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; point$3(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
	      default: point$3(this, this._t0, t1 = slope3(this, x, y)); break;
	    }

	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	    this._t0 = t1;
	  }
	};

	function MonotoneY(context) {
	  this._context = new ReflectContext(context);
	}

	(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
	  MonotoneX.prototype.point.call(this, y, x);
	};

	function ReflectContext(context) {
	  this._context = context;
	}

	ReflectContext.prototype = {
	  moveTo: function(x, y) { this._context.moveTo(y, x); },
	  closePath: function() { this._context.closePath(); },
	  lineTo: function(x, y) { this._context.lineTo(y, x); },
	  bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
	};

	function monotoneX(context) {
	  return new MonotoneX(context);
	}

	function monotoneY(context) {
	  return new MonotoneY(context);
	}

	function Natural(context) {
	  this._context = context;
	}

	Natural.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x = [];
	    this._y = [];
	  },
	  lineEnd: function() {
	    var x = this._x,
	        y = this._y,
	        n = x.length;

	    if (n) {
	      this._line ? this._context.lineTo(x[0], y[0]) : this._context.moveTo(x[0], y[0]);
	      if (n === 2) {
	        this._context.lineTo(x[1], y[1]);
	      } else {
	        var px = controlPoints(x),
	            py = controlPoints(y);
	        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
	          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x[i1], y[i1]);
	        }
	      }
	    }

	    if (this._line || (this._line !== 0 && n === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	    this._x = this._y = null;
	  },
	  point: function(x, y) {
	    this._x.push(+x);
	    this._y.push(+y);
	  }
	};

	// See https://www.particleincell.com/2012/bezier-splines/ for derivation.
	function controlPoints(x) {
	  var i,
	      n = x.length - 1,
	      m,
	      a = new Array(n),
	      b = new Array(n),
	      r = new Array(n);
	  a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
	  for (i = 1; i < n - 1; ++i) a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
	  a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
	  for (i = 1; i < n; ++i) m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
	  a[n - 1] = r[n - 1] / b[n - 1];
	  for (i = n - 2; i >= 0; --i) a[i] = (r[i] - a[i + 1]) / b[i];
	  b[n - 1] = (x[n] + a[n - 1]) / 2;
	  for (i = 0; i < n - 1; ++i) b[i] = 2 * x[i + 1] - a[i + 1];
	  return [a, b];
	}

	var natural = function(context) {
	  return new Natural(context);
	};

	function Step(context, t) {
	  this._context = context;
	  this._t = t;
	}

	Step.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x = this._y = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    if (this._line >= 0) this._t = 1 - this._t, this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; // proceed
	      default: {
	        if (this._t <= 0) {
	          this._context.lineTo(this._x, y);
	          this._context.lineTo(x, y);
	        } else {
	          var x1 = this._x * (1 - this._t) + x * this._t;
	          this._context.lineTo(x1, this._y);
	          this._context.lineTo(x1, y);
	        }
	        break;
	      }
	    }
	    this._x = x, this._y = y;
	  }
	};

	var step = function(context) {
	  return new Step(context, 0.5);
	};

	function stepBefore(context) {
	  return new Step(context, 0);
	}

	function stepAfter(context) {
	  return new Step(context, 1);
	}

	var slice$2 = Array.prototype.slice;

	var none = function(series, order) {
	  if (!((n = series.length) > 1)) return;
	  for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
	    s0 = s1, s1 = series[order[i]];
	    for (var j = 0; j < m; ++j) {
	      s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
	    }
	  }
	};

	var none$1 = function(series) {
	  var n = series.length, o = new Array(n);
	  while (--n >= 0) o[n] = n;
	  return o;
	};

	function stackValue(d, key) {
	  return d[key];
	}

	var stack = function() {
	  var keys = constant$2([]),
	      order = none$1,
	      offset = none,
	      value = stackValue;

	  function stack(data) {
	    var kz = keys.apply(this, arguments),
	        i,
	        m = data.length,
	        n = kz.length,
	        sz = new Array(n),
	        oz;

	    for (i = 0; i < n; ++i) {
	      for (var ki = kz[i], si = sz[i] = new Array(m), j = 0, sij; j < m; ++j) {
	        si[j] = sij = [0, +value(data[j], ki, j, data)];
	        sij.data = data[j];
	      }
	      si.key = ki;
	    }

	    for (i = 0, oz = order(sz); i < n; ++i) {
	      sz[oz[i]].index = i;
	    }

	    offset(sz, oz);
	    return sz;
	  }

	  stack.keys = function(_) {
	    return arguments.length ? (keys = typeof _ === "function" ? _ : constant$2(slice$2.call(_)), stack) : keys;
	  };

	  stack.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant$2(+_), stack) : value;
	  };

	  stack.order = function(_) {
	    return arguments.length ? (order = _ == null ? none$1 : typeof _ === "function" ? _ : constant$2(slice$2.call(_)), stack) : order;
	  };

	  stack.offset = function(_) {
	    return arguments.length ? (offset = _ == null ? none : _, stack) : offset;
	  };

	  return stack;
	};

	var expand = function(series, order) {
	  if (!((n = series.length) > 0)) return;
	  for (var i, n, j = 0, m = series[0].length, y; j < m; ++j) {
	    for (y = i = 0; i < n; ++i) y += series[i][j][1] || 0;
	    if (y) for (i = 0; i < n; ++i) series[i][j][1] /= y;
	  }
	  none(series, order);
	};

	var silhouette = function(series, order) {
	  if (!((n = series.length) > 0)) return;
	  for (var j = 0, s0 = series[order[0]], n, m = s0.length; j < m; ++j) {
	    for (var i = 0, y = 0; i < n; ++i) y += series[i][j][1] || 0;
	    s0[j][1] += s0[j][0] = -y / 2;
	  }
	  none(series, order);
	};

	var wiggle = function(series, order) {
	  if (!((n = series.length) > 0) || !((m = (s0 = series[order[0]]).length) > 0)) return;
	  for (var y = 0, j = 1, s0, m, n; j < m; ++j) {
	    for (var i = 0, s1 = 0, s2 = 0; i < n; ++i) {
	      var si = series[order[i]],
	          sij0 = si[j][1] || 0,
	          sij1 = si[j - 1][1] || 0,
	          s3 = (sij0 - sij1) / 2;
	      for (var k = 0; k < i; ++k) {
	        var sk = series[order[k]],
	            skj0 = sk[j][1] || 0,
	            skj1 = sk[j - 1][1] || 0;
	        s3 += skj0 - skj1;
	      }
	      s1 += sij0, s2 += s3 * sij0;
	    }
	    s0[j - 1][1] += s0[j - 1][0] = y;
	    if (s1) y -= s2 / s1;
	  }
	  s0[j - 1][1] += s0[j - 1][0] = y;
	  none(series, order);
	};

	var ascending$1 = function(series) {
	  var sums = series.map(sum$1);
	  return none$1(series).sort(function(a, b) { return sums[a] - sums[b]; });
	};

	function sum$1(series) {
	  var s = 0, i = -1, n = series.length, v;
	  while (++i < n) if (v = +series[i][1]) s += v;
	  return s;
	}

	var descending$2 = function(series) {
	  return ascending$1(series).reverse();
	};

	var insideOut = function(series) {
	  var n = series.length,
	      i,
	      j,
	      sums = series.map(sum$1),
	      order = none$1(series).sort(function(a, b) { return sums[b] - sums[a]; }),
	      top = 0,
	      bottom = 0,
	      tops = [],
	      bottoms = [];

	  for (i = 0; i < n; ++i) {
	    j = order[i];
	    if (top < bottom) {
	      top += sums[j];
	      tops.push(j);
	    } else {
	      bottom += sums[j];
	      bottoms.push(j);
	    }
	  }

	  return bottoms.reverse().concat(tops);
	};

	var reverse = function(series) {
	  return none$1(series).reverse();
	};

	var define = function(constructor, factory, prototype) {
	  constructor.prototype = factory.prototype = prototype;
	  prototype.constructor = constructor;
	};

	function extend(parent, definition) {
	  var prototype = Object.create(parent.prototype);
	  for (var key in definition) prototype[key] = definition[key];
	  return prototype;
	}

	function Color() {}

	var darker = 0.7;
	var brighter = 1 / darker;

	var reHex3 = /^#([0-9a-f]{3})$/;
	var reHex6 = /^#([0-9a-f]{6})$/;
	var reRgbInteger = /^rgb\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*\)$/;
	var reRgbPercent = /^rgb\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var reRgbaInteger = /^rgba\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;
	var reRgbaPercent = /^rgba\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;
	var reHslPercent = /^hsl\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var reHslaPercent = /^hsla\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)\s*\)$/;

	var named = {
	  aliceblue: 0xf0f8ff,
	  antiquewhite: 0xfaebd7,
	  aqua: 0x00ffff,
	  aquamarine: 0x7fffd4,
	  azure: 0xf0ffff,
	  beige: 0xf5f5dc,
	  bisque: 0xffe4c4,
	  black: 0x000000,
	  blanchedalmond: 0xffebcd,
	  blue: 0x0000ff,
	  blueviolet: 0x8a2be2,
	  brown: 0xa52a2a,
	  burlywood: 0xdeb887,
	  cadetblue: 0x5f9ea0,
	  chartreuse: 0x7fff00,
	  chocolate: 0xd2691e,
	  coral: 0xff7f50,
	  cornflowerblue: 0x6495ed,
	  cornsilk: 0xfff8dc,
	  crimson: 0xdc143c,
	  cyan: 0x00ffff,
	  darkblue: 0x00008b,
	  darkcyan: 0x008b8b,
	  darkgoldenrod: 0xb8860b,
	  darkgray: 0xa9a9a9,
	  darkgreen: 0x006400,
	  darkgrey: 0xa9a9a9,
	  darkkhaki: 0xbdb76b,
	  darkmagenta: 0x8b008b,
	  darkolivegreen: 0x556b2f,
	  darkorange: 0xff8c00,
	  darkorchid: 0x9932cc,
	  darkred: 0x8b0000,
	  darksalmon: 0xe9967a,
	  darkseagreen: 0x8fbc8f,
	  darkslateblue: 0x483d8b,
	  darkslategray: 0x2f4f4f,
	  darkslategrey: 0x2f4f4f,
	  darkturquoise: 0x00ced1,
	  darkviolet: 0x9400d3,
	  deeppink: 0xff1493,
	  deepskyblue: 0x00bfff,
	  dimgray: 0x696969,
	  dimgrey: 0x696969,
	  dodgerblue: 0x1e90ff,
	  firebrick: 0xb22222,
	  floralwhite: 0xfffaf0,
	  forestgreen: 0x228b22,
	  fuchsia: 0xff00ff,
	  gainsboro: 0xdcdcdc,
	  ghostwhite: 0xf8f8ff,
	  gold: 0xffd700,
	  goldenrod: 0xdaa520,
	  gray: 0x808080,
	  green: 0x008000,
	  greenyellow: 0xadff2f,
	  grey: 0x808080,
	  honeydew: 0xf0fff0,
	  hotpink: 0xff69b4,
	  indianred: 0xcd5c5c,
	  indigo: 0x4b0082,
	  ivory: 0xfffff0,
	  khaki: 0xf0e68c,
	  lavender: 0xe6e6fa,
	  lavenderblush: 0xfff0f5,
	  lawngreen: 0x7cfc00,
	  lemonchiffon: 0xfffacd,
	  lightblue: 0xadd8e6,
	  lightcoral: 0xf08080,
	  lightcyan: 0xe0ffff,
	  lightgoldenrodyellow: 0xfafad2,
	  lightgray: 0xd3d3d3,
	  lightgreen: 0x90ee90,
	  lightgrey: 0xd3d3d3,
	  lightpink: 0xffb6c1,
	  lightsalmon: 0xffa07a,
	  lightseagreen: 0x20b2aa,
	  lightskyblue: 0x87cefa,
	  lightslategray: 0x778899,
	  lightslategrey: 0x778899,
	  lightsteelblue: 0xb0c4de,
	  lightyellow: 0xffffe0,
	  lime: 0x00ff00,
	  limegreen: 0x32cd32,
	  linen: 0xfaf0e6,
	  magenta: 0xff00ff,
	  maroon: 0x800000,
	  mediumaquamarine: 0x66cdaa,
	  mediumblue: 0x0000cd,
	  mediumorchid: 0xba55d3,
	  mediumpurple: 0x9370db,
	  mediumseagreen: 0x3cb371,
	  mediumslateblue: 0x7b68ee,
	  mediumspringgreen: 0x00fa9a,
	  mediumturquoise: 0x48d1cc,
	  mediumvioletred: 0xc71585,
	  midnightblue: 0x191970,
	  mintcream: 0xf5fffa,
	  mistyrose: 0xffe4e1,
	  moccasin: 0xffe4b5,
	  navajowhite: 0xffdead,
	  navy: 0x000080,
	  oldlace: 0xfdf5e6,
	  olive: 0x808000,
	  olivedrab: 0x6b8e23,
	  orange: 0xffa500,
	  orangered: 0xff4500,
	  orchid: 0xda70d6,
	  palegoldenrod: 0xeee8aa,
	  palegreen: 0x98fb98,
	  paleturquoise: 0xafeeee,
	  palevioletred: 0xdb7093,
	  papayawhip: 0xffefd5,
	  peachpuff: 0xffdab9,
	  peru: 0xcd853f,
	  pink: 0xffc0cb,
	  plum: 0xdda0dd,
	  powderblue: 0xb0e0e6,
	  purple: 0x800080,
	  rebeccapurple: 0x663399,
	  red: 0xff0000,
	  rosybrown: 0xbc8f8f,
	  royalblue: 0x4169e1,
	  saddlebrown: 0x8b4513,
	  salmon: 0xfa8072,
	  sandybrown: 0xf4a460,
	  seagreen: 0x2e8b57,
	  seashell: 0xfff5ee,
	  sienna: 0xa0522d,
	  silver: 0xc0c0c0,
	  skyblue: 0x87ceeb,
	  slateblue: 0x6a5acd,
	  slategray: 0x708090,
	  slategrey: 0x708090,
	  snow: 0xfffafa,
	  springgreen: 0x00ff7f,
	  steelblue: 0x4682b4,
	  tan: 0xd2b48c,
	  teal: 0x008080,
	  thistle: 0xd8bfd8,
	  tomato: 0xff6347,
	  turquoise: 0x40e0d0,
	  violet: 0xee82ee,
	  wheat: 0xf5deb3,
	  white: 0xffffff,
	  whitesmoke: 0xf5f5f5,
	  yellow: 0xffff00,
	  yellowgreen: 0x9acd32
	};

	define(Color, color, {
	  displayable: function() {
	    return this.rgb().displayable();
	  },
	  toString: function() {
	    return this.rgb() + "";
	  }
	});

	function color(format) {
	  var m;
	  format = (format + "").trim().toLowerCase();
	  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
	      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
	      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
	      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
	      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
	      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
	      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
	      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
	      : named.hasOwnProperty(format) ? rgbn(named[format])
	      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
	      : null;
	}

	function rgbn(n) {
	  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
	}

	function rgba(r, g, b, a) {
	  if (a <= 0) r = g = b = NaN;
	  return new Rgb(r, g, b, a);
	}

	function rgbConvert(o) {
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Rgb;
	  o = o.rgb();
	  return new Rgb(o.r, o.g, o.b, o.opacity);
	}

	function rgb(r, g, b, opacity) {
	  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}

	function Rgb(r, g, b, opacity) {
	  this.r = +r;
	  this.g = +g;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Rgb, rgb, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  rgb: function() {
	    return this;
	  },
	  displayable: function() {
	    return (0 <= this.r && this.r <= 255)
	        && (0 <= this.g && this.g <= 255)
	        && (0 <= this.b && this.b <= 255)
	        && (0 <= this.opacity && this.opacity <= 1);
	  },
	  toString: function() {
	    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
	    return (a === 1 ? "rgb(" : "rgba(")
	        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
	        + (a === 1 ? ")" : ", " + a + ")");
	  }
	}));

	function hsla(h, s, l, a) {
	  if (a <= 0) h = s = l = NaN;
	  else if (l <= 0 || l >= 1) h = s = NaN;
	  else if (s <= 0) h = NaN;
	  return new Hsl(h, s, l, a);
	}

	function hslConvert(o) {
	  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Hsl;
	  if (o instanceof Hsl) return o;
	  o = o.rgb();
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      min = Math.min(r, g, b),
	      max = Math.max(r, g, b),
	      h = NaN,
	      s = max - min,
	      l = (max + min) / 2;
	  if (s) {
	    if (r === max) h = (g - b) / s + (g < b) * 6;
	    else if (g === max) h = (b - r) / s + 2;
	    else h = (r - g) / s + 4;
	    s /= l < 0.5 ? max + min : 2 - max - min;
	    h *= 60;
	  } else {
	    s = l > 0 && l < 1 ? 0 : h;
	  }
	  return new Hsl(h, s, l, o.opacity);
	}

	function hsl(h, s, l, opacity) {
	  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}

	function Hsl(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hsl, hsl, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = this.h % 360 + (this.h < 0) * 360,
	        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
	        l = this.l,
	        m2 = l + (l < 0.5 ? l : 1 - l) * s,
	        m1 = 2 * l - m2;
	    return new Rgb(
	      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
	      hsl2rgb(h, m1, m2),
	      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
	      this.opacity
	    );
	  },
	  displayable: function() {
	    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
	        && (0 <= this.l && this.l <= 1)
	        && (0 <= this.opacity && this.opacity <= 1);
	  }
	}));

	/* From FvD 13.37, CSS Color Module Level 3 */
	function hsl2rgb(h, m1, m2) {
	  return (h < 60 ? m1 + (m2 - m1) * h / 60
	      : h < 180 ? m2
	      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
	      : m1) * 255;
	}

	var deg2rad = Math.PI / 180;
	var rad2deg = 180 / Math.PI;

	var Kn = 18;
	var Xn = 0.950470;
	var Yn = 1;
	var Zn = 1.088830;
	var t0 = 4 / 29;
	var t1 = 6 / 29;
	var t2 = 3 * t1 * t1;
	var t3 = t1 * t1 * t1;

	function labConvert(o) {
	  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
	  if (o instanceof Hcl) {
	    var h = o.h * deg2rad;
	    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
	  }
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var b = rgb2xyz(o.r),
	      a = rgb2xyz(o.g),
	      l = rgb2xyz(o.b),
	      x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
	      y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
	      z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
	  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
	}

	function lab(l, a, b, opacity) {
	  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
	}

	function Lab(l, a, b, opacity) {
	  this.l = +l;
	  this.a = +a;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Lab, lab, extend(Color, {
	  brighter: function(k) {
	    return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  darker: function(k) {
	    return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  rgb: function() {
	    var y = (this.l + 16) / 116,
	        x = isNaN(this.a) ? y : y + this.a / 500,
	        z = isNaN(this.b) ? y : y - this.b / 200;
	    y = Yn * lab2xyz(y);
	    x = Xn * lab2xyz(x);
	    z = Zn * lab2xyz(z);
	    return new Rgb(
	      xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
	      xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
	      xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
	      this.opacity
	    );
	  }
	}));

	function xyz2lab(t) {
	  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
	}

	function lab2xyz(t) {
	  return t > t1 ? t * t * t : t2 * (t - t0);
	}

	function xyz2rgb(x) {
	  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2xyz(x) {
	  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hclConvert(o) {
	  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
	  if (!(o instanceof Lab)) o = labConvert(o);
	  var h = Math.atan2(o.b, o.a) * rad2deg;
	  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
	}

	function hcl(h, c, l, opacity) {
	  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
	}

	function Hcl(h, c, l, opacity) {
	  this.h = +h;
	  this.c = +c;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hcl, hcl, extend(Color, {
	  brighter: function(k) {
	    return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
	  },
	  darker: function(k) {
	    return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
	  },
	  rgb: function() {
	    return labConvert(this).rgb();
	  }
	}));

	var A = -0.14861;
	var B = +1.78277;
	var C = -0.29227;
	var D = -0.90649;
	var E = +1.97294;
	var ED = E * D;
	var EB = E * B;
	var BC_DA = B * C - D * A;

	function cubehelixConvert(o) {
	  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
	      bl = b - l,
	      k = (E * (g - l) - C * bl) / D,
	      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
	      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
	  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
	}

	function cubehelix(h, s, l, opacity) {
	  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
	}

	function Cubehelix(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Cubehelix, cubehelix, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
	        l = +this.l,
	        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
	        cosh = Math.cos(h),
	        sinh = Math.sin(h);
	    return new Rgb(
	      255 * (l + a * (A * cosh + B * sinh)),
	      255 * (l + a * (C * cosh + D * sinh)),
	      255 * (l + a * (E * cosh)),
	      this.opacity
	    );
	  }
	}));

	function basis$1(t1, v0, v1, v2, v3) {
	  var t2 = t1 * t1, t3 = t2 * t1;
	  return ((1 - 3 * t1 + 3 * t2 - t3) * v0
	      + (4 - 6 * t2 + 3 * t3) * v1
	      + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
	      + t3 * v3) / 6;
	}

	var basis$2 = function(values) {
	  var n = values.length - 1;
	  return function(t) {
	    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
	        v1 = values[i],
	        v2 = values[i + 1],
	        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
	        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
	    return basis$1((t - i / n) * n, v0, v1, v2, v3);
	  };
	};

	var basisClosed$1 = function(values) {
	  var n = values.length;
	  return function(t) {
	    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
	        v0 = values[(i + n - 1) % n],
	        v1 = values[i % n],
	        v2 = values[(i + 1) % n],
	        v3 = values[(i + 2) % n];
	    return basis$1((t - i / n) * n, v0, v1, v2, v3);
	  };
	};

	var constant$3 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function linear$1(a, d) {
	  return function(t) {
	    return a + t * d;
	  };
	}

	function exponential$1(a, b, y) {
	  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
	    return Math.pow(a + t * b, y);
	  };
	}

	function hue(a, b) {
	  var d = b - a;
	  return d ? linear$1(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$3(isNaN(a) ? b : a);
	}

	function gamma(y) {
	  return (y = +y) === 1 ? nogamma : function(a, b) {
	    return b - a ? exponential$1(a, b, y) : constant$3(isNaN(a) ? b : a);
	  };
	}

	function nogamma(a, b) {
	  var d = b - a;
	  return d ? linear$1(a, d) : constant$3(isNaN(a) ? b : a);
	}

	var interpolateRgb = (function rgbGamma(y) {
	  var color$$1 = gamma(y);

	  function rgb$$1(start, end) {
	    var r = color$$1((start = rgb(start)).r, (end = rgb(end)).r),
	        g = color$$1(start.g, end.g),
	        b = color$$1(start.b, end.b),
	        opacity = color$$1(start.opacity, end.opacity);
	    return function(t) {
	      start.r = r(t);
	      start.g = g(t);
	      start.b = b(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }

	  rgb$$1.gamma = rgbGamma;

	  return rgb$$1;
	})(1);

	function rgbSpline(spline) {
	  return function(colors) {
	    var n = colors.length,
	        r = new Array(n),
	        g = new Array(n),
	        b = new Array(n),
	        i, color$$1;
	    for (i = 0; i < n; ++i) {
	      color$$1 = rgb(colors[i]);
	      r[i] = color$$1.r || 0;
	      g[i] = color$$1.g || 0;
	      b[i] = color$$1.b || 0;
	    }
	    r = spline(r);
	    g = spline(g);
	    b = spline(b);
	    color$$1.opacity = 1;
	    return function(t) {
	      color$$1.r = r(t);
	      color$$1.g = g(t);
	      color$$1.b = b(t);
	      return color$$1 + "";
	    };
	  };
	}

	var rgbBasis = rgbSpline(basis$2);
	var rgbBasisClosed = rgbSpline(basisClosed$1);

	var array$1 = function(a, b) {
	  var nb = b ? b.length : 0,
	      na = a ? Math.min(nb, a.length) : 0,
	      x = new Array(nb),
	      c = new Array(nb),
	      i;

	  for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
	  for (; i < nb; ++i) c[i] = b[i];

	  return function(t) {
	    for (i = 0; i < na; ++i) c[i] = x[i](t);
	    return c;
	  };
	};

	var date = function(a, b) {
	  var d = new Date;
	  return a = +a, b -= a, function(t) {
	    return d.setTime(a + b * t), d;
	  };
	};

	var interpolateNumber = function(a, b) {
	  return a = +a, b -= a, function(t) {
	    return a + b * t;
	  };
	};

	var object = function(a, b) {
	  var i = {},
	      c = {},
	      k;

	  if (a === null || typeof a !== "object") a = {};
	  if (b === null || typeof b !== "object") b = {};

	  for (k in b) {
	    if (k in a) {
	      i[k] = interpolate(a[k], b[k]);
	    } else {
	      c[k] = b[k];
	    }
	  }

	  return function(t) {
	    for (k in i) c[k] = i[k](t);
	    return c;
	  };
	};

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
	var reB = new RegExp(reA.source, "g");

	function zero(b) {
	  return function() {
	    return b;
	  };
	}

	function one(b) {
	  return function(t) {
	    return b(t) + "";
	  };
	}

	var interpolateString = function(a, b) {
	  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
	      am, // current match in a
	      bm, // current match in b
	      bs, // string preceding current number in b, if any
	      i = -1, // index in s
	      s = [], // string constants and placeholders
	      q = []; // number interpolators

	  // Coerce inputs to strings.
	  a = a + "", b = b + "";

	  // Interpolate pairs of numbers in a & b.
	  while ((am = reA.exec(a))
	      && (bm = reB.exec(b))) {
	    if ((bs = bm.index) > bi) { // a string precedes the next number in b
	      bs = b.slice(bi, bs);
	      if (s[i]) s[i] += bs; // coalesce with previous string
	      else s[++i] = bs;
	    }
	    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
	      if (s[i]) s[i] += bm; // coalesce with previous string
	      else s[++i] = bm;
	    } else { // interpolate non-matching numbers
	      s[++i] = null;
	      q.push({i: i, x: interpolateNumber(am, bm)});
	    }
	    bi = reB.lastIndex;
	  }

	  // Add remains of b.
	  if (bi < b.length) {
	    bs = b.slice(bi);
	    if (s[i]) s[i] += bs; // coalesce with previous string
	    else s[++i] = bs;
	  }

	  // Special optimization for only a single match.
	  // Otherwise, interpolate each of the numbers and rejoin the string.
	  return s.length < 2 ? (q[0]
	      ? one(q[0].x)
	      : zero(b))
	      : (b = q.length, function(t) {
	          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
	          return s.join("");
	        });
	};

	var interpolate = function(a, b) {
	  var t = typeof b, c;
	  return b == null || t === "boolean" ? constant$3(b)
	      : (t === "number" ? interpolateNumber
	      : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
	      : b instanceof color ? interpolateRgb
	      : b instanceof Date ? date
	      : Array.isArray(b) ? array$1
	      : isNaN(b) ? object
	      : interpolateNumber)(a, b);
	};

	var interpolateRound = function(a, b) {
	  return a = +a, b -= a, function(t) {
	    return Math.round(a + b * t);
	  };
	};

	var degrees = 180 / Math.PI;

	var identity$2 = {
	  translateX: 0,
	  translateY: 0,
	  rotate: 0,
	  skewX: 0,
	  scaleX: 1,
	  scaleY: 1
	};

	var decompose = function(a, b, c, d, e, f) {
	  var scaleX, scaleY, skewX;
	  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
	  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
	  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
	  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
	  return {
	    translateX: e,
	    translateY: f,
	    rotate: Math.atan2(b, a) * degrees,
	    skewX: Math.atan(skewX) * degrees,
	    scaleX: scaleX,
	    scaleY: scaleY
	  };
	};

	var cssNode;
	var cssRoot;
	var cssView;
	var svgNode;

	function parseCss(value) {
	  if (value === "none") return identity$2;
	  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
	  cssNode.style.transform = value;
	  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
	  cssRoot.removeChild(cssNode);
	  value = value.slice(7, -1).split(",");
	  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
	}

	function parseSvg(value) {
	  if (value == null) return identity$2;
	  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
	  svgNode.setAttribute("transform", value);
	  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$2;
	  value = value.matrix;
	  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
	}

	function interpolateTransform(parse, pxComma, pxParen, degParen) {

	  function pop(s) {
	    return s.length ? s.pop() + " " : "";
	  }

	  function translate(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push("translate(", null, pxComma, null, pxParen);
	      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
	    } else if (xb || yb) {
	      s.push("translate(" + xb + pxComma + yb + pxParen);
	    }
	  }

	  function rotate(a, b, s, q) {
	    if (a !== b) {
	      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
	      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "rotate(" + b + degParen);
	    }
	  }

	  function skewX(a, b, s, q) {
	    if (a !== b) {
	      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "skewX(" + b + degParen);
	    }
	  }

	  function scale(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
	      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
	    } else if (xb !== 1 || yb !== 1) {
	      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
	    }
	  }

	  return function(a, b) {
	    var s = [], // string constants and placeholders
	        q = []; // number interpolators
	    a = parse(a), b = parse(b);
	    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
	    rotate(a.rotate, b.rotate, s, q);
	    skewX(a.skewX, b.skewX, s, q);
	    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
	    a = b = null; // gc
	    return function(t) {
	      var i = -1, n = q.length, o;
	      while (++i < n) s[(o = q[i]).i] = o.x(t);
	      return s.join("");
	    };
	  };
	}

	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

	var rho = Math.SQRT2;
	var rho2 = 2;
	var rho4 = 4;
	var epsilon2 = 1e-12;

	function cosh(x) {
	  return ((x = Math.exp(x)) + 1 / x) / 2;
	}

	function sinh(x) {
	  return ((x = Math.exp(x)) - 1 / x) / 2;
	}

	function tanh(x) {
	  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
	}

	// p0 = [ux0, uy0, w0]
	// p1 = [ux1, uy1, w1]
	var interpolateZoom = function(p0, p1) {
	  var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
	      ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
	      dx = ux1 - ux0,
	      dy = uy1 - uy0,
	      d2 = dx * dx + dy * dy,
	      i,
	      S;

	  // Special case for u0 ≅ u1.
	  if (d2 < epsilon2) {
	    S = Math.log(w1 / w0) / rho;
	    i = function(t) {
	      return [
	        ux0 + t * dx,
	        uy0 + t * dy,
	        w0 * Math.exp(rho * t * S)
	      ];
	    };
	  }

	  // General case.
	  else {
	    var d1 = Math.sqrt(d2),
	        b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
	        b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
	        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
	        r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	    S = (r1 - r0) / rho;
	    i = function(t) {
	      var s = t * S,
	          coshr0 = cosh(r0),
	          u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
	      return [
	        ux0 + u * dx,
	        uy0 + u * dy,
	        w0 * coshr0 / cosh(rho * s + r0)
	      ];
	    };
	  }

	  i.duration = S * 1000;

	  return i;
	};

	function hsl$1(hue$$1) {
	  return function(start, end) {
	    var h = hue$$1((start = hsl(start)).h, (end = hsl(end)).h),
	        s = nogamma(start.s, end.s),
	        l = nogamma(start.l, end.l),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.h = h(t);
	      start.s = s(t);
	      start.l = l(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }
	}

	var hsl$2 = hsl$1(hue);
	var hslLong = hsl$1(nogamma);

	function lab$1(start, end) {
	  var l = nogamma((start = lab(start)).l, (end = lab(end)).l),
	      a = nogamma(start.a, end.a),
	      b = nogamma(start.b, end.b),
	      opacity = nogamma(start.opacity, end.opacity);
	  return function(t) {
	    start.l = l(t);
	    start.a = a(t);
	    start.b = b(t);
	    start.opacity = opacity(t);
	    return start + "";
	  };
	}

	function hcl$1(hue$$1) {
	  return function(start, end) {
	    var h = hue$$1((start = hcl(start)).h, (end = hcl(end)).h),
	        c = nogamma(start.c, end.c),
	        l = nogamma(start.l, end.l),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.h = h(t);
	      start.c = c(t);
	      start.l = l(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }
	}

	var hcl$2 = hcl$1(hue);
	var hclLong = hcl$1(nogamma);

	function cubehelix$1(hue$$1) {
	  return (function cubehelixGamma(y) {
	    y = +y;

	    function cubehelix$$1(start, end) {
	      var h = hue$$1((start = cubehelix(start)).h, (end = cubehelix(end)).h),
	          s = nogamma(start.s, end.s),
	          l = nogamma(start.l, end.l),
	          opacity = nogamma(start.opacity, end.opacity);
	      return function(t) {
	        start.h = h(t);
	        start.s = s(t);
	        start.l = l(Math.pow(t, y));
	        start.opacity = opacity(t);
	        return start + "";
	      };
	    }

	    cubehelix$$1.gamma = cubehelixGamma;

	    return cubehelix$$1;
	  })(1);
	}

	var cubehelix$2 = cubehelix$1(hue);
	var cubehelixLong = cubehelix$1(nogamma);

	var quantize = function(interpolator, n) {
	  var samples = new Array(n);
	  for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
	  return samples;
	};

	var noop$1 = {value: function() {}};

	function dispatch() {
	  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
	    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
	    _[t] = [];
	  }
	  return new Dispatch(_);
	}

	function Dispatch(_) {
	  this._ = _;
	}

	function parseTypenames(typenames, types) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
	    return {type: t, name: name};
	  });
	}

	Dispatch.prototype = dispatch.prototype = {
	  constructor: Dispatch,
	  on: function(typename, callback) {
	    var _ = this._,
	        T = parseTypenames(typename + "", _),
	        t,
	        i = -1,
	        n = T.length;

	    // If no callback was specified, return the callback of the given type and name.
	    if (arguments.length < 2) {
	      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
	      return;
	    }

	    // If a type was specified, set the callback for the given type and name.
	    // Otherwise, if a null callback was specified, remove callbacks of the given name.
	    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    while (++i < n) {
	      if (t = (typename = T[i]).type) _[t] = set$2(_[t], typename.name, callback);
	      else if (callback == null) for (t in _) _[t] = set$2(_[t], typename.name, null);
	    }

	    return this;
	  },
	  copy: function() {
	    var copy = {}, _ = this._;
	    for (var t in _) copy[t] = _[t].slice();
	    return new Dispatch(copy);
	  },
	  call: function(type, that) {
	    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  },
	  apply: function(type, that, args) {
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  }
	};

	function get(type, name) {
	  for (var i = 0, n = type.length, c; i < n; ++i) {
	    if ((c = type[i]).name === name) {
	      return c.value;
	    }
	  }
	}

	function set$2(type, name, callback) {
	  for (var i = 0, n = type.length; i < n; ++i) {
	    if (type[i].name === name) {
	      type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
	      break;
	    }
	  }
	  if (callback != null) type.push({name: name, value: callback});
	  return type;
	}

	function objectConverter(columns) {
	  return new Function("d", "return {" + columns.map(function(name, i) {
	    return JSON.stringify(name) + ": d[" + i + "]";
	  }).join(",") + "}");
	}

	function customConverter(columns, f) {
	  var object = objectConverter(columns);
	  return function(row, i) {
	    return f(object(row), i, columns);
	  };
	}

	// Compute unique columns in order of discovery.
	function inferColumns(rows) {
	  var columnSet = Object.create(null),
	      columns = [];

	  rows.forEach(function(row) {
	    for (var column in row) {
	      if (!(column in columnSet)) {
	        columns.push(columnSet[column] = column);
	      }
	    }
	  });

	  return columns;
	}

	var dsv = function(delimiter) {
	  var reFormat = new RegExp("[\"" + delimiter + "\n]"),
	      delimiterCode = delimiter.charCodeAt(0);

	  function parse(text, f) {
	    var convert, columns, rows = parseRows(text, function(row, i) {
	      if (convert) return convert(row, i - 1);
	      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
	    });
	    rows.columns = columns;
	    return rows;
	  }

	  function parseRows(text, f) {
	    var EOL = {}, // sentinel value for end-of-line
	        EOF = {}, // sentinel value for end-of-file
	        rows = [], // output rows
	        N = text.length,
	        I = 0, // current character index
	        n = 0, // the current line number
	        t, // the current token
	        eol; // is the current token followed by EOL?

	    function token() {
	      if (I >= N) return EOF; // special case: end of file
	      if (eol) return eol = false, EOL; // special case: end of line

	      // special case: quotes
	      var j = I, c;
	      if (text.charCodeAt(j) === 34) {
	        var i = j;
	        while (i++ < N) {
	          if (text.charCodeAt(i) === 34) {
	            if (text.charCodeAt(i + 1) !== 34) break;
	            ++i;
	          }
	        }
	        I = i + 2;
	        c = text.charCodeAt(i + 1);
	        if (c === 13) {
	          eol = true;
	          if (text.charCodeAt(i + 2) === 10) ++I;
	        } else if (c === 10) {
	          eol = true;
	        }
	        return text.slice(j + 1, i).replace(/""/g, "\"");
	      }

	      // common case: find next delimiter or newline
	      while (I < N) {
	        var k = 1;
	        c = text.charCodeAt(I++);
	        if (c === 10) eol = true; // \n
	        else if (c === 13) { eol = true; if (text.charCodeAt(I) === 10) ++I, ++k; } // \r|\r\n
	        else if (c !== delimiterCode) continue;
	        return text.slice(j, I - k);
	      }

	      // special case: last token before EOF
	      return text.slice(j);
	    }

	    while ((t = token()) !== EOF) {
	      var a = [];
	      while (t !== EOL && t !== EOF) {
	        a.push(t);
	        t = token();
	      }
	      if (f && (a = f(a, n++)) == null) continue;
	      rows.push(a);
	    }

	    return rows;
	  }

	  function format(rows, columns) {
	    if (columns == null) columns = inferColumns(rows);
	    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
	      return columns.map(function(column) {
	        return formatValue(row[column]);
	      }).join(delimiter);
	    })).join("\n");
	  }

	  function formatRows(rows) {
	    return rows.map(formatRow).join("\n");
	  }

	  function formatRow(row) {
	    return row.map(formatValue).join(delimiter);
	  }

	  function formatValue(text) {
	    return text == null ? ""
	        : reFormat.test(text += "") ? "\"" + text.replace(/\"/g, "\"\"") + "\""
	        : text;
	  }

	  return {
	    parse: parse,
	    parseRows: parseRows,
	    format: format,
	    formatRows: formatRows
	  };
	};

	var csv = dsv(",");

	var csvParse = csv.parse;
	var csvParseRows = csv.parseRows;
	var csvFormat = csv.format;
	var csvFormatRows = csv.formatRows;

	var tsv = dsv("\t");

	var tsvParse = tsv.parse;
	var tsvParseRows = tsv.parseRows;
	var tsvFormat = tsv.format;
	var tsvFormatRows = tsv.formatRows;

	var request = function(url, callback) {
	  var request,
	      event = dispatch("beforesend", "progress", "load", "error"),
	      mimeType,
	      headers = map$1(),
	      xhr = new XMLHttpRequest,
	      user = null,
	      password = null,
	      response,
	      responseType,
	      timeout = 0;

	  // If IE does not support CORS, use XDomainRequest.
	  if (typeof XDomainRequest !== "undefined"
	      && !("withCredentials" in xhr)
	      && /^(http(s)?:)?\/\//.test(url)) xhr = new XDomainRequest;

	  "onload" in xhr
	      ? xhr.onload = xhr.onerror = xhr.ontimeout = respond
	      : xhr.onreadystatechange = function(o) { xhr.readyState > 3 && respond(o); };

	  function respond(o) {
	    var status = xhr.status, result;
	    if (!status && hasResponse(xhr)
	        || status >= 200 && status < 300
	        || status === 304) {
	      if (response) {
	        try {
	          result = response.call(request, xhr);
	        } catch (e) {
	          event.call("error", request, e);
	          return;
	        }
	      } else {
	        result = xhr;
	      }
	      event.call("load", request, result);
	    } else {
	      event.call("error", request, o);
	    }
	  }

	  xhr.onprogress = function(e) {
	    event.call("progress", request, e);
	  };

	  request = {
	    header: function(name, value) {
	      name = (name + "").toLowerCase();
	      if (arguments.length < 2) return headers.get(name);
	      if (value == null) headers.remove(name);
	      else headers.set(name, value + "");
	      return request;
	    },

	    // If mimeType is non-null and no Accept header is set, a default is used.
	    mimeType: function(value) {
	      if (!arguments.length) return mimeType;
	      mimeType = value == null ? null : value + "";
	      return request;
	    },

	    // Specifies what type the response value should take;
	    // for instance, arraybuffer, blob, document, or text.
	    responseType: function(value) {
	      if (!arguments.length) return responseType;
	      responseType = value;
	      return request;
	    },

	    timeout: function(value) {
	      if (!arguments.length) return timeout;
	      timeout = +value;
	      return request;
	    },

	    user: function(value) {
	      return arguments.length < 1 ? user : (user = value == null ? null : value + "", request);
	    },

	    password: function(value) {
	      return arguments.length < 1 ? password : (password = value == null ? null : value + "", request);
	    },

	    // Specify how to convert the response content to a specific type;
	    // changes the callback value on "load" events.
	    response: function(value) {
	      response = value;
	      return request;
	    },

	    // Alias for send("GET", …).
	    get: function(data, callback) {
	      return request.send("GET", data, callback);
	    },

	    // Alias for send("POST", …).
	    post: function(data, callback) {
	      return request.send("POST", data, callback);
	    },

	    // If callback is non-null, it will be used for error and load events.
	    send: function(method, data, callback) {
	      xhr.open(method, url, true, user, password);
	      if (mimeType != null && !headers.has("accept")) headers.set("accept", mimeType + ",*/*");
	      if (xhr.setRequestHeader) headers.each(function(value, name) { xhr.setRequestHeader(name, value); });
	      if (mimeType != null && xhr.overrideMimeType) xhr.overrideMimeType(mimeType);
	      if (responseType != null) xhr.responseType = responseType;
	      if (timeout > 0) xhr.timeout = timeout;
	      if (callback == null && typeof data === "function") callback = data, data = null;
	      if (callback != null && callback.length === 1) callback = fixCallback(callback);
	      if (callback != null) request.on("error", callback).on("load", function(xhr) { callback(null, xhr); });
	      event.call("beforesend", request, xhr);
	      xhr.send(data == null ? null : data);
	      return request;
	    },

	    abort: function() {
	      xhr.abort();
	      return request;
	    },

	    on: function() {
	      var value = event.on.apply(event, arguments);
	      return value === event ? request : value;
	    }
	  };

	  if (callback != null) {
	    if (typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    return request.get(callback);
	  }

	  return request;
	};

	function fixCallback(callback) {
	  return function(error, xhr) {
	    callback(error == null ? xhr : null);
	  };
	}

	function hasResponse(xhr) {
	  var type = xhr.responseType;
	  return type && type !== "text"
	      ? xhr.response // null on error
	      : xhr.responseText; // "" on error
	}

	var type = function(defaultMimeType, response) {
	  return function(url, callback) {
	    var r = request(url).mimeType(defaultMimeType).response(response);
	    if (callback != null) {
	      if (typeof callback !== "function") throw new Error("invalid callback: " + callback);
	      return r.get(callback);
	    }
	    return r;
	  };
	};

	var html = type("text/html", function(xhr) {
	  return document.createRange().createContextualFragment(xhr.responseText);
	});

	var json = type("application/json", function(xhr) {
	  return JSON.parse(xhr.responseText);
	});

	var text = type("text/plain", function(xhr) {
	  return xhr.responseText;
	});

	var xml = type("application/xml", function(xhr) {
	  var xml = xhr.responseXML;
	  if (!xml) throw new Error("parse error");
	  return xml;
	});

	var dsv$1 = function(defaultMimeType, parse) {
	  return function(url, row, callback) {
	    if (arguments.length < 3) callback = row, row = null;
	    var r = request(url).mimeType(defaultMimeType);
	    r.row = function(_) { return arguments.length ? r.response(responseOf(parse, row = _)) : row; };
	    r.row(row);
	    return callback ? r.get(callback) : r;
	  };
	};

	function responseOf(parse, row) {
	  return function(request$$1) {
	    return parse(request$$1.responseText, row);
	  };
	}

	var csv$1 = dsv$1("text/csv", csvParse);

	var tsv$1 = dsv$1("text/tab-separated-values", tsvParse);

	var frame = 0;
	var timeout = 0;
	var interval = 0;
	var pokeDelay = 1000;
	var taskHead;
	var taskTail;
	var clockLast = 0;
	var clockNow = 0;
	var clockSkew = 0;
	var clock = typeof performance === "object" && performance.now ? performance : Date;
	var setFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function(f) { setTimeout(f, 17); };

	function now() {
	  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}

	function clearNow() {
	  clockNow = 0;
	}

	function Timer() {
	  this._call =
	  this._time =
	  this._next = null;
	}

	Timer.prototype = timer.prototype = {
	  constructor: Timer,
	  restart: function(callback, delay, time) {
	    if (typeof callback !== "function") throw new TypeError("callback is not a function");
	    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
	    if (!this._next && taskTail !== this) {
	      if (taskTail) taskTail._next = this;
	      else taskHead = this;
	      taskTail = this;
	    }
	    this._call = callback;
	    this._time = time;
	    sleep();
	  },
	  stop: function() {
	    if (this._call) {
	      this._call = null;
	      this._time = Infinity;
	      sleep();
	    }
	  }
	};

	function timer(callback, delay, time) {
	  var t = new Timer;
	  t.restart(callback, delay, time);
	  return t;
	}

	function timerFlush() {
	  now(); // Get the current time, if not already set.
	  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
	  var t = taskHead, e;
	  while (t) {
	    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
	    t = t._next;
	  }
	  --frame;
	}

	function wake() {
	  clockNow = (clockLast = clock.now()) + clockSkew;
	  frame = timeout = 0;
	  try {
	    timerFlush();
	  } finally {
	    frame = 0;
	    nap();
	    clockNow = 0;
	  }
	}

	function poke$1() {
	  var now = clock.now(), delay = now - clockLast;
	  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}

	function nap() {
	  var t0, t1 = taskHead, t2, time = Infinity;
	  while (t1) {
	    if (t1._call) {
	      if (time > t1._time) time = t1._time;
	      t0 = t1, t1 = t1._next;
	    } else {
	      t2 = t1._next, t1._next = null;
	      t1 = t0 ? t0._next = t2 : taskHead = t2;
	    }
	  }
	  taskTail = t0;
	  sleep(time);
	}

	function sleep(time) {
	  if (frame) return; // Soonest alarm already set, or will be.
	  if (timeout) timeout = clearTimeout(timeout);
	  var delay = time - clockNow;
	  if (delay > 24) {
	    if (time < Infinity) timeout = setTimeout(wake, delay);
	    if (interval) interval = clearInterval(interval);
	  } else {
	    if (!interval) interval = setInterval(poke$1, pokeDelay);
	    frame = 1, setFrame(wake);
	  }
	}

	var timeout$1 = function(callback, delay, time) {
	  var t = new Timer;
	  delay = delay == null ? 0 : +delay;
	  t.restart(function(elapsed) {
	    t.stop();
	    callback(elapsed + delay);
	  }, delay, time);
	  return t;
	};

	var interval$1 = function(callback, delay, time) {
	  var t = new Timer, total = delay;
	  if (delay == null) return t.restart(callback, delay, time), t;
	  delay = +delay, time = time == null ? now() : +time;
	  t.restart(function tick(elapsed) {
	    elapsed += total;
	    t.restart(tick, total += delay, time);
	    callback(elapsed);
	  }, delay, time);
	  return t;
	};

	var t0$1 = new Date;
	var t1$1 = new Date;

	function newInterval(floori, offseti, count, field) {

	  function interval(date) {
	    return floori(date = new Date(+date)), date;
	  }

	  interval.floor = interval;

	  interval.ceil = function(date) {
	    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
	  };

	  interval.round = function(date) {
	    var d0 = interval(date),
	        d1 = interval.ceil(date);
	    return date - d0 < d1 - date ? d0 : d1;
	  };

	  interval.offset = function(date, step) {
	    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
	  };

	  interval.range = function(start, stop, step) {
	    var range = [];
	    start = interval.ceil(start);
	    step = step == null ? 1 : Math.floor(step);
	    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
	    do range.push(new Date(+start)); while (offseti(start, step), floori(start), start < stop)
	    return range;
	  };

	  interval.filter = function(test) {
	    return newInterval(function(date) {
	      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
	    }, function(date, step) {
	      if (date >= date) while (--step >= 0) while (offseti(date, 1), !test(date)) {} // eslint-disable-line no-empty
	    });
	  };

	  if (count) {
	    interval.count = function(start, end) {
	      t0$1.setTime(+start), t1$1.setTime(+end);
	      floori(t0$1), floori(t1$1);
	      return Math.floor(count(t0$1, t1$1));
	    };

	    interval.every = function(step) {
	      step = Math.floor(step);
	      return !isFinite(step) || !(step > 0) ? null
	          : !(step > 1) ? interval
	          : interval.filter(field
	              ? function(d) { return field(d) % step === 0; }
	              : function(d) { return interval.count(0, d) % step === 0; });
	    };
	  }

	  return interval;
	}

	var millisecond = newInterval(function() {
	  // noop
	}, function(date, step) {
	  date.setTime(+date + step);
	}, function(start, end) {
	  return end - start;
	});

	// An optimized implementation for this simple case.
	millisecond.every = function(k) {
	  k = Math.floor(k);
	  if (!isFinite(k) || !(k > 0)) return null;
	  if (!(k > 1)) return millisecond;
	  return newInterval(function(date) {
	    date.setTime(Math.floor(date / k) * k);
	  }, function(date, step) {
	    date.setTime(+date + step * k);
	  }, function(start, end) {
	    return (end - start) / k;
	  });
	};

	var milliseconds = millisecond.range;

	var durationSecond = 1e3;
	var durationMinute = 6e4;
	var durationHour = 36e5;
	var durationDay = 864e5;
	var durationWeek = 6048e5;

	var second = newInterval(function(date) {
	  date.setTime(Math.floor(date / durationSecond) * durationSecond);
	}, function(date, step) {
	  date.setTime(+date + step * durationSecond);
	}, function(start, end) {
	  return (end - start) / durationSecond;
	}, function(date) {
	  return date.getUTCSeconds();
	});

	var seconds = second.range;

	var minute = newInterval(function(date) {
	  date.setTime(Math.floor(date / durationMinute) * durationMinute);
	}, function(date, step) {
	  date.setTime(+date + step * durationMinute);
	}, function(start, end) {
	  return (end - start) / durationMinute;
	}, function(date) {
	  return date.getMinutes();
	});

	var minutes = minute.range;

	var hour = newInterval(function(date) {
	  var offset = date.getTimezoneOffset() * durationMinute % durationHour;
	  if (offset < 0) offset += durationHour;
	  date.setTime(Math.floor((+date - offset) / durationHour) * durationHour + offset);
	}, function(date, step) {
	  date.setTime(+date + step * durationHour);
	}, function(start, end) {
	  return (end - start) / durationHour;
	}, function(date) {
	  return date.getHours();
	});

	var hours = hour.range;

	var day = newInterval(function(date) {
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setDate(date.getDate() + step);
	}, function(start, end) {
	  return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
	}, function(date) {
	  return date.getDate() - 1;
	});

	var days = day.range;

	function weekday(i) {
	  return newInterval(function(date) {
	    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
	    date.setHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setDate(date.getDate() + step * 7);
	  }, function(start, end) {
	    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
	  });
	}

	var sunday = weekday(0);
	var monday = weekday(1);
	var tuesday = weekday(2);
	var wednesday = weekday(3);
	var thursday = weekday(4);
	var friday = weekday(5);
	var saturday = weekday(6);

	var sundays = sunday.range;
	var mondays = monday.range;
	var tuesdays = tuesday.range;
	var wednesdays = wednesday.range;
	var thursdays = thursday.range;
	var fridays = friday.range;
	var saturdays = saturday.range;

	var month = newInterval(function(date) {
	  date.setDate(1);
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setMonth(date.getMonth() + step);
	}, function(start, end) {
	  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
	}, function(date) {
	  return date.getMonth();
	});

	var months = month.range;

	var year = newInterval(function(date) {
	  date.setMonth(0, 1);
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setFullYear(date.getFullYear() + step);
	}, function(start, end) {
	  return end.getFullYear() - start.getFullYear();
	}, function(date) {
	  return date.getFullYear();
	});

	// An optimized implementation for this simple case.
	year.every = function(k) {
	  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
	    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
	    date.setMonth(0, 1);
	    date.setHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setFullYear(date.getFullYear() + step * k);
	  });
	};

	var years = year.range;

	var utcMinute = newInterval(function(date) {
	  date.setUTCSeconds(0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * durationMinute);
	}, function(start, end) {
	  return (end - start) / durationMinute;
	}, function(date) {
	  return date.getUTCMinutes();
	});

	var utcMinutes = utcMinute.range;

	var utcHour = newInterval(function(date) {
	  date.setUTCMinutes(0, 0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * durationHour);
	}, function(start, end) {
	  return (end - start) / durationHour;
	}, function(date) {
	  return date.getUTCHours();
	});

	var utcHours = utcHour.range;

	var utcDay = newInterval(function(date) {
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCDate(date.getUTCDate() + step);
	}, function(start, end) {
	  return (end - start) / durationDay;
	}, function(date) {
	  return date.getUTCDate() - 1;
	});

	var utcDays = utcDay.range;

	function utcWeekday(i) {
	  return newInterval(function(date) {
	    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
	    date.setUTCHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setUTCDate(date.getUTCDate() + step * 7);
	  }, function(start, end) {
	    return (end - start) / durationWeek;
	  });
	}

	var utcSunday = utcWeekday(0);
	var utcMonday = utcWeekday(1);
	var utcTuesday = utcWeekday(2);
	var utcWednesday = utcWeekday(3);
	var utcThursday = utcWeekday(4);
	var utcFriday = utcWeekday(5);
	var utcSaturday = utcWeekday(6);

	var utcSundays = utcSunday.range;
	var utcMondays = utcMonday.range;
	var utcTuesdays = utcTuesday.range;
	var utcWednesdays = utcWednesday.range;
	var utcThursdays = utcThursday.range;
	var utcFridays = utcFriday.range;
	var utcSaturdays = utcSaturday.range;

	var utcMonth = newInterval(function(date) {
	  date.setUTCDate(1);
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCMonth(date.getUTCMonth() + step);
	}, function(start, end) {
	  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
	}, function(date) {
	  return date.getUTCMonth();
	});

	var utcMonths = utcMonth.range;

	var utcYear = newInterval(function(date) {
	  date.setUTCMonth(0, 1);
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCFullYear(date.getUTCFullYear() + step);
	}, function(start, end) {
	  return end.getUTCFullYear() - start.getUTCFullYear();
	}, function(date) {
	  return date.getUTCFullYear();
	});

	// An optimized implementation for this simple case.
	utcYear.every = function(k) {
	  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
	    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
	    date.setUTCMonth(0, 1);
	    date.setUTCHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setUTCFullYear(date.getUTCFullYear() + step * k);
	  });
	};

	var utcYears = utcYear.range;

	// Computes the decimal coefficient and exponent of the specified number x with
	// significant digits p, where x is positive and p is in [1, 21] or undefined.
	// For example, formatDecimal(1.23) returns ["123", 0].
	var formatDecimal = function(x, p) {
	  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
	  var i, coefficient = x.slice(0, i);

	  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
	  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
	  return [
	    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
	    +x.slice(i + 1)
	  ];
	};

	var exponent$1 = function(x) {
	  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
	};

	var formatGroup = function(grouping, thousands) {
	  return function(value, width) {
	    var i = value.length,
	        t = [],
	        j = 0,
	        g = grouping[0],
	        length = 0;

	    while (i > 0 && g > 0) {
	      if (length + g + 1 > width) g = Math.max(1, width - length);
	      t.push(value.substring(i -= g, i + g));
	      if ((length += g + 1) > width) break;
	      g = grouping[j = (j + 1) % grouping.length];
	    }

	    return t.reverse().join(thousands);
	  };
	};

	var formatDefault = function(x, p) {
	  x = x.toPrecision(p);

	  out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
	    switch (x[i]) {
	      case ".": i0 = i1 = i; break;
	      case "0": if (i0 === 0) i0 = i; i1 = i; break;
	      case "e": break out;
	      default: if (i0 > 0) i0 = 0; break;
	    }
	  }

	  return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
	};

	var prefixExponent;

	var formatPrefixAuto = function(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1],
	      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
	      n = coefficient.length;
	  return i === n ? coefficient
	      : i > n ? coefficient + new Array(i - n + 1).join("0")
	      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
	      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
	};

	var formatRounded = function(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1];
	  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
	      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
	      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
	};

	var formatTypes = {
	  "": formatDefault,
	  "%": function(x, p) { return (x * 100).toFixed(p); },
	  "b": function(x) { return Math.round(x).toString(2); },
	  "c": function(x) { return x + ""; },
	  "d": function(x) { return Math.round(x).toString(10); },
	  "e": function(x, p) { return x.toExponential(p); },
	  "f": function(x, p) { return x.toFixed(p); },
	  "g": function(x, p) { return x.toPrecision(p); },
	  "o": function(x) { return Math.round(x).toString(8); },
	  "p": function(x, p) { return formatRounded(x * 100, p); },
	  "r": formatRounded,
	  "s": formatPrefixAuto,
	  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
	  "x": function(x) { return Math.round(x).toString(16); }
	};

	// [[fill]align][sign][symbol][0][width][,][.precision][type]
	var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

	var formatSpecifier = function(specifier) {
	  return new FormatSpecifier(specifier);
	};

	function FormatSpecifier(specifier) {
	  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

	  var match,
	      fill = match[1] || " ",
	      align = match[2] || ">",
	      sign = match[3] || "-",
	      symbol = match[4] || "",
	      zero = !!match[5],
	      width = match[6] && +match[6],
	      comma = !!match[7],
	      precision = match[8] && +match[8].slice(1),
	      type = match[9] || "";

	  // The "n" type is an alias for ",g".
	  if (type === "n") comma = true, type = "g";

	  // Map invalid types to the default format.
	  else if (!formatTypes[type]) type = "";

	  // If zero fill is specified, padding goes after sign and before digits.
	  if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

	  this.fill = fill;
	  this.align = align;
	  this.sign = sign;
	  this.symbol = symbol;
	  this.zero = zero;
	  this.width = width;
	  this.comma = comma;
	  this.precision = precision;
	  this.type = type;
	}

	FormatSpecifier.prototype.toString = function() {
	  return this.fill
	      + this.align
	      + this.sign
	      + this.symbol
	      + (this.zero ? "0" : "")
	      + (this.width == null ? "" : Math.max(1, this.width | 0))
	      + (this.comma ? "," : "")
	      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
	      + this.type;
	};

	var prefixes = ["y","z","a","f","p","n","\xB5","m","","k","M","G","T","P","E","Z","Y"];

	function identity$3(x) {
	  return x;
	}

	var formatLocale = function(locale) {
	  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$3,
	      currency = locale.currency,
	      decimal = locale.decimal;

	  function newFormat(specifier) {
	    specifier = formatSpecifier(specifier);

	    var fill = specifier.fill,
	        align = specifier.align,
	        sign = specifier.sign,
	        symbol = specifier.symbol,
	        zero = specifier.zero,
	        width = specifier.width,
	        comma = specifier.comma,
	        precision = specifier.precision,
	        type = specifier.type;

	    // Compute the prefix and suffix.
	    // For SI-prefix, the suffix is lazily computed.
	    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
	        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? "%" : "";

	    // What format function should we use?
	    // Is this an integer type?
	    // Can this type generate exponential notation?
	    var formatType = formatTypes[type],
	        maybeSuffix = !type || /[defgprs%]/.test(type);

	    // Set the default precision if not specified,
	    // or clamp the specified precision to the supported range.
	    // For significant precision, it must be in [1, 21].
	    // For fixed precision, it must be in [0, 20].
	    precision = precision == null ? (type ? 6 : 12)
	        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
	        : Math.max(0, Math.min(20, precision));

	    function format(value) {
	      var valuePrefix = prefix,
	          valueSuffix = suffix,
	          i, n, c;

	      if (type === "c") {
	        valueSuffix = formatType(value) + valueSuffix;
	        value = "";
	      } else {
	        value = +value;

	        // Convert negative to positive, and compute the prefix.
	        // Note that -0 is not less than 0, but 1 / -0 is!
	        var valueNegative = (value < 0 || 1 / value < 0) && (value *= -1, true);

	        // Perform the initial formatting.
	        value = formatType(value, precision);

	        // If the original value was negative, it may be rounded to zero during
	        // formatting; treat this as (positive) zero.
	        if (valueNegative) {
	          i = -1, n = value.length;
	          valueNegative = false;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), (48 < c && c < 58)
	                || (type === "x" && 96 < c && c < 103)
	                || (type === "X" && 64 < c && c < 71)) {
	              valueNegative = true;
	              break;
	            }
	          }
	        }

	        // Compute the prefix and suffix.
	        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
	        valueSuffix = valueSuffix + (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + (valueNegative && sign === "(" ? ")" : "");

	        // Break the formatted value into the integer “value” part that can be
	        // grouped, and fractional or exponential “suffix” part that is not.
	        if (maybeSuffix) {
	          i = -1, n = value.length;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), 48 > c || c > 57) {
	              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
	              value = value.slice(0, i);
	              break;
	            }
	          }
	        }
	      }

	      // If the fill character is not "0", grouping is applied before padding.
	      if (comma && !zero) value = group(value, Infinity);

	      // Compute the padding.
	      var length = valuePrefix.length + value.length + valueSuffix.length,
	          padding = length < width ? new Array(width - length + 1).join(fill) : "";

	      // If the fill character is "0", grouping is applied after padding.
	      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

	      // Reconstruct the final output based on the desired alignment.
	      switch (align) {
	        case "<": return valuePrefix + value + valueSuffix + padding;
	        case "=": return valuePrefix + padding + value + valueSuffix;
	        case "^": return padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
	      }
	      return padding + valuePrefix + value + valueSuffix;
	    }

	    format.toString = function() {
	      return specifier + "";
	    };

	    return format;
	  }

	  function formatPrefix(specifier, value) {
	    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
	        e = Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3,
	        k = Math.pow(10, -e),
	        prefix = prefixes[8 + e / 3];
	    return function(value) {
	      return f(k * value) + prefix;
	    };
	  }

	  return {
	    format: newFormat,
	    formatPrefix: formatPrefix
	  };
	};

	var locale$1;



	defaultLocale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	function defaultLocale(definition) {
	  locale$1 = formatLocale(definition);
	  exports.format = locale$1.format;
	  exports.formatPrefix = locale$1.formatPrefix;
	  return locale$1;
	}

	var precisionFixed = function(step) {
	  return Math.max(0, -exponent$1(Math.abs(step)));
	};

	var precisionPrefix = function(step, value) {
	  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3 - exponent$1(Math.abs(step)));
	};

	var precisionRound = function(step, max) {
	  step = Math.abs(step), max = Math.abs(max) - step;
	  return Math.max(0, exponent$1(max) - exponent$1(step)) + 1;
	};

	function localDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
	    date.setFullYear(d.y);
	    return date;
	  }
	  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
	}

	function utcDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
	    date.setUTCFullYear(d.y);
	    return date;
	  }
	  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
	}

	function newYear(y) {
	  return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
	}

	function formatLocale$1(locale) {
	  var locale_dateTime = locale.dateTime,
	      locale_date = locale.date,
	      locale_time = locale.time,
	      locale_periods = locale.periods,
	      locale_weekdays = locale.days,
	      locale_shortWeekdays = locale.shortDays,
	      locale_months = locale.months,
	      locale_shortMonths = locale.shortMonths;

	  var periodRe = formatRe(locale_periods),
	      periodLookup = formatLookup(locale_periods),
	      weekdayRe = formatRe(locale_weekdays),
	      weekdayLookup = formatLookup(locale_weekdays),
	      shortWeekdayRe = formatRe(locale_shortWeekdays),
	      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
	      monthRe = formatRe(locale_months),
	      monthLookup = formatLookup(locale_months),
	      shortMonthRe = formatRe(locale_shortMonths),
	      shortMonthLookup = formatLookup(locale_shortMonths);

	  var formats = {
	    "a": formatShortWeekday,
	    "A": formatWeekday,
	    "b": formatShortMonth,
	    "B": formatMonth,
	    "c": null,
	    "d": formatDayOfMonth,
	    "e": formatDayOfMonth,
	    "H": formatHour24,
	    "I": formatHour12,
	    "j": formatDayOfYear,
	    "L": formatMilliseconds,
	    "m": formatMonthNumber,
	    "M": formatMinutes,
	    "p": formatPeriod,
	    "S": formatSeconds,
	    "U": formatWeekNumberSunday,
	    "w": formatWeekdayNumber,
	    "W": formatWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatYear,
	    "Y": formatFullYear,
	    "Z": formatZone,
	    "%": formatLiteralPercent
	  };

	  var utcFormats = {
	    "a": formatUTCShortWeekday,
	    "A": formatUTCWeekday,
	    "b": formatUTCShortMonth,
	    "B": formatUTCMonth,
	    "c": null,
	    "d": formatUTCDayOfMonth,
	    "e": formatUTCDayOfMonth,
	    "H": formatUTCHour24,
	    "I": formatUTCHour12,
	    "j": formatUTCDayOfYear,
	    "L": formatUTCMilliseconds,
	    "m": formatUTCMonthNumber,
	    "M": formatUTCMinutes,
	    "p": formatUTCPeriod,
	    "S": formatUTCSeconds,
	    "U": formatUTCWeekNumberSunday,
	    "w": formatUTCWeekdayNumber,
	    "W": formatUTCWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatUTCYear,
	    "Y": formatUTCFullYear,
	    "Z": formatUTCZone,
	    "%": formatLiteralPercent
	  };

	  var parses = {
	    "a": parseShortWeekday,
	    "A": parseWeekday,
	    "b": parseShortMonth,
	    "B": parseMonth,
	    "c": parseLocaleDateTime,
	    "d": parseDayOfMonth,
	    "e": parseDayOfMonth,
	    "H": parseHour24,
	    "I": parseHour24,
	    "j": parseDayOfYear,
	    "L": parseMilliseconds,
	    "m": parseMonthNumber,
	    "M": parseMinutes,
	    "p": parsePeriod,
	    "S": parseSeconds,
	    "U": parseWeekNumberSunday,
	    "w": parseWeekdayNumber,
	    "W": parseWeekNumberMonday,
	    "x": parseLocaleDate,
	    "X": parseLocaleTime,
	    "y": parseYear,
	    "Y": parseFullYear,
	    "Z": parseZone,
	    "%": parseLiteralPercent
	  };

	  // These recursive directive definitions must be deferred.
	  formats.x = newFormat(locale_date, formats);
	  formats.X = newFormat(locale_time, formats);
	  formats.c = newFormat(locale_dateTime, formats);
	  utcFormats.x = newFormat(locale_date, utcFormats);
	  utcFormats.X = newFormat(locale_time, utcFormats);
	  utcFormats.c = newFormat(locale_dateTime, utcFormats);

	  function newFormat(specifier, formats) {
	    return function(date) {
	      var string = [],
	          i = -1,
	          j = 0,
	          n = specifier.length,
	          c,
	          pad,
	          format;

	      if (!(date instanceof Date)) date = new Date(+date);

	      while (++i < n) {
	        if (specifier.charCodeAt(i) === 37) {
	          string.push(specifier.slice(j, i));
	          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
	          else pad = c === "e" ? " " : "0";
	          if (format = formats[c]) c = format(date, pad);
	          string.push(c);
	          j = i + 1;
	        }
	      }

	      string.push(specifier.slice(j, i));
	      return string.join("");
	    };
	  }

	  function newParse(specifier, newDate) {
	    return function(string) {
	      var d = newYear(1900),
	          i = parseSpecifier(d, specifier, string += "", 0);
	      if (i != string.length) return null;

	      // The am-pm flag is 0 for AM, and 1 for PM.
	      if ("p" in d) d.H = d.H % 12 + d.p * 12;

	      // Convert day-of-week and week-of-year to day-of-year.
	      if ("W" in d || "U" in d) {
	        if (!("w" in d)) d.w = "W" in d ? 1 : 0;
	        var day$$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
	        d.m = 0;
	        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$$1 + 5) % 7 : d.w + d.U * 7 - (day$$1 + 6) % 7;
	      }

	      // If a time zone is specified, all fields are interpreted as UTC and then
	      // offset according to the specified time zone.
	      if ("Z" in d) {
	        d.H += d.Z / 100 | 0;
	        d.M += d.Z % 100;
	        return utcDate(d);
	      }

	      // Otherwise, all fields are in local time.
	      return newDate(d);
	    };
	  }

	  function parseSpecifier(d, specifier, string, j) {
	    var i = 0,
	        n = specifier.length,
	        m = string.length,
	        c,
	        parse;

	    while (i < n) {
	      if (j >= m) return -1;
	      c = specifier.charCodeAt(i++);
	      if (c === 37) {
	        c = specifier.charAt(i++);
	        parse = parses[c in pads ? specifier.charAt(i++) : c];
	        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
	      } else if (c != string.charCodeAt(j++)) {
	        return -1;
	      }
	    }

	    return j;
	  }

	  function parsePeriod(d, string, i) {
	    var n = periodRe.exec(string.slice(i));
	    return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortWeekday(d, string, i) {
	    var n = shortWeekdayRe.exec(string.slice(i));
	    return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseWeekday(d, string, i) {
	    var n = weekdayRe.exec(string.slice(i));
	    return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortMonth(d, string, i) {
	    var n = shortMonthRe.exec(string.slice(i));
	    return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseMonth(d, string, i) {
	    var n = monthRe.exec(string.slice(i));
	    return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseLocaleDateTime(d, string, i) {
	    return parseSpecifier(d, locale_dateTime, string, i);
	  }

	  function parseLocaleDate(d, string, i) {
	    return parseSpecifier(d, locale_date, string, i);
	  }

	  function parseLocaleTime(d, string, i) {
	    return parseSpecifier(d, locale_time, string, i);
	  }

	  function formatShortWeekday(d) {
	    return locale_shortWeekdays[d.getDay()];
	  }

	  function formatWeekday(d) {
	    return locale_weekdays[d.getDay()];
	  }

	  function formatShortMonth(d) {
	    return locale_shortMonths[d.getMonth()];
	  }

	  function formatMonth(d) {
	    return locale_months[d.getMonth()];
	  }

	  function formatPeriod(d) {
	    return locale_periods[+(d.getHours() >= 12)];
	  }

	  function formatUTCShortWeekday(d) {
	    return locale_shortWeekdays[d.getUTCDay()];
	  }

	  function formatUTCWeekday(d) {
	    return locale_weekdays[d.getUTCDay()];
	  }

	  function formatUTCShortMonth(d) {
	    return locale_shortMonths[d.getUTCMonth()];
	  }

	  function formatUTCMonth(d) {
	    return locale_months[d.getUTCMonth()];
	  }

	  function formatUTCPeriod(d) {
	    return locale_periods[+(d.getUTCHours() >= 12)];
	  }

	  return {
	    format: function(specifier) {
	      var f = newFormat(specifier += "", formats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    parse: function(specifier) {
	      var p = newParse(specifier += "", localDate);
	      p.toString = function() { return specifier; };
	      return p;
	    },
	    utcFormat: function(specifier) {
	      var f = newFormat(specifier += "", utcFormats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    utcParse: function(specifier) {
	      var p = newParse(specifier, utcDate);
	      p.toString = function() { return specifier; };
	      return p;
	    }
	  };
	}

	var pads = {"-": "", "_": " ", "0": "0"};
	var numberRe = /^\s*\d+/;
	var percentRe = /^%/;
	var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

	function pad(value, fill, width) {
	  var sign = value < 0 ? "-" : "",
	      string = (sign ? -value : value) + "",
	      length = string.length;
	  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
	}

	function requote(s) {
	  return s.replace(requoteRe, "\\$&");
	}

	function formatRe(names) {
	  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
	}

	function formatLookup(names) {
	  var map = {}, i = -1, n = names.length;
	  while (++i < n) map[names[i].toLowerCase()] = i;
	  return map;
	}

	function parseWeekdayNumber(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 1));
	  return n ? (d.w = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberSunday(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.U = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberMonday(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.W = +n[0], i + n[0].length) : -1;
	}

	function parseFullYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 4));
	  return n ? (d.y = +n[0], i + n[0].length) : -1;
	}

	function parseYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
	}

	function parseZone(d, string, i) {
	  var n = /^(Z)|([+-]\d\d)(?:\:?(\d\d))?/.exec(string.slice(i, i + 6));
	  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
	}

	function parseMonthNumber(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
	}

	function parseDayOfMonth(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.d = +n[0], i + n[0].length) : -1;
	}

	function parseDayOfYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
	}

	function parseHour24(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.H = +n[0], i + n[0].length) : -1;
	}

	function parseMinutes(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.M = +n[0], i + n[0].length) : -1;
	}

	function parseSeconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.S = +n[0], i + n[0].length) : -1;
	}

	function parseMilliseconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.L = +n[0], i + n[0].length) : -1;
	}

	function parseLiteralPercent(d, string, i) {
	  var n = percentRe.exec(string.slice(i, i + 1));
	  return n ? i + n[0].length : -1;
	}

	function formatDayOfMonth(d, p) {
	  return pad(d.getDate(), p, 2);
	}

	function formatHour24(d, p) {
	  return pad(d.getHours(), p, 2);
	}

	function formatHour12(d, p) {
	  return pad(d.getHours() % 12 || 12, p, 2);
	}

	function formatDayOfYear(d, p) {
	  return pad(1 + day.count(year(d), d), p, 3);
	}

	function formatMilliseconds(d, p) {
	  return pad(d.getMilliseconds(), p, 3);
	}

	function formatMonthNumber(d, p) {
	  return pad(d.getMonth() + 1, p, 2);
	}

	function formatMinutes(d, p) {
	  return pad(d.getMinutes(), p, 2);
	}

	function formatSeconds(d, p) {
	  return pad(d.getSeconds(), p, 2);
	}

	function formatWeekNumberSunday(d, p) {
	  return pad(sunday.count(year(d), d), p, 2);
	}

	function formatWeekdayNumber(d) {
	  return d.getDay();
	}

	function formatWeekNumberMonday(d, p) {
	  return pad(monday.count(year(d), d), p, 2);
	}

	function formatYear(d, p) {
	  return pad(d.getFullYear() % 100, p, 2);
	}

	function formatFullYear(d, p) {
	  return pad(d.getFullYear() % 10000, p, 4);
	}

	function formatZone(d) {
	  var z = d.getTimezoneOffset();
	  return (z > 0 ? "-" : (z *= -1, "+"))
	      + pad(z / 60 | 0, "0", 2)
	      + pad(z % 60, "0", 2);
	}

	function formatUTCDayOfMonth(d, p) {
	  return pad(d.getUTCDate(), p, 2);
	}

	function formatUTCHour24(d, p) {
	  return pad(d.getUTCHours(), p, 2);
	}

	function formatUTCHour12(d, p) {
	  return pad(d.getUTCHours() % 12 || 12, p, 2);
	}

	function formatUTCDayOfYear(d, p) {
	  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
	}

	function formatUTCMilliseconds(d, p) {
	  return pad(d.getUTCMilliseconds(), p, 3);
	}

	function formatUTCMonthNumber(d, p) {
	  return pad(d.getUTCMonth() + 1, p, 2);
	}

	function formatUTCMinutes(d, p) {
	  return pad(d.getUTCMinutes(), p, 2);
	}

	function formatUTCSeconds(d, p) {
	  return pad(d.getUTCSeconds(), p, 2);
	}

	function formatUTCWeekNumberSunday(d, p) {
	  return pad(utcSunday.count(utcYear(d), d), p, 2);
	}

	function formatUTCWeekdayNumber(d) {
	  return d.getUTCDay();
	}

	function formatUTCWeekNumberMonday(d, p) {
	  return pad(utcMonday.count(utcYear(d), d), p, 2);
	}

	function formatUTCYear(d, p) {
	  return pad(d.getUTCFullYear() % 100, p, 2);
	}

	function formatUTCFullYear(d, p) {
	  return pad(d.getUTCFullYear() % 10000, p, 4);
	}

	function formatUTCZone() {
	  return "+0000";
	}

	function formatLiteralPercent() {
	  return "%";
	}

	var locale$2;





	defaultLocale$1({
	  dateTime: "%x, %X",
	  date: "%-m/%-d/%Y",
	  time: "%-I:%M:%S %p",
	  periods: ["AM", "PM"],
	  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	});

	function defaultLocale$1(definition) {
	  locale$2 = formatLocale$1(definition);
	  exports.timeFormat = locale$2.format;
	  exports.timeParse = locale$2.parse;
	  exports.utcFormat = locale$2.utcFormat;
	  exports.utcParse = locale$2.utcParse;
	  return locale$2;
	}

	var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

	function formatIsoNative(date) {
	  return date.toISOString();
	}

	var formatIso = Date.prototype.toISOString
	    ? formatIsoNative
	    : exports.utcFormat(isoSpecifier);

	function parseIsoNative(string) {
	  var date = new Date(string);
	  return isNaN(date) ? null : date;
	}

	var parseIso = +new Date("2000-01-01T00:00:00.000Z")
	    ? parseIsoNative
	    : exports.utcParse(isoSpecifier);

	var array$2 = Array.prototype;

	var map$3 = array$2.map;
	var slice$3 = array$2.slice;

	var implicit = {name: "implicit"};

	function ordinal(range) {
	  var index = map$1(),
	      domain = [],
	      unknown = implicit;

	  range = range == null ? [] : slice$3.call(range);

	  function scale(d) {
	    var key = d + "", i = index.get(key);
	    if (!i) {
	      if (unknown !== implicit) return unknown;
	      index.set(key, i = domain.push(d));
	    }
	    return range[(i - 1) % range.length];
	  }

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [], index = map$1();
	    var i = -1, n = _.length, d, key;
	    while (++i < n) if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
	    return scale;
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = slice$3.call(_), scale) : range.slice();
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.copy = function() {
	    return ordinal()
	        .domain(domain)
	        .range(range)
	        .unknown(unknown);
	  };

	  return scale;
	}

	function band() {
	  var scale = ordinal().unknown(undefined),
	      domain = scale.domain,
	      ordinalRange = scale.range,
	      range$$1 = [0, 1],
	      step,
	      bandwidth,
	      round = false,
	      paddingInner = 0,
	      paddingOuter = 0,
	      align = 0.5;

	  delete scale.unknown;

	  function rescale() {
	    var n = domain().length,
	        reverse = range$$1[1] < range$$1[0],
	        start = range$$1[reverse - 0],
	        stop = range$$1[1 - reverse];
	    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
	    if (round) step = Math.floor(step);
	    start += (stop - start - step * (n - paddingInner)) * align;
	    bandwidth = step * (1 - paddingInner);
	    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
	    var values = range(n).map(function(i) { return start + step * i; });
	    return ordinalRange(reverse ? values.reverse() : values);
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range$$1 = [+_[0], +_[1]], rescale()) : range$$1.slice();
	  };

	  scale.rangeRound = function(_) {
	    return range$$1 = [+_[0], +_[1]], round = true, rescale();
	  };

	  scale.bandwidth = function() {
	    return bandwidth;
	  };

	  scale.step = function() {
	    return step;
	  };

	  scale.round = function(_) {
	    return arguments.length ? (round = !!_, rescale()) : round;
	  };

	  scale.padding = function(_) {
	    return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
	  };

	  scale.paddingInner = function(_) {
	    return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
	  };

	  scale.paddingOuter = function(_) {
	    return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
	  };

	  scale.align = function(_) {
	    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
	  };

	  scale.copy = function() {
	    return band()
	        .domain(domain())
	        .range(range$$1)
	        .round(round)
	        .paddingInner(paddingInner)
	        .paddingOuter(paddingOuter)
	        .align(align);
	  };

	  return rescale();
	}

	function pointish(scale) {
	  var copy = scale.copy;

	  scale.padding = scale.paddingOuter;
	  delete scale.paddingInner;
	  delete scale.paddingOuter;

	  scale.copy = function() {
	    return pointish(copy());
	  };

	  return scale;
	}

	function point$4() {
	  return pointish(band().paddingInner(1));
	}

	var constant$4 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var number$1 = function(x) {
	  return +x;
	};

	var unit = [0, 1];

	function deinterpolateLinear(a, b) {
	  return (b -= (a = +a))
	      ? function(x) { return (x - a) / b; }
	      : constant$4(b);
	}

	function deinterpolateClamp(deinterpolate) {
	  return function(a, b) {
	    var d = deinterpolate(a = +a, b = +b);
	    return function(x) { return x <= a ? 0 : x >= b ? 1 : d(x); };
	  };
	}

	function reinterpolateClamp(reinterpolate) {
	  return function(a, b) {
	    var r = reinterpolate(a = +a, b = +b);
	    return function(t) { return t <= 0 ? a : t >= 1 ? b : r(t); };
	  };
	}

	function bimap(domain, range$$1, deinterpolate, reinterpolate) {
	  var d0 = domain[0], d1 = domain[1], r0 = range$$1[0], r1 = range$$1[1];
	  if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);
	  else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
	  return function(x) { return r0(d0(x)); };
	}

	function polymap(domain, range$$1, deinterpolate, reinterpolate) {
	  var j = Math.min(domain.length, range$$1.length) - 1,
	      d = new Array(j),
	      r = new Array(j),
	      i = -1;

	  // Reverse descending domains.
	  if (domain[j] < domain[0]) {
	    domain = domain.slice().reverse();
	    range$$1 = range$$1.slice().reverse();
	  }

	  while (++i < j) {
	    d[i] = deinterpolate(domain[i], domain[i + 1]);
	    r[i] = reinterpolate(range$$1[i], range$$1[i + 1]);
	  }

	  return function(x) {
	    var i = bisectRight(domain, x, 1, j) - 1;
	    return r[i](d[i](x));
	  };
	}

	function copy(source, target) {
	  return target
	      .domain(source.domain())
	      .range(source.range())
	      .interpolate(source.interpolate())
	      .clamp(source.clamp());
	}

	// deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
	// reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
	function continuous(deinterpolate, reinterpolate) {
	  var domain = unit,
	      range$$1 = unit,
	      interpolate$$1 = interpolate,
	      clamp = false,
	      piecewise,
	      output,
	      input;

	  function rescale() {
	    piecewise = Math.min(domain.length, range$$1.length) > 2 ? polymap : bimap;
	    output = input = null;
	    return scale;
	  }

	  function scale(x) {
	    return (output || (output = piecewise(domain, range$$1, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate$$1)))(+x);
	  }

	  scale.invert = function(y) {
	    return (input || (input = piecewise(range$$1, domain, deinterpolateLinear, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate)))(+y);
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain = map$3.call(_, number$1), rescale()) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range$$1 = slice$3.call(_), rescale()) : range$$1.slice();
	  };

	  scale.rangeRound = function(_) {
	    return range$$1 = slice$3.call(_), interpolate$$1 = interpolateRound, rescale();
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, rescale()) : clamp;
	  };

	  scale.interpolate = function(_) {
	    return arguments.length ? (interpolate$$1 = _, rescale()) : interpolate$$1;
	  };

	  return rescale();
	}

	var tickFormat = function(domain, count, specifier) {
	  var start = domain[0],
	      stop = domain[domain.length - 1],
	      step = tickStep(start, stop, count == null ? 10 : count),
	      precision;
	  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
	  switch (specifier.type) {
	    case "s": {
	      var value = Math.max(Math.abs(start), Math.abs(stop));
	      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
	      return exports.formatPrefix(specifier, value);
	    }
	    case "":
	    case "e":
	    case "g":
	    case "p":
	    case "r": {
	      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
	      break;
	    }
	    case "f":
	    case "%": {
	      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
	      break;
	    }
	  }
	  return exports.format(specifier);
	};

	function linearish(scale) {
	  var domain = scale.domain;

	  scale.ticks = function(count) {
	    var d = domain();
	    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
	  };

	  scale.tickFormat = function(count, specifier) {
	    return tickFormat(domain(), count, specifier);
	  };

	  scale.nice = function(count) {
	    var d = domain(),
	        i = d.length - 1,
	        n = count == null ? 10 : count,
	        start = d[0],
	        stop = d[i],
	        step = tickStep(start, stop, n);

	    if (step) {
	      step = tickStep(Math.floor(start / step) * step, Math.ceil(stop / step) * step, n);
	      d[0] = Math.floor(start / step) * step;
	      d[i] = Math.ceil(stop / step) * step;
	      domain(d);
	    }

	    return scale;
	  };

	  return scale;
	}

	function linear$2() {
	  var scale = continuous(deinterpolateLinear, interpolateNumber);

	  scale.copy = function() {
	    return copy(scale, linear$2());
	  };

	  return linearish(scale);
	}

	function identity$4() {
	  var domain = [0, 1];

	  function scale(x) {
	    return +x;
	  }

	  scale.invert = scale;

	  scale.domain = scale.range = function(_) {
	    return arguments.length ? (domain = map$3.call(_, number$1), scale) : domain.slice();
	  };

	  scale.copy = function() {
	    return identity$4().domain(domain);
	  };

	  return linearish(scale);
	}

	var nice = function(domain, interval) {
	  domain = domain.slice();

	  var i0 = 0,
	      i1 = domain.length - 1,
	      x0 = domain[i0],
	      x1 = domain[i1],
	      t;

	  if (x1 < x0) {
	    t = i0, i0 = i1, i1 = t;
	    t = x0, x0 = x1, x1 = t;
	  }

	  domain[i0] = interval.floor(x0);
	  domain[i1] = interval.ceil(x1);
	  return domain;
	};

	function deinterpolate(a, b) {
	  return (b = Math.log(b / a))
	      ? function(x) { return Math.log(x / a) / b; }
	      : constant$4(b);
	}

	function reinterpolate(a, b) {
	  return a < 0
	      ? function(t) { return -Math.pow(-b, t) * Math.pow(-a, 1 - t); }
	      : function(t) { return Math.pow(b, t) * Math.pow(a, 1 - t); };
	}

	function pow10(x) {
	  return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
	}

	function powp(base) {
	  return base === 10 ? pow10
	      : base === Math.E ? Math.exp
	      : function(x) { return Math.pow(base, x); };
	}

	function logp(base) {
	  return base === Math.E ? Math.log
	      : base === 10 && Math.log10
	      || base === 2 && Math.log2
	      || (base = Math.log(base), function(x) { return Math.log(x) / base; });
	}

	function reflect(f) {
	  return function(x) {
	    return -f(-x);
	  };
	}

	function log() {
	  var scale = continuous(deinterpolate, reinterpolate).domain([1, 10]),
	      domain = scale.domain,
	      base = 10,
	      logs = logp(10),
	      pows = powp(10);

	  function rescale() {
	    logs = logp(base), pows = powp(base);
	    if (domain()[0] < 0) logs = reflect(logs), pows = reflect(pows);
	    return scale;
	  }

	  scale.base = function(_) {
	    return arguments.length ? (base = +_, rescale()) : base;
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.ticks = function(count) {
	    var d = domain(),
	        u = d[0],
	        v = d[d.length - 1],
	        r;

	    if (r = v < u) i = u, u = v, v = i;

	    var i = logs(u),
	        j = logs(v),
	        p,
	        k,
	        t,
	        n = count == null ? 10 : +count,
	        z = [];

	    if (!(base % 1) && j - i < n) {
	      i = Math.round(i) - 1, j = Math.round(j) + 1;
	      if (u > 0) for (; i < j; ++i) {
	        for (k = 1, p = pows(i); k < base; ++k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      } else for (; i < j; ++i) {
	        for (k = base - 1, p = pows(i); k >= 1; --k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      }
	    } else {
	      z = ticks(i, j, Math.min(j - i, n)).map(pows);
	    }

	    return r ? z.reverse() : z;
	  };

	  scale.tickFormat = function(count, specifier) {
	    if (specifier == null) specifier = base === 10 ? ".0e" : ",";
	    if (typeof specifier !== "function") specifier = exports.format(specifier);
	    if (count === Infinity) return specifier;
	    if (count == null) count = 10;
	    var k = Math.max(1, base * count / scale.ticks().length); // TODO fast estimate?
	    return function(d) {
	      var i = d / pows(Math.round(logs(d)));
	      if (i * base < base - 0.5) i *= base;
	      return i <= k ? specifier(d) : "";
	    };
	  };

	  scale.nice = function() {
	    return domain(nice(domain(), {
	      floor: function(x) { return pows(Math.floor(logs(x))); },
	      ceil: function(x) { return pows(Math.ceil(logs(x))); }
	    }));
	  };

	  scale.copy = function() {
	    return copy(scale, log().base(base));
	  };

	  return scale;
	}

	function raise(x, exponent) {
	  return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
	}

	function pow() {
	  var exponent = 1,
	      scale = continuous(deinterpolate, reinterpolate),
	      domain = scale.domain;

	  function deinterpolate(a, b) {
	    return (b = raise(b, exponent) - (a = raise(a, exponent)))
	        ? function(x) { return (raise(x, exponent) - a) / b; }
	        : constant$4(b);
	  }

	  function reinterpolate(a, b) {
	    b = raise(b, exponent) - (a = raise(a, exponent));
	    return function(t) { return raise(a + b * t, 1 / exponent); };
	  }

	  scale.exponent = function(_) {
	    return arguments.length ? (exponent = +_, domain(domain())) : exponent;
	  };

	  scale.copy = function() {
	    return copy(scale, pow().exponent(exponent));
	  };

	  return linearish(scale);
	}

	function sqrt() {
	  return pow().exponent(0.5);
	}

	function quantile$$1() {
	  var domain = [],
	      range$$1 = [],
	      thresholds = [];

	  function rescale() {
	    var i = 0, n = Math.max(1, range$$1.length);
	    thresholds = new Array(n - 1);
	    while (++i < n) thresholds[i - 1] = threshold(domain, i / n);
	    return scale;
	  }

	  function scale(x) {
	    if (!isNaN(x = +x)) return range$$1[bisectRight(thresholds, x)];
	  }

	  scale.invertExtent = function(y) {
	    var i = range$$1.indexOf(y);
	    return i < 0 ? [NaN, NaN] : [
	      i > 0 ? thresholds[i - 1] : domain[0],
	      i < thresholds.length ? thresholds[i] : domain[domain.length - 1]
	    ];
	  };

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [];
	    for (var i = 0, n = _.length, d; i < n; ++i) if (d = _[i], d != null && !isNaN(d = +d)) domain.push(d);
	    domain.sort(ascending);
	    return rescale();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range$$1 = slice$3.call(_), rescale()) : range$$1.slice();
	  };

	  scale.quantiles = function() {
	    return thresholds.slice();
	  };

	  scale.copy = function() {
	    return quantile$$1()
	        .domain(domain)
	        .range(range$$1);
	  };

	  return scale;
	}

	function quantize$1() {
	  var x0 = 0,
	      x1 = 1,
	      n = 1,
	      domain = [0.5],
	      range$$1 = [0, 1];

	  function scale(x) {
	    if (x <= x) return range$$1[bisectRight(domain, x, 0, n)];
	  }

	  function rescale() {
	    var i = -1;
	    domain = new Array(n);
	    while (++i < n) domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
	    return scale;
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (x0 = +_[0], x1 = +_[1], rescale()) : [x0, x1];
	  };

	  scale.range = function(_) {
	    return arguments.length ? (n = (range$$1 = slice$3.call(_)).length - 1, rescale()) : range$$1.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range$$1.indexOf(y);
	    return i < 0 ? [NaN, NaN]
	        : i < 1 ? [x0, domain[0]]
	        : i >= n ? [domain[n - 1], x1]
	        : [domain[i - 1], domain[i]];
	  };

	  scale.copy = function() {
	    return quantize$1()
	        .domain([x0, x1])
	        .range(range$$1);
	  };

	  return linearish(scale);
	}

	function threshold$1() {
	  var domain = [0.5],
	      range$$1 = [0, 1],
	      n = 1;

	  function scale(x) {
	    if (x <= x) return range$$1[bisectRight(domain, x, 0, n)];
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain = slice$3.call(_), n = Math.min(domain.length, range$$1.length - 1), scale) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range$$1 = slice$3.call(_), n = Math.min(domain.length, range$$1.length - 1), scale) : range$$1.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range$$1.indexOf(y);
	    return [domain[i - 1], domain[i]];
	  };

	  scale.copy = function() {
	    return threshold$1()
	        .domain(domain)
	        .range(range$$1);
	  };

	  return scale;
	}

	var durationSecond$1 = 1000;
	var durationMinute$1 = durationSecond$1 * 60;
	var durationHour$1 = durationMinute$1 * 60;
	var durationDay$1 = durationHour$1 * 24;
	var durationWeek$1 = durationDay$1 * 7;
	var durationMonth = durationDay$1 * 30;
	var durationYear = durationDay$1 * 365;

	function date$1(t) {
	  return new Date(t);
	}

	function number$2(t) {
	  return t instanceof Date ? +t : +new Date(+t);
	}

	function calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format) {
	  var scale = continuous(deinterpolateLinear, interpolateNumber),
	      invert = scale.invert,
	      domain = scale.domain;

	  var formatMillisecond = format(".%L"),
	      formatSecond = format(":%S"),
	      formatMinute = format("%I:%M"),
	      formatHour = format("%I %p"),
	      formatDay = format("%a %d"),
	      formatWeek = format("%b %d"),
	      formatMonth = format("%B"),
	      formatYear = format("%Y");

	  var tickIntervals = [
	    [second$$1,  1,      durationSecond$1],
	    [second$$1,  5,  5 * durationSecond$1],
	    [second$$1, 15, 15 * durationSecond$1],
	    [second$$1, 30, 30 * durationSecond$1],
	    [minute$$1,  1,      durationMinute$1],
	    [minute$$1,  5,  5 * durationMinute$1],
	    [minute$$1, 15, 15 * durationMinute$1],
	    [minute$$1, 30, 30 * durationMinute$1],
	    [  hour$$1,  1,      durationHour$1  ],
	    [  hour$$1,  3,  3 * durationHour$1  ],
	    [  hour$$1,  6,  6 * durationHour$1  ],
	    [  hour$$1, 12, 12 * durationHour$1  ],
	    [   day$$1,  1,      durationDay$1   ],
	    [   day$$1,  2,  2 * durationDay$1   ],
	    [  week,  1,      durationWeek$1  ],
	    [ month$$1,  1,      durationMonth ],
	    [ month$$1,  3,  3 * durationMonth ],
	    [  year$$1,  1,      durationYear  ]
	  ];

	  function tickFormat(date) {
	    return (second$$1(date) < date ? formatMillisecond
	        : minute$$1(date) < date ? formatSecond
	        : hour$$1(date) < date ? formatMinute
	        : day$$1(date) < date ? formatHour
	        : month$$1(date) < date ? (week(date) < date ? formatDay : formatWeek)
	        : year$$1(date) < date ? formatMonth
	        : formatYear)(date);
	  }

	  function tickInterval(interval, start, stop, step) {
	    if (interval == null) interval = 10;

	    // If a desired tick count is specified, pick a reasonable tick interval
	    // based on the extent of the domain and a rough estimate of tick size.
	    // Otherwise, assume interval is already a time interval and use it.
	    if (typeof interval === "number") {
	      var target = Math.abs(stop - start) / interval,
	          i = bisector(function(i) { return i[2]; }).right(tickIntervals, target);
	      if (i === tickIntervals.length) {
	        step = tickStep(start / durationYear, stop / durationYear, interval);
	        interval = year$$1;
	      } else if (i) {
	        i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
	        step = i[1];
	        interval = i[0];
	      } else {
	        step = tickStep(start, stop, interval);
	        interval = millisecond$$1;
	      }
	    }

	    return step == null ? interval : interval.every(step);
	  }

	  scale.invert = function(y) {
	    return new Date(invert(y));
	  };

	  scale.domain = function(_) {
	    return arguments.length ? domain(map$3.call(_, number$2)) : domain().map(date$1);
	  };

	  scale.ticks = function(interval, step) {
	    var d = domain(),
	        t0 = d[0],
	        t1 = d[d.length - 1],
	        r = t1 < t0,
	        t;
	    if (r) t = t0, t0 = t1, t1 = t;
	    t = tickInterval(interval, t0, t1, step);
	    t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
	    return r ? t.reverse() : t;
	  };

	  scale.tickFormat = function(count, specifier) {
	    return specifier == null ? tickFormat : format(specifier);
	  };

	  scale.nice = function(interval, step) {
	    var d = domain();
	    return (interval = tickInterval(interval, d[0], d[d.length - 1], step))
	        ? domain(nice(d, interval))
	        : scale;
	  };

	  scale.copy = function() {
	    return copy(scale, calendar(year$$1, month$$1, week, day$$1, hour$$1, minute$$1, second$$1, millisecond$$1, format));
	  };

	  return scale;
	}

	var time = function() {
	  return calendar(year, month, sunday, day, hour, minute, second, millisecond, exports.timeFormat).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]);
	};

	var utcTime = function() {
	  return calendar(utcYear, utcMonth, utcSunday, utcDay, utcHour, utcMinute, second, millisecond, exports.utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]);
	};

	var colors = function(s) {
	  return s.match(/.{6}/g).map(function(x) {
	    return "#" + x;
	  });
	};

	var category10 = colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

	var category20b = colors("393b795254a36b6ecf9c9ede6379398ca252b5cf6bcedb9c8c6d31bd9e39e7ba52e7cb94843c39ad494ad6616be7969c7b4173a55194ce6dbdde9ed6");

	var category20c = colors("3182bd6baed69ecae1c6dbefe6550dfd8d3cfdae6bfdd0a231a35474c476a1d99bc7e9c0756bb19e9ac8bcbddcdadaeb636363969696bdbdbdd9d9d9");

	var category20 = colors("1f77b4aec7e8ff7f0effbb782ca02c98df8ad62728ff98969467bdc5b0d58c564bc49c94e377c2f7b6d27f7f7fc7c7c7bcbd22dbdb8d17becf9edae5");

	var cubehelix$3 = cubehelixLong(cubehelix(300, 0.5, 0.0), cubehelix(-240, 0.5, 1.0));

	var warm = cubehelixLong(cubehelix(-100, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

	var cool = cubehelixLong(cubehelix(260, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

	var rainbow = cubehelix();

	var rainbow$1 = function(t) {
	  if (t < 0 || t > 1) t -= Math.floor(t);
	  var ts = Math.abs(t - 0.5);
	  rainbow.h = 360 * t - 100;
	  rainbow.s = 1.5 - 1.5 * ts;
	  rainbow.l = 0.8 - 0.9 * ts;
	  return rainbow + "";
	};

	function ramp(range) {
	  var n = range.length;
	  return function(t) {
	    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
	  };
	}

	var viridis = ramp(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

	var magma = ramp(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

	var inferno = ramp(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

	var plasma = ramp(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

	function sequential(interpolator) {
	  var x0 = 0,
	      x1 = 1,
	      clamp = false;

	  function scale(x) {
	    var t = (x - x0) / (x1 - x0);
	    return interpolator(clamp ? Math.max(0, Math.min(1, t)) : t);
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (x0 = +_[0], x1 = +_[1], scale) : [x0, x1];
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, scale) : clamp;
	  };

	  scale.interpolator = function(_) {
	    return arguments.length ? (interpolator = _, scale) : interpolator;
	  };

	  scale.copy = function() {
	    return sequential(interpolator).domain([x0, x1]).clamp(clamp);
	  };

	  return linearish(scale);
	}

	var xhtml = "http://www.w3.org/1999/xhtml";

	var namespaces = {
	  svg: "http://www.w3.org/2000/svg",
	  xhtml: xhtml,
	  xlink: "http://www.w3.org/1999/xlink",
	  xml: "http://www.w3.org/XML/1998/namespace",
	  xmlns: "http://www.w3.org/2000/xmlns/"
	};

	var namespace = function(name) {
	  var prefix = name += "", i = prefix.indexOf(":");
	  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
	  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
	};

	function creatorInherit(name) {
	  return function() {
	    var document = this.ownerDocument,
	        uri = this.namespaceURI;
	    return uri === xhtml && document.documentElement.namespaceURI === xhtml
	        ? document.createElement(name)
	        : document.createElementNS(uri, name);
	  };
	}

	function creatorFixed(fullname) {
	  return function() {
	    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
	  };
	}

	var creator = function(name) {
	  var fullname = namespace(name);
	  return (fullname.local
	      ? creatorFixed
	      : creatorInherit)(fullname);
	};

	var nextId = 0;

	function local() {
	  return new Local;
	}

	function Local() {
	  this._ = "@" + (++nextId).toString(36);
	}

	Local.prototype = local.prototype = {
	  constructor: Local,
	  get: function(node) {
	    var id = this._;
	    while (!(id in node)) if (!(node = node.parentNode)) return;
	    return node[id];
	  },
	  set: function(node, value) {
	    return node[this._] = value;
	  },
	  remove: function(node) {
	    return this._ in node && delete node[this._];
	  },
	  toString: function() {
	    return this._;
	  }
	};

	var matcher = function(selector) {
	  return function() {
	    return this.matches(selector);
	  };
	};

	if (typeof document !== "undefined") {
	  var element = document.documentElement;
	  if (!element.matches) {
	    var vendorMatches = element.webkitMatchesSelector
	        || element.msMatchesSelector
	        || element.mozMatchesSelector
	        || element.oMatchesSelector;
	    matcher = function(selector) {
	      return function() {
	        return vendorMatches.call(this, selector);
	      };
	    };
	  }
	}

	var matcher$1 = matcher;

	var filterEvents = {};

	exports.event = null;

	if (typeof document !== "undefined") {
	  var element$1 = document.documentElement;
	  if (!("onmouseenter" in element$1)) {
	    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
	  }
	}

	function filterContextListener(listener, index, group) {
	  listener = contextListener(listener, index, group);
	  return function(event) {
	    var related = event.relatedTarget;
	    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
	      listener.call(this, event);
	    }
	  };
	}

	function contextListener(listener, index, group) {
	  return function(event1) {
	    var event0 = exports.event; // Events can be reentrant (e.g., focus).
	    exports.event = event1;
	    try {
	      listener.call(this, this.__data__, index, group);
	    } finally {
	      exports.event = event0;
	    }
	  };
	}

	function parseTypenames$1(typenames) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    return {type: t, name: name};
	  });
	}

	function onRemove(typename) {
	  return function() {
	    var on = this.__on;
	    if (!on) return;
	    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
	      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
	        this.removeEventListener(o.type, o.listener, o.capture);
	      } else {
	        on[++i] = o;
	      }
	    }
	    if (++i) on.length = i;
	    else delete this.__on;
	  };
	}

	function onAdd(typename, value, capture) {
	  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
	  return function(d, i, group) {
	    var on = this.__on, o, listener = wrap(value, i, group);
	    if (on) for (var j = 0, m = on.length; j < m; ++j) {
	      if ((o = on[j]).type === typename.type && o.name === typename.name) {
	        this.removeEventListener(o.type, o.listener, o.capture);
	        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
	        o.value = value;
	        return;
	      }
	    }
	    this.addEventListener(typename.type, listener, capture);
	    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
	    if (!on) this.__on = [o];
	    else on.push(o);
	  };
	}

	var selection_on = function(typename, value, capture) {
	  var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

	  if (arguments.length < 2) {
	    var on = this.node().__on;
	    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
	      for (i = 0, o = on[j]; i < n; ++i) {
	        if ((t = typenames[i]).type === o.type && t.name === o.name) {
	          return o.value;
	        }
	      }
	    }
	    return;
	  }

	  on = value ? onAdd : onRemove;
	  if (capture == null) capture = false;
	  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
	  return this;
	};

	function customEvent(event1, listener, that, args) {
	  var event0 = exports.event;
	  event1.sourceEvent = exports.event;
	  exports.event = event1;
	  try {
	    return listener.apply(that, args);
	  } finally {
	    exports.event = event0;
	  }
	}

	var sourceEvent = function() {
	  var current = exports.event, source;
	  while (source = current.sourceEvent) current = source;
	  return current;
	};

	var point$5 = function(node, event) {
	  var svg = node.ownerSVGElement || node;

	  if (svg.createSVGPoint) {
	    var point = svg.createSVGPoint();
	    point.x = event.clientX, point.y = event.clientY;
	    point = point.matrixTransform(node.getScreenCTM().inverse());
	    return [point.x, point.y];
	  }

	  var rect = node.getBoundingClientRect();
	  return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
	};

	var mouse = function(node) {
	  var event = sourceEvent();
	  if (event.changedTouches) event = event.changedTouches[0];
	  return point$5(node, event);
	};

	function none$2() {}

	var selector = function(selector) {
	  return selector == null ? none$2 : function() {
	    return this.querySelector(selector);
	  };
	};

	var selection_select = function(select) {
	  if (typeof select !== "function") select = selector(select);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
	      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
	        if ("__data__" in node) subnode.__data__ = node.__data__;
	        subgroup[i] = subnode;
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	};

	function empty() {
	  return [];
	}

	var selectorAll = function(selector) {
	  return selector == null ? empty : function() {
	    return this.querySelectorAll(selector);
	  };
	};

	var selection_selectAll = function(select) {
	  if (typeof select !== "function") select = selectorAll(select);

	  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        subgroups.push(select.call(node, node.__data__, i, group));
	        parents.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, parents);
	};

	var selection_filter = function(match) {
	  if (typeof match !== "function") match = matcher$1(match);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
	      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
	        subgroup.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	};

	var sparse = function(update) {
	  return new Array(update.length);
	};

	var selection_enter = function() {
	  return new Selection(this._enter || this._groups.map(sparse), this._parents);
	};

	function EnterNode(parent, datum) {
	  this.ownerDocument = parent.ownerDocument;
	  this.namespaceURI = parent.namespaceURI;
	  this._next = null;
	  this._parent = parent;
	  this.__data__ = datum;
	}

	EnterNode.prototype = {
	  constructor: EnterNode,
	  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
	  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
	  querySelector: function(selector) { return this._parent.querySelector(selector); },
	  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
	};

	var constant$5 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var keyPrefix = "$"; // Protect against keys like “__proto__”.

	function bindIndex(parent, group, enter, update, exit, data) {
	  var i = 0,
	      node,
	      groupLength = group.length,
	      dataLength = data.length;

	  // Put any non-null nodes that fit into update.
	  // Put any null nodes into enter.
	  // Put any remaining data into enter.
	  for (; i < dataLength; ++i) {
	    if (node = group[i]) {
	      node.__data__ = data[i];
	      update[i] = node;
	    } else {
	      enter[i] = new EnterNode(parent, data[i]);
	    }
	  }

	  // Put any non-null nodes that don’t fit into exit.
	  for (; i < groupLength; ++i) {
	    if (node = group[i]) {
	      exit[i] = node;
	    }
	  }
	}

	function bindKey(parent, group, enter, update, exit, data, key) {
	  var i,
	      node,
	      nodeByKeyValue = {},
	      groupLength = group.length,
	      dataLength = data.length,
	      keyValues = new Array(groupLength),
	      keyValue;

	  // Compute the key for each node.
	  // If multiple nodes have the same key, the duplicates are added to exit.
	  for (i = 0; i < groupLength; ++i) {
	    if (node = group[i]) {
	      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
	      if (keyValue in nodeByKeyValue) {
	        exit[i] = node;
	      } else {
	        nodeByKeyValue[keyValue] = node;
	      }
	    }
	  }

	  // Compute the key for each datum.
	  // If there a node associated with this key, join and add it to update.
	  // If there is not (or the key is a duplicate), add it to enter.
	  for (i = 0; i < dataLength; ++i) {
	    keyValue = keyPrefix + key.call(parent, data[i], i, data);
	    if (node = nodeByKeyValue[keyValue]) {
	      update[i] = node;
	      node.__data__ = data[i];
	      nodeByKeyValue[keyValue] = null;
	    } else {
	      enter[i] = new EnterNode(parent, data[i]);
	    }
	  }

	  // Add any remaining nodes that were not bound to data to exit.
	  for (i = 0; i < groupLength; ++i) {
	    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
	      exit[i] = node;
	    }
	  }
	}

	var selection_data = function(value, key) {
	  if (!value) {
	    data = new Array(this.size()), j = -1;
	    this.each(function(d) { data[++j] = d; });
	    return data;
	  }

	  var bind = key ? bindKey : bindIndex,
	      parents = this._parents,
	      groups = this._groups;

	  if (typeof value !== "function") value = constant$5(value);

	  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
	    var parent = parents[j],
	        group = groups[j],
	        groupLength = group.length,
	        data = value.call(parent, parent && parent.__data__, j, parents),
	        dataLength = data.length,
	        enterGroup = enter[j] = new Array(dataLength),
	        updateGroup = update[j] = new Array(dataLength),
	        exitGroup = exit[j] = new Array(groupLength);

	    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

	    // Now connect the enter nodes to their following update node, such that
	    // appendChild can insert the materialized enter node before this node,
	    // rather than at the end of the parent node.
	    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
	      if (previous = enterGroup[i0]) {
	        if (i0 >= i1) i1 = i0 + 1;
	        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
	        previous._next = next || null;
	      }
	    }
	  }

	  update = new Selection(update, parents);
	  update._enter = enter;
	  update._exit = exit;
	  return update;
	};

	var selection_exit = function() {
	  return new Selection(this._exit || this._groups.map(sparse), this._parents);
	};

	var selection_merge = function(selection) {

	  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
	    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group0[i] || group1[i]) {
	        merge[i] = node;
	      }
	    }
	  }

	  for (; j < m0; ++j) {
	    merges[j] = groups0[j];
	  }

	  return new Selection(merges, this._parents);
	};

	var selection_order = function() {

	  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
	    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
	      if (node = group[i]) {
	        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
	        next = node;
	      }
	    }
	  }

	  return this;
	};

	var selection_sort = function(compare) {
	  if (!compare) compare = ascending$2;

	  function compareNode(a, b) {
	    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
	  }

	  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        sortgroup[i] = node;
	      }
	    }
	    sortgroup.sort(compareNode);
	  }

	  return new Selection(sortgroups, this._parents).order();
	};

	function ascending$2(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	var selection_call = function() {
	  var callback = arguments[0];
	  arguments[0] = this;
	  callback.apply(null, arguments);
	  return this;
	};

	var selection_nodes = function() {
	  var nodes = new Array(this.size()), i = -1;
	  this.each(function() { nodes[++i] = this; });
	  return nodes;
	};

	var selection_node = function() {

	  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
	      var node = group[i];
	      if (node) return node;
	    }
	  }

	  return null;
	};

	var selection_size = function() {
	  var size = 0;
	  this.each(function() { ++size; });
	  return size;
	};

	var selection_empty = function() {
	  return !this.node();
	};

	var selection_each = function(callback) {

	  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
	      if (node = group[i]) callback.call(node, node.__data__, i, group);
	    }
	  }

	  return this;
	};

	function attrRemove(name) {
	  return function() {
	    this.removeAttribute(name);
	  };
	}

	function attrRemoveNS(fullname) {
	  return function() {
	    this.removeAttributeNS(fullname.space, fullname.local);
	  };
	}

	function attrConstant(name, value) {
	  return function() {
	    this.setAttribute(name, value);
	  };
	}

	function attrConstantNS(fullname, value) {
	  return function() {
	    this.setAttributeNS(fullname.space, fullname.local, value);
	  };
	}

	function attrFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttribute(name);
	    else this.setAttribute(name, v);
	  };
	}

	function attrFunctionNS(fullname, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
	    else this.setAttributeNS(fullname.space, fullname.local, v);
	  };
	}

	var selection_attr = function(name, value) {
	  var fullname = namespace(name);

	  if (arguments.length < 2) {
	    var node = this.node();
	    return fullname.local
	        ? node.getAttributeNS(fullname.space, fullname.local)
	        : node.getAttribute(fullname);
	  }

	  return this.each((value == null
	      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
	      ? (fullname.local ? attrFunctionNS : attrFunction)
	      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
	};

	var window = function(node) {
	  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
	      || (node.document && node) // node is a Window
	      || node.defaultView; // node is a Document
	};

	function styleRemove(name) {
	  return function() {
	    this.style.removeProperty(name);
	  };
	}

	function styleConstant(name, value, priority) {
	  return function() {
	    this.style.setProperty(name, value, priority);
	  };
	}

	function styleFunction(name, value, priority) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.style.removeProperty(name);
	    else this.style.setProperty(name, v, priority);
	  };
	}

	var selection_style = function(name, value, priority) {
	  var node;
	  return arguments.length > 1
	      ? this.each((value == null
	            ? styleRemove : typeof value === "function"
	            ? styleFunction
	            : styleConstant)(name, value, priority == null ? "" : priority))
	      : window(node = this.node())
	          .getComputedStyle(node, null)
	          .getPropertyValue(name);
	};

	function propertyRemove(name) {
	  return function() {
	    delete this[name];
	  };
	}

	function propertyConstant(name, value) {
	  return function() {
	    this[name] = value;
	  };
	}

	function propertyFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) delete this[name];
	    else this[name] = v;
	  };
	}

	var selection_property = function(name, value) {
	  return arguments.length > 1
	      ? this.each((value == null
	          ? propertyRemove : typeof value === "function"
	          ? propertyFunction
	          : propertyConstant)(name, value))
	      : this.node()[name];
	};

	function classArray(string) {
	  return string.trim().split(/^|\s+/);
	}

	function classList(node) {
	  return node.classList || new ClassList(node);
	}

	function ClassList(node) {
	  this._node = node;
	  this._names = classArray(node.getAttribute("class") || "");
	}

	ClassList.prototype = {
	  add: function(name) {
	    var i = this._names.indexOf(name);
	    if (i < 0) {
	      this._names.push(name);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  remove: function(name) {
	    var i = this._names.indexOf(name);
	    if (i >= 0) {
	      this._names.splice(i, 1);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  contains: function(name) {
	    return this._names.indexOf(name) >= 0;
	  }
	};

	function classedAdd(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.add(names[i]);
	}

	function classedRemove(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.remove(names[i]);
	}

	function classedTrue(names) {
	  return function() {
	    classedAdd(this, names);
	  };
	}

	function classedFalse(names) {
	  return function() {
	    classedRemove(this, names);
	  };
	}

	function classedFunction(names, value) {
	  return function() {
	    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
	  };
	}

	var selection_classed = function(name, value) {
	  var names = classArray(name + "");

	  if (arguments.length < 2) {
	    var list = classList(this.node()), i = -1, n = names.length;
	    while (++i < n) if (!list.contains(names[i])) return false;
	    return true;
	  }

	  return this.each((typeof value === "function"
	      ? classedFunction : value
	      ? classedTrue
	      : classedFalse)(names, value));
	};

	function textRemove() {
	  this.textContent = "";
	}

	function textConstant(value) {
	  return function() {
	    this.textContent = value;
	  };
	}

	function textFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.textContent = v == null ? "" : v;
	  };
	}

	var selection_text = function(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? textRemove : (typeof value === "function"
	          ? textFunction
	          : textConstant)(value))
	      : this.node().textContent;
	};

	function htmlRemove() {
	  this.innerHTML = "";
	}

	function htmlConstant(value) {
	  return function() {
	    this.innerHTML = value;
	  };
	}

	function htmlFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.innerHTML = v == null ? "" : v;
	  };
	}

	var selection_html = function(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? htmlRemove : (typeof value === "function"
	          ? htmlFunction
	          : htmlConstant)(value))
	      : this.node().innerHTML;
	};

	function raise$1() {
	  if (this.nextSibling) this.parentNode.appendChild(this);
	}

	var selection_raise = function() {
	  return this.each(raise$1);
	};

	function lower() {
	  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}

	var selection_lower = function() {
	  return this.each(lower);
	};

	var selection_append = function(name) {
	  var create = typeof name === "function" ? name : creator(name);
	  return this.select(function() {
	    return this.appendChild(create.apply(this, arguments));
	  });
	};

	function constantNull() {
	  return null;
	}

	var selection_insert = function(name, before) {
	  var create = typeof name === "function" ? name : creator(name),
	      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
	  return this.select(function() {
	    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
	  });
	};

	function remove() {
	  var parent = this.parentNode;
	  if (parent) parent.removeChild(this);
	}

	var selection_remove = function() {
	  return this.each(remove);
	};

	var selection_datum = function(value) {
	  return arguments.length
	      ? this.property("__data__", value)
	      : this.node().__data__;
	};

	function dispatchEvent(node, type, params) {
	  var window$$1 = window(node),
	      event = window$$1.CustomEvent;

	  if (event) {
	    event = new event(type, params);
	  } else {
	    event = window$$1.document.createEvent("Event");
	    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
	    else event.initEvent(type, false, false);
	  }

	  node.dispatchEvent(event);
	}

	function dispatchConstant(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params);
	  };
	}

	function dispatchFunction(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params.apply(this, arguments));
	  };
	}

	var selection_dispatch = function(type, params) {
	  return this.each((typeof params === "function"
	      ? dispatchFunction
	      : dispatchConstant)(type, params));
	};

	var root = [null];

	function Selection(groups, parents) {
	  this._groups = groups;
	  this._parents = parents;
	}

	function selection() {
	  return new Selection([[document.documentElement]], root);
	}

	Selection.prototype = selection.prototype = {
	  constructor: Selection,
	  select: selection_select,
	  selectAll: selection_selectAll,
	  filter: selection_filter,
	  data: selection_data,
	  enter: selection_enter,
	  exit: selection_exit,
	  merge: selection_merge,
	  order: selection_order,
	  sort: selection_sort,
	  call: selection_call,
	  nodes: selection_nodes,
	  node: selection_node,
	  size: selection_size,
	  empty: selection_empty,
	  each: selection_each,
	  attr: selection_attr,
	  style: selection_style,
	  property: selection_property,
	  classed: selection_classed,
	  text: selection_text,
	  html: selection_html,
	  raise: selection_raise,
	  lower: selection_lower,
	  append: selection_append,
	  insert: selection_insert,
	  remove: selection_remove,
	  datum: selection_datum,
	  on: selection_on,
	  dispatch: selection_dispatch
	};

	var select = function(selector) {
	  return typeof selector === "string"
	      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
	      : new Selection([[selector]], root);
	};

	var selectAll = function(selector) {
	  return typeof selector === "string"
	      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
	      : new Selection([selector == null ? [] : selector], root);
	};

	var touch = function(node, touches, identifier) {
	  if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

	  for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
	    if ((touch = touches[i]).identifier === identifier) {
	      return point$5(node, touch);
	    }
	  }

	  return null;
	};

	var touches = function(node, touches) {
	  if (touches == null) touches = sourceEvent().touches;

	  for (var i = 0, n = touches ? touches.length : 0, points = new Array(n); i < n; ++i) {
	    points[i] = point$5(node, touches[i]);
	  }

	  return points;
	};

	var emptyOn = dispatch("start", "end", "interrupt");
	var emptyTween = [];

	var CREATED = 0;
	var SCHEDULED = 1;
	var STARTING = 2;
	var STARTED = 3;
	var RUNNING = 4;
	var ENDING = 5;
	var ENDED = 6;

	var schedule = function(node, name, id, index, group, timing) {
	  var schedules = node.__transition;
	  if (!schedules) node.__transition = {};
	  else if (id in schedules) return;
	  create(node, id, {
	    name: name,
	    index: index, // For context during callback.
	    group: group, // For context during callback.
	    on: emptyOn,
	    tween: emptyTween,
	    time: timing.time,
	    delay: timing.delay,
	    duration: timing.duration,
	    ease: timing.ease,
	    timer: null,
	    state: CREATED
	  });
	};

	function init(node, id) {
	  var schedule = node.__transition;
	  if (!schedule || !(schedule = schedule[id]) || schedule.state > CREATED) throw new Error("too late");
	  return schedule;
	}

	function set$3(node, id) {
	  var schedule = node.__transition;
	  if (!schedule || !(schedule = schedule[id]) || schedule.state > STARTING) throw new Error("too late");
	  return schedule;
	}

	function get$1(node, id) {
	  var schedule = node.__transition;
	  if (!schedule || !(schedule = schedule[id])) throw new Error("too late");
	  return schedule;
	}

	function create(node, id, self) {
	  var schedules = node.__transition,
	      tween;

	  // Initialize the self timer when the transition is created.
	  // Note the actual delay is not known until the first callback!
	  schedules[id] = self;
	  self.timer = timer(schedule, 0, self.time);

	  function schedule(elapsed) {
	    self.state = SCHEDULED;
	    self.timer.restart(start, self.delay, self.time);

	    // If the elapsed delay is less than our first sleep, start immediately.
	    if (self.delay <= elapsed) start(elapsed - self.delay);
	  }

	  function start(elapsed) {
	    var i, j, n, o;

	    // If the state is not SCHEDULED, then we previously errored on start.
	    if (self.state !== SCHEDULED) return stop();

	    for (i in schedules) {
	      o = schedules[i];
	      if (o.name !== self.name) continue;

	      // While this element already has a starting transition during this frame,
	      // defer starting an interrupting transition until that transition has a
	      // chance to tick (and possibly end); see d3/d3-transition#54!
	      if (o.state === STARTED) return timeout$1(start);

	      // Interrupt the active transition, if any.
	      // Dispatch the interrupt event.
	      if (o.state === RUNNING) {
	        o.state = ENDED;
	        o.timer.stop();
	        o.on.call("interrupt", node, node.__data__, o.index, o.group);
	        delete schedules[i];
	      }

	      // Cancel any pre-empted transitions. No interrupt event is dispatched
	      // because the cancelled transitions never started. Note that this also
	      // removes this transition from the pending list!
	      else if (+i < id) {
	        o.state = ENDED;
	        o.timer.stop();
	        delete schedules[i];
	      }
	    }

	    // Defer the first tick to end of the current frame; see d3/d3#1576.
	    // Note the transition may be canceled after start and before the first tick!
	    // Note this must be scheduled before the start event; see d3/d3-transition#16!
	    // Assuming this is successful, subsequent callbacks go straight to tick.
	    timeout$1(function() {
	      if (self.state === STARTED) {
	        self.state = RUNNING;
	        self.timer.restart(tick, self.delay, self.time);
	        tick(elapsed);
	      }
	    });

	    // Dispatch the start event.
	    // Note this must be done before the tween are initialized.
	    self.state = STARTING;
	    self.on.call("start", node, node.__data__, self.index, self.group);
	    if (self.state !== STARTING) return; // interrupted
	    self.state = STARTED;

	    // Initialize the tween, deleting null tween.
	    tween = new Array(n = self.tween.length);
	    for (i = 0, j = -1; i < n; ++i) {
	      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
	        tween[++j] = o;
	      }
	    }
	    tween.length = j + 1;
	  }

	  function tick(elapsed) {
	    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
	        i = -1,
	        n = tween.length;

	    while (++i < n) {
	      tween[i].call(null, t);
	    }

	    // Dispatch the end event.
	    if (self.state === ENDING) {
	      self.on.call("end", node, node.__data__, self.index, self.group);
	      stop();
	    }
	  }

	  function stop() {
	    self.state = ENDED;
	    self.timer.stop();
	    delete schedules[id];
	    for (var i in schedules) return; // eslint-disable-line no-unused-vars
	    delete node.__transition;
	  }
	}

	var interrupt = function(node, name) {
	  var schedules = node.__transition,
	      schedule,
	      active,
	      empty = true,
	      i;

	  if (!schedules) return;

	  name = name == null ? null : name + "";

	  for (i in schedules) {
	    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
	    active = schedule.state > STARTING && schedule.state < ENDING;
	    schedule.state = ENDED;
	    schedule.timer.stop();
	    if (active) schedule.on.call("interrupt", node, node.__data__, schedule.index, schedule.group);
	    delete schedules[i];
	  }

	  if (empty) delete node.__transition;
	};

	var selection_interrupt = function(name) {
	  return this.each(function() {
	    interrupt(this, name);
	  });
	};

	function tweenRemove(id, name) {
	  var tween0, tween1;
	  return function() {
	    var schedule = set$3(this, id),
	        tween = schedule.tween;

	    // If this node shared tween with the previous node,
	    // just assign the updated shared tween and we’re done!
	    // Otherwise, copy-on-write.
	    if (tween !== tween0) {
	      tween1 = tween0 = tween;
	      for (var i = 0, n = tween1.length; i < n; ++i) {
	        if (tween1[i].name === name) {
	          tween1 = tween1.slice();
	          tween1.splice(i, 1);
	          break;
	        }
	      }
	    }

	    schedule.tween = tween1;
	  };
	}

	function tweenFunction(id, name, value) {
	  var tween0, tween1;
	  if (typeof value !== "function") throw new Error;
	  return function() {
	    var schedule = set$3(this, id),
	        tween = schedule.tween;

	    // If this node shared tween with the previous node,
	    // just assign the updated shared tween and we’re done!
	    // Otherwise, copy-on-write.
	    if (tween !== tween0) {
	      tween1 = (tween0 = tween).slice();
	      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
	        if (tween1[i].name === name) {
	          tween1[i] = t;
	          break;
	        }
	      }
	      if (i === n) tween1.push(t);
	    }

	    schedule.tween = tween1;
	  };
	}

	var transition_tween = function(name, value) {
	  var id = this._id;

	  name += "";

	  if (arguments.length < 2) {
	    var tween = get$1(this.node(), id).tween;
	    for (var i = 0, n = tween.length, t; i < n; ++i) {
	      if ((t = tween[i]).name === name) {
	        return t.value;
	      }
	    }
	    return null;
	  }

	  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
	};

	function tweenValue(transition, name, value) {
	  var id = transition._id;

	  transition.each(function() {
	    var schedule = set$3(this, id);
	    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
	  });

	  return function(node) {
	    return get$1(node, id).value[name];
	  };
	}

	var interpolate$1 = function(a, b) {
	  var c;
	  return (typeof b === "number" ? interpolateNumber
	      : b instanceof color ? interpolateRgb
	      : (c = color(b)) ? (b = c, interpolateRgb)
	      : interpolateString)(a, b);
	};

	function attrRemove$1(name) {
	  return function() {
	    this.removeAttribute(name);
	  };
	}

	function attrRemoveNS$1(fullname) {
	  return function() {
	    this.removeAttributeNS(fullname.space, fullname.local);
	  };
	}

	function attrConstant$1(name, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = this.getAttribute(name);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function attrConstantNS$1(fullname, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = this.getAttributeNS(fullname.space, fullname.local);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function attrFunction$1(name, interpolate$$1, value) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0, value1 = value(this);
	    if (value1 == null) return void this.removeAttribute(name);
	    value0 = this.getAttribute(name);
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function attrFunctionNS$1(fullname, interpolate$$1, value) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var value0, value1 = value(this);
	    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
	    value0 = this.getAttributeNS(fullname.space, fullname.local);
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	var transition_attr = function(name, value) {
	  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate$1;
	  return this.attrTween(name, typeof value === "function"
	      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
	      : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
	      : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
	};

	function attrTweenNS(fullname, value) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.setAttributeNS(fullname.space, fullname.local, i(t));
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	function attrTween(name, value) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.setAttribute(name, i(t));
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	var transition_attrTween = function(name, value) {
	  var key = "attr." + name;
	  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	  if (value == null) return this.tween(key, null);
	  if (typeof value !== "function") throw new Error;
	  var fullname = namespace(name);
	  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
	};

	function delayFunction(id, value) {
	  return function() {
	    init(this, id).delay = +value.apply(this, arguments);
	  };
	}

	function delayConstant(id, value) {
	  return value = +value, function() {
	    init(this, id).delay = value;
	  };
	}

	var transition_delay = function(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each((typeof value === "function"
	          ? delayFunction
	          : delayConstant)(id, value))
	      : get$1(this.node(), id).delay;
	};

	function durationFunction(id, value) {
	  return function() {
	    set$3(this, id).duration = +value.apply(this, arguments);
	  };
	}

	function durationConstant(id, value) {
	  return value = +value, function() {
	    set$3(this, id).duration = value;
	  };
	}

	var transition_duration = function(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each((typeof value === "function"
	          ? durationFunction
	          : durationConstant)(id, value))
	      : get$1(this.node(), id).duration;
	};

	function easeConstant(id, value) {
	  if (typeof value !== "function") throw new Error;
	  return function() {
	    set$3(this, id).ease = value;
	  };
	}

	var transition_ease = function(value) {
	  var id = this._id;

	  return arguments.length
	      ? this.each(easeConstant(id, value))
	      : get$1(this.node(), id).ease;
	};

	var transition_filter = function(match) {
	  if (typeof match !== "function") match = matcher$1(match);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
	      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
	        subgroup.push(node);
	      }
	    }
	  }

	  return new Transition(subgroups, this._parents, this._name, this._id);
	};

	var transition_merge = function(transition) {
	  if (transition._id !== this._id) throw new Error;

	  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
	    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
	      if (node = group0[i] || group1[i]) {
	        merge[i] = node;
	      }
	    }
	  }

	  for (; j < m0; ++j) {
	    merges[j] = groups0[j];
	  }

	  return new Transition(merges, this._parents, this._name, this._id);
	};

	function start$1(name) {
	  return (name + "").trim().split(/^|\s+/).every(function(t) {
	    var i = t.indexOf(".");
	    if (i >= 0) t = t.slice(0, i);
	    return !t || t === "start";
	  });
	}

	function onFunction(id, name, listener) {
	  var on0, on1, sit = start$1(name) ? init : set$3;
	  return function() {
	    var schedule = sit(this, id),
	        on = schedule.on;

	    // If this node shared a dispatch with the previous node,
	    // just assign the updated shared dispatch and we’re done!
	    // Otherwise, copy-on-write.
	    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

	    schedule.on = on1;
	  };
	}

	var transition_on = function(name, listener) {
	  var id = this._id;

	  return arguments.length < 2
	      ? get$1(this.node(), id).on.on(name)
	      : this.each(onFunction(id, name, listener));
	};

	function removeFunction(id) {
	  return function() {
	    var parent = this.parentNode;
	    for (var i in this.__transition) if (+i !== id) return;
	    if (parent) parent.removeChild(this);
	  };
	}

	var transition_remove = function() {
	  return this.on("end.remove", removeFunction(this._id));
	};

	var transition_select = function(select$$1) {
	  var name = this._name,
	      id = this._id;

	  if (typeof select$$1 !== "function") select$$1 = selector(select$$1);

	  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
	      if ((node = group[i]) && (subnode = select$$1.call(node, node.__data__, i, group))) {
	        if ("__data__" in node) subnode.__data__ = node.__data__;
	        subgroup[i] = subnode;
	        schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
	      }
	    }
	  }

	  return new Transition(subgroups, this._parents, name, id);
	};

	var transition_selectAll = function(select$$1) {
	  var name = this._name,
	      id = this._id;

	  if (typeof select$$1 !== "function") select$$1 = selectorAll(select$$1);

	  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        for (var children = select$$1.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
	          if (child = children[k]) {
	            schedule(child, name, id, k, children, inherit);
	          }
	        }
	        subgroups.push(children);
	        parents.push(node);
	      }
	    }
	  }

	  return new Transition(subgroups, parents, name, id);
	};

	var Selection$1 = selection.prototype.constructor;

	var transition_selection = function() {
	  return new Selection$1(this._groups, this._parents);
	};

	function styleRemove$1(name, interpolate$$1) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var style = window(this).getComputedStyle(this, null),
	        value0 = style.getPropertyValue(name),
	        value1 = (this.style.removeProperty(name), style.getPropertyValue(name));
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	function styleRemoveEnd(name) {
	  return function() {
	    this.style.removeProperty(name);
	  };
	}

	function styleConstant$1(name, interpolate$$1, value1) {
	  var value00,
	      interpolate0;
	  return function() {
	    var value0 = window(this).getComputedStyle(this, null).getPropertyValue(name);
	    return value0 === value1 ? null
	        : value0 === value00 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value1);
	  };
	}

	function styleFunction$1(name, interpolate$$1, value) {
	  var value00,
	      value10,
	      interpolate0;
	  return function() {
	    var style = window(this).getComputedStyle(this, null),
	        value0 = style.getPropertyValue(name),
	        value1 = value(this);
	    if (value1 == null) value1 = (this.style.removeProperty(name), style.getPropertyValue(name));
	    return value0 === value1 ? null
	        : value0 === value00 && value1 === value10 ? interpolate0
	        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
	  };
	}

	var transition_style = function(name, value, priority) {
	  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate$1;
	  return value == null ? this
	          .styleTween(name, styleRemove$1(name, i))
	          .on("end.style." + name, styleRemoveEnd(name))
	      : this.styleTween(name, typeof value === "function"
	          ? styleFunction$1(name, i, tweenValue(this, "style." + name, value))
	          : styleConstant$1(name, i, value), priority);
	};

	function styleTween(name, value, priority) {
	  function tween() {
	    var node = this, i = value.apply(node, arguments);
	    return i && function(t) {
	      node.style.setProperty(name, i(t), priority);
	    };
	  }
	  tween._value = value;
	  return tween;
	}

	var transition_styleTween = function(name, value, priority) {
	  var key = "style." + (name += "");
	  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
	  if (value == null) return this.tween(key, null);
	  if (typeof value !== "function") throw new Error;
	  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
	};

	function textConstant$1(value) {
	  return function() {
	    this.textContent = value;
	  };
	}

	function textFunction$1(value) {
	  return function() {
	    var value1 = value(this);
	    this.textContent = value1 == null ? "" : value1;
	  };
	}

	var transition_text = function(value) {
	  return this.tween("text", typeof value === "function"
	      ? textFunction$1(tweenValue(this, "text", value))
	      : textConstant$1(value == null ? "" : value + ""));
	};

	var transition_transition = function() {
	  var name = this._name,
	      id0 = this._id,
	      id1 = newId();

	  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        var inherit = get$1(node, id0);
	        schedule(node, name, id1, i, group, {
	          time: inherit.time + inherit.delay + inherit.duration,
	          delay: 0,
	          duration: inherit.duration,
	          ease: inherit.ease
	        });
	      }
	    }
	  }

	  return new Transition(groups, this._parents, name, id1);
	};

	var id = 0;

	function Transition(groups, parents, name, id) {
	  this._groups = groups;
	  this._parents = parents;
	  this._name = name;
	  this._id = id;
	}

	function transition(name) {
	  return selection().transition(name);
	}

	function newId() {
	  return ++id;
	}

	var selection_prototype = selection.prototype;

	Transition.prototype = transition.prototype = {
	  constructor: Transition,
	  select: transition_select,
	  selectAll: transition_selectAll,
	  filter: transition_filter,
	  merge: transition_merge,
	  selection: transition_selection,
	  transition: transition_transition,
	  call: selection_prototype.call,
	  nodes: selection_prototype.nodes,
	  node: selection_prototype.node,
	  size: selection_prototype.size,
	  empty: selection_prototype.empty,
	  each: selection_prototype.each,
	  on: transition_on,
	  attr: transition_attr,
	  attrTween: transition_attrTween,
	  style: transition_style,
	  styleTween: transition_styleTween,
	  text: transition_text,
	  remove: transition_remove,
	  tween: transition_tween,
	  delay: transition_delay,
	  duration: transition_duration,
	  ease: transition_ease
	};

	var defaultTiming = {
	  time: null, // Set on use.
	  delay: 0,
	  duration: 250,
	  ease: cubicInOut
	};

	function inherit(node, id) {
	  var timing;
	  while (!(timing = node.__transition) || !(timing = timing[id])) {
	    if (!(node = node.parentNode)) {
	      return defaultTiming.time = now(), defaultTiming;
	    }
	  }
	  return timing;
	}

	var selection_transition = function(name) {
	  var id,
	      timing;

	  if (name instanceof Transition) {
	    id = name._id, name = name._name;
	  } else {
	    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
	  }

	  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        schedule(node, name, id, i, group, timing || inherit(node, id));
	      }
	    }
	  }

	  return new Transition(groups, this._parents, name, id);
	};

	selection.prototype.interrupt = selection_interrupt;
	selection.prototype.transition = selection_transition;

	var root$1 = [null];

	var active = function(node, name) {
	  var schedules = node.__transition,
	      schedule,
	      i;

	  if (schedules) {
	    name = name == null ? null : name + "";
	    for (i in schedules) {
	      if ((schedule = schedules[i]).state > SCHEDULED && schedule.name === name) {
	        return new Transition([[node]], root$1, name, +i);
	      }
	    }
	  }

	  return null;
	};

	var slice$4 = Array.prototype.slice;

	var identity$5 = function(x) {
	  return x;
	};

	var top = 1;
	var right = 2;
	var bottom = 3;
	var left = 4;
	var epsilon$2 = 1e-6;

	function translateX(scale0, scale1, d) {
	  var x = scale0(d);
	  return "translate(" + (isFinite(x) ? x : scale1(d)) + ",0)";
	}

	function translateY(scale0, scale1, d) {
	  var y = scale0(d);
	  return "translate(0," + (isFinite(y) ? y : scale1(d)) + ")";
	}

	function center(scale) {
	  var offset = scale.bandwidth() / 2;
	  if (scale.round()) offset = Math.round(offset);
	  return function(d) {
	    return scale(d) + offset;
	  };
	}

	function entering() {
	  return !this.__axis;
	}

	function axis(orient, scale) {
	  var tickArguments = [],
	      tickValues = null,
	      tickFormat = null,
	      tickSizeInner = 6,
	      tickSizeOuter = 6,
	      tickPadding = 3;

	  function axis(context) {
	    var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
	        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$5) : tickFormat,
	        spacing = Math.max(tickSizeInner, 0) + tickPadding,
	        transform = orient === top || orient === bottom ? translateX : translateY,
	        range = scale.range(),
	        range0 = range[0] + 0.5,
	        range1 = range[range.length - 1] + 0.5,
	        position = (scale.bandwidth ? center : identity$5)(scale.copy()),
	        selection = context.selection ? context.selection() : context,
	        path = selection.selectAll(".domain").data([null]),
	        tick = selection.selectAll(".tick").data(values, scale).order(),
	        tickExit = tick.exit(),
	        tickEnter = tick.enter().append("g").attr("class", "tick"),
	        line = tick.select("line"),
	        text = tick.select("text"),
	        k = orient === top || orient === left ? -1 : 1,
	        x, y = orient === left || orient === right ? (x = "x", "y") : (x = "y", "x");

	    path = path.merge(path.enter().insert("path", ".tick")
	        .attr("class", "domain")
	        .attr("stroke", "#000"));

	    tick = tick.merge(tickEnter);

	    line = line.merge(tickEnter.append("line")
	        .attr("stroke", "#000")
	        .attr(x + "2", k * tickSizeInner)
	        .attr(y + "1", 0.5)
	        .attr(y + "2", 0.5));

	    text = text.merge(tickEnter.append("text")
	        .attr("fill", "#000")
	        .attr(x, k * spacing)
	        .attr(y, 0.5)
	        .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

	    if (context !== selection) {
	      path = path.transition(context);
	      tick = tick.transition(context);
	      line = line.transition(context);
	      text = text.transition(context);

	      tickExit = tickExit.transition(context)
	          .attr("opacity", epsilon$2)
	          .attr("transform", function(d) { return transform(position, this.parentNode.__axis || position, d); });

	      tickEnter
	          .attr("opacity", epsilon$2)
	          .attr("transform", function(d) { return transform(this.parentNode.__axis || position, position, d); });
	    }

	    tickExit.remove();

	    path
	        .attr("d", orient === left || orient == right
	            ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter
	            : "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter);

	    tick
	        .attr("opacity", 1)
	        .attr("transform", function(d) { return transform(position, position, d); });

	    line
	        .attr(x + "2", k * tickSizeInner);

	    text
	        .attr(x, k * spacing)
	        .text(format);

	    selection.filter(entering)
	        .attr("fill", "none")
	        .attr("font-size", 10)
	        .attr("font-family", "sans-serif")
	        .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

	    selection
	        .each(function() { this.__axis = position; });
	  }

	  axis.scale = function(_) {
	    return arguments.length ? (scale = _, axis) : scale;
	  };

	  axis.ticks = function() {
	    return tickArguments = slice$4.call(arguments), axis;
	  };

	  axis.tickArguments = function(_) {
	    return arguments.length ? (tickArguments = _ == null ? [] : slice$4.call(_), axis) : tickArguments.slice();
	  };

	  axis.tickValues = function(_) {
	    return arguments.length ? (tickValues = _ == null ? null : slice$4.call(_), axis) : tickValues && tickValues.slice();
	  };

	  axis.tickFormat = function(_) {
	    return arguments.length ? (tickFormat = _, axis) : tickFormat;
	  };

	  axis.tickSize = function(_) {
	    return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
	  };

	  axis.tickSizeInner = function(_) {
	    return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
	  };

	  axis.tickSizeOuter = function(_) {
	    return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
	  };

	  axis.tickPadding = function(_) {
	    return arguments.length ? (tickPadding = +_, axis) : tickPadding;
	  };

	  return axis;
	}

	function axisTop(scale) {
	  return axis(top, scale);
	}

	function axisRight(scale) {
	  return axis(right, scale);
	}

	function axisBottom(scale) {
	  return axis(bottom, scale);
	}

	function axisLeft(scale) {
	  return axis(left, scale);
	}

	function defaultSeparation(a, b) {
	  return a.parent === b.parent ? 1 : 2;
	}

	function meanX(children) {
	  return children.reduce(meanXReduce, 0) / children.length;
	}

	function meanXReduce(x, c) {
	  return x + c.x;
	}

	function maxY(children) {
	  return 1 + children.reduce(maxYReduce, 0);
	}

	function maxYReduce(y, c) {
	  return Math.max(y, c.y);
	}

	function leafLeft(node) {
	  var children;
	  while (children = node.children) node = children[0];
	  return node;
	}

	function leafRight(node) {
	  var children;
	  while (children = node.children) node = children[children.length - 1];
	  return node;
	}

	var cluster = function() {
	  var separation = defaultSeparation,
	      dx = 1,
	      dy = 1,
	      nodeSize = false;

	  function cluster(root) {
	    var previousNode,
	        x = 0;

	    // First walk, computing the initial x & y values.
	    root.eachAfter(function(node) {
	      var children = node.children;
	      if (children) {
	        node.x = meanX(children);
	        node.y = maxY(children);
	      } else {
	        node.x = previousNode ? x += separation(node, previousNode) : 0;
	        node.y = 0;
	        previousNode = node;
	      }
	    });

	    var left = leafLeft(root),
	        right = leafRight(root),
	        x0 = left.x - separation(left, right) / 2,
	        x1 = right.x + separation(right, left) / 2;

	    // Second walk, normalizing x & y to the desired size.
	    return root.eachAfter(nodeSize ? function(node) {
	      node.x = (node.x - root.x) * dx;
	      node.y = (root.y - node.y) * dy;
	    } : function(node) {
	      node.x = (node.x - x0) / (x1 - x0) * dx;
	      node.y = (1 - (root.y ? node.y / root.y : 1)) * dy;
	    });
	  }

	  cluster.separation = function(x) {
	    return arguments.length ? (separation = x, cluster) : separation;
	  };

	  cluster.size = function(x) {
	    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? null : [dx, dy]);
	  };

	  cluster.nodeSize = function(x) {
	    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? [dx, dy] : null);
	  };

	  return cluster;
	};

	var node_each = function(callback) {
	  var node = this, current, next = [node], children, i, n;
	  do {
	    current = next.reverse(), next = [];
	    while (node = current.pop()) {
	      callback(node), children = node.children;
	      if (children) for (i = 0, n = children.length; i < n; ++i) {
	        next.push(children[i]);
	      }
	    }
	  } while (next.length);
	  return this;
	};

	var node_eachBefore = function(callback) {
	  var node = this, nodes = [node], children, i;
	  while (node = nodes.pop()) {
	    callback(node), children = node.children;
	    if (children) for (i = children.length - 1; i >= 0; --i) {
	      nodes.push(children[i]);
	    }
	  }
	  return this;
	};

	var node_eachAfter = function(callback) {
	  var node = this, nodes = [node], next = [], children, i, n;
	  while (node = nodes.pop()) {
	    next.push(node), children = node.children;
	    if (children) for (i = 0, n = children.length; i < n; ++i) {
	      nodes.push(children[i]);
	    }
	  }
	  while (node = next.pop()) {
	    callback(node);
	  }
	  return this;
	};

	var node_sum = function(value) {
	  return this.eachAfter(function(node) {
	    var sum = +value(node.data) || 0,
	        children = node.children,
	        i = children && children.length;
	    while (--i >= 0) sum += children[i].value;
	    node.value = sum;
	  });
	};

	var node_sort = function(compare) {
	  return this.eachBefore(function(node) {
	    if (node.children) {
	      node.children.sort(compare);
	    }
	  });
	};

	var node_path = function(end) {
	  var start = this,
	      ancestor = leastCommonAncestor(start, end),
	      nodes = [start];
	  while (start !== ancestor) {
	    start = start.parent;
	    nodes.push(start);
	  }
	  var k = nodes.length;
	  while (end !== ancestor) {
	    nodes.splice(k, 0, end);
	    end = end.parent;
	  }
	  return nodes;
	};

	function leastCommonAncestor(a, b) {
	  if (a === b) return a;
	  var aNodes = a.ancestors(),
	      bNodes = b.ancestors(),
	      c = null;
	  a = aNodes.pop();
	  b = bNodes.pop();
	  while (a === b) {
	    c = a;
	    a = aNodes.pop();
	    b = bNodes.pop();
	  }
	  return c;
	}

	var node_ancestors = function() {
	  var node = this, nodes = [node];
	  while (node = node.parent) {
	    nodes.push(node);
	  }
	  return nodes;
	};

	var node_descendants = function() {
	  var nodes = [];
	  this.each(function(node) {
	    nodes.push(node);
	  });
	  return nodes;
	};

	var node_leaves = function() {
	  var leaves = [];
	  this.eachBefore(function(node) {
	    if (!node.children) {
	      leaves.push(node);
	    }
	  });
	  return leaves;
	};

	var node_links = function() {
	  var root = this, links = [];
	  root.each(function(node) {
	    if (node !== root) { // Don’t include the root’s parent, if any.
	      links.push({source: node.parent, target: node});
	    }
	  });
	  return links;
	};

	function hierarchy(data, children) {
	  var root = new Node(data),
	      valued = +data.value && (root.value = data.value),
	      node,
	      nodes = [root],
	      child,
	      childs,
	      i,
	      n;

	  if (children == null) children = defaultChildren;

	  while (node = nodes.pop()) {
	    if (valued) node.value = +node.data.value;
	    if ((childs = children(node.data)) && (n = childs.length)) {
	      node.children = new Array(n);
	      for (i = n - 1; i >= 0; --i) {
	        nodes.push(child = node.children[i] = new Node(childs[i]));
	        child.parent = node;
	        child.depth = node.depth + 1;
	      }
	    }
	  }

	  return root.eachBefore(computeHeight);
	}

	function node_copy() {
	  return hierarchy(this).eachBefore(copyData);
	}

	function defaultChildren(d) {
	  return d.children;
	}

	function copyData(node) {
	  node.data = node.data.data;
	}

	function computeHeight(node) {
	  var height = 0;
	  do node.height = height;
	  while ((node = node.parent) && (node.height < ++height));
	}

	function Node(data) {
	  this.data = data;
	  this.depth =
	  this.height = 0;
	  this.parent = null;
	}

	Node.prototype = hierarchy.prototype = {
	  constructor: Node,
	  each: node_each,
	  eachAfter: node_eachAfter,
	  eachBefore: node_eachBefore,
	  sum: node_sum,
	  sort: node_sort,
	  path: node_path,
	  ancestors: node_ancestors,
	  descendants: node_descendants,
	  leaves: node_leaves,
	  links: node_links,
	  copy: node_copy
	};

	function Node$2(value) {
	  this._ = value;
	  this.next = null;
	}

	var shuffle$1 = function(array) {
	  var i,
	      n = (array = array.slice()).length,
	      head = null,
	      node = head;

	  while (n) {
	    var next = new Node$2(array[n - 1]);
	    if (node) node = node.next = next;
	    else node = head = next;
	    array[i] = array[--n];
	  }

	  return {
	    head: head,
	    tail: node
	  };
	};

	var enclose = function(circles) {
	  return encloseN(shuffle$1(circles), []);
	};

	function encloses(a, b) {
	  var dx = b.x - a.x,
	      dy = b.y - a.y,
	      dr = a.r - b.r;
	  return dr * dr + 1e-6 > dx * dx + dy * dy;
	}

	// Returns the smallest circle that contains circles L and intersects circles B.
	function encloseN(L, B) {
	  var circle,
	      l0 = null,
	      l1 = L.head,
	      l2,
	      p1;

	  switch (B.length) {
	    case 1: circle = enclose1(B[0]); break;
	    case 2: circle = enclose2(B[0], B[1]); break;
	    case 3: circle = enclose3(B[0], B[1], B[2]); break;
	  }

	  while (l1) {
	    p1 = l1._, l2 = l1.next;
	    if (!circle || !encloses(circle, p1)) {

	      // Temporarily truncate L before l1.
	      if (l0) L.tail = l0, l0.next = null;
	      else L.head = L.tail = null;

	      B.push(p1);
	      circle = encloseN(L, B); // Note: reorders L!
	      B.pop();

	      // Move l1 to the front of L and reconnect the truncated list L.
	      if (L.head) l1.next = L.head, L.head = l1;
	      else l1.next = null, L.head = L.tail = l1;
	      l0 = L.tail, l0.next = l2;

	    } else {
	      l0 = l1;
	    }
	    l1 = l2;
	  }

	  L.tail = l0;
	  return circle;
	}

	function enclose1(a) {
	  return {
	    x: a.x,
	    y: a.y,
	    r: a.r
	  };
	}

	function enclose2(a, b) {
	  var x1 = a.x, y1 = a.y, r1 = a.r,
	      x2 = b.x, y2 = b.y, r2 = b.r,
	      x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1,
	      l = Math.sqrt(x21 * x21 + y21 * y21);
	  return {
	    x: (x1 + x2 + x21 / l * r21) / 2,
	    y: (y1 + y2 + y21 / l * r21) / 2,
	    r: (l + r1 + r2) / 2
	  };
	}

	function enclose3(a, b, c) {
	  var x1 = a.x, y1 = a.y, r1 = a.r,
	      x2 = b.x, y2 = b.y, r2 = b.r,
	      x3 = c.x, y3 = c.y, r3 = c.r,
	      a2 = 2 * (x1 - x2),
	      b2 = 2 * (y1 - y2),
	      c2 = 2 * (r2 - r1),
	      d2 = x1 * x1 + y1 * y1 - r1 * r1 - x2 * x2 - y2 * y2 + r2 * r2,
	      a3 = 2 * (x1 - x3),
	      b3 = 2 * (y1 - y3),
	      c3 = 2 * (r3 - r1),
	      d3 = x1 * x1 + y1 * y1 - r1 * r1 - x3 * x3 - y3 * y3 + r3 * r3,
	      ab = a3 * b2 - a2 * b3,
	      xa = (b2 * d3 - b3 * d2) / ab - x1,
	      xb = (b3 * c2 - b2 * c3) / ab,
	      ya = (a3 * d2 - a2 * d3) / ab - y1,
	      yb = (a2 * c3 - a3 * c2) / ab,
	      A = xb * xb + yb * yb - 1,
	      B = 2 * (xa * xb + ya * yb + r1),
	      C = xa * xa + ya * ya - r1 * r1,
	      r = (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A);
	  return {
	    x: xa + xb * r + x1,
	    y: ya + yb * r + y1,
	    r: r
	  };
	}

	function place(a, b, c) {
	  var ax = a.x,
	      ay = a.y,
	      da = b.r + c.r,
	      db = a.r + c.r,
	      dx = b.x - ax,
	      dy = b.y - ay,
	      dc = dx * dx + dy * dy;
	  if (dc) {
	    var x = 0.5 + ((db *= db) - (da *= da)) / (2 * dc),
	        y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
	    c.x = ax + x * dx + y * dy;
	    c.y = ay + x * dy - y * dx;
	  } else {
	    c.x = ax + db;
	    c.y = ay;
	  }
	}

	function intersects(a, b) {
	  var dx = b.x - a.x,
	      dy = b.y - a.y,
	      dr = a.r + b.r;
	  return dr * dr > dx * dx + dy * dy;
	}

	function distance2(circle, x, y) {
	  var dx = circle.x - x,
	      dy = circle.y - y;
	  return dx * dx + dy * dy;
	}

	function Node$1(circle) {
	  this._ = circle;
	  this.next = null;
	  this.previous = null;
	}

	function packEnclose(circles) {
	  if (!(n = circles.length)) return 0;

	  var a, b, c, n;

	  // Place the first circle.
	  a = circles[0], a.x = 0, a.y = 0;
	  if (!(n > 1)) return a.r;

	  // Place the second circle.
	  b = circles[1], a.x = -b.r, b.x = a.r, b.y = 0;
	  if (!(n > 2)) return a.r + b.r;

	  // Place the third circle.
	  place(b, a, c = circles[2]);

	  // Initialize the weighted centroid.
	  var aa = a.r * a.r,
	      ba = b.r * b.r,
	      ca = c.r * c.r,
	      oa = aa + ba + ca,
	      ox = aa * a.x + ba * b.x + ca * c.x,
	      oy = aa * a.y + ba * b.y + ca * c.y,
	      cx, cy, i, j, k, sj, sk;

	  // Initialize the front-chain using the first three circles a, b and c.
	  a = new Node$1(a), b = new Node$1(b), c = new Node$1(c);
	  a.next = c.previous = b;
	  b.next = a.previous = c;
	  c.next = b.previous = a;

	  // Attempt to place each remaining circle…
	  pack: for (i = 3; i < n; ++i) {
	    place(a._, b._, c = circles[i]), c = new Node$1(c);

	    // If there are only three elements in the front-chain…
	    if ((k = a.previous) === (j = b.next)) {
	      // If the new circle intersects the third circle,
	      // rotate the front chain to try the next position.
	      if (intersects(j._, c._)) {
	        a = b, b = j, --i;
	        continue pack;
	      }
	    }

	    // Find the closest intersecting circle on the front-chain, if any.
	    else {
	      sj = j._.r, sk = k._.r;
	      do {
	        if (sj <= sk) {
	          if (intersects(j._, c._)) {
	            b = j, a.next = b, b.previous = a, --i;
	            continue pack;
	          }
	          j = j.next, sj += j._.r;
	        } else {
	          if (intersects(k._, c._)) {
	            a = k, a.next = b, b.previous = a, --i;
	            continue pack;
	          }
	          k = k.previous, sk += k._.r;
	        }
	      } while (j !== k.next);
	    }

	    // Success! Insert the new circle c between a and b.
	    c.previous = a, c.next = b, a.next = b.previous = b = c;

	    // Update the weighted centroid.
	    oa += ca = c._.r * c._.r;
	    ox += ca * c._.x;
	    oy += ca * c._.y;

	    // Compute the new closest circle a to centroid.
	    aa = distance2(a._, cx = ox / oa, cy = oy / oa);
	    while ((c = c.next) !== b) {
	      if ((ca = distance2(c._, cx, cy)) < aa) {
	        a = c, aa = ca;
	      }
	    }
	    b = a.next;
	  }

	  // Compute the enclosing circle of the front chain.
	  a = [b._], c = b; while ((c = c.next) !== b) a.push(c._); c = enclose(a);

	  // Translate the circles to put the enclosing circle around the origin.
	  for (i = 0; i < n; ++i) a = circles[i], a.x -= c.x, a.y -= c.y;

	  return c.r;
	}

	var siblings = function(circles) {
	  packEnclose(circles);
	  return circles;
	};

	function optional(f) {
	  return f == null ? null : required(f);
	}

	function required(f) {
	  if (typeof f !== "function") throw new Error;
	  return f;
	}

	function constantZero() {
	  return 0;
	}

	var constant$6 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function defaultRadius(d) {
	  return Math.sqrt(d.value);
	}

	var index = function() {
	  var radius = null,
	      dx = 1,
	      dy = 1,
	      padding = constantZero;

	  function pack(root) {
	    root.x = dx / 2, root.y = dy / 2;
	    if (radius) {
	      root.eachBefore(radiusLeaf(radius))
	          .eachAfter(packChildren(padding, 0.5))
	          .eachBefore(translateChild(1));
	    } else {
	      root.eachBefore(radiusLeaf(defaultRadius))
	          .eachAfter(packChildren(constantZero, 1))
	          .eachAfter(packChildren(padding, root.r / Math.min(dx, dy)))
	          .eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
	    }
	    return root;
	  }

	  pack.radius = function(x) {
	    return arguments.length ? (radius = optional(x), pack) : radius;
	  };

	  pack.size = function(x) {
	    return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
	  };

	  pack.padding = function(x) {
	    return arguments.length ? (padding = typeof x === "function" ? x : constant$6(+x), pack) : padding;
	  };

	  return pack;
	};

	function radiusLeaf(radius) {
	  return function(node) {
	    if (!node.children) {
	      node.r = Math.max(0, +radius(node) || 0);
	    }
	  };
	}

	function packChildren(padding, k) {
	  return function(node) {
	    if (children = node.children) {
	      var children,
	          i,
	          n = children.length,
	          r = padding(node) * k || 0,
	          e;

	      if (r) for (i = 0; i < n; ++i) children[i].r += r;
	      e = packEnclose(children);
	      if (r) for (i = 0; i < n; ++i) children[i].r -= r;
	      node.r = e + r;
	    }
	  };
	}

	function translateChild(k) {
	  return function(node) {
	    var parent = node.parent;
	    node.r *= k;
	    if (parent) {
	      node.x = parent.x + k * node.x;
	      node.y = parent.y + k * node.y;
	    }
	  };
	}

	var roundNode = function(node) {
	  node.x0 = Math.round(node.x0);
	  node.y0 = Math.round(node.y0);
	  node.x1 = Math.round(node.x1);
	  node.y1 = Math.round(node.y1);
	};

	var treemapDice = function(parent, x0, y0, x1, y1) {
	  var nodes = parent.children,
	      node,
	      i = -1,
	      n = nodes.length,
	      k = parent.value && (x1 - x0) / parent.value;

	  while (++i < n) {
	    node = nodes[i], node.y0 = y0, node.y1 = y1;
	    node.x0 = x0, node.x1 = x0 += node.value * k;
	  }
	};

	var partition = function() {
	  var dx = 1,
	      dy = 1,
	      padding = 0,
	      round = false;

	  function partition(root) {
	    var n = root.height + 1;
	    root.x0 =
	    root.y0 = padding;
	    root.x1 = dx;
	    root.y1 = dy / n;
	    root.eachBefore(positionNode(dy, n));
	    if (round) root.eachBefore(roundNode);
	    return root;
	  }

	  function positionNode(dy, n) {
	    return function(node) {
	      if (node.children) {
	        treemapDice(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
	      }
	      var x0 = node.x0,
	          y0 = node.y0,
	          x1 = node.x1 - padding,
	          y1 = node.y1 - padding;
	      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
	      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
	      node.x0 = x0;
	      node.y0 = y0;
	      node.x1 = x1;
	      node.y1 = y1;
	    };
	  }

	  partition.round = function(x) {
	    return arguments.length ? (round = !!x, partition) : round;
	  };

	  partition.size = function(x) {
	    return arguments.length ? (dx = +x[0], dy = +x[1], partition) : [dx, dy];
	  };

	  partition.padding = function(x) {
	    return arguments.length ? (padding = +x, partition) : padding;
	  };

	  return partition;
	};

	var keyPrefix$1 = "$";
	var preroot = {depth: -1};
	var ambiguous = {};

	function defaultId(d) {
	  return d.id;
	}

	function defaultParentId(d) {
	  return d.parentId;
	}

	var stratify = function() {
	  var id = defaultId,
	      parentId = defaultParentId;

	  function stratify(data) {
	    var d,
	        i,
	        n = data.length,
	        root,
	        parent,
	        node,
	        nodes = new Array(n),
	        nodeId,
	        nodeKey,
	        nodeByKey = {};

	    for (i = 0; i < n; ++i) {
	      d = data[i], node = nodes[i] = new Node(d);
	      if ((nodeId = id(d, i, data)) != null && (nodeId += "")) {
	        nodeKey = keyPrefix$1 + (node.id = nodeId);
	        nodeByKey[nodeKey] = nodeKey in nodeByKey ? ambiguous : node;
	      }
	    }

	    for (i = 0; i < n; ++i) {
	      node = nodes[i], nodeId = parentId(data[i], i, data);
	      if (nodeId == null || !(nodeId += "")) {
	        if (root) throw new Error("multiple roots");
	        root = node;
	      } else {
	        parent = nodeByKey[keyPrefix$1 + nodeId];
	        if (!parent) throw new Error("missing: " + nodeId);
	        if (parent === ambiguous) throw new Error("ambiguous: " + nodeId);
	        if (parent.children) parent.children.push(node);
	        else parent.children = [node];
	        node.parent = parent;
	      }
	    }

	    if (!root) throw new Error("no root");
	    root.parent = preroot;
	    root.eachBefore(function(node) { node.depth = node.parent.depth + 1; --n; }).eachBefore(computeHeight);
	    root.parent = null;
	    if (n > 0) throw new Error("cycle");

	    return root;
	  }

	  stratify.id = function(x) {
	    return arguments.length ? (id = required(x), stratify) : id;
	  };

	  stratify.parentId = function(x) {
	    return arguments.length ? (parentId = required(x), stratify) : parentId;
	  };

	  return stratify;
	};

	function defaultSeparation$1(a, b) {
	  return a.parent === b.parent ? 1 : 2;
	}

	// function radialSeparation(a, b) {
	//   return (a.parent === b.parent ? 1 : 2) / a.depth;
	// }

	// This function is used to traverse the left contour of a subtree (or
	// subforest). It returns the successor of v on this contour. This successor is
	// either given by the leftmost child of v or by the thread of v. The function
	// returns null if and only if v is on the highest level of its subtree.
	function nextLeft(v) {
	  var children = v.children;
	  return children ? children[0] : v.t;
	}

	// This function works analogously to nextLeft.
	function nextRight(v) {
	  var children = v.children;
	  return children ? children[children.length - 1] : v.t;
	}

	// Shifts the current subtree rooted at w+. This is done by increasing
	// prelim(w+) and mod(w+) by shift.
	function moveSubtree(wm, wp, shift) {
	  var change = shift / (wp.i - wm.i);
	  wp.c -= change;
	  wp.s += shift;
	  wm.c += change;
	  wp.z += shift;
	  wp.m += shift;
	}

	// All other shifts, applied to the smaller subtrees between w- and w+, are
	// performed by this function. To prepare the shifts, we have to adjust
	// change(w+), shift(w+), and change(w-).
	function executeShifts(v) {
	  var shift = 0,
	      change = 0,
	      children = v.children,
	      i = children.length,
	      w;
	  while (--i >= 0) {
	    w = children[i];
	    w.z += shift;
	    w.m += shift;
	    shift += w.s + (change += w.c);
	  }
	}

	// If vi-’s ancestor is a sibling of v, returns vi-’s ancestor. Otherwise,
	// returns the specified (default) ancestor.
	function nextAncestor(vim, v, ancestor) {
	  return vim.a.parent === v.parent ? vim.a : ancestor;
	}

	function TreeNode(node, i) {
	  this._ = node;
	  this.parent = null;
	  this.children = null;
	  this.A = null; // default ancestor
	  this.a = this; // ancestor
	  this.z = 0; // prelim
	  this.m = 0; // mod
	  this.c = 0; // change
	  this.s = 0; // shift
	  this.t = null; // thread
	  this.i = i; // number
	}

	TreeNode.prototype = Object.create(Node.prototype);

	function treeRoot(root) {
	  var tree = new TreeNode(root, 0),
	      node,
	      nodes = [tree],
	      child,
	      children,
	      i,
	      n;

	  while (node = nodes.pop()) {
	    if (children = node._.children) {
	      node.children = new Array(n = children.length);
	      for (i = n - 1; i >= 0; --i) {
	        nodes.push(child = node.children[i] = new TreeNode(children[i], i));
	        child.parent = node;
	      }
	    }
	  }

	  (tree.parent = new TreeNode(null, 0)).children = [tree];
	  return tree;
	}

	// Node-link tree diagram using the Reingold-Tilford "tidy" algorithm
	var tree = function() {
	  var separation = defaultSeparation$1,
	      dx = 1,
	      dy = 1,
	      nodeSize = null;

	  function tree(root) {
	    var t = treeRoot(root);

	    // Compute the layout using Buchheim et al.’s algorithm.
	    t.eachAfter(firstWalk), t.parent.m = -t.z;
	    t.eachBefore(secondWalk);

	    // If a fixed node size is specified, scale x and y.
	    if (nodeSize) root.eachBefore(sizeNode);

	    // If a fixed tree size is specified, scale x and y based on the extent.
	    // Compute the left-most, right-most, and depth-most nodes for extents.
	    else {
	      var left = root,
	          right = root,
	          bottom = root;
	      root.eachBefore(function(node) {
	        if (node.x < left.x) left = node;
	        if (node.x > right.x) right = node;
	        if (node.depth > bottom.depth) bottom = node;
	      });
	      var s = left === right ? 1 : separation(left, right) / 2,
	          tx = s - left.x,
	          kx = dx / (right.x + s + tx),
	          ky = dy / (bottom.depth || 1);
	      root.eachBefore(function(node) {
	        node.x = (node.x + tx) * kx;
	        node.y = node.depth * ky;
	      });
	    }

	    return root;
	  }

	  // Computes a preliminary x-coordinate for v. Before that, FIRST WALK is
	  // applied recursively to the children of v, as well as the function
	  // APPORTION. After spacing out the children by calling EXECUTE SHIFTS, the
	  // node v is placed to the midpoint of its outermost children.
	  function firstWalk(v) {
	    var children = v.children,
	        siblings = v.parent.children,
	        w = v.i ? siblings[v.i - 1] : null;
	    if (children) {
	      executeShifts(v);
	      var midpoint = (children[0].z + children[children.length - 1].z) / 2;
	      if (w) {
	        v.z = w.z + separation(v._, w._);
	        v.m = v.z - midpoint;
	      } else {
	        v.z = midpoint;
	      }
	    } else if (w) {
	      v.z = w.z + separation(v._, w._);
	    }
	    v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
	  }

	  // Computes all real x-coordinates by summing up the modifiers recursively.
	  function secondWalk(v) {
	    v._.x = v.z + v.parent.m;
	    v.m += v.parent.m;
	  }

	  // The core of the algorithm. Here, a new subtree is combined with the
	  // previous subtrees. Threads are used to traverse the inside and outside
	  // contours of the left and right subtree up to the highest common level. The
	  // vertices used for the traversals are vi+, vi-, vo-, and vo+, where the
	  // superscript o means outside and i means inside, the subscript - means left
	  // subtree and + means right subtree. For summing up the modifiers along the
	  // contour, we use respective variables si+, si-, so-, and so+. Whenever two
	  // nodes of the inside contours conflict, we compute the left one of the
	  // greatest uncommon ancestors using the function ANCESTOR and call MOVE
	  // SUBTREE to shift the subtree and prepare the shifts of smaller subtrees.
	  // Finally, we add a new thread (if necessary).
	  function apportion(v, w, ancestor) {
	    if (w) {
	      var vip = v,
	          vop = v,
	          vim = w,
	          vom = vip.parent.children[0],
	          sip = vip.m,
	          sop = vop.m,
	          sim = vim.m,
	          som = vom.m,
	          shift;
	      while (vim = nextRight(vim), vip = nextLeft(vip), vim && vip) {
	        vom = nextLeft(vom);
	        vop = nextRight(vop);
	        vop.a = v;
	        shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
	        if (shift > 0) {
	          moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
	          sip += shift;
	          sop += shift;
	        }
	        sim += vim.m;
	        sip += vip.m;
	        som += vom.m;
	        sop += vop.m;
	      }
	      if (vim && !nextRight(vop)) {
	        vop.t = vim;
	        vop.m += sim - sop;
	      }
	      if (vip && !nextLeft(vom)) {
	        vom.t = vip;
	        vom.m += sip - som;
	        ancestor = v;
	      }
	    }
	    return ancestor;
	  }

	  function sizeNode(node) {
	    node.x *= dx;
	    node.y = node.depth * dy;
	  }

	  tree.separation = function(x) {
	    return arguments.length ? (separation = x, tree) : separation;
	  };

	  tree.size = function(x) {
	    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], tree) : (nodeSize ? null : [dx, dy]);
	  };

	  tree.nodeSize = function(x) {
	    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], tree) : (nodeSize ? [dx, dy] : null);
	  };

	  return tree;
	};

	var treemapSlice = function(parent, x0, y0, x1, y1) {
	  var nodes = parent.children,
	      node,
	      i = -1,
	      n = nodes.length,
	      k = parent.value && (y1 - y0) / parent.value;

	  while (++i < n) {
	    node = nodes[i], node.x0 = x0, node.x1 = x1;
	    node.y0 = y0, node.y1 = y0 += node.value * k;
	  }
	};

	var phi = (1 + Math.sqrt(5)) / 2;

	function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
	  var rows = [],
	      nodes = parent.children,
	      row,
	      nodeValue,
	      i0 = 0,
	      i1,
	      n = nodes.length,
	      dx, dy,
	      value = parent.value,
	      sumValue,
	      minValue,
	      maxValue,
	      newRatio,
	      minRatio,
	      alpha,
	      beta;

	  while (i0 < n) {
	    dx = x1 - x0, dy = y1 - y0;
	    minValue = maxValue = sumValue = nodes[i0].value;
	    alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
	    beta = sumValue * sumValue * alpha;
	    minRatio = Math.max(maxValue / beta, beta / minValue);

	    // Keep adding nodes while the aspect ratio maintains or improves.
	    for (i1 = i0 + 1; i1 < n; ++i1) {
	      sumValue += nodeValue = nodes[i1].value;
	      if (nodeValue < minValue) minValue = nodeValue;
	      if (nodeValue > maxValue) maxValue = nodeValue;
	      beta = sumValue * sumValue * alpha;
	      newRatio = Math.max(maxValue / beta, beta / minValue);
	      if (newRatio > minRatio) { sumValue -= nodeValue; break; }
	      minRatio = newRatio;
	    }

	    // Position and record the row orientation.
	    rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
	    if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
	    else treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
	    value -= sumValue, i0 = i1;
	  }

	  return rows;
	}

	var squarify = (function custom(ratio) {

	  function squarify(parent, x0, y0, x1, y1) {
	    squarifyRatio(ratio, parent, x0, y0, x1, y1);
	  }

	  squarify.ratio = function(x) {
	    return custom((x = +x) > 1 ? x : 1);
	  };

	  return squarify;
	})(phi);

	var index$1 = function() {
	  var tile = squarify,
	      round = false,
	      dx = 1,
	      dy = 1,
	      paddingStack = [0],
	      paddingInner = constantZero,
	      paddingTop = constantZero,
	      paddingRight = constantZero,
	      paddingBottom = constantZero,
	      paddingLeft = constantZero;

	  function treemap(root) {
	    root.x0 =
	    root.y0 = 0;
	    root.x1 = dx;
	    root.y1 = dy;
	    root.eachBefore(positionNode);
	    paddingStack = [0];
	    if (round) root.eachBefore(roundNode);
	    return root;
	  }

	  function positionNode(node) {
	    var p = paddingStack[node.depth],
	        x0 = node.x0 + p,
	        y0 = node.y0 + p,
	        x1 = node.x1 - p,
	        y1 = node.y1 - p;
	    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
	    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
	    node.x0 = x0;
	    node.y0 = y0;
	    node.x1 = x1;
	    node.y1 = y1;
	    if (node.children) {
	      p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
	      x0 += paddingLeft(node) - p;
	      y0 += paddingTop(node) - p;
	      x1 -= paddingRight(node) - p;
	      y1 -= paddingBottom(node) - p;
	      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
	      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
	      tile(node, x0, y0, x1, y1);
	    }
	  }

	  treemap.round = function(x) {
	    return arguments.length ? (round = !!x, treemap) : round;
	  };

	  treemap.size = function(x) {
	    return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
	  };

	  treemap.tile = function(x) {
	    return arguments.length ? (tile = required(x), treemap) : tile;
	  };

	  treemap.padding = function(x) {
	    return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
	  };

	  treemap.paddingInner = function(x) {
	    return arguments.length ? (paddingInner = typeof x === "function" ? x : constant$6(+x), treemap) : paddingInner;
	  };

	  treemap.paddingOuter = function(x) {
	    return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
	  };

	  treemap.paddingTop = function(x) {
	    return arguments.length ? (paddingTop = typeof x === "function" ? x : constant$6(+x), treemap) : paddingTop;
	  };

	  treemap.paddingRight = function(x) {
	    return arguments.length ? (paddingRight = typeof x === "function" ? x : constant$6(+x), treemap) : paddingRight;
	  };

	  treemap.paddingBottom = function(x) {
	    return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant$6(+x), treemap) : paddingBottom;
	  };

	  treemap.paddingLeft = function(x) {
	    return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant$6(+x), treemap) : paddingLeft;
	  };

	  return treemap;
	};

	var binary = function(parent, x0, y0, x1, y1) {
	  var nodes = parent.children,
	      i, n = nodes.length,
	      sum, sums = new Array(n + 1);

	  for (sums[0] = sum = i = 0; i < n; ++i) {
	    sums[i + 1] = sum += nodes[i].value;
	  }

	  partition(0, n, parent.value, x0, y0, x1, y1);

	  function partition(i, j, value, x0, y0, x1, y1) {
	    if (i >= j - 1) {
	      var node = nodes[i];
	      node.x0 = x0, node.y0 = y0;
	      node.x1 = x1, node.y1 = y1;
	      return;
	    }

	    var valueOffset = sums[i],
	        valueTarget = (value / 2) + valueOffset,
	        k = i + 1,
	        hi = j - 1;

	    while (k < hi) {
	      var mid = k + hi >>> 1;
	      if (sums[mid] < valueTarget) k = mid + 1;
	      else hi = mid;
	    }

	    var valueLeft = sums[k] - valueOffset,
	        valueRight = value - valueLeft;

	    if ((y1 - y0) > (x1 - x0)) {
	      var yk = (y0 * valueRight + y1 * valueLeft) / value;
	      partition(i, k, valueLeft, x0, y0, x1, yk);
	      partition(k, j, valueRight, x0, yk, x1, y1);
	    } else {
	      var xk = (x0 * valueRight + x1 * valueLeft) / value;
	      partition(i, k, valueLeft, x0, y0, xk, y1);
	      partition(k, j, valueRight, xk, y0, x1, y1);
	    }
	  }
	};

	var sliceDice = function(parent, x0, y0, x1, y1) {
	  (parent.depth & 1 ? treemapSlice : treemapDice)(parent, x0, y0, x1, y1);
	};

	var resquarify = (function custom(ratio) {

	  function resquarify(parent, x0, y0, x1, y1) {
	    if ((rows = parent._squarify) && (rows.ratio === ratio)) {
	      var rows,
	          row,
	          nodes,
	          i,
	          j = -1,
	          n,
	          m = rows.length,
	          value = parent.value;

	      while (++j < m) {
	        row = rows[j], nodes = row.children;
	        for (i = row.value = 0, n = nodes.length; i < n; ++i) row.value += nodes[i].value;
	        if (row.dice) treemapDice(row, x0, y0, x1, y0 += (y1 - y0) * row.value / value);
	        else treemapSlice(row, x0, y0, x0 += (x1 - x0) * row.value / value, y1);
	        value -= row.value;
	      }
	    } else {
	      parent._squarify = rows = squarifyRatio(ratio, parent, x0, y0, x1, y1);
	      rows.ratio = ratio;
	    }
	  }

	  resquarify.ratio = function(x) {
	    return custom((x = +x) > 1 ? x : 1);
	  };

	  return resquarify;
	})(phi);

	var center$1 = function(x, y) {
	  var nodes;

	  if (x == null) x = 0;
	  if (y == null) y = 0;

	  function force() {
	    var i,
	        n = nodes.length,
	        node,
	        sx = 0,
	        sy = 0;

	    for (i = 0; i < n; ++i) {
	      node = nodes[i], sx += node.x, sy += node.y;
	    }

	    for (sx = sx / n - x, sy = sy / n - y, i = 0; i < n; ++i) {
	      node = nodes[i], node.x -= sx, node.y -= sy;
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = +_, force) : x;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = +_, force) : y;
	  };

	  return force;
	};

	var constant$7 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var jiggle = function() {
	  return (Math.random() - 0.5) * 1e-6;
	};

	function x$1(d) {
	  return d.x + d.vx;
	}

	function y$1(d) {
	  return d.y + d.vy;
	}

	var collide = function(radius) {
	  var nodes,
	      radii,
	      strength = 1,
	      iterations = 1;

	  if (typeof radius !== "function") radius = constant$7(radius == null ? 1 : +radius);

	  function force() {
	    var i, n = nodes.length,
	        tree,
	        node,
	        xi,
	        yi,
	        ri,
	        ri2;

	    for (var k = 0; k < iterations; ++k) {
	      tree = quadtree(nodes, x$1, y$1).visitAfter(prepare);
	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        ri = radii[i], ri2 = ri * ri;
	        xi = node.x + node.vx;
	        yi = node.y + node.vy;
	        tree.visit(apply);
	      }
	    }

	    function apply(quad, x0, y0, x1, y1) {
	      var data = quad.data, rj = quad.r, r = ri + rj;
	      if (data) {
	        if (data.index > i) {
	          var x = xi - data.x - data.vx,
	              y = yi - data.y - data.vy,
	              l = x * x + y * y;
	          if (l < r * r) {
	            if (x === 0) x = jiggle(), l += x * x;
	            if (y === 0) y = jiggle(), l += y * y;
	            l = (r - (l = Math.sqrt(l))) / l * strength;
	            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
	            node.vy += (y *= l) * r;
	            data.vx -= x * (r = 1 - r);
	            data.vy -= y * r;
	          }
	        }
	        return;
	      }
	      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
	    }
	  }

	  function prepare(quad) {
	    if (quad.data) return quad.r = radii[quad.data.index];
	    for (var i = quad.r = 0; i < 4; ++i) {
	      if (quad[i] && quad[i].r > quad.r) {
	        quad.r = quad[i].r;
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    radii = new Array(n);
	    for (i = 0; i < n; ++i) radii[i] = +radius(nodes[i], i, nodes);
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = +_, force) : strength;
	  };

	  force.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : radius;
	  };

	  return force;
	};

	function index$2(d, i) {
	  return i;
	}

	function find(nodeById, nodeId) {
	  var node = nodeById.get(nodeId);
	  if (!node) throw new Error("missing: " + nodeId);
	  return node;
	}

	var link = function(links) {
	  var id = index$2,
	      strength = defaultStrength,
	      strengths,
	      distance = constant$7(30),
	      distances,
	      nodes,
	      count,
	      bias,
	      iterations = 1;

	  if (links == null) links = [];

	  function defaultStrength(link) {
	    return 1 / Math.min(count[link.source.index], count[link.target.index]);
	  }

	  function force(alpha) {
	    for (var k = 0, n = links.length; k < iterations; ++k) {
	      for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
	        link = links[i], source = link.source, target = link.target;
	        x = target.x + target.vx - source.x - source.vx || jiggle();
	        y = target.y + target.vy - source.y - source.vy || jiggle();
	        l = Math.sqrt(x * x + y * y);
	        l = (l - distances[i]) / l * alpha * strengths[i];
	        x *= l, y *= l;
	        target.vx -= x * (b = bias[i]);
	        target.vy -= y * b;
	        source.vx += x * (b = 1 - b);
	        source.vy += y * b;
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;

	    var i,
	        n = nodes.length,
	        m = links.length,
	        nodeById = map$1(nodes, id),
	        link;

	    for (i = 0, count = new Array(n); i < n; ++i) {
	      count[i] = 0;
	    }

	    for (i = 0; i < m; ++i) {
	      link = links[i], link.index = i;
	      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
	      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
	      ++count[link.source.index], ++count[link.target.index];
	    }

	    for (i = 0, bias = new Array(m); i < m; ++i) {
	      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
	    }

	    strengths = new Array(m), initializeStrength();
	    distances = new Array(m), initializeDistance();
	  }

	  function initializeStrength() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      strengths[i] = +strength(links[i], i, links);
	    }
	  }

	  function initializeDistance() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      distances[i] = +distance(links[i], i, links);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.links = function(_) {
	    return arguments.length ? (links = _, initialize(), force) : links;
	  };

	  force.id = function(_) {
	    return arguments.length ? (id = _, force) : id;
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant$7(+_), initializeStrength(), force) : strength;
	  };

	  force.distance = function(_) {
	    return arguments.length ? (distance = typeof _ === "function" ? _ : constant$7(+_), initializeDistance(), force) : distance;
	  };

	  return force;
	};

	function x$2(d) {
	  return d.x;
	}

	function y$2(d) {
	  return d.y;
	}

	var initialRadius = 10;
	var initialAngle = Math.PI * (3 - Math.sqrt(5));

	var simulation = function(nodes) {
	  var simulation,
	      alpha = 1,
	      alphaMin = 0.001,
	      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
	      alphaTarget = 0,
	      velocityDecay = 0.6,
	      forces = map$1(),
	      stepper = timer(step),
	      event = dispatch("tick", "end");

	  if (nodes == null) nodes = [];

	  function step() {
	    tick();
	    event.call("tick", simulation);
	    if (alpha < alphaMin) {
	      stepper.stop();
	      event.call("end", simulation);
	    }
	  }

	  function tick() {
	    var i, n = nodes.length, node;

	    alpha += (alphaTarget - alpha) * alphaDecay;

	    forces.each(function(force) {
	      force(alpha);
	    });

	    for (i = 0; i < n; ++i) {
	      node = nodes[i];
	      if (node.fx == null) node.x += node.vx *= velocityDecay;
	      else node.x = node.fx, node.vx = 0;
	      if (node.fy == null) node.y += node.vy *= velocityDecay;
	      else node.y = node.fy, node.vy = 0;
	    }
	  }

	  function initializeNodes() {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.index = i;
	      if (isNaN(node.x) || isNaN(node.y)) {
	        var radius = initialRadius * Math.sqrt(i), angle = i * initialAngle;
	        node.x = radius * Math.cos(angle);
	        node.y = radius * Math.sin(angle);
	      }
	      if (isNaN(node.vx) || isNaN(node.vy)) {
	        node.vx = node.vy = 0;
	      }
	    }
	  }

	  function initializeForce(force) {
	    if (force.initialize) force.initialize(nodes);
	    return force;
	  }

	  initializeNodes();

	  return simulation = {
	    tick: tick,

	    restart: function() {
	      return stepper.restart(step), simulation;
	    },

	    stop: function() {
	      return stepper.stop(), simulation;
	    },

	    nodes: function(_) {
	      return arguments.length ? (nodes = _, initializeNodes(), forces.each(initializeForce), simulation) : nodes;
	    },

	    alpha: function(_) {
	      return arguments.length ? (alpha = +_, simulation) : alpha;
	    },

	    alphaMin: function(_) {
	      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
	    },

	    alphaDecay: function(_) {
	      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
	    },

	    alphaTarget: function(_) {
	      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
	    },

	    velocityDecay: function(_) {
	      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
	    },

	    force: function(name, _) {
	      return arguments.length > 1 ? ((_ == null ? forces.remove(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
	    },

	    find: function(x, y, radius) {
	      var i = 0,
	          n = nodes.length,
	          dx,
	          dy,
	          d2,
	          node,
	          closest;

	      if (radius == null) radius = Infinity;
	      else radius *= radius;

	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        dx = x - node.x;
	        dy = y - node.y;
	        d2 = dx * dx + dy * dy;
	        if (d2 < radius) closest = node, radius = d2;
	      }

	      return closest;
	    },

	    on: function(name, _) {
	      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
	    }
	  };
	};

	var manyBody = function() {
	  var nodes,
	      node,
	      alpha,
	      strength = constant$7(-30),
	      strengths,
	      distanceMin2 = 1,
	      distanceMax2 = Infinity,
	      theta2 = 0.81;

	  function force(_) {
	    var i, n = nodes.length, tree = quadtree(nodes, x$2, y$2).visitAfter(accumulate);
	    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    for (i = 0; i < n; ++i) strengths[i] = +strength(nodes[i], i, nodes);
	  }

	  function accumulate(quad) {
	    var strength = 0, q, c, x$$1, y$$1, i;

	    // For internal nodes, accumulate forces from child quadrants.
	    if (quad.length) {
	      for (x$$1 = y$$1 = i = 0; i < 4; ++i) {
	        if ((q = quad[i]) && (c = q.value)) {
	          strength += c, x$$1 += c * q.x, y$$1 += c * q.y;
	        }
	      }
	      quad.x = x$$1 / strength;
	      quad.y = y$$1 / strength;
	    }

	    // For leaf nodes, accumulate forces from coincident quadrants.
	    else {
	      q = quad;
	      q.x = q.data.x;
	      q.y = q.data.y;
	      do strength += strengths[q.data.index];
	      while (q = q.next);
	    }

	    quad.value = strength;
	  }

	  function apply(quad, x1, _, x2) {
	    if (!quad.value) return true;

	    var x$$1 = quad.x - node.x,
	        y$$1 = quad.y - node.y,
	        w = x2 - x1,
	        l = x$$1 * x$$1 + y$$1 * y$$1;

	    // Apply the Barnes-Hut approximation if possible.
	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (w * w / theta2 < l) {
	      if (l < distanceMax2) {
	        if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
	        if (y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
	        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	        node.vx += x$$1 * quad.value * alpha / l;
	        node.vy += y$$1 * quad.value * alpha / l;
	      }
	      return true;
	    }

	    // Otherwise, process points directly.
	    else if (quad.length || l >= distanceMax2) return;

	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (quad.data !== node || quad.next) {
	      if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
	      if (y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
	      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	    }

	    do if (quad.data !== node) {
	      w = strengths[quad.data.index] * alpha / l;
	      node.vx += x$$1 * w;
	      node.vy += y$$1 * w;
	    } while (quad = quad.next);
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : strength;
	  };

	  force.distanceMin = function(_) {
	    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
	  };

	  force.distanceMax = function(_) {
	    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
	  };

	  force.theta = function(_) {
	    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
	  };

	  return force;
	};

	var x$3 = function(x) {
	  var strength = constant$7(0.1),
	      nodes,
	      strengths,
	      xz;

	  if (typeof x !== "function") x = constant$7(x == null ? 0 : +x);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    xz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : strength;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : x;
	  };

	  return force;
	};

	var y$3 = function(y) {
	  var strength = constant$7(0.1),
	      nodes,
	      strengths,
	      yz;

	  if (typeof y !== "function") y = constant$7(y == null ? 0 : +y);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    yz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : strength;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = typeof _ === "function" ? _ : constant$7(+_), initialize(), force) : y;
	  };

	  return force;
	};

	function nopropagation() {
	  exports.event.stopImmediatePropagation();
	}

	var noevent = function() {
	  exports.event.preventDefault();
	  exports.event.stopImmediatePropagation();
	};

	var dragDisable = function(view) {
	  var root = view.document.documentElement,
	      selection$$1 = select(view).on("dragstart.drag", noevent, true);
	  if ("onselectstart" in root) {
	    selection$$1.on("selectstart.drag", noevent, true);
	  } else {
	    root.__noselect = root.style.MozUserSelect;
	    root.style.MozUserSelect = "none";
	  }
	};

	function yesdrag(view, noclick) {
	  var root = view.document.documentElement,
	      selection$$1 = select(view).on("dragstart.drag", null);
	  if (noclick) {
	    selection$$1.on("click.drag", noevent, true);
	    setTimeout(function() { selection$$1.on("click.drag", null); }, 0);
	  }
	  if ("onselectstart" in root) {
	    selection$$1.on("selectstart.drag", null);
	  } else {
	    root.style.MozUserSelect = root.__noselect;
	    delete root.__noselect;
	  }
	}

	var constant$8 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function DragEvent(target, type, subject, id, active, x, y, dx, dy, dispatch) {
	  this.target = target;
	  this.type = type;
	  this.subject = subject;
	  this.identifier = id;
	  this.active = active;
	  this.x = x;
	  this.y = y;
	  this.dx = dx;
	  this.dy = dy;
	  this._ = dispatch;
	}

	DragEvent.prototype.on = function() {
	  var value = this._.on.apply(this._, arguments);
	  return value === this._ ? this : value;
	};

	// Ignore right-click, since that should open the context menu.
	function defaultFilter() {
	  return !exports.event.button;
	}

	function defaultContainer() {
	  return this.parentNode;
	}

	function defaultSubject(d) {
	  return d == null ? {x: exports.event.x, y: exports.event.y} : d;
	}

	var drag = function() {
	  var filter = defaultFilter,
	      container = defaultContainer,
	      subject = defaultSubject,
	      gestures = {},
	      listeners = dispatch("start", "drag", "end"),
	      active = 0,
	      mousemoving,
	      touchending;

	  function drag(selection$$1) {
	    selection$$1
	        .on("mousedown.drag", mousedowned)
	        .on("touchstart.drag", touchstarted)
	        .on("touchmove.drag", touchmoved)
	        .on("touchend.drag touchcancel.drag", touchended)
	        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
	  }

	  function mousedowned() {
	    if (touchending || !filter.apply(this, arguments)) return;
	    var gesture = beforestart("mouse", container.apply(this, arguments), mouse, this, arguments);
	    if (!gesture) return;
	    select(exports.event.view).on("mousemove.drag", mousemoved, true).on("mouseup.drag", mouseupped, true);
	    dragDisable(exports.event.view);
	    nopropagation();
	    mousemoving = false;
	    gesture("start");
	  }

	  function mousemoved() {
	    noevent();
	    mousemoving = true;
	    gestures.mouse("drag");
	  }

	  function mouseupped() {
	    select(exports.event.view).on("mousemove.drag mouseup.drag", null);
	    yesdrag(exports.event.view, mousemoving);
	    noevent();
	    gestures.mouse("end");
	  }

	  function touchstarted() {
	    if (!filter.apply(this, arguments)) return;
	    var touches$$1 = exports.event.changedTouches,
	        c = container.apply(this, arguments),
	        n = touches$$1.length, i, gesture;

	    for (i = 0; i < n; ++i) {
	      if (gesture = beforestart(touches$$1[i].identifier, c, touch, this, arguments)) {
	        nopropagation();
	        gesture("start");
	      }
	    }
	  }

	  function touchmoved() {
	    var touches$$1 = exports.event.changedTouches,
	        n = touches$$1.length, i, gesture;

	    for (i = 0; i < n; ++i) {
	      if (gesture = gestures[touches$$1[i].identifier]) {
	        noevent();
	        gesture("drag");
	      }
	    }
	  }

	  function touchended() {
	    var touches$$1 = exports.event.changedTouches,
	        n = touches$$1.length, i, gesture;

	    if (touchending) clearTimeout(touchending);
	    touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
	    for (i = 0; i < n; ++i) {
	      if (gesture = gestures[touches$$1[i].identifier]) {
	        nopropagation();
	        gesture("end");
	      }
	    }
	  }

	  function beforestart(id, container, point, that, args) {
	    var p = point(container, id), s, dx, dy,
	        sublisteners = listeners.copy();

	    if (!customEvent(new DragEvent(drag, "beforestart", s, id, active, p[0], p[1], 0, 0, sublisteners), function() {
	      if ((exports.event.subject = s = subject.apply(that, args)) == null) return false;
	      dx = s.x - p[0] || 0;
	      dy = s.y - p[1] || 0;
	      return true;
	    })) return;

	    return function gesture(type) {
	      var p0 = p, n;
	      switch (type) {
	        case "start": gestures[id] = gesture, n = active++; break;
	        case "end": delete gestures[id], --active; // nobreak
	        case "drag": p = point(container, id), n = active; break;
	      }
	      customEvent(new DragEvent(drag, type, s, id, n, p[0] + dx, p[1] + dy, p[0] - p0[0], p[1] - p0[1], sublisteners), sublisteners.apply, sublisteners, [type, that, args]);
	    };
	  }

	  drag.filter = function(_) {
	    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$8(!!_), drag) : filter;
	  };

	  drag.container = function(_) {
	    return arguments.length ? (container = typeof _ === "function" ? _ : constant$8(_), drag) : container;
	  };

	  drag.subject = function(_) {
	    return arguments.length ? (subject = typeof _ === "function" ? _ : constant$8(_), drag) : subject;
	  };

	  drag.on = function() {
	    var value = listeners.on.apply(listeners, arguments);
	    return value === listeners ? drag : value;
	  };

	  return drag;
	};

	var constant$9 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function x$4(d) {
	  return d[0];
	}

	function y$4(d) {
	  return d[1];
	}

	function RedBlackTree() {
	  this._ = null; // root node
	}

	function RedBlackNode(node) {
	  node.U = // parent node
	  node.C = // color - true for red, false for black
	  node.L = // left node
	  node.R = // right node
	  node.P = // previous node
	  node.N = null; // next node
	}

	RedBlackTree.prototype = {
	  constructor: RedBlackTree,

	  insert: function(after, node) {
	    var parent, grandpa, uncle;

	    if (after) {
	      node.P = after;
	      node.N = after.N;
	      if (after.N) after.N.P = node;
	      after.N = node;
	      if (after.R) {
	        after = after.R;
	        while (after.L) after = after.L;
	        after.L = node;
	      } else {
	        after.R = node;
	      }
	      parent = after;
	    } else if (this._) {
	      after = RedBlackFirst(this._);
	      node.P = null;
	      node.N = after;
	      after.P = after.L = node;
	      parent = after;
	    } else {
	      node.P = node.N = null;
	      this._ = node;
	      parent = null;
	    }
	    node.L = node.R = null;
	    node.U = parent;
	    node.C = true;

	    after = node;
	    while (parent && parent.C) {
	      grandpa = parent.U;
	      if (parent === grandpa.L) {
	        uncle = grandpa.R;
	        if (uncle && uncle.C) {
	          parent.C = uncle.C = false;
	          grandpa.C = true;
	          after = grandpa;
	        } else {
	          if (after === parent.R) {
	            RedBlackRotateLeft(this, parent);
	            after = parent;
	            parent = after.U;
	          }
	          parent.C = false;
	          grandpa.C = true;
	          RedBlackRotateRight(this, grandpa);
	        }
	      } else {
	        uncle = grandpa.L;
	        if (uncle && uncle.C) {
	          parent.C = uncle.C = false;
	          grandpa.C = true;
	          after = grandpa;
	        } else {
	          if (after === parent.L) {
	            RedBlackRotateRight(this, parent);
	            after = parent;
	            parent = after.U;
	          }
	          parent.C = false;
	          grandpa.C = true;
	          RedBlackRotateLeft(this, grandpa);
	        }
	      }
	      parent = after.U;
	    }
	    this._.C = false;
	  },

	  remove: function(node) {
	    if (node.N) node.N.P = node.P;
	    if (node.P) node.P.N = node.N;
	    node.N = node.P = null;

	    var parent = node.U,
	        sibling,
	        left = node.L,
	        right = node.R,
	        next,
	        red;

	    if (!left) next = right;
	    else if (!right) next = left;
	    else next = RedBlackFirst(right);

	    if (parent) {
	      if (parent.L === node) parent.L = next;
	      else parent.R = next;
	    } else {
	      this._ = next;
	    }

	    if (left && right) {
	      red = next.C;
	      next.C = node.C;
	      next.L = left;
	      left.U = next;
	      if (next !== right) {
	        parent = next.U;
	        next.U = node.U;
	        node = next.R;
	        parent.L = node;
	        next.R = right;
	        right.U = next;
	      } else {
	        next.U = parent;
	        parent = next;
	        node = next.R;
	      }
	    } else {
	      red = node.C;
	      node = next;
	    }

	    if (node) node.U = parent;
	    if (red) return;
	    if (node && node.C) { node.C = false; return; }

	    do {
	      if (node === this._) break;
	      if (node === parent.L) {
	        sibling = parent.R;
	        if (sibling.C) {
	          sibling.C = false;
	          parent.C = true;
	          RedBlackRotateLeft(this, parent);
	          sibling = parent.R;
	        }
	        if ((sibling.L && sibling.L.C)
	            || (sibling.R && sibling.R.C)) {
	          if (!sibling.R || !sibling.R.C) {
	            sibling.L.C = false;
	            sibling.C = true;
	            RedBlackRotateRight(this, sibling);
	            sibling = parent.R;
	          }
	          sibling.C = parent.C;
	          parent.C = sibling.R.C = false;
	          RedBlackRotateLeft(this, parent);
	          node = this._;
	          break;
	        }
	      } else {
	        sibling = parent.L;
	        if (sibling.C) {
	          sibling.C = false;
	          parent.C = true;
	          RedBlackRotateRight(this, parent);
	          sibling = parent.L;
	        }
	        if ((sibling.L && sibling.L.C)
	          || (sibling.R && sibling.R.C)) {
	          if (!sibling.L || !sibling.L.C) {
	            sibling.R.C = false;
	            sibling.C = true;
	            RedBlackRotateLeft(this, sibling);
	            sibling = parent.L;
	          }
	          sibling.C = parent.C;
	          parent.C = sibling.L.C = false;
	          RedBlackRotateRight(this, parent);
	          node = this._;
	          break;
	        }
	      }
	      sibling.C = true;
	      node = parent;
	      parent = parent.U;
	    } while (!node.C);

	    if (node) node.C = false;
	  }
	};

	function RedBlackRotateLeft(tree, node) {
	  var p = node,
	      q = node.R,
	      parent = p.U;

	  if (parent) {
	    if (parent.L === p) parent.L = q;
	    else parent.R = q;
	  } else {
	    tree._ = q;
	  }

	  q.U = parent;
	  p.U = q;
	  p.R = q.L;
	  if (p.R) p.R.U = p;
	  q.L = p;
	}

	function RedBlackRotateRight(tree, node) {
	  var p = node,
	      q = node.L,
	      parent = p.U;

	  if (parent) {
	    if (parent.L === p) parent.L = q;
	    else parent.R = q;
	  } else {
	    tree._ = q;
	  }

	  q.U = parent;
	  p.U = q;
	  p.L = q.R;
	  if (p.L) p.L.U = p;
	  q.R = p;
	}

	function RedBlackFirst(node) {
	  while (node.L) node = node.L;
	  return node;
	}

	function createEdge(left, right, v0, v1) {
	  var edge = [null, null],
	      index = edges.push(edge) - 1;
	  edge.left = left;
	  edge.right = right;
	  if (v0) setEdgeEnd(edge, left, right, v0);
	  if (v1) setEdgeEnd(edge, right, left, v1);
	  cells[left.index].halfedges.push(index);
	  cells[right.index].halfedges.push(index);
	  return edge;
	}

	function createBorderEdge(left, v0, v1) {
	  var edge = [v0, v1];
	  edge.left = left;
	  return edge;
	}

	function setEdgeEnd(edge, left, right, vertex) {
	  if (!edge[0] && !edge[1]) {
	    edge[0] = vertex;
	    edge.left = left;
	    edge.right = right;
	  } else if (edge.left === right) {
	    edge[1] = vertex;
	  } else {
	    edge[0] = vertex;
	  }
	}

	// Liang–Barsky line clipping.
	function clipEdge(edge, x0, y0, x1, y1) {
	  var a = edge[0],
	      b = edge[1],
	      ax = a[0],
	      ay = a[1],
	      bx = b[0],
	      by = b[1],
	      t0 = 0,
	      t1 = 1,
	      dx = bx - ax,
	      dy = by - ay,
	      r;

	  r = x0 - ax;
	  if (!dx && r > 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dx > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = x1 - ax;
	  if (!dx && r < 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dx > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  r = y0 - ay;
	  if (!dy && r > 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dy > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = y1 - ay;
	  if (!dy && r < 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dy > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  if (!(t0 > 0) && !(t1 < 1)) return true; // TODO Better check?

	  if (t0 > 0) edge[0] = [ax + t0 * dx, ay + t0 * dy];
	  if (t1 < 1) edge[1] = [ax + t1 * dx, ay + t1 * dy];
	  return true;
	}

	function connectEdge(edge, x0, y0, x1, y1) {
	  var v1 = edge[1];
	  if (v1) return true;

	  var v0 = edge[0],
	      left = edge.left,
	      right = edge.right,
	      lx = left[0],
	      ly = left[1],
	      rx = right[0],
	      ry = right[1],
	      fx = (lx + rx) / 2,
	      fy = (ly + ry) / 2,
	      fm,
	      fb;

	  if (ry === ly) {
	    if (fx < x0 || fx >= x1) return;
	    if (lx > rx) {
	      if (!v0) v0 = [fx, y0];
	      else if (v0[1] >= y1) return;
	      v1 = [fx, y1];
	    } else {
	      if (!v0) v0 = [fx, y1];
	      else if (v0[1] < y0) return;
	      v1 = [fx, y0];
	    }
	  } else {
	    fm = (lx - rx) / (ry - ly);
	    fb = fy - fm * fx;
	    if (fm < -1 || fm > 1) {
	      if (lx > rx) {
	        if (!v0) v0 = [(y0 - fb) / fm, y0];
	        else if (v0[1] >= y1) return;
	        v1 = [(y1 - fb) / fm, y1];
	      } else {
	        if (!v0) v0 = [(y1 - fb) / fm, y1];
	        else if (v0[1] < y0) return;
	        v1 = [(y0 - fb) / fm, y0];
	      }
	    } else {
	      if (ly < ry) {
	        if (!v0) v0 = [x0, fm * x0 + fb];
	        else if (v0[0] >= x1) return;
	        v1 = [x1, fm * x1 + fb];
	      } else {
	        if (!v0) v0 = [x1, fm * x1 + fb];
	        else if (v0[0] < x0) return;
	        v1 = [x0, fm * x0 + fb];
	      }
	    }
	  }

	  edge[0] = v0;
	  edge[1] = v1;
	  return true;
	}

	function clipEdges(x0, y0, x1, y1) {
	  var i = edges.length,
	      edge;

	  while (i--) {
	    if (!connectEdge(edge = edges[i], x0, y0, x1, y1)
	        || !clipEdge(edge, x0, y0, x1, y1)
	        || !(Math.abs(edge[0][0] - edge[1][0]) > epsilon$3
	            || Math.abs(edge[0][1] - edge[1][1]) > epsilon$3)) {
	      delete edges[i];
	    }
	  }
	}

	function createCell(site) {
	  return cells[site.index] = {
	    site: site,
	    halfedges: []
	  };
	}

	function cellHalfedgeAngle(cell, edge) {
	  var site = cell.site,
	      va = edge.left,
	      vb = edge.right;
	  if (site === vb) vb = va, va = site;
	  if (vb) return Math.atan2(vb[1] - va[1], vb[0] - va[0]);
	  if (site === va) va = edge[1], vb = edge[0];
	  else va = edge[0], vb = edge[1];
	  return Math.atan2(va[0] - vb[0], vb[1] - va[1]);
	}

	function cellHalfedgeStart(cell, edge) {
	  return edge[+(edge.left !== cell.site)];
	}

	function cellHalfedgeEnd(cell, edge) {
	  return edge[+(edge.left === cell.site)];
	}

	function sortCellHalfedges() {
	  for (var i = 0, n = cells.length, cell, halfedges, j, m; i < n; ++i) {
	    if ((cell = cells[i]) && (m = (halfedges = cell.halfedges).length)) {
	      var index = new Array(m),
	          array = new Array(m);
	      for (j = 0; j < m; ++j) index[j] = j, array[j] = cellHalfedgeAngle(cell, edges[halfedges[j]]);
	      index.sort(function(i, j) { return array[j] - array[i]; });
	      for (j = 0; j < m; ++j) array[j] = halfedges[index[j]];
	      for (j = 0; j < m; ++j) halfedges[j] = array[j];
	    }
	  }
	}

	function clipCells(x0, y0, x1, y1) {
	  var nCells = cells.length,
	      iCell,
	      cell,
	      site,
	      iHalfedge,
	      halfedges,
	      nHalfedges,
	      start,
	      startX,
	      startY,
	      end,
	      endX,
	      endY,
	      cover = true;

	  for (iCell = 0; iCell < nCells; ++iCell) {
	    if (cell = cells[iCell]) {
	      site = cell.site;
	      halfedges = cell.halfedges;
	      iHalfedge = halfedges.length;

	      // Remove any dangling clipped edges.
	      while (iHalfedge--) {
	        if (!edges[halfedges[iHalfedge]]) {
	          halfedges.splice(iHalfedge, 1);
	        }
	      }

	      // Insert any border edges as necessary.
	      iHalfedge = 0, nHalfedges = halfedges.length;
	      while (iHalfedge < nHalfedges) {
	        end = cellHalfedgeEnd(cell, edges[halfedges[iHalfedge]]), endX = end[0], endY = end[1];
	        start = cellHalfedgeStart(cell, edges[halfedges[++iHalfedge % nHalfedges]]), startX = start[0], startY = start[1];
	        if (Math.abs(endX - startX) > epsilon$3 || Math.abs(endY - startY) > epsilon$3) {
	          halfedges.splice(iHalfedge, 0, edges.push(createBorderEdge(site, end,
	              Math.abs(endX - x0) < epsilon$3 && y1 - endY > epsilon$3 ? [x0, Math.abs(startX - x0) < epsilon$3 ? startY : y1]
	              : Math.abs(endY - y1) < epsilon$3 && x1 - endX > epsilon$3 ? [Math.abs(startY - y1) < epsilon$3 ? startX : x1, y1]
	              : Math.abs(endX - x1) < epsilon$3 && endY - y0 > epsilon$3 ? [x1, Math.abs(startX - x1) < epsilon$3 ? startY : y0]
	              : Math.abs(endY - y0) < epsilon$3 && endX - x0 > epsilon$3 ? [Math.abs(startY - y0) < epsilon$3 ? startX : x0, y0]
	              : null)) - 1);
	          ++nHalfedges;
	        }
	      }

	      if (nHalfedges) cover = false;
	    }
	  }

	  // If there weren’t any edges, have the closest site cover the extent.
	  // It doesn’t matter which corner of the extent we measure!
	  if (cover) {
	    var dx, dy, d2, dc = Infinity;

	    for (iCell = 0, cover = null; iCell < nCells; ++iCell) {
	      if (cell = cells[iCell]) {
	        site = cell.site;
	        dx = site[0] - x0;
	        dy = site[1] - y0;
	        d2 = dx * dx + dy * dy;
	        if (d2 < dc) dc = d2, cover = cell;
	      }
	    }

	    if (cover) {
	      var v00 = [x0, y0], v01 = [x0, y1], v11 = [x1, y1], v10 = [x1, y0];
	      cover.halfedges.push(
	        edges.push(createBorderEdge(site = cover.site, v00, v01)) - 1,
	        edges.push(createBorderEdge(site, v01, v11)) - 1,
	        edges.push(createBorderEdge(site, v11, v10)) - 1,
	        edges.push(createBorderEdge(site, v10, v00)) - 1
	      );
	    }
	  }

	  // Lastly delete any cells with no edges; these were entirely clipped.
	  for (iCell = 0; iCell < nCells; ++iCell) {
	    if (cell = cells[iCell]) {
	      if (!cell.halfedges.length) {
	        delete cells[iCell];
	      }
	    }
	  }
	}

	var circlePool = [];

	var firstCircle;

	function Circle() {
	  RedBlackNode(this);
	  this.x =
	  this.y =
	  this.arc =
	  this.site =
	  this.cy = null;
	}

	function attachCircle(arc) {
	  var lArc = arc.P,
	      rArc = arc.N;

	  if (!lArc || !rArc) return;

	  var lSite = lArc.site,
	      cSite = arc.site,
	      rSite = rArc.site;

	  if (lSite === rSite) return;

	  var bx = cSite[0],
	      by = cSite[1],
	      ax = lSite[0] - bx,
	      ay = lSite[1] - by,
	      cx = rSite[0] - bx,
	      cy = rSite[1] - by;

	  var d = 2 * (ax * cy - ay * cx);
	  if (d >= -epsilon2$1) return;

	  var ha = ax * ax + ay * ay,
	      hc = cx * cx + cy * cy,
	      x = (cy * ha - ay * hc) / d,
	      y = (ax * hc - cx * ha) / d;

	  var circle = circlePool.pop() || new Circle;
	  circle.arc = arc;
	  circle.site = cSite;
	  circle.x = x + bx;
	  circle.y = (circle.cy = y + by) + Math.sqrt(x * x + y * y); // y bottom

	  arc.circle = circle;

	  var before = null,
	      node = circles._;

	  while (node) {
	    if (circle.y < node.y || (circle.y === node.y && circle.x <= node.x)) {
	      if (node.L) node = node.L;
	      else { before = node.P; break; }
	    } else {
	      if (node.R) node = node.R;
	      else { before = node; break; }
	    }
	  }

	  circles.insert(before, circle);
	  if (!before) firstCircle = circle;
	}

	function detachCircle(arc) {
	  var circle = arc.circle;
	  if (circle) {
	    if (!circle.P) firstCircle = circle.N;
	    circles.remove(circle);
	    circlePool.push(circle);
	    RedBlackNode(circle);
	    arc.circle = null;
	  }
	}

	var beachPool = [];

	function Beach() {
	  RedBlackNode(this);
	  this.edge =
	  this.site =
	  this.circle = null;
	}

	function createBeach(site) {
	  var beach = beachPool.pop() || new Beach;
	  beach.site = site;
	  return beach;
	}

	function detachBeach(beach) {
	  detachCircle(beach);
	  beaches.remove(beach);
	  beachPool.push(beach);
	  RedBlackNode(beach);
	}

	function removeBeach(beach) {
	  var circle = beach.circle,
	      x = circle.x,
	      y = circle.cy,
	      vertex = [x, y],
	      previous = beach.P,
	      next = beach.N,
	      disappearing = [beach];

	  detachBeach(beach);

	  var lArc = previous;
	  while (lArc.circle
	      && Math.abs(x - lArc.circle.x) < epsilon$3
	      && Math.abs(y - lArc.circle.cy) < epsilon$3) {
	    previous = lArc.P;
	    disappearing.unshift(lArc);
	    detachBeach(lArc);
	    lArc = previous;
	  }

	  disappearing.unshift(lArc);
	  detachCircle(lArc);

	  var rArc = next;
	  while (rArc.circle
	      && Math.abs(x - rArc.circle.x) < epsilon$3
	      && Math.abs(y - rArc.circle.cy) < epsilon$3) {
	    next = rArc.N;
	    disappearing.push(rArc);
	    detachBeach(rArc);
	    rArc = next;
	  }

	  disappearing.push(rArc);
	  detachCircle(rArc);

	  var nArcs = disappearing.length,
	      iArc;
	  for (iArc = 1; iArc < nArcs; ++iArc) {
	    rArc = disappearing[iArc];
	    lArc = disappearing[iArc - 1];
	    setEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
	  }

	  lArc = disappearing[0];
	  rArc = disappearing[nArcs - 1];
	  rArc.edge = createEdge(lArc.site, rArc.site, null, vertex);

	  attachCircle(lArc);
	  attachCircle(rArc);
	}

	function addBeach(site) {
	  var x = site[0],
	      directrix = site[1],
	      lArc,
	      rArc,
	      dxl,
	      dxr,
	      node = beaches._;

	  while (node) {
	    dxl = leftBreakPoint(node, directrix) - x;
	    if (dxl > epsilon$3) node = node.L; else {
	      dxr = x - rightBreakPoint(node, directrix);
	      if (dxr > epsilon$3) {
	        if (!node.R) {
	          lArc = node;
	          break;
	        }
	        node = node.R;
	      } else {
	        if (dxl > -epsilon$3) {
	          lArc = node.P;
	          rArc = node;
	        } else if (dxr > -epsilon$3) {
	          lArc = node;
	          rArc = node.N;
	        } else {
	          lArc = rArc = node;
	        }
	        break;
	      }
	    }
	  }

	  createCell(site);
	  var newArc = createBeach(site);
	  beaches.insert(lArc, newArc);

	  if (!lArc && !rArc) return;

	  if (lArc === rArc) {
	    detachCircle(lArc);
	    rArc = createBeach(lArc.site);
	    beaches.insert(newArc, rArc);
	    newArc.edge = rArc.edge = createEdge(lArc.site, newArc.site);
	    attachCircle(lArc);
	    attachCircle(rArc);
	    return;
	  }

	  if (!rArc) { // && lArc
	    newArc.edge = createEdge(lArc.site, newArc.site);
	    return;
	  }

	  // else lArc !== rArc
	  detachCircle(lArc);
	  detachCircle(rArc);

	  var lSite = lArc.site,
	      ax = lSite[0],
	      ay = lSite[1],
	      bx = site[0] - ax,
	      by = site[1] - ay,
	      rSite = rArc.site,
	      cx = rSite[0] - ax,
	      cy = rSite[1] - ay,
	      d = 2 * (bx * cy - by * cx),
	      hb = bx * bx + by * by,
	      hc = cx * cx + cy * cy,
	      vertex = [(cy * hb - by * hc) / d + ax, (bx * hc - cx * hb) / d + ay];

	  setEdgeEnd(rArc.edge, lSite, rSite, vertex);
	  newArc.edge = createEdge(lSite, site, null, vertex);
	  rArc.edge = createEdge(site, rSite, null, vertex);
	  attachCircle(lArc);
	  attachCircle(rArc);
	}

	function leftBreakPoint(arc, directrix) {
	  var site = arc.site,
	      rfocx = site[0],
	      rfocy = site[1],
	      pby2 = rfocy - directrix;

	  if (!pby2) return rfocx;

	  var lArc = arc.P;
	  if (!lArc) return -Infinity;

	  site = lArc.site;
	  var lfocx = site[0],
	      lfocy = site[1],
	      plby2 = lfocy - directrix;

	  if (!plby2) return lfocx;

	  var hl = lfocx - rfocx,
	      aby2 = 1 / pby2 - 1 / plby2,
	      b = hl / plby2;

	  if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;

	  return (rfocx + lfocx) / 2;
	}

	function rightBreakPoint(arc, directrix) {
	  var rArc = arc.N;
	  if (rArc) return leftBreakPoint(rArc, directrix);
	  var site = arc.site;
	  return site[1] === directrix ? site[0] : Infinity;
	}

	var epsilon$3 = 1e-6;
	var epsilon2$1 = 1e-12;
	var beaches;
	var cells;
	var circles;
	var edges;

	function triangleArea(a, b, c) {
	  return (a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]);
	}

	function lexicographic(a, b) {
	  return b[1] - a[1]
	      || b[0] - a[0];
	}

	function Diagram(sites, extent) {
	  var site = sites.sort(lexicographic).pop(),
	      x,
	      y,
	      circle;

	  edges = [];
	  cells = new Array(sites.length);
	  beaches = new RedBlackTree;
	  circles = new RedBlackTree;

	  while (true) {
	    circle = firstCircle;
	    if (site && (!circle || site[1] < circle.y || (site[1] === circle.y && site[0] < circle.x))) {
	      if (site[0] !== x || site[1] !== y) {
	        addBeach(site);
	        x = site[0], y = site[1];
	      }
	      site = sites.pop();
	    } else if (circle) {
	      removeBeach(circle.arc);
	    } else {
	      break;
	    }
	  }

	  sortCellHalfedges();

	  if (extent) {
	    var x0 = +extent[0][0],
	        y0 = +extent[0][1],
	        x1 = +extent[1][0],
	        y1 = +extent[1][1];
	    clipEdges(x0, y0, x1, y1);
	    clipCells(x0, y0, x1, y1);
	  }

	  this.edges = edges;
	  this.cells = cells;

	  beaches =
	  circles =
	  edges =
	  cells = null;
	}

	Diagram.prototype = {
	  constructor: Diagram,

	  polygons: function() {
	    var edges = this.edges;

	    return this.cells.map(function(cell) {
	      var polygon = cell.halfedges.map(function(i) { return cellHalfedgeStart(cell, edges[i]); });
	      polygon.data = cell.site.data;
	      return polygon;
	    });
	  },

	  triangles: function() {
	    var triangles = [],
	        edges = this.edges;

	    this.cells.forEach(function(cell, i) {
	      var site = cell.site,
	          halfedges = cell.halfedges,
	          j = -1,
	          m = halfedges.length,
	          s0,
	          e1 = edges[halfedges[m - 1]],
	          s1 = e1.left === site ? e1.right : e1.left;

	      while (++j < m) {
	        s0 = s1;
	        e1 = edges[halfedges[j]];
	        s1 = e1.left === site ? e1.right : e1.left;
	        if (s0 && s1 && i < s0.index && i < s1.index && triangleArea(site, s0, s1) < 0) {
	          triangles.push([site.data, s0.data, s1.data]);
	        }
	      }
	    });

	    return triangles;
	  },

	  links: function() {
	    return this.edges.filter(function(edge) {
	      return edge.right;
	    }).map(function(edge) {
	      return {
	        source: edge.left.data,
	        target: edge.right.data
	      };
	    });
	  },

	  find: function(x, y, radius) {
	    var that = this,
	        i0, i1 = that._found || 0,
	        cell = that.cells[i1] || that.cells[i1 = 0],
	        dx = x - cell.site[0],
	        dy = y - cell.site[1],
	        d2 = dx * dx + dy * dy;

	    do {
	      cell = that.cells[i0 = i1], i1 = null;
	      cell.halfedges.forEach(function(e) {
	        var edge = that.edges[e], v = edge.left;
	        if ((v === cell.site || !v) && !(v = edge.right)) return;
	        var vx = x - v[0],
	            vy = y - v[1],
	            v2 = vx * vx + vy * vy;
	        if (v2 < d2) d2 = v2, i1 = v.index;
	      });
	    } while (i1 !== null);

	    that._found = i0;

	    return radius == null || d2 <= radius * radius ? cell.site : null;
	  }
	};

	var voronoi = function() {
	  var x$$1 = x$4,
	      y$$1 = y$4,
	      extent = null;

	  function voronoi(data) {
	    return new Diagram(data.map(function(d, i) {
	      var s = [Math.round(x$$1(d, i, data) / epsilon$3) * epsilon$3, Math.round(y$$1(d, i, data) / epsilon$3) * epsilon$3];
	      s.index = i;
	      s.data = d;
	      return s;
	    }), extent);
	  }

	  voronoi.polygons = function(data) {
	    return voronoi(data).polygons();
	  };

	  voronoi.links = function(data) {
	    return voronoi(data).links();
	  };

	  voronoi.triangles = function(data) {
	    return voronoi(data).triangles();
	  };

	  voronoi.x = function(_) {
	    return arguments.length ? (x$$1 = typeof _ === "function" ? _ : constant$9(+_), voronoi) : x$$1;
	  };

	  voronoi.y = function(_) {
	    return arguments.length ? (y$$1 = typeof _ === "function" ? _ : constant$9(+_), voronoi) : y$$1;
	  };

	  voronoi.extent = function(_) {
	    return arguments.length ? (extent = _ == null ? null : [[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]], voronoi) : extent && [[extent[0][0], extent[0][1]], [extent[1][0], extent[1][1]]];
	  };

	  voronoi.size = function(_) {
	    return arguments.length ? (extent = _ == null ? null : [[0, 0], [+_[0], +_[1]]], voronoi) : extent && [extent[1][0] - extent[0][0], extent[1][1] - extent[0][1]];
	  };

	  return voronoi;
	};

	var constant$10 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function ZoomEvent(target, type, transform) {
	  this.target = target;
	  this.type = type;
	  this.transform = transform;
	}

	function Transform(k, x, y) {
	  this.k = k;
	  this.x = x;
	  this.y = y;
	}

	Transform.prototype = {
	  constructor: Transform,
	  scale: function(k) {
	    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
	  },
	  translate: function(x, y) {
	    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
	  },
	  apply: function(point) {
	    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
	  },
	  applyX: function(x) {
	    return x * this.k + this.x;
	  },
	  applyY: function(y) {
	    return y * this.k + this.y;
	  },
	  invert: function(location) {
	    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
	  },
	  invertX: function(x) {
	    return (x - this.x) / this.k;
	  },
	  invertY: function(y) {
	    return (y - this.y) / this.k;
	  },
	  rescaleX: function(x) {
	    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
	  },
	  rescaleY: function(y) {
	    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
	  },
	  toString: function() {
	    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
	  }
	};

	var identity$6 = new Transform(1, 0, 0);

	transform.prototype = Transform.prototype;

	function transform(node) {
	  return node.__zoom || identity$6;
	}

	function nopropagation$1() {
	  exports.event.stopImmediatePropagation();
	}

	var noevent$1 = function() {
	  exports.event.preventDefault();
	  exports.event.stopImmediatePropagation();
	};

	// Ignore right-click, since that should open the context menu.
	function defaultFilter$1() {
	  return !exports.event.button;
	}

	function defaultExtent() {
	  var e = this, w, h;
	  if (e instanceof SVGElement) {
	    e = e.ownerSVGElement || e;
	    w = e.width.baseVal.value;
	    h = e.height.baseVal.value;
	  } else {
	    w = e.clientWidth;
	    h = e.clientHeight;
	  }
	  return [[0, 0], [w, h]];
	}

	function defaultTransform() {
	  return this.__zoom || identity$6;
	}

	var zoom = function() {
	  var filter = defaultFilter$1,
	      extent = defaultExtent,
	      k0 = 0,
	      k1 = Infinity,
	      x0 = -k1,
	      x1 = k1,
	      y0 = x0,
	      y1 = x1,
	      duration = 250,
	      gestures = [],
	      listeners = dispatch("start", "zoom", "end"),
	      touchstarting,
	      touchending,
	      touchDelay = 500,
	      wheelDelay = 150;

	  function zoom(selection$$1) {
	    selection$$1
	        .on("wheel.zoom", wheeled)
	        .on("mousedown.zoom", mousedowned)
	        .on("dblclick.zoom", dblclicked)
	        .on("touchstart.zoom", touchstarted)
	        .on("touchmove.zoom", touchmoved)
	        .on("touchend.zoom touchcancel.zoom", touchended)
	        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)")
	        .property("__zoom", defaultTransform);
	  }

	  zoom.transform = function(collection, transform) {
	    var selection$$1 = collection.selection ? collection.selection() : collection;
	    selection$$1.property("__zoom", defaultTransform);
	    if (collection !== selection$$1) {
	      schedule(collection, transform);
	    } else {
	      selection$$1.interrupt().each(function() {
	        gesture(this, arguments)
	            .start()
	            .zoom(null, typeof transform === "function" ? transform.apply(this, arguments) : transform)
	            .end();
	      });
	    }
	  };

	  zoom.scaleBy = function(selection$$1, k) {
	    zoom.scaleTo(selection$$1, function() {
	      var k0 = this.__zoom.k,
	          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
	      return k0 * k1;
	    });
	  };

	  zoom.scaleTo = function(selection$$1, k) {
	    zoom.transform(selection$$1, function() {
	      var e = extent.apply(this, arguments),
	          t0 = this.__zoom,
	          p0 = centroid(e),
	          p1 = t0.invert(p0),
	          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
	      return constrain(translate(scale(t0, k1), p0, p1), e);
	    });
	  };

	  zoom.translateBy = function(selection$$1, x, y) {
	    zoom.transform(selection$$1, function() {
	      return constrain(this.__zoom.translate(
	        typeof x === "function" ? x.apply(this, arguments) : x,
	        typeof y === "function" ? y.apply(this, arguments) : y
	      ), extent.apply(this, arguments));
	    });
	  };

	  function scale(transform, k) {
	    k = Math.max(k0, Math.min(k1, k));
	    return k === transform.k ? transform : new Transform(k, transform.x, transform.y);
	  }

	  function translate(transform, p0, p1) {
	    var x = p0[0] - p1[0] * transform.k, y = p0[1] - p1[1] * transform.k;
	    return x === transform.x && y === transform.y ? transform : new Transform(transform.k, x, y);
	  }

	  function constrain(transform, extent) {
	    var dx = Math.min(0, transform.invertX(extent[0][0]) - x0) || Math.max(0, transform.invertX(extent[1][0]) - x1),
	        dy = Math.min(0, transform.invertY(extent[0][1]) - y0) || Math.max(0, transform.invertY(extent[1][1]) - y1);
	    return dx || dy ? transform.translate(dx, dy) : transform;
	  }

	  function centroid(extent) {
	    return [(+extent[0][0] + +extent[1][0]) / 2, (+extent[0][1] + +extent[1][1]) / 2];
	  }

	  function schedule(transition$$1, transform, center) {
	    transition$$1
	        .on("start.zoom", function() { gesture(this, arguments).start(); })
	        .on("interrupt.zoom end.zoom", function() { gesture(this, arguments).end(); })
	        .tween("zoom", function() {
	          var that = this,
	              args = arguments,
	              g = gesture(that, args),
	              e = extent.apply(that, args),
	              p = center || centroid(e),
	              w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]),
	              a = that.__zoom,
	              b = typeof transform === "function" ? transform.apply(that, args) : transform,
	              i = interpolateZoom(a.invert(p).concat(w / a.k), b.invert(p).concat(w / b.k));
	          return function(t) {
	            if (t === 1) t = b; // Avoid rounding error on end.
	            else { var l = i(t), k = w / l[2]; t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k); }
	            g.zoom(null, t);
	          };
	        });
	  }

	  function gesture(that, args) {
	    for (var i = 0, n = gestures.length, g; i < n; ++i) {
	      if ((g = gestures[i]).that === that) {
	        return g;
	      }
	    }
	    return new Gesture(that, args);
	  }

	  function Gesture(that, args) {
	    this.that = that;
	    this.args = args;
	    this.index = -1;
	    this.active = 0;
	    this.extent = extent.apply(that, args);
	  }

	  Gesture.prototype = {
	    start: function() {
	      if (++this.active === 1) {
	        this.index = gestures.push(this) - 1;
	        this.emit("start");
	      }
	      return this;
	    },
	    zoom: function(key, transform) {
	      if (this.mouse && key !== "mouse") this.mouse[1] = transform.invert(this.mouse[0]);
	      if (this.touch0 && key !== "touch") this.touch0[1] = transform.invert(this.touch0[0]);
	      if (this.touch1 && key !== "touch") this.touch1[1] = transform.invert(this.touch1[0]);
	      this.that.__zoom = transform;
	      this.emit("zoom");
	      return this;
	    },
	    end: function() {
	      if (--this.active === 0) {
	        gestures.splice(this.index, 1);
	        this.index = -1;
	        this.emit("end");
	      }
	      return this;
	    },
	    emit: function(type) {
	      customEvent(new ZoomEvent(zoom, type, this.that.__zoom), listeners.apply, listeners, [type, this.that, this.args]);
	    }
	  };

	  function wheeled() {
	    if (!filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        t = this.__zoom,
	        k = Math.max(k0, Math.min(k1, t.k * Math.pow(2, -exports.event.deltaY * (exports.event.deltaMode ? 120 : 1) / 500))),
	        p = mouse(this);

	    // If the mouse is in the same location as before, reuse it.
	    // If there were recent wheel events, reset the wheel idle timeout.
	    if (g.wheel) {
	      if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
	        g.mouse[1] = t.invert(g.mouse[0] = p);
	      }
	      clearTimeout(g.wheel);
	    }

	    // If this wheel event won’t trigger a transform change, ignore it.
	    else if (t.k === k) return;

	    // Otherwise, capture the mouse point and location at the start.
	    else {
	      g.mouse = [p, t.invert(p)];
	      interrupt(this);
	      g.start();
	    }

	    noevent$1();
	    g.wheel = setTimeout(wheelidled, wheelDelay);
	    g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent));

	    function wheelidled() {
	      g.wheel = null;
	      g.end();
	    }
	  }

	  function mousedowned() {
	    if (touchending || !filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        v = select(exports.event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true),
	        p = mouse(this);

	    dragDisable(exports.event.view);
	    nopropagation$1();
	    g.mouse = [p, this.__zoom.invert(p)];
	    interrupt(this);
	    g.start();

	    function mousemoved() {
	      noevent$1();
	      g.moved = true;
	      g.zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = mouse(g.that), g.mouse[1]), g.extent));
	    }

	    function mouseupped() {
	      v.on("mousemove.zoom mouseup.zoom", null);
	      yesdrag(exports.event.view, g.moved);
	      noevent$1();
	      g.end();
	    }
	  }

	  function dblclicked() {
	    if (!filter.apply(this, arguments)) return;
	    var t0 = this.__zoom,
	        p0 = mouse(this),
	        p1 = t0.invert(p0),
	        k1 = t0.k * (exports.event.shiftKey ? 0.5 : 2),
	        t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, arguments));

	    noevent$1();
	    if (duration > 0) select(this).transition().duration(duration).call(schedule, t1, p0);
	    else select(this).call(zoom.transform, t1);
	  }

	  function touchstarted() {
	    if (!filter.apply(this, arguments)) return;
	    var g = gesture(this, arguments),
	        touches$$1 = exports.event.changedTouches,
	        n = touches$$1.length, i, t, p;

	    nopropagation$1();
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i], p = touch(this, touches$$1, t.identifier);
	      p = [p, this.__zoom.invert(p), t.identifier];
	      if (!g.touch0) g.touch0 = p;
	      else if (!g.touch1) g.touch1 = p;
	    }
	    if (touchstarting) {
	      touchstarting = clearTimeout(touchstarting);
	      if (!g.touch1) return g.end(), dblclicked.apply(this, arguments);
	    }
	    if (exports.event.touches.length === n) {
	      touchstarting = setTimeout(function() { touchstarting = null; }, touchDelay);
	      interrupt(this);
	      g.start();
	    }
	  }

	  function touchmoved() {
	    var g = gesture(this, arguments),
	        touches$$1 = exports.event.changedTouches,
	        n = touches$$1.length, i, t, p, l;

	    noevent$1();
	    if (touchstarting) touchstarting = clearTimeout(touchstarting);
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i], p = touch(this, touches$$1, t.identifier);
	      if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
	      else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
	    }
	    t = g.that.__zoom;
	    if (g.touch1) {
	      var p0 = g.touch0[0], l0 = g.touch0[1],
	          p1 = g.touch1[0], l1 = g.touch1[1],
	          dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp,
	          dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
	      t = scale(t, Math.sqrt(dp / dl));
	      p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
	      l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
	    }
	    else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
	    else return;
	    g.zoom("touch", constrain(translate(t, p, l), g.extent));
	  }

	  function touchended() {
	    var g = gesture(this, arguments),
	        touches$$1 = exports.event.changedTouches,
	        n = touches$$1.length, i, t;

	    nopropagation$1();
	    if (touchending) clearTimeout(touchending);
	    touchending = setTimeout(function() { touchending = null; }, touchDelay);
	    for (i = 0; i < n; ++i) {
	      t = touches$$1[i];
	      if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
	      else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
	    }
	    if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
	    if (!g.touch0) g.end();
	  }

	  zoom.filter = function(_) {
	    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$10(!!_), zoom) : filter;
	  };

	  zoom.extent = function(_) {
	    return arguments.length ? (extent = typeof _ === "function" ? _ : constant$10([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
	  };

	  zoom.scaleExtent = function(_) {
	    return arguments.length ? (k0 = +_[0], k1 = +_[1], zoom) : [k0, k1];
	  };

	  zoom.translateExtent = function(_) {
	    return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], zoom) : [[x0, y0], [x1, y1]];
	  };

	  zoom.duration = function(_) {
	    return arguments.length ? (duration = +_, zoom) : duration;
	  };

	  zoom.on = function() {
	    var value = listeners.on.apply(listeners, arguments);
	    return value === listeners ? zoom : value;
	  };

	  return zoom;
	};

	var constant$11 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var BrushEvent = function(target, type, selection) {
	  this.target = target;
	  this.type = type;
	  this.selection = selection;
	};

	function nopropagation$2() {
	  exports.event.stopImmediatePropagation();
	}

	var noevent$2 = function() {
	  exports.event.preventDefault();
	  exports.event.stopImmediatePropagation();
	};

	var MODE_DRAG = {name: "drag"};
	var MODE_SPACE = {name: "space"};
	var MODE_HANDLE = {name: "handle"};
	var MODE_CENTER = {name: "center"};

	var X = {
	  name: "x",
	  handles: ["e", "w"].map(type$1),
	  input: function(x, e) { return x && [[x[0], e[0][1]], [x[1], e[1][1]]]; },
	  output: function(xy) { return xy && [xy[0][0], xy[1][0]]; }
	};

	var Y = {
	  name: "y",
	  handles: ["n", "s"].map(type$1),
	  input: function(y, e) { return y && [[e[0][0], y[0]], [e[1][0], y[1]]]; },
	  output: function(xy) { return xy && [xy[0][1], xy[1][1]]; }
	};

	var XY = {
	  name: "xy",
	  handles: ["n", "e", "s", "w", "nw", "ne", "se", "sw"].map(type$1),
	  input: function(xy) { return xy; },
	  output: function(xy) { return xy; }
	};

	var cursors = {
	  overlay: "crosshair",
	  selection: "move",
	  n: "ns-resize",
	  e: "ew-resize",
	  s: "ns-resize",
	  w: "ew-resize",
	  nw: "nwse-resize",
	  ne: "nesw-resize",
	  se: "nwse-resize",
	  sw: "nesw-resize"
	};

	var flipX = {
	  e: "w",
	  w: "e",
	  nw: "ne",
	  ne: "nw",
	  se: "sw",
	  sw: "se"
	};

	var flipY = {
	  n: "s",
	  s: "n",
	  nw: "sw",
	  ne: "se",
	  se: "ne",
	  sw: "nw"
	};

	var signsX = {
	  overlay: +1,
	  selection: +1,
	  n: null,
	  e: +1,
	  s: null,
	  w: -1,
	  nw: -1,
	  ne: +1,
	  se: +1,
	  sw: -1
	};

	var signsY = {
	  overlay: +1,
	  selection: +1,
	  n: -1,
	  e: null,
	  s: +1,
	  w: null,
	  nw: -1,
	  ne: -1,
	  se: +1,
	  sw: +1
	};

	function type$1(t) {
	  return {type: t};
	}

	// Ignore right-click, since that should open the context menu.
	function defaultFilter$2() {
	  return !exports.event.button;
	}

	function defaultExtent$1() {
	  var svg = this.ownerSVGElement || this;
	  return [[0, 0], [svg.width.baseVal.value, svg.height.baseVal.value]];
	}

	// Like d3.local, but with the name “__brush” rather than auto-generated.
	function local$1(node) {
	  while (!node.__brush) if (!(node = node.parentNode)) return;
	  return node.__brush;
	}

	function empty$1(extent) {
	  return extent[0][0] === extent[1][0]
	      || extent[0][1] === extent[1][1];
	}

	function brushSelection(node) {
	  var state = node.__brush;
	  return state ? state.dim.output(state.selection) : null;
	}

	function brushX() {
	  return brush$1(X);
	}

	function brushY() {
	  return brush$1(Y);
	}

	var brush = function() {
	  return brush$1(XY);
	};

	function brush$1(dim) {
	  var extent = defaultExtent$1,
	      filter = defaultFilter$2,
	      listeners = dispatch(brush, "start", "brush", "end"),
	      handleSize = 6,
	      touchending;

	  function brush(group) {
	    var overlay = group
	        .property("__brush", initialize)
	      .selectAll(".overlay")
	      .data([type$1("overlay")]);

	    overlay.enter().append("rect")
	        .attr("class", "overlay")
	        .attr("pointer-events", "all")
	        .attr("cursor", cursors.overlay)
	      .merge(overlay)
	        .each(function() {
	          var extent = local$1(this).extent;
	          select(this)
	              .attr("x", extent[0][0])
	              .attr("y", extent[0][1])
	              .attr("width", extent[1][0] - extent[0][0])
	              .attr("height", extent[1][1] - extent[0][1]);
	        });

	    group.selectAll(".selection")
	      .data([type$1("selection")])
	      .enter().append("rect")
	        .attr("class", "selection")
	        .attr("cursor", cursors.selection)
	        .attr("fill", "#777")
	        .attr("fill-opacity", 0.3)
	        .attr("stroke", "#fff")
	        .attr("shape-rendering", "crispEdges");

	    var handle = group.selectAll(".handle")
	      .data(dim.handles, function(d) { return d.type; });

	    handle.exit().remove();

	    handle.enter().append("rect")
	        .attr("class", function(d) { return "handle handle--" + d.type; })
	        .attr("cursor", function(d) { return cursors[d.type]; });

	    group
	        .each(redraw)
	        .attr("fill", "none")
	        .attr("pointer-events", "all")
	        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)")
	        .on("mousedown.brush touchstart.brush", started);
	  }

	  brush.move = function(group, selection$$1) {
	    if (group.selection) {
	      group
	          .on("start.brush", function() { emitter(this, arguments).beforestart().start(); })
	          .on("interrupt.brush end.brush", function() { emitter(this, arguments).end(); })
	          .tween("brush", function() {
	            var that = this,
	                state = that.__brush,
	                emit = emitter(that, arguments),
	                selection0 = state.selection,
	                selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(this, arguments) : selection$$1, state.extent),
	                i = interpolate(selection0, selection1);

	            function tween(t) {
	              state.selection = t === 1 && empty$1(selection1) ? null : i(t);
	              redraw.call(that);
	              emit.brush();
	            }

	            return selection0 && selection1 ? tween : tween(1);
	          });
	    } else {
	      group
	          .each(function() {
	            var that = this,
	                args = arguments,
	                state = that.__brush,
	                selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(that, args) : selection$$1, state.extent),
	                emit = emitter(that, args).beforestart();

	            interrupt(that);
	            state.selection = selection1 == null || empty$1(selection1) ? null : selection1;
	            redraw.call(that);
	            emit.start().brush().end();
	          });
	    }
	  };

	  function redraw() {
	    var group = select(this),
	        selection$$1 = local$1(this).selection;

	    if (selection$$1) {
	      group.selectAll(".selection")
	          .style("display", null)
	          .attr("x", selection$$1[0][0])
	          .attr("y", selection$$1[0][1])
	          .attr("width", selection$$1[1][0] - selection$$1[0][0])
	          .attr("height", selection$$1[1][1] - selection$$1[0][1]);

	      group.selectAll(".handle")
	          .style("display", null)
	          .attr("x", function(d) { return d.type[d.type.length - 1] === "e" ? selection$$1[1][0] - handleSize / 2 : selection$$1[0][0] - handleSize / 2; })
	          .attr("y", function(d) { return d.type[0] === "s" ? selection$$1[1][1] - handleSize / 2 : selection$$1[0][1] - handleSize / 2; })
	          .attr("width", function(d) { return d.type === "n" || d.type === "s" ? selection$$1[1][0] - selection$$1[0][0] + handleSize : handleSize; })
	          .attr("height", function(d) { return d.type === "e" || d.type === "w" ? selection$$1[1][1] - selection$$1[0][1] + handleSize : handleSize; });
	    }

	    else {
	      group.selectAll(".selection,.handle")
	          .style("display", "none")
	          .attr("x", null)
	          .attr("y", null)
	          .attr("width", null)
	          .attr("height", null);
	    }
	  }

	  function emitter(that, args) {
	    return that.__brush.emitter || new Emitter(that, args);
	  }

	  function Emitter(that, args) {
	    this.that = that;
	    this.args = args;
	    this.state = that.__brush;
	    this.active = 0;
	  }

	  Emitter.prototype = {
	    beforestart: function() {
	      if (++this.active === 1) this.state.emitter = this, this.starting = true;
	      return this;
	    },
	    start: function() {
	      if (this.starting) this.starting = false, this.emit("start");
	      return this;
	    },
	    brush: function() {
	      this.emit("brush");
	      return this;
	    },
	    end: function() {
	      if (--this.active === 0) delete this.state.emitter, this.emit("end");
	      return this;
	    },
	    emit: function(type) {
	      customEvent(new BrushEvent(brush, type, dim.output(this.state.selection)), listeners.apply, listeners, [type, this.that, this.args]);
	    }
	  };

	  function started() {
	    if (exports.event.touches) { if (exports.event.changedTouches.length < exports.event.touches.length) return noevent$2(); }
	    else if (touchending) return;
	    if (!filter.apply(this, arguments)) return;

	    var that = this,
	        type = exports.event.target.__data__.type,
	        mode = (exports.event.metaKey ? type = "overlay" : type) === "selection" ? MODE_DRAG : (exports.event.altKey ? MODE_CENTER : MODE_HANDLE),
	        signX = dim === Y ? null : signsX[type],
	        signY = dim === X ? null : signsY[type],
	        state = local$1(that),
	        extent = state.extent,
	        selection$$1 = state.selection,
	        W = extent[0][0], w0, w1,
	        N = extent[0][1], n0, n1,
	        E = extent[1][0], e0, e1,
	        S = extent[1][1], s0, s1,
	        dx,
	        dy,
	        moving,
	        shifting = signX && signY && exports.event.shiftKey,
	        lockX,
	        lockY,
	        point0 = mouse(that),
	        point = point0,
	        emit = emitter(that, arguments).beforestart();

	    if (type === "overlay") {
	      state.selection = selection$$1 = [
	        [w0 = dim === Y ? W : point0[0], n0 = dim === X ? N : point0[1]],
	        [e0 = dim === Y ? E : w0, s0 = dim === X ? S : n0]
	      ];
	    } else {
	      w0 = selection$$1[0][0];
	      n0 = selection$$1[0][1];
	      e0 = selection$$1[1][0];
	      s0 = selection$$1[1][1];
	    }

	    w1 = w0;
	    n1 = n0;
	    e1 = e0;
	    s1 = s0;

	    var group = select(that)
	        .attr("pointer-events", "none");

	    var overlay = group.selectAll(".overlay")
	        .attr("cursor", cursors[type]);

	    if (exports.event.touches) {
	      group
	          .on("touchmove.brush", moved, true)
	          .on("touchend.brush touchcancel.brush", ended, true);
	    } else {
	      var view = select(exports.event.view)
	          .on("keydown.brush", keydowned, true)
	          .on("keyup.brush", keyupped, true)
	          .on("mousemove.brush", moved, true)
	          .on("mouseup.brush", ended, true);

	      dragDisable(exports.event.view);
	    }

	    nopropagation$2();
	    interrupt(that);
	    redraw.call(that);
	    emit.start();

	    function moved() {
	      var point1 = mouse(that);
	      if (shifting && !lockX && !lockY) {
	        if (Math.abs(point1[0] - point[0]) > Math.abs(point1[1] - point[1])) lockY = true;
	        else lockX = true;
	      }
	      point = point1;
	      moving = true;
	      noevent$2();
	      move();
	    }

	    function move() {
	      var t;

	      dx = point[0] - point0[0];
	      dy = point[1] - point0[1];

	      switch (mode) {
	        case MODE_SPACE:
	        case MODE_DRAG: {
	          if (signX) dx = Math.max(W - w0, Math.min(E - e0, dx)), w1 = w0 + dx, e1 = e0 + dx;
	          if (signY) dy = Math.max(N - n0, Math.min(S - s0, dy)), n1 = n0 + dy, s1 = s0 + dy;
	          break;
	        }
	        case MODE_HANDLE: {
	          if (signX < 0) dx = Math.max(W - w0, Math.min(E - w0, dx)), w1 = w0 + dx, e1 = e0;
	          else if (signX > 0) dx = Math.max(W - e0, Math.min(E - e0, dx)), w1 = w0, e1 = e0 + dx;
	          if (signY < 0) dy = Math.max(N - n0, Math.min(S - n0, dy)), n1 = n0 + dy, s1 = s0;
	          else if (signY > 0) dy = Math.max(N - s0, Math.min(S - s0, dy)), n1 = n0, s1 = s0 + dy;
	          break;
	        }
	        case MODE_CENTER: {
	          if (signX) w1 = Math.max(W, Math.min(E, w0 - dx * signX)), e1 = Math.max(W, Math.min(E, e0 + dx * signX));
	          if (signY) n1 = Math.max(N, Math.min(S, n0 - dy * signY)), s1 = Math.max(N, Math.min(S, s0 + dy * signY));
	          break;
	        }
	      }

	      if (e1 < w1) {
	        signX *= -1;
	        t = w0, w0 = e0, e0 = t;
	        t = w1, w1 = e1, e1 = t;
	        if (type in flipX) overlay.attr("cursor", cursors[type = flipX[type]]);
	      }

	      if (s1 < n1) {
	        signY *= -1;
	        t = n0, n0 = s0, s0 = t;
	        t = n1, n1 = s1, s1 = t;
	        if (type in flipY) overlay.attr("cursor", cursors[type = flipY[type]]);
	      }

	      if (state.selection) selection$$1 = state.selection; // May be set by brush.move!
	      if (lockX) w1 = selection$$1[0][0], e1 = selection$$1[1][0];
	      if (lockY) n1 = selection$$1[0][1], s1 = selection$$1[1][1];

	      if (selection$$1[0][0] !== w1
	          || selection$$1[0][1] !== n1
	          || selection$$1[1][0] !== e1
	          || selection$$1[1][1] !== s1) {
	        state.selection = [[w1, n1], [e1, s1]];
	        redraw.call(that);
	        emit.brush();
	      }
	    }

	    function ended() {
	      nopropagation$2();
	      if (exports.event.touches) {
	        if (exports.event.touches.length) return;
	        if (touchending) clearTimeout(touchending);
	        touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
	        group.on("touchmove.brush touchend.brush touchcancel.brush", null);
	      } else {
	        yesdrag(exports.event.view, moving);
	        view.on("keydown.brush keyup.brush mousemove.brush mouseup.brush", null);
	      }
	      group.attr("pointer-events", "all");
	      overlay.attr("cursor", cursors.overlay);
	      if (state.selection) selection$$1 = state.selection; // May be set by brush.move (on start)!
	      if (empty$1(selection$$1)) state.selection = null, redraw.call(that);
	      emit.end();
	    }

	    function keydowned() {
	      switch (exports.event.keyCode) {
	        case 16: { // SHIFT
	          shifting = signX && signY;
	          break;
	        }
	        case 18: { // ALT
	          if (mode === MODE_HANDLE) {
	            if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
	            if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
	            mode = MODE_CENTER;
	            move();
	          }
	          break;
	        }
	        case 32: { // SPACE; takes priority over ALT
	          if (mode === MODE_HANDLE || mode === MODE_CENTER) {
	            if (signX < 0) e0 = e1 - dx; else if (signX > 0) w0 = w1 - dx;
	            if (signY < 0) s0 = s1 - dy; else if (signY > 0) n0 = n1 - dy;
	            mode = MODE_SPACE;
	            overlay.attr("cursor", cursors.selection);
	            move();
	          }
	          break;
	        }
	        default: return;
	      }
	      noevent$2();
	    }

	    function keyupped() {
	      switch (exports.event.keyCode) {
	        case 16: { // SHIFT
	          if (shifting) {
	            lockX = lockY = shifting = false;
	            move();
	          }
	          break;
	        }
	        case 18: { // ALT
	          if (mode === MODE_CENTER) {
	            if (signX < 0) e0 = e1; else if (signX > 0) w0 = w1;
	            if (signY < 0) s0 = s1; else if (signY > 0) n0 = n1;
	            mode = MODE_HANDLE;
	            move();
	          }
	          break;
	        }
	        case 32: { // SPACE
	          if (mode === MODE_SPACE) {
	            if (exports.event.altKey) {
	              if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
	              if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
	              mode = MODE_CENTER;
	            } else {
	              if (signX < 0) e0 = e1; else if (signX > 0) w0 = w1;
	              if (signY < 0) s0 = s1; else if (signY > 0) n0 = n1;
	              mode = MODE_HANDLE;
	            }
	            overlay.attr("cursor", cursors[type]);
	            move();
	          }
	          break;
	        }
	        default: return;
	      }
	      noevent$2();
	    }
	  }

	  function initialize() {
	    var state = this.__brush || {selection: null};
	    state.extent = extent.apply(this, arguments);
	    state.dim = dim;
	    return state;
	  }

	  brush.extent = function(_) {
	    return arguments.length ? (extent = typeof _ === "function" ? _ : constant$11([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), brush) : extent;
	  };

	  brush.filter = function(_) {
	    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$11(!!_), brush) : filter;
	  };

	  brush.handleSize = function(_) {
	    return arguments.length ? (handleSize = +_, brush) : handleSize;
	  };

	  brush.on = function() {
	    var value = listeners.on.apply(listeners, arguments);
	    return value === listeners ? brush : value;
	  };

	  return brush;
	}

	var cos = Math.cos;
	var sin = Math.sin;
	var pi$3 = Math.PI;
	var halfPi$2 = pi$3 / 2;
	var tau$3 = pi$3 * 2;
	var max$1 = Math.max;

	function compareValue(compare) {
	  return function(a, b) {
	    return compare(
	      a.source.value + a.target.value,
	      b.source.value + b.target.value
	    );
	  };
	}

	var chord = function() {
	  var padAngle = 0,
	      sortGroups = null,
	      sortSubgroups = null,
	      sortChords = null;

	  function chord(matrix) {
	    var n = matrix.length,
	        groupSums = [],
	        groupIndex = range(n),
	        subgroupIndex = [],
	        chords = [],
	        groups = chords.groups = new Array(n),
	        subgroups = new Array(n * n),
	        k,
	        x,
	        x0,
	        dx,
	        i,
	        j;

	    // Compute the sum.
	    k = 0, i = -1; while (++i < n) {
	      x = 0, j = -1; while (++j < n) {
	        x += matrix[i][j];
	      }
	      groupSums.push(x);
	      subgroupIndex.push(range(n));
	      k += x;
	    }

	    // Sort groups…
	    if (sortGroups) groupIndex.sort(function(a, b) {
	      return sortGroups(groupSums[a], groupSums[b]);
	    });

	    // Sort subgroups…
	    if (sortSubgroups) subgroupIndex.forEach(function(d, i) {
	      d.sort(function(a, b) {
	        return sortSubgroups(matrix[i][a], matrix[i][b]);
	      });
	    });

	    // Convert the sum to scaling factor for [0, 2pi].
	    // TODO Allow start and end angle to be specified?
	    // TODO Allow padding to be specified as percentage?
	    k = max$1(0, tau$3 - padAngle * n) / k;
	    dx = k ? padAngle : tau$3 / n;

	    // Compute the start and end angle for each group and subgroup.
	    // Note: Opera has a bug reordering object literal properties!
	    x = 0, i = -1; while (++i < n) {
	      x0 = x, j = -1; while (++j < n) {
	        var di = groupIndex[i],
	            dj = subgroupIndex[di][j],
	            v = matrix[di][dj],
	            a0 = x,
	            a1 = x += v * k;
	        subgroups[dj * n + di] = {
	          index: di,
	          subindex: dj,
	          startAngle: a0,
	          endAngle: a1,
	          value: v
	        };
	      }
	      groups[di] = {
	        index: di,
	        startAngle: x0,
	        endAngle: x,
	        value: groupSums[di]
	      };
	      x += dx;
	    }

	    // Generate chords for each (non-empty) subgroup-subgroup link.
	    i = -1; while (++i < n) {
	      j = i - 1; while (++j < n) {
	        var source = subgroups[j * n + i],
	            target = subgroups[i * n + j];
	        if (source.value || target.value) {
	          chords.push(source.value < target.value
	              ? {source: target, target: source}
	              : {source: source, target: target});
	        }
	      }
	    }

	    return sortChords ? chords.sort(sortChords) : chords;
	  }

	  chord.padAngle = function(_) {
	    return arguments.length ? (padAngle = max$1(0, _), chord) : padAngle;
	  };

	  chord.sortGroups = function(_) {
	    return arguments.length ? (sortGroups = _, chord) : sortGroups;
	  };

	  chord.sortSubgroups = function(_) {
	    return arguments.length ? (sortSubgroups = _, chord) : sortSubgroups;
	  };

	  chord.sortChords = function(_) {
	    return arguments.length ? (_ == null ? sortChords = null : (sortChords = compareValue(_))._ = _, chord) : sortChords && sortChords._;
	  };

	  return chord;
	};

	var slice$5 = Array.prototype.slice;

	var constant$12 = function(x) {
	  return function() {
	    return x;
	  };
	};

	function defaultSource(d) {
	  return d.source;
	}

	function defaultTarget(d) {
	  return d.target;
	}

	function defaultRadius$1(d) {
	  return d.radius;
	}

	function defaultStartAngle(d) {
	  return d.startAngle;
	}

	function defaultEndAngle(d) {
	  return d.endAngle;
	}

	var ribbon = function() {
	  var source = defaultSource,
	      target = defaultTarget,
	      radius = defaultRadius$1,
	      startAngle = defaultStartAngle,
	      endAngle = defaultEndAngle,
	      context = null;

	  function ribbon() {
	    var buffer,
	        argv = slice$5.call(arguments),
	        s = source.apply(this, argv),
	        t = target.apply(this, argv),
	        sr = +radius.apply(this, (argv[0] = s, argv)),
	        sa0 = startAngle.apply(this, argv) - halfPi$2,
	        sa1 = endAngle.apply(this, argv) - halfPi$2,
	        sx0 = sr * cos(sa0),
	        sy0 = sr * sin(sa0),
	        tr = +radius.apply(this, (argv[0] = t, argv)),
	        ta0 = startAngle.apply(this, argv) - halfPi$2,
	        ta1 = endAngle.apply(this, argv) - halfPi$2;

	    if (!context) context = buffer = path();

	    context.moveTo(sx0, sy0);
	    context.arc(0, 0, sr, sa0, sa1);
	    if (sa0 !== ta0 || sa1 !== ta1) { // TODO sr !== tr?
	      context.quadraticCurveTo(0, 0, tr * cos(ta0), tr * sin(ta0));
	      context.arc(0, 0, tr, ta0, ta1);
	    }
	    context.quadraticCurveTo(0, 0, sx0, sy0);
	    context.closePath();

	    if (buffer) return context = null, buffer + "" || null;
	  }

	  ribbon.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant$12(+_), ribbon) : radius;
	  };

	  ribbon.startAngle = function(_) {
	    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$12(+_), ribbon) : startAngle;
	  };

	  ribbon.endAngle = function(_) {
	    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$12(+_), ribbon) : endAngle;
	  };

	  ribbon.source = function(_) {
	    return arguments.length ? (source = _, ribbon) : source;
	  };

	  ribbon.target = function(_) {
	    return arguments.length ? (target = _, ribbon) : target;
	  };

	  ribbon.context = function(_) {
	    return arguments.length ? ((context = _ == null ? null : _), ribbon) : context;
	  };

	  return ribbon;
	};

	// Adds floating point numbers with twice the normal precision.
	// Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
	// Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
	// 305–363 (1997).
	// Code adapted from GeographicLib by Charles F. F. Karney,
	// http://geographiclib.sourceforge.net/

	var adder = function() {
	  return new Adder;
	};

	function Adder() {
	  this.reset();
	}

	Adder.prototype = {
	  constructor: Adder,
	  reset: function() {
	    this.s = // rounded value
	    this.t = 0; // exact error
	  },
	  add: function(y) {
	    add$1(temp, y, this.t);
	    add$1(this, temp.s, this.s);
	    if (this.s) this.t += temp.t;
	    else this.s = temp.t;
	  },
	  valueOf: function() {
	    return this.s;
	  }
	};

	var temp = new Adder;

	function add$1(adder, a, b) {
	  var x = adder.s = a + b,
	      bv = x - a,
	      av = x - bv;
	  adder.t = (a - av) + (b - bv);
	}

	var epsilon$4 = 1e-6;
	var epsilon2$2 = 1e-12;
	var pi$4 = Math.PI;
	var halfPi$3 = pi$4 / 2;
	var quarterPi = pi$4 / 4;
	var tau$4 = pi$4 * 2;

	var degrees$1 = 180 / pi$4;
	var radians = pi$4 / 180;

	var abs = Math.abs;
	var atan = Math.atan;
	var atan2 = Math.atan2;
	var cos$1 = Math.cos;
	var ceil = Math.ceil;
	var exp = Math.exp;

	var log$1 = Math.log;
	var pow$1 = Math.pow;
	var sin$1 = Math.sin;
	var sign$1 = Math.sign || function(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; };
	var sqrt$1 = Math.sqrt;
	var tan = Math.tan;

	function acos(x) {
	  return x > 1 ? 0 : x < -1 ? pi$4 : Math.acos(x);
	}

	function asin$1(x) {
	  return x > 1 ? halfPi$3 : x < -1 ? -halfPi$3 : Math.asin(x);
	}

	function haversin(x) {
	  return (x = sin$1(x / 2)) * x;
	}

	function noop$2() {}

	function streamGeometry(geometry, stream) {
	  if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
	    streamGeometryType[geometry.type](geometry, stream);
	  }
	}

	var streamObjectType = {
	  Feature: function(feature, stream) {
	    streamGeometry(feature.geometry, stream);
	  },
	  FeatureCollection: function(object, stream) {
	    var features = object.features, i = -1, n = features.length;
	    while (++i < n) streamGeometry(features[i].geometry, stream);
	  }
	};

	var streamGeometryType = {
	  Sphere: function(object, stream) {
	    stream.sphere();
	  },
	  Point: function(object, stream) {
	    object = object.coordinates;
	    stream.point(object[0], object[1], object[2]);
	  },
	  MultiPoint: function(object, stream) {
	    var coordinates = object.coordinates, i = -1, n = coordinates.length;
	    while (++i < n) object = coordinates[i], stream.point(object[0], object[1], object[2]);
	  },
	  LineString: function(object, stream) {
	    streamLine(object.coordinates, stream, 0);
	  },
	  MultiLineString: function(object, stream) {
	    var coordinates = object.coordinates, i = -1, n = coordinates.length;
	    while (++i < n) streamLine(coordinates[i], stream, 0);
	  },
	  Polygon: function(object, stream) {
	    streamPolygon(object.coordinates, stream);
	  },
	  MultiPolygon: function(object, stream) {
	    var coordinates = object.coordinates, i = -1, n = coordinates.length;
	    while (++i < n) streamPolygon(coordinates[i], stream);
	  },
	  GeometryCollection: function(object, stream) {
	    var geometries = object.geometries, i = -1, n = geometries.length;
	    while (++i < n) streamGeometry(geometries[i], stream);
	  }
	};

	function streamLine(coordinates, stream, closed) {
	  var i = -1, n = coordinates.length - closed, coordinate;
	  stream.lineStart();
	  while (++i < n) coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
	  stream.lineEnd();
	}

	function streamPolygon(coordinates, stream) {
	  var i = -1, n = coordinates.length;
	  stream.polygonStart();
	  while (++i < n) streamLine(coordinates[i], stream, 1);
	  stream.polygonEnd();
	}

	var geoStream = function(object, stream) {
	  if (object && streamObjectType.hasOwnProperty(object.type)) {
	    streamObjectType[object.type](object, stream);
	  } else {
	    streamGeometry(object, stream);
	  }
	};

	var areaRingSum = adder();

	var areaSum = adder();
	var lambda00;
	var phi00;
	var lambda0;
	var cosPhi0;
	var sinPhi0;

	var areaStream = {
	  point: noop$2,
	  lineStart: noop$2,
	  lineEnd: noop$2,
	  polygonStart: function() {
	    areaRingSum.reset();
	    areaStream.lineStart = areaRingStart;
	    areaStream.lineEnd = areaRingEnd;
	  },
	  polygonEnd: function() {
	    var areaRing = +areaRingSum;
	    areaSum.add(areaRing < 0 ? tau$4 + areaRing : areaRing);
	    this.lineStart = this.lineEnd = this.point = noop$2;
	  },
	  sphere: function() {
	    areaSum.add(tau$4);
	  }
	};

	function areaRingStart() {
	  areaStream.point = areaPointFirst;
	}

	function areaRingEnd() {
	  areaPoint(lambda00, phi00);
	}

	function areaPointFirst(lambda, phi) {
	  areaStream.point = areaPoint;
	  lambda00 = lambda, phi00 = phi;
	  lambda *= radians, phi *= radians;
	  lambda0 = lambda, cosPhi0 = cos$1(phi = phi / 2 + quarterPi), sinPhi0 = sin$1(phi);
	}

	function areaPoint(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  phi = phi / 2 + quarterPi; // half the angular distance from south pole

	  // Spherical excess E for a spherical triangle with vertices: south pole,
	  // previous point, current point.  Uses a formula derived from Cagnoli’s
	  // theorem.  See Todhunter, Spherical Trig. (1871), Sec. 103, Eq. (2).
	  var dLambda = lambda - lambda0,
	      sdLambda = dLambda >= 0 ? 1 : -1,
	      adLambda = sdLambda * dLambda,
	      cosPhi = cos$1(phi),
	      sinPhi = sin$1(phi),
	      k = sinPhi0 * sinPhi,
	      u = cosPhi0 * cosPhi + k * cos$1(adLambda),
	      v = k * sdLambda * sin$1(adLambda);
	  areaRingSum.add(atan2(v, u));

	  // Advance the previous points.
	  lambda0 = lambda, cosPhi0 = cosPhi, sinPhi0 = sinPhi;
	}

	var area$2 = function(object) {
	  areaSum.reset();
	  geoStream(object, areaStream);
	  return areaSum * 2;
	};

	function spherical(cartesian) {
	  return [atan2(cartesian[1], cartesian[0]), asin$1(cartesian[2])];
	}

	function cartesian(spherical) {
	  var lambda = spherical[0], phi = spherical[1], cosPhi = cos$1(phi);
	  return [cosPhi * cos$1(lambda), cosPhi * sin$1(lambda), sin$1(phi)];
	}

	function cartesianDot(a, b) {
	  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	}

	function cartesianCross(a, b) {
	  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
	}

	// TODO return a
	function cartesianAddInPlace(a, b) {
	  a[0] += b[0], a[1] += b[1], a[2] += b[2];
	}

	function cartesianScale(vector, k) {
	  return [vector[0] * k, vector[1] * k, vector[2] * k];
	}

	// TODO return d
	function cartesianNormalizeInPlace(d) {
	  var l = sqrt$1(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
	  d[0] /= l, d[1] /= l, d[2] /= l;
	}

	var lambda0$1;
	var phi0;
	var lambda1;
	var phi1;
	var lambda2;
	var lambda00$1;
	var phi00$1;
	var p0;
	var deltaSum = adder();
	var ranges;
	var range$1;

	var boundsStream = {
	  point: boundsPoint,
	  lineStart: boundsLineStart,
	  lineEnd: boundsLineEnd,
	  polygonStart: function() {
	    boundsStream.point = boundsRingPoint;
	    boundsStream.lineStart = boundsRingStart;
	    boundsStream.lineEnd = boundsRingEnd;
	    deltaSum.reset();
	    areaStream.polygonStart();
	  },
	  polygonEnd: function() {
	    areaStream.polygonEnd();
	    boundsStream.point = boundsPoint;
	    boundsStream.lineStart = boundsLineStart;
	    boundsStream.lineEnd = boundsLineEnd;
	    if (areaRingSum < 0) lambda0$1 = -(lambda1 = 180), phi0 = -(phi1 = 90);
	    else if (deltaSum > epsilon$4) phi1 = 90;
	    else if (deltaSum < -epsilon$4) phi0 = -90;
	    range$1[0] = lambda0$1, range$1[1] = lambda1;
	  }
	};

	function boundsPoint(lambda, phi) {
	  ranges.push(range$1 = [lambda0$1 = lambda, lambda1 = lambda]);
	  if (phi < phi0) phi0 = phi;
	  if (phi > phi1) phi1 = phi;
	}

	function linePoint(lambda, phi) {
	  var p = cartesian([lambda * radians, phi * radians]);
	  if (p0) {
	    var normal = cartesianCross(p0, p),
	        equatorial = [normal[1], -normal[0], 0],
	        inflection = cartesianCross(equatorial, normal);
	    cartesianNormalizeInPlace(inflection);
	    inflection = spherical(inflection);
	    var delta = lambda - lambda2,
	        sign$$1 = delta > 0 ? 1 : -1,
	        lambdai = inflection[0] * degrees$1 * sign$$1,
	        phii,
	        antimeridian = abs(delta) > 180;
	    if (antimeridian ^ (sign$$1 * lambda2 < lambdai && lambdai < sign$$1 * lambda)) {
	      phii = inflection[1] * degrees$1;
	      if (phii > phi1) phi1 = phii;
	    } else if (lambdai = (lambdai + 360) % 360 - 180, antimeridian ^ (sign$$1 * lambda2 < lambdai && lambdai < sign$$1 * lambda)) {
	      phii = -inflection[1] * degrees$1;
	      if (phii < phi0) phi0 = phii;
	    } else {
	      if (phi < phi0) phi0 = phi;
	      if (phi > phi1) phi1 = phi;
	    }
	    if (antimeridian) {
	      if (lambda < lambda2) {
	        if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
	      } else {
	        if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
	      }
	    } else {
	      if (lambda1 >= lambda0$1) {
	        if (lambda < lambda0$1) lambda0$1 = lambda;
	        if (lambda > lambda1) lambda1 = lambda;
	      } else {
	        if (lambda > lambda2) {
	          if (angle(lambda0$1, lambda) > angle(lambda0$1, lambda1)) lambda1 = lambda;
	        } else {
	          if (angle(lambda, lambda1) > angle(lambda0$1, lambda1)) lambda0$1 = lambda;
	        }
	      }
	    }
	  } else {
	    boundsPoint(lambda, phi);
	  }
	  p0 = p, lambda2 = lambda;
	}

	function boundsLineStart() {
	  boundsStream.point = linePoint;
	}

	function boundsLineEnd() {
	  range$1[0] = lambda0$1, range$1[1] = lambda1;
	  boundsStream.point = boundsPoint;
	  p0 = null;
	}

	function boundsRingPoint(lambda, phi) {
	  if (p0) {
	    var delta = lambda - lambda2;
	    deltaSum.add(abs(delta) > 180 ? delta + (delta > 0 ? 360 : -360) : delta);
	  } else {
	    lambda00$1 = lambda, phi00$1 = phi;
	  }
	  areaStream.point(lambda, phi);
	  linePoint(lambda, phi);
	}

	function boundsRingStart() {
	  areaStream.lineStart();
	}

	function boundsRingEnd() {
	  boundsRingPoint(lambda00$1, phi00$1);
	  areaStream.lineEnd();
	  if (abs(deltaSum) > epsilon$4) lambda0$1 = -(lambda1 = 180);
	  range$1[0] = lambda0$1, range$1[1] = lambda1;
	  p0 = null;
	}

	// Finds the left-right distance between two longitudes.
	// This is almost the same as (lambda1 - lambda0 + 360°) % 360°, except that we want
	// the distance between ±180° to be 360°.
	function angle(lambda0, lambda1) {
	  return (lambda1 -= lambda0) < 0 ? lambda1 + 360 : lambda1;
	}

	function rangeCompare(a, b) {
	  return a[0] - b[0];
	}

	function rangeContains(range, x) {
	  return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
	}

	var bounds = function(feature) {
	  var i, n, a, b, merged, deltaMax, delta;

	  phi1 = lambda1 = -(lambda0$1 = phi0 = Infinity);
	  ranges = [];
	  geoStream(feature, boundsStream);

	  // First, sort ranges by their minimum longitudes.
	  if (n = ranges.length) {
	    ranges.sort(rangeCompare);

	    // Then, merge any ranges that overlap.
	    for (i = 1, a = ranges[0], merged = [a]; i < n; ++i) {
	      b = ranges[i];
	      if (rangeContains(a, b[0]) || rangeContains(a, b[1])) {
	        if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
	        if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
	      } else {
	        merged.push(a = b);
	      }
	    }

	    // Finally, find the largest gap between the merged ranges.
	    // The final bounding box will be the inverse of this gap.
	    for (deltaMax = -Infinity, n = merged.length - 1, i = 0, a = merged[n]; i <= n; a = b, ++i) {
	      b = merged[i];
	      if ((delta = angle(a[1], b[0])) > deltaMax) deltaMax = delta, lambda0$1 = b[0], lambda1 = a[1];
	    }
	  }

	  ranges = range$1 = null;

	  return lambda0$1 === Infinity || phi0 === Infinity
	      ? [[NaN, NaN], [NaN, NaN]]
	      : [[lambda0$1, phi0], [lambda1, phi1]];
	};

	var W0;
	var W1;
	var X0;
	var Y0;
	var Z0;
	var X1;
	var Y1;
	var Z1;
	var X2;
	var Y2;
	var Z2;
	var lambda00$2;
	var phi00$2;
	var x0;
	var y0;
	var z0; // previous point

	var centroidStream = {
	  sphere: noop$2,
	  point: centroidPoint,
	  lineStart: centroidLineStart,
	  lineEnd: centroidLineEnd,
	  polygonStart: function() {
	    centroidStream.lineStart = centroidRingStart;
	    centroidStream.lineEnd = centroidRingEnd;
	  },
	  polygonEnd: function() {
	    centroidStream.lineStart = centroidLineStart;
	    centroidStream.lineEnd = centroidLineEnd;
	  }
	};

	// Arithmetic mean of Cartesian vectors.
	function centroidPoint(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  var cosPhi = cos$1(phi);
	  centroidPointCartesian(cosPhi * cos$1(lambda), cosPhi * sin$1(lambda), sin$1(phi));
	}

	function centroidPointCartesian(x, y, z) {
	  ++W0;
	  X0 += (x - X0) / W0;
	  Y0 += (y - Y0) / W0;
	  Z0 += (z - Z0) / W0;
	}

	function centroidLineStart() {
	  centroidStream.point = centroidLinePointFirst;
	}

	function centroidLinePointFirst(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  var cosPhi = cos$1(phi);
	  x0 = cosPhi * cos$1(lambda);
	  y0 = cosPhi * sin$1(lambda);
	  z0 = sin$1(phi);
	  centroidStream.point = centroidLinePoint;
	  centroidPointCartesian(x0, y0, z0);
	}

	function centroidLinePoint(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  var cosPhi = cos$1(phi),
	      x = cosPhi * cos$1(lambda),
	      y = cosPhi * sin$1(lambda),
	      z = sin$1(phi),
	      w = atan2(sqrt$1((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
	  W1 += w;
	  X1 += w * (x0 + (x0 = x));
	  Y1 += w * (y0 + (y0 = y));
	  Z1 += w * (z0 + (z0 = z));
	  centroidPointCartesian(x0, y0, z0);
	}

	function centroidLineEnd() {
	  centroidStream.point = centroidPoint;
	}

	// See J. E. Brock, The Inertia Tensor for a Spherical Triangle,
	// J. Applied Mechanics 42, 239 (1975).
	function centroidRingStart() {
	  centroidStream.point = centroidRingPointFirst;
	}

	function centroidRingEnd() {
	  centroidRingPoint(lambda00$2, phi00$2);
	  centroidStream.point = centroidPoint;
	}

	function centroidRingPointFirst(lambda, phi) {
	  lambda00$2 = lambda, phi00$2 = phi;
	  lambda *= radians, phi *= radians;
	  centroidStream.point = centroidRingPoint;
	  var cosPhi = cos$1(phi);
	  x0 = cosPhi * cos$1(lambda);
	  y0 = cosPhi * sin$1(lambda);
	  z0 = sin$1(phi);
	  centroidPointCartesian(x0, y0, z0);
	}

	function centroidRingPoint(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  var cosPhi = cos$1(phi),
	      x = cosPhi * cos$1(lambda),
	      y = cosPhi * sin$1(lambda),
	      z = sin$1(phi),
	      cx = y0 * z - z0 * y,
	      cy = z0 * x - x0 * z,
	      cz = x0 * y - y0 * x,
	      m = sqrt$1(cx * cx + cy * cy + cz * cz),
	      u = x0 * x + y0 * y + z0 * z,
	      v = m && -acos(u) / m, // area weight
	      w = atan2(m, u); // line weight
	  X2 += v * cx;
	  Y2 += v * cy;
	  Z2 += v * cz;
	  W1 += w;
	  X1 += w * (x0 + (x0 = x));
	  Y1 += w * (y0 + (y0 = y));
	  Z1 += w * (z0 + (z0 = z));
	  centroidPointCartesian(x0, y0, z0);
	}

	var centroid$1 = function(object) {
	  W0 = W1 =
	  X0 = Y0 = Z0 =
	  X1 = Y1 = Z1 =
	  X2 = Y2 = Z2 = 0;
	  geoStream(object, centroidStream);

	  var x = X2,
	      y = Y2,
	      z = Z2,
	      m = x * x + y * y + z * z;

	  // If the area-weighted ccentroid is undefined, fall back to length-weighted ccentroid.
	  if (m < epsilon2$2) {
	    x = X1, y = Y1, z = Z1;
	    // If the feature has zero length, fall back to arithmetic mean of point vectors.
	    if (W1 < epsilon$4) x = X0, y = Y0, z = Z0;
	    m = x * x + y * y + z * z;
	    // If the feature still has an undefined ccentroid, then return.
	    if (m < epsilon2$2) return [NaN, NaN];
	  }

	  return [atan2(y, x) * degrees$1, asin$1(z / sqrt$1(m)) * degrees$1];
	};

	var constant$13 = function(x) {
	  return function() {
	    return x;
	  };
	};

	var compose = function(a, b) {

	  function compose(x, y) {
	    return x = a(x, y), b(x[0], x[1]);
	  }

	  if (a.invert && b.invert) compose.invert = function(x, y) {
	    return x = b.invert(x, y), x && a.invert(x[0], x[1]);
	  };

	  return compose;
	};

	function rotationIdentity(lambda, phi) {
	  return [lambda > pi$4 ? lambda - tau$4 : lambda < -pi$4 ? lambda + tau$4 : lambda, phi];
	}

	rotationIdentity.invert = rotationIdentity;

	function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
	  return (deltaLambda %= tau$4) ? (deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma))
	    : rotationLambda(deltaLambda))
	    : (deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma)
	    : rotationIdentity);
	}

	function forwardRotationLambda(deltaLambda) {
	  return function(lambda, phi) {
	    return lambda += deltaLambda, [lambda > pi$4 ? lambda - tau$4 : lambda < -pi$4 ? lambda + tau$4 : lambda, phi];
	  };
	}

	function rotationLambda(deltaLambda) {
	  var rotation = forwardRotationLambda(deltaLambda);
	  rotation.invert = forwardRotationLambda(-deltaLambda);
	  return rotation;
	}

	function rotationPhiGamma(deltaPhi, deltaGamma) {
	  var cosDeltaPhi = cos$1(deltaPhi),
	      sinDeltaPhi = sin$1(deltaPhi),
	      cosDeltaGamma = cos$1(deltaGamma),
	      sinDeltaGamma = sin$1(deltaGamma);

	  function rotation(lambda, phi) {
	    var cosPhi = cos$1(phi),
	        x = cos$1(lambda) * cosPhi,
	        y = sin$1(lambda) * cosPhi,
	        z = sin$1(phi),
	        k = z * cosDeltaPhi + x * sinDeltaPhi;
	    return [
	      atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
	      asin$1(k * cosDeltaGamma + y * sinDeltaGamma)
	    ];
	  }

	  rotation.invert = function(lambda, phi) {
	    var cosPhi = cos$1(phi),
	        x = cos$1(lambda) * cosPhi,
	        y = sin$1(lambda) * cosPhi,
	        z = sin$1(phi),
	        k = z * cosDeltaGamma - y * sinDeltaGamma;
	    return [
	      atan2(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
	      asin$1(k * cosDeltaPhi - x * sinDeltaPhi)
	    ];
	  };

	  return rotation;
	}

	var rotation = function(rotate) {
	  rotate = rotateRadians(rotate[0] * radians, rotate[1] * radians, rotate.length > 2 ? rotate[2] * radians : 0);

	  function forward(coordinates) {
	    coordinates = rotate(coordinates[0] * radians, coordinates[1] * radians);
	    return coordinates[0] *= degrees$1, coordinates[1] *= degrees$1, coordinates;
	  }

	  forward.invert = function(coordinates) {
	    coordinates = rotate.invert(coordinates[0] * radians, coordinates[1] * radians);
	    return coordinates[0] *= degrees$1, coordinates[1] *= degrees$1, coordinates;
	  };

	  return forward;
	};

	// Generates a circle centered at [0°, 0°], with a given radius and precision.
	function circleStream(stream, radius, delta, direction, t0, t1) {
	  if (!delta) return;
	  var cosRadius = cos$1(radius),
	      sinRadius = sin$1(radius),
	      step = direction * delta;
	  if (t0 == null) {
	    t0 = radius + direction * tau$4;
	    t1 = radius - step / 2;
	  } else {
	    t0 = circleRadius(cosRadius, t0);
	    t1 = circleRadius(cosRadius, t1);
	    if (direction > 0 ? t0 < t1 : t0 > t1) t0 += direction * tau$4;
	  }
	  for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
	    point = spherical([cosRadius, -sinRadius * cos$1(t), -sinRadius * sin$1(t)]);
	    stream.point(point[0], point[1]);
	  }
	}

	// Returns the signed angle of a cartesian point relative to [cosRadius, 0, 0].
	function circleRadius(cosRadius, point) {
	  point = cartesian(point), point[0] -= cosRadius;
	  cartesianNormalizeInPlace(point);
	  var radius = acos(-point[1]);
	  return ((-point[2] < 0 ? -radius : radius) + tau$4 - epsilon$4) % tau$4;
	}

	var circle$1 = function() {
	  var center = constant$13([0, 0]),
	      radius = constant$13(90),
	      precision = constant$13(6),
	      ring,
	      rotate,
	      stream = {point: point};

	  function point(x, y) {
	    ring.push(x = rotate(x, y));
	    x[0] *= degrees$1, x[1] *= degrees$1;
	  }

	  function circle() {
	    var c = center.apply(this, arguments),
	        r = radius.apply(this, arguments) * radians,
	        p = precision.apply(this, arguments) * radians;
	    ring = [];
	    rotate = rotateRadians(-c[0] * radians, -c[1] * radians, 0).invert;
	    circleStream(stream, r, p, 1);
	    c = {type: "Polygon", coordinates: [ring]};
	    ring = rotate = null;
	    return c;
	  }

	  circle.center = function(_) {
	    return arguments.length ? (center = typeof _ === "function" ? _ : constant$13([+_[0], +_[1]]), circle) : center;
	  };

	  circle.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant$13(+_), circle) : radius;
	  };

	  circle.precision = function(_) {
	    return arguments.length ? (precision = typeof _ === "function" ? _ : constant$13(+_), circle) : precision;
	  };

	  return circle;
	};

	var clipBuffer = function() {
	  var lines = [],
	      line;
	  return {
	    point: function(x, y) {
	      line.push([x, y]);
	    },
	    lineStart: function() {
	      lines.push(line = []);
	    },
	    lineEnd: noop$2,
	    rejoin: function() {
	      if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
	    },
	    result: function() {
	      var result = lines;
	      lines = [];
	      line = null;
	      return result;
	    }
	  };
	};

	var clipLine = function(a, b, x0, y0, x1, y1) {
	  var ax = a[0],
	      ay = a[1],
	      bx = b[0],
	      by = b[1],
	      t0 = 0,
	      t1 = 1,
	      dx = bx - ax,
	      dy = by - ay,
	      r;

	  r = x0 - ax;
	  if (!dx && r > 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dx > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = x1 - ax;
	  if (!dx && r < 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dx > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  r = y0 - ay;
	  if (!dy && r > 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dy > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = y1 - ay;
	  if (!dy && r < 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dy > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  if (t0 > 0) a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
	  if (t1 < 1) b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
	  return true;
	};

	var pointEqual = function(a, b) {
	  return abs(a[0] - b[0]) < epsilon$4 && abs(a[1] - b[1]) < epsilon$4;
	};

	function Intersection(point, points, other, entry) {
	  this.x = point;
	  this.z = points;
	  this.o = other; // another intersection
	  this.e = entry; // is an entry?
	  this.v = false; // visited
	  this.n = this.p = null; // next & previous
	}

	// A generalized polygon clipping algorithm: given a polygon that has been cut
	// into its visible line segments, and rejoins the segments by interpolating
	// along the clip edge.
	var clipPolygon = function(segments, compareIntersection, startInside, interpolate, stream) {
	  var subject = [],
	      clip = [],
	      i,
	      n;

	  segments.forEach(function(segment) {
	    if ((n = segment.length - 1) <= 0) return;
	    var n, p0 = segment[0], p1 = segment[n], x;

	    // If the first and last points of a segment are coincident, then treat as a
	    // closed ring. TODO if all rings are closed, then the winding order of the
	    // exterior ring should be checked.
	    if (pointEqual(p0, p1)) {
	      stream.lineStart();
	      for (i = 0; i < n; ++i) stream.point((p0 = segment[i])[0], p0[1]);
	      stream.lineEnd();
	      return;
	    }

	    subject.push(x = new Intersection(p0, segment, null, true));
	    clip.push(x.o = new Intersection(p0, null, x, false));
	    subject.push(x = new Intersection(p1, segment, null, false));
	    clip.push(x.o = new Intersection(p1, null, x, true));
	  });

	  if (!subject.length) return;

	  clip.sort(compareIntersection);
	  link$1(subject);
	  link$1(clip);

	  for (i = 0, n = clip.length; i < n; ++i) {
	    clip[i].e = startInside = !startInside;
	  }

	  var start = subject[0],
	      points,
	      point;

	  while (1) {
	    // Find first unvisited intersection.
	    var current = start,
	        isSubject = true;
	    while (current.v) if ((current = current.n) === start) return;
	    points = current.z;
	    stream.lineStart();
	    do {
	      current.v = current.o.v = true;
	      if (current.e) {
	        if (isSubject) {
	          for (i = 0, n = points.length; i < n; ++i) stream.point((point = points[i])[0], point[1]);
	        } else {
	          interpolate(current.x, current.n.x, 1, stream);
	        }
	        current = current.n;
	      } else {
	        if (isSubject) {
	          points = current.p.z;
	          for (i = points.length - 1; i >= 0; --i) stream.point((point = points[i])[0], point[1]);
	        } else {
	          interpolate(current.x, current.p.x, -1, stream);
	        }
	        current = current.p;
	      }
	      current = current.o;
	      points = current.z;
	      isSubject = !isSubject;
	    } while (!current.v);
	    stream.lineEnd();
	  }
	};

	function link$1(array) {
	  if (!(n = array.length)) return;
	  var n,
	      i = 0,
	      a = array[0],
	      b;
	  while (++i < n) {
	    a.n = b = array[i];
	    b.p = a;
	    a = b;
	  }
	  a.n = b = array[0];
	  b.p = a;
	}

	var clipMax = 1e9;
	var clipMin = -clipMax;

	// TODO Use d3-polygon’s polygonContains here for the ring check?
	// TODO Eliminate duplicate buffering in clipBuffer and polygon.push?

	function clipExtent(x0, y0, x1, y1) {

	  function visible(x, y) {
	    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
	  }

	  function interpolate(from, to, direction, stream) {
	    var a = 0, a1 = 0;
	    if (from == null
	        || (a = corner(from, direction)) !== (a1 = corner(to, direction))
	        || comparePoint(from, to) < 0 ^ direction > 0) {
	      do stream.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
	      while ((a = (a + direction + 4) % 4) !== a1);
	    } else {
	      stream.point(to[0], to[1]);
	    }
	  }

	  function corner(p, direction) {
	    return abs(p[0] - x0) < epsilon$4 ? direction > 0 ? 0 : 3
	        : abs(p[0] - x1) < epsilon$4 ? direction > 0 ? 2 : 1
	        : abs(p[1] - y0) < epsilon$4 ? direction > 0 ? 1 : 0
	        : direction > 0 ? 3 : 2; // abs(p[1] - y1) < epsilon
	  }

	  function compareIntersection(a, b) {
	    return comparePoint(a.x, b.x);
	  }

	  function comparePoint(a, b) {
	    var ca = corner(a, 1),
	        cb = corner(b, 1);
	    return ca !== cb ? ca - cb
	        : ca === 0 ? b[1] - a[1]
	        : ca === 1 ? a[0] - b[0]
	        : ca === 2 ? a[1] - b[1]
	        : b[0] - a[0];
	  }

	  return function(stream) {
	    var activeStream = stream,
	        bufferStream = clipBuffer(),
	        segments,
	        polygon,
	        ring,
	        x__, y__, v__, // first point
	        x_, y_, v_, // previous point
	        first,
	        clean;

	    var clipStream = {
	      point: point,
	      lineStart: lineStart,
	      lineEnd: lineEnd,
	      polygonStart: polygonStart,
	      polygonEnd: polygonEnd
	    };

	    function point(x, y) {
	      if (visible(x, y)) activeStream.point(x, y);
	    }

	    function polygonInside() {
	      var winding = 0;

	      for (var i = 0, n = polygon.length; i < n; ++i) {
	        for (var ring = polygon[i], j = 1, m = ring.length, point = ring[0], a0, a1, b0 = point[0], b1 = point[1]; j < m; ++j) {
	          a0 = b0, a1 = b1, point = ring[j], b0 = point[0], b1 = point[1];
	          if (a1 <= y1) { if (b1 > y1 && (b0 - a0) * (y1 - a1) > (b1 - a1) * (x0 - a0)) ++winding; }
	          else { if (b1 <= y1 && (b0 - a0) * (y1 - a1) < (b1 - a1) * (x0 - a0)) --winding; }
	        }
	      }

	      return winding;
	    }

	    // Buffer geometry within a polygon and then clip it en masse.
	    function polygonStart() {
	      activeStream = bufferStream, segments = [], polygon = [], clean = true;
	    }

	    function polygonEnd() {
	      var startInside = polygonInside(),
	          cleanInside = clean && startInside,
	          visible = (segments = merge(segments)).length;
	      if (cleanInside || visible) {
	        stream.polygonStart();
	        if (cleanInside) {
	          stream.lineStart();
	          interpolate(null, null, 1, stream);
	          stream.lineEnd();
	        }
	        if (visible) {
	          clipPolygon(segments, compareIntersection, startInside, interpolate, stream);
	        }
	        stream.polygonEnd();
	      }
	      activeStream = stream, segments = polygon = ring = null;
	    }

	    function lineStart() {
	      clipStream.point = linePoint;
	      if (polygon) polygon.push(ring = []);
	      first = true;
	      v_ = false;
	      x_ = y_ = NaN;
	    }

	    // TODO rather than special-case polygons, simply handle them separately.
	    // Ideally, coincident intersection points should be jittered to avoid
	    // clipping issues.
	    function lineEnd() {
	      if (segments) {
	        linePoint(x__, y__);
	        if (v__ && v_) bufferStream.rejoin();
	        segments.push(bufferStream.result());
	      }
	      clipStream.point = point;
	      if (v_) activeStream.lineEnd();
	    }

	    function linePoint(x, y) {
	      var v = visible(x, y);
	      if (polygon) ring.push([x, y]);
	      if (first) {
	        x__ = x, y__ = y, v__ = v;
	        first = false;
	        if (v) {
	          activeStream.lineStart();
	          activeStream.point(x, y);
	        }
	      } else {
	        if (v && v_) activeStream.point(x, y);
	        else {
	          var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))],
	              b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
	          if (clipLine(a, b, x0, y0, x1, y1)) {
	            if (!v_) {
	              activeStream.lineStart();
	              activeStream.point(a[0], a[1]);
	            }
	            activeStream.point(b[0], b[1]);
	            if (!v) activeStream.lineEnd();
	            clean = false;
	          } else if (v) {
	            activeStream.lineStart();
	            activeStream.point(x, y);
	            clean = false;
	          }
	        }
	      }
	      x_ = x, y_ = y, v_ = v;
	    }

	    return clipStream;
	  };
	}

	var extent$1 = function() {
	  var x0 = 0,
	      y0 = 0,
	      x1 = 960,
	      y1 = 500,
	      cache,
	      cacheStream,
	      clip;

	  return clip = {
	    stream: function(stream) {
	      return cache && cacheStream === stream ? cache : cache = clipExtent(x0, y0, x1, y1)(cacheStream = stream);
	    },
	    extent: function(_) {
	      return arguments.length ? (x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1], cache = cacheStream = null, clip) : [[x0, y0], [x1, y1]];
	    }
	  };
	};

	var lengthSum = adder();
	var lambda0$2;
	var sinPhi0$1;
	var cosPhi0$1;

	var lengthStream = {
	  sphere: noop$2,
	  point: noop$2,
	  lineStart: lengthLineStart,
	  lineEnd: noop$2,
	  polygonStart: noop$2,
	  polygonEnd: noop$2
	};

	function lengthLineStart() {
	  lengthStream.point = lengthPointFirst;
	  lengthStream.lineEnd = lengthLineEnd;
	}

	function lengthLineEnd() {
	  lengthStream.point = lengthStream.lineEnd = noop$2;
	}

	function lengthPointFirst(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  lambda0$2 = lambda, sinPhi0$1 = sin$1(phi), cosPhi0$1 = cos$1(phi);
	  lengthStream.point = lengthPoint;
	}

	function lengthPoint(lambda, phi) {
	  lambda *= radians, phi *= radians;
	  var sinPhi = sin$1(phi),
	      cosPhi = cos$1(phi),
	      delta = abs(lambda - lambda0$2),
	      cosDelta = cos$1(delta),
	      sinDelta = sin$1(delta),
	      x = cosPhi * sinDelta,
	      y = cosPhi0$1 * sinPhi - sinPhi0$1 * cosPhi * cosDelta,
	      z = sinPhi0$1 * sinPhi + cosPhi0$1 * cosPhi * cosDelta;
	  lengthSum.add(atan2(sqrt$1(x * x + y * y), z));
	  lambda0$2 = lambda, sinPhi0$1 = sinPhi, cosPhi0$1 = cosPhi;
	}

	var length$2 = function(object) {
	  lengthSum.reset();
	  geoStream(object, lengthStream);
	  return +lengthSum;
	};

	var coordinates = [null, null];
	var object$1 = {type: "LineString", coordinates: coordinates};

	var distance = function(a, b) {
	  coordinates[0] = a;
	  coordinates[1] = b;
	  return length$2(object$1);
	};

	function graticuleX(y0, y1, dy) {
	  var y = range(y0, y1 - epsilon$4, dy).concat(y1);
	  return function(x) { return y.map(function(y) { return [x, y]; }); };
	}

	function graticuleY(x0, x1, dx) {
	  var x = range(x0, x1 - epsilon$4, dx).concat(x1);
	  return function(y) { return x.map(function(x) { return [x, y]; }); };
	}

	function graticule() {
	  var x1, x0, X1, X0,
	      y1, y0, Y1, Y0,
	      dx = 10, dy = dx, DX = 90, DY = 360,
	      x, y, X, Y,
	      precision = 2.5;

	  function graticule() {
	    return {type: "MultiLineString", coordinates: lines()};
	  }

	  function lines() {
	    return range(ceil(X0 / DX) * DX, X1, DX).map(X)
	        .concat(range(ceil(Y0 / DY) * DY, Y1, DY).map(Y))
	        .concat(range(ceil(x0 / dx) * dx, x1, dx).filter(function(x) { return abs(x % DX) > epsilon$4; }).map(x))
	        .concat(range(ceil(y0 / dy) * dy, y1, dy).filter(function(y) { return abs(y % DY) > epsilon$4; }).map(y));
	  }

	  graticule.lines = function() {
	    return lines().map(function(coordinates) { return {type: "LineString", coordinates: coordinates}; });
	  };

	  graticule.outline = function() {
	    return {
	      type: "Polygon",
	      coordinates: [
	        X(X0).concat(
	        Y(Y1).slice(1),
	        X(X1).reverse().slice(1),
	        Y(Y0).reverse().slice(1))
	      ]
	    };
	  };

	  graticule.extent = function(_) {
	    if (!arguments.length) return graticule.extentMinor();
	    return graticule.extentMajor(_).extentMinor(_);
	  };

	  graticule.extentMajor = function(_) {
	    if (!arguments.length) return [[X0, Y0], [X1, Y1]];
	    X0 = +_[0][0], X1 = +_[1][0];
	    Y0 = +_[0][1], Y1 = +_[1][1];
	    if (X0 > X1) _ = X0, X0 = X1, X1 = _;
	    if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
	    return graticule.precision(precision);
	  };

	  graticule.extentMinor = function(_) {
	    if (!arguments.length) return [[x0, y0], [x1, y1]];
	    x0 = +_[0][0], x1 = +_[1][0];
	    y0 = +_[0][1], y1 = +_[1][1];
	    if (x0 > x1) _ = x0, x0 = x1, x1 = _;
	    if (y0 > y1) _ = y0, y0 = y1, y1 = _;
	    return graticule.precision(precision);
	  };

	  graticule.step = function(_) {
	    if (!arguments.length) return graticule.stepMinor();
	    return graticule.stepMajor(_).stepMinor(_);
	  };

	  graticule.stepMajor = function(_) {
	    if (!arguments.length) return [DX, DY];
	    DX = +_[0], DY = +_[1];
	    return graticule;
	  };

	  graticule.stepMinor = function(_) {
	    if (!arguments.length) return [dx, dy];
	    dx = +_[0], dy = +_[1];
	    return graticule;
	  };

	  graticule.precision = function(_) {
	    if (!arguments.length) return precision;
	    precision = +_;
	    x = graticuleX(y0, y1, 90);
	    y = graticuleY(x0, x1, precision);
	    X = graticuleX(Y0, Y1, 90);
	    Y = graticuleY(X0, X1, precision);
	    return graticule;
	  };

	  return graticule
	      .extentMajor([[-180, -90 + epsilon$4], [180, 90 - epsilon$4]])
	      .extentMinor([[-180, -80 - epsilon$4], [180, 80 + epsilon$4]]);
	}

	function graticule10() {
	  return graticule()();
	}

	var interpolate$2 = function(a, b) {
	  var x0 = a[0] * radians,
	      y0 = a[1] * radians,
	      x1 = b[0] * radians,
	      y1 = b[1] * radians,
	      cy0 = cos$1(y0),
	      sy0 = sin$1(y0),
	      cy1 = cos$1(y1),
	      sy1 = sin$1(y1),
	      kx0 = cy0 * cos$1(x0),
	      ky0 = cy0 * sin$1(x0),
	      kx1 = cy1 * cos$1(x1),
	      ky1 = cy1 * sin$1(x1),
	      d = 2 * asin$1(sqrt$1(haversin(y1 - y0) + cy0 * cy1 * haversin(x1 - x0))),
	      k = sin$1(d);

	  var interpolate = d ? function(t) {
	    var B = sin$1(t *= d) / k,
	        A = sin$1(d - t) / k,
	        x = A * kx0 + B * kx1,
	        y = A * ky0 + B * ky1,
	        z = A * sy0 + B * sy1;
	    return [
	      atan2(y, x) * degrees$1,
	      atan2(z, sqrt$1(x * x + y * y)) * degrees$1
	    ];
	  } : function() {
	    return [x0 * degrees$1, y0 * degrees$1];
	  };

	  interpolate.distance = d;

	  return interpolate;
	};

	var identity$7 = function(x) {
	  return x;
	};

	var areaSum$1 = adder();
	var areaRingSum$1 = adder();
	var x00;
	var y00;
	var x0$1;
	var y0$1;

	var areaStream$1 = {
	  point: noop$2,
	  lineStart: noop$2,
	  lineEnd: noop$2,
	  polygonStart: function() {
	    areaStream$1.lineStart = areaRingStart$1;
	    areaStream$1.lineEnd = areaRingEnd$1;
	  },
	  polygonEnd: function() {
	    areaStream$1.lineStart = areaStream$1.lineEnd = areaStream$1.point = noop$2;
	    areaSum$1.add(abs(areaRingSum$1));
	    areaRingSum$1.reset();
	  },
	  result: function() {
	    var area = areaSum$1 / 2;
	    areaSum$1.reset();
	    return area;
	  }
	};

	function areaRingStart$1() {
	  areaStream$1.point = areaPointFirst$1;
	}

	function areaPointFirst$1(x, y) {
	  areaStream$1.point = areaPoint$1;
	  x00 = x0$1 = x, y00 = y0$1 = y;
	}

	function areaPoint$1(x, y) {
	  areaRingSum$1.add(y0$1 * x - x0$1 * y);
	  x0$1 = x, y0$1 = y;
	}

	function areaRingEnd$1() {
	  areaPoint$1(x00, y00);
	}

	var x0$2 = Infinity;
	var y0$2 = x0$2;
	var x1 = -x0$2;
	var y1 = x1;

	var boundsStream$1 = {
	  point: boundsPoint$1,
	  lineStart: noop$2,
	  lineEnd: noop$2,
	  polygonStart: noop$2,
	  polygonEnd: noop$2,
	  result: function() {
	    var bounds = [[x0$2, y0$2], [x1, y1]];
	    x1 = y1 = -(y0$2 = x0$2 = Infinity);
	    return bounds;
	  }
	};

	function boundsPoint$1(x, y) {
	  if (x < x0$2) x0$2 = x;
	  if (x > x1) x1 = x;
	  if (y < y0$2) y0$2 = y;
	  if (y > y1) y1 = y;
	}

	// TODO Enforce positive area for exterior, negative area for interior?

	var X0$1 = 0;
	var Y0$1 = 0;
	var Z0$1 = 0;
	var X1$1 = 0;
	var Y1$1 = 0;
	var Z1$1 = 0;
	var X2$1 = 0;
	var Y2$1 = 0;
	var Z2$1 = 0;
	var x00$1;
	var y00$1;
	var x0$3;
	var y0$3;

	var centroidStream$1 = {
	  point: centroidPoint$1,
	  lineStart: centroidLineStart$1,
	  lineEnd: centroidLineEnd$1,
	  polygonStart: function() {
	    centroidStream$1.lineStart = centroidRingStart$1;
	    centroidStream$1.lineEnd = centroidRingEnd$1;
	  },
	  polygonEnd: function() {
	    centroidStream$1.point = centroidPoint$1;
	    centroidStream$1.lineStart = centroidLineStart$1;
	    centroidStream$1.lineEnd = centroidLineEnd$1;
	  },
	  result: function() {
	    var centroid = Z2$1 ? [X2$1 / Z2$1, Y2$1 / Z2$1]
	        : Z1$1 ? [X1$1 / Z1$1, Y1$1 / Z1$1]
	        : Z0$1 ? [X0$1 / Z0$1, Y0$1 / Z0$1]
	        : [NaN, NaN];
	    X0$1 = Y0$1 = Z0$1 =
	    X1$1 = Y1$1 = Z1$1 =
	    X2$1 = Y2$1 = Z2$1 = 0;
	    return centroid;
	  }
	};

	function centroidPoint$1(x, y) {
	  X0$1 += x;
	  Y0$1 += y;
	  ++Z0$1;
	}

	function centroidLineStart$1() {
	  centroidStream$1.point = centroidPointFirstLine;
	}

	function centroidPointFirstLine(x, y) {
	  centroidStream$1.point = centroidPointLine;
	  centroidPoint$1(x0$3 = x, y0$3 = y);
	}

	function centroidPointLine(x, y) {
	  var dx = x - x0$3, dy = y - y0$3, z = sqrt$1(dx * dx + dy * dy);
	  X1$1 += z * (x0$3 + x) / 2;
	  Y1$1 += z * (y0$3 + y) / 2;
	  Z1$1 += z;
	  centroidPoint$1(x0$3 = x, y0$3 = y);
	}

	function centroidLineEnd$1() {
	  centroidStream$1.point = centroidPoint$1;
	}

	function centroidRingStart$1() {
	  centroidStream$1.point = centroidPointFirstRing;
	}

	function centroidRingEnd$1() {
	  centroidPointRing(x00$1, y00$1);
	}

	function centroidPointFirstRing(x, y) {
	  centroidStream$1.point = centroidPointRing;
	  centroidPoint$1(x00$1 = x0$3 = x, y00$1 = y0$3 = y);
	}

	function centroidPointRing(x, y) {
	  var dx = x - x0$3,
	      dy = y - y0$3,
	      z = sqrt$1(dx * dx + dy * dy);

	  X1$1 += z * (x0$3 + x) / 2;
	  Y1$1 += z * (y0$3 + y) / 2;
	  Z1$1 += z;

	  z = y0$3 * x - x0$3 * y;
	  X2$1 += z * (x0$3 + x);
	  Y2$1 += z * (y0$3 + y);
	  Z2$1 += z * 3;
	  centroidPoint$1(x0$3 = x, y0$3 = y);
	}

	function PathContext(context) {
	  this._context = context;
	}

	PathContext.prototype = {
	  _radius: 4.5,
	  pointRadius: function(_) {
	    return this._radius = _, this;
	  },
	  polygonStart: function() {
	    this._line = 0;
	  },
	  polygonEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line === 0) this._context.closePath();
	    this._point = NaN;
	  },
	  point: function(x, y) {
	    switch (this._point) {
	      case 0: {
	        this._context.moveTo(x, y);
	        this._point = 1;
	        break;
	      }
	      case 1: {
	        this._context.lineTo(x, y);
	        break;
	      }
	      default: {
	        this._context.moveTo(x + this._radius, y);
	        this._context.arc(x, y, this._radius, 0, tau$4);
	        break;
	      }
	    }
	  },
	  result: noop$2
	};

	function PathString() {
	  this._string = [];
	}

	PathString.prototype = {
	  _circle: circle$2(4.5),
	  pointRadius: function(_) {
	    return this._circle = circle$2(_), this;
	  },
	  polygonStart: function() {
	    this._line = 0;
	  },
	  polygonEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line === 0) this._string.push("Z");
	    this._point = NaN;
	  },
	  point: function(x, y) {
	    switch (this._point) {
	      case 0: {
	        this._string.push("M", x, ",", y);
	        this._point = 1;
	        break;
	      }
	      case 1: {
	        this._string.push("L", x, ",", y);
	        break;
	      }
	      default: {
	        this._string.push("M", x, ",", y, this._circle);
	        break;
	      }
	    }
	  },
	  result: function() {
	    if (this._string.length) {
	      var result = this._string.join("");
	      this._string = [];
	      return result;
	    }
	  }
	};

	function circle$2(radius) {
	  return "m0," + radius
	      + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius
	      + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius
	      + "z";
	}

	var index$3 = function(projection, context) {
	  var pointRadius = 4.5,
	      projectionStream,
	      contextStream;

	  function path(object) {
	    if (object) {
	      if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
	      geoStream(object, projectionStream(contextStream));
	    }
	    return contextStream.result();
	  }

	  path.area = function(object) {
	    geoStream(object, projectionStream(areaStream$1));
	    return areaStream$1.result();
	  };

	  path.bounds = function(object) {
	    geoStream(object, projectionStream(boundsStream$1));
	    return boundsStream$1.result();
	  };

	  path.centroid = function(object) {
	    geoStream(object, projectionStream(centroidStream$1));
	    return centroidStream$1.result();
	  };

	  path.projection = function(_) {
	    return arguments.length ? (projectionStream = (projection = _) == null ? identity$7 : _.stream, path) : projection;
	  };

	  path.context = function(_) {
	    if (!arguments.length) return context;
	    contextStream = (context = _) == null ? new PathString : new PathContext(_);
	    if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
	    return path;
	  };

	  path.pointRadius = function(_) {
	    if (!arguments.length) return pointRadius;
	    pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
	    return path;
	  };

	  return path.projection(projection).context(context);
	};

	var sum$2 = adder();

	var polygonContains = function(polygon, point) {
	  var lambda = point[0],
	      phi = point[1],
	      normal = [sin$1(lambda), -cos$1(lambda), 0],
	      angle = 0,
	      winding = 0;

	  sum$2.reset();

	  for (var i = 0, n = polygon.length; i < n; ++i) {
	    if (!(m = (ring = polygon[i]).length)) continue;
	    var ring,
	        m,
	        point0 = ring[m - 1],
	        lambda0 = point0[0],
	        phi0 = point0[1] / 2 + quarterPi,
	        sinPhi0 = sin$1(phi0),
	        cosPhi0 = cos$1(phi0);

	    for (var j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
	      var point1 = ring[j],
	          lambda1 = point1[0],
	          phi1 = point1[1] / 2 + quarterPi,
	          sinPhi1 = sin$1(phi1),
	          cosPhi1 = cos$1(phi1),
	          delta = lambda1 - lambda0,
	          sign$$1 = delta >= 0 ? 1 : -1,
	          absDelta = sign$$1 * delta,
	          antimeridian = absDelta > pi$4,
	          k = sinPhi0 * sinPhi1;

	      sum$2.add(atan2(k * sign$$1 * sin$1(absDelta), cosPhi0 * cosPhi1 + k * cos$1(absDelta)));
	      angle += antimeridian ? delta + sign$$1 * tau$4 : delta;

	      // Are the longitudes either side of the point’s meridian (lambda),
	      // and are the latitudes smaller than the parallel (phi)?
	      if (antimeridian ^ lambda0 >= lambda ^ lambda1 >= lambda) {
	        var arc = cartesianCross(cartesian(point0), cartesian(point1));
	        cartesianNormalizeInPlace(arc);
	        var intersection = cartesianCross(normal, arc);
	        cartesianNormalizeInPlace(intersection);
	        var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin$1(intersection[2]);
	        if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
	          winding += antimeridian ^ delta >= 0 ? 1 : -1;
	        }
	      }
	    }
	  }

	  // First, determine whether the South pole is inside or outside:
	  //
	  // It is inside if:
	  // * the polygon winds around it in a clockwise direction.
	  // * the polygon does not (cumulatively) wind around it, but has a negative
	  //   (counter-clockwise) area.
	  //
	  // Second, count the (signed) number of times a segment crosses a lambda
	  // from the point to the South pole.  If it is zero, then the point is the
	  // same side as the South pole.

	  return (angle < -epsilon$4 || angle < epsilon$4 && sum$2 < -epsilon$4) ^ (winding & 1);
	};

	var clip = function(pointVisible, clipLine, interpolate, start) {
	  return function(rotate, sink) {
	    var line = clipLine(sink),
	        rotatedStart = rotate.invert(start[0], start[1]),
	        ringBuffer = clipBuffer(),
	        ringSink = clipLine(ringBuffer),
	        polygonStarted = false,
	        polygon,
	        segments,
	        ring;

	    var clip = {
	      point: point,
	      lineStart: lineStart,
	      lineEnd: lineEnd,
	      polygonStart: function() {
	        clip.point = pointRing;
	        clip.lineStart = ringStart;
	        clip.lineEnd = ringEnd;
	        segments = [];
	        polygon = [];
	      },
	      polygonEnd: function() {
	        clip.point = point;
	        clip.lineStart = lineStart;
	        clip.lineEnd = lineEnd;
	        segments = merge(segments);
	        var startInside = polygonContains(polygon, rotatedStart);
	        if (segments.length) {
	          if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
	          clipPolygon(segments, compareIntersection, startInside, interpolate, sink);
	        } else if (startInside) {
	          if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
	          sink.lineStart();
	          interpolate(null, null, 1, sink);
	          sink.lineEnd();
	        }
	        if (polygonStarted) sink.polygonEnd(), polygonStarted = false;
	        segments = polygon = null;
	      },
	      sphere: function() {
	        sink.polygonStart();
	        sink.lineStart();
	        interpolate(null, null, 1, sink);
	        sink.lineEnd();
	        sink.polygonEnd();
	      }
	    };

	    function point(lambda, phi) {
	      var point = rotate(lambda, phi);
	      if (pointVisible(lambda = point[0], phi = point[1])) sink.point(lambda, phi);
	    }

	    function pointLine(lambda, phi) {
	      var point = rotate(lambda, phi);
	      line.point(point[0], point[1]);
	    }

	    function lineStart() {
	      clip.point = pointLine;
	      line.lineStart();
	    }

	    function lineEnd() {
	      clip.point = point;
	      line.lineEnd();
	    }

	    function pointRing(lambda, phi) {
	      ring.push([lambda, phi]);
	      var point = rotate(lambda, phi);
	      ringSink.point(point[0], point[1]);
	    }

	    function ringStart() {
	      ringSink.lineStart();
	      ring = [];
	    }

	    function ringEnd() {
	      pointRing(ring[0][0], ring[0][1]);
	      ringSink.lineEnd();

	      var clean = ringSink.clean(),
	          ringSegments = ringBuffer.result(),
	          i, n = ringSegments.length, m,
	          segment,
	          point;

	      ring.pop();
	      polygon.push(ring);
	      ring = null;

	      if (!n) return;

	      // No intersections.
	      if (clean & 1) {
	        segment = ringSegments[0];
	        if ((m = segment.length - 1) > 0) {
	          if (!polygonStarted) sink.polygonStart(), polygonStarted = true;
	          sink.lineStart();
	          for (i = 0; i < m; ++i) sink.point((point = segment[i])[0], point[1]);
	          sink.lineEnd();
	        }
	        return;
	      }

	      // Rejoin connected segments.
	      // TODO reuse ringBuffer.rejoin()?
	      if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));

	      segments.push(ringSegments.filter(validSegment));
	    }

	    return clip;
	  };
	};

	function validSegment(segment) {
	  return segment.length > 1;
	}

	// Intersections are sorted along the clip edge. For both antimeridian cutting
	// and circle clipping, the same comparison is used.
	function compareIntersection(a, b) {
	  return ((a = a.x)[0] < 0 ? a[1] - halfPi$3 - epsilon$4 : halfPi$3 - a[1])
	       - ((b = b.x)[0] < 0 ? b[1] - halfPi$3 - epsilon$4 : halfPi$3 - b[1]);
	}

	var clipAntimeridian = clip(
	  function() { return true; },
	  clipAntimeridianLine,
	  clipAntimeridianInterpolate,
	  [-pi$4, -halfPi$3]
	);

	// Takes a line and cuts into visible segments. Return values: 0 - there were
	// intersections or the line was empty; 1 - no intersections; 2 - there were
	// intersections, and the first and last segments should be rejoined.
	function clipAntimeridianLine(stream) {
	  var lambda0 = NaN,
	      phi0 = NaN,
	      sign0 = NaN,
	      clean; // no intersections

	  return {
	    lineStart: function() {
	      stream.lineStart();
	      clean = 1;
	    },
	    point: function(lambda1, phi1) {
	      var sign1 = lambda1 > 0 ? pi$4 : -pi$4,
	          delta = abs(lambda1 - lambda0);
	      if (abs(delta - pi$4) < epsilon$4) { // line crosses a pole
	        stream.point(lambda0, phi0 = (phi0 + phi1) / 2 > 0 ? halfPi$3 : -halfPi$3);
	        stream.point(sign0, phi0);
	        stream.lineEnd();
	        stream.lineStart();
	        stream.point(sign1, phi0);
	        stream.point(lambda1, phi0);
	        clean = 0;
	      } else if (sign0 !== sign1 && delta >= pi$4) { // line crosses antimeridian
	        if (abs(lambda0 - sign0) < epsilon$4) lambda0 -= sign0 * epsilon$4; // handle degeneracies
	        if (abs(lambda1 - sign1) < epsilon$4) lambda1 -= sign1 * epsilon$4;
	        phi0 = clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1);
	        stream.point(sign0, phi0);
	        stream.lineEnd();
	        stream.lineStart();
	        stream.point(sign1, phi0);
	        clean = 0;
	      }
	      stream.point(lambda0 = lambda1, phi0 = phi1);
	      sign0 = sign1;
	    },
	    lineEnd: function() {
	      stream.lineEnd();
	      lambda0 = phi0 = NaN;
	    },
	    clean: function() {
	      return 2 - clean; // if intersections, rejoin first and last segments
	    }
	  };
	}

	function clipAntimeridianIntersect(lambda0, phi0, lambda1, phi1) {
	  var cosPhi0,
	      cosPhi1,
	      sinLambda0Lambda1 = sin$1(lambda0 - lambda1);
	  return abs(sinLambda0Lambda1) > epsilon$4
	      ? atan((sin$1(phi0) * (cosPhi1 = cos$1(phi1)) * sin$1(lambda1)
	          - sin$1(phi1) * (cosPhi0 = cos$1(phi0)) * sin$1(lambda0))
	          / (cosPhi0 * cosPhi1 * sinLambda0Lambda1))
	      : (phi0 + phi1) / 2;
	}

	function clipAntimeridianInterpolate(from, to, direction, stream) {
	  var phi;
	  if (from == null) {
	    phi = direction * halfPi$3;
	    stream.point(-pi$4, phi);
	    stream.point(0, phi);
	    stream.point(pi$4, phi);
	    stream.point(pi$4, 0);
	    stream.point(pi$4, -phi);
	    stream.point(0, -phi);
	    stream.point(-pi$4, -phi);
	    stream.point(-pi$4, 0);
	    stream.point(-pi$4, phi);
	  } else if (abs(from[0] - to[0]) > epsilon$4) {
	    var lambda = from[0] < to[0] ? pi$4 : -pi$4;
	    phi = direction * lambda / 2;
	    stream.point(-lambda, phi);
	    stream.point(0, phi);
	    stream.point(lambda, phi);
	  } else {
	    stream.point(to[0], to[1]);
	  }
	}

	var clipCircle = function(radius, delta) {
	  var cr = cos$1(radius),
	      smallRadius = cr > 0,
	      notHemisphere = abs(cr) > epsilon$4; // TODO optimise for this common case

	  function interpolate(from, to, direction, stream) {
	    circleStream(stream, radius, delta, direction, from, to);
	  }

	  function visible(lambda, phi) {
	    return cos$1(lambda) * cos$1(phi) > cr;
	  }

	  // Takes a line and cuts into visible segments. Return values used for polygon
	  // clipping: 0 - there were intersections or the line was empty; 1 - no
	  // intersections 2 - there were intersections, and the first and last segments
	  // should be rejoined.
	  function clipLine(stream) {
	    var point0, // previous point
	        c0, // code for previous point
	        v0, // visibility of previous point
	        v00, // visibility of first point
	        clean; // no intersections
	    return {
	      lineStart: function() {
	        v00 = v0 = false;
	        clean = 1;
	      },
	      point: function(lambda, phi) {
	        var point1 = [lambda, phi],
	            point2,
	            v = visible(lambda, phi),
	            c = smallRadius
	              ? v ? 0 : code(lambda, phi)
	              : v ? code(lambda + (lambda < 0 ? pi$4 : -pi$4), phi) : 0;
	        if (!point0 && (v00 = v0 = v)) stream.lineStart();
	        // Handle degeneracies.
	        // TODO ignore if not clipping polygons.
	        if (v !== v0) {
	          point2 = intersect(point0, point1);
	          if (pointEqual(point0, point2) || pointEqual(point1, point2)) {
	            point1[0] += epsilon$4;
	            point1[1] += epsilon$4;
	            v = visible(point1[0], point1[1]);
	          }
	        }
	        if (v !== v0) {
	          clean = 0;
	          if (v) {
	            // outside going in
	            stream.lineStart();
	            point2 = intersect(point1, point0);
	            stream.point(point2[0], point2[1]);
	          } else {
	            // inside going out
	            point2 = intersect(point0, point1);
	            stream.point(point2[0], point2[1]);
	            stream.lineEnd();
	          }
	          point0 = point2;
	        } else if (notHemisphere && point0 && smallRadius ^ v) {
	          var t;
	          // If the codes for two points are different, or are both zero,
	          // and there this segment intersects with the small circle.
	          if (!(c & c0) && (t = intersect(point1, point0, true))) {
	            clean = 0;
	            if (smallRadius) {
	              stream.lineStart();
	              stream.point(t[0][0], t[0][1]);
	              stream.point(t[1][0], t[1][1]);
	              stream.lineEnd();
	            } else {
	              stream.point(t[1][0], t[1][1]);
	              stream.lineEnd();
	              stream.lineStart();
	              stream.point(t[0][0], t[0][1]);
	            }
	          }
	        }
	        if (v && (!point0 || !pointEqual(point0, point1))) {
	          stream.point(point1[0], point1[1]);
	        }
	        point0 = point1, v0 = v, c0 = c;
	      },
	      lineEnd: function() {
	        if (v0) stream.lineEnd();
	        point0 = null;
	      },
	      // Rejoin first and last segments if there were intersections and the first
	      // and last points were visible.
	      clean: function() {
	        return clean | ((v00 && v0) << 1);
	      }
	    };
	  }

	  // Intersects the great circle between a and b with the clip circle.
	  function intersect(a, b, two) {
	    var pa = cartesian(a),
	        pb = cartesian(b);

	    // We have two planes, n1.p = d1 and n2.p = d2.
	    // Find intersection line p(t) = c1 n1 + c2 n2 + t (n1 ⨯ n2).
	    var n1 = [1, 0, 0], // normal
	        n2 = cartesianCross(pa, pb),
	        n2n2 = cartesianDot(n2, n2),
	        n1n2 = n2[0], // cartesianDot(n1, n2),
	        determinant = n2n2 - n1n2 * n1n2;

	    // Two polar points.
	    if (!determinant) return !two && a;

	    var c1 =  cr * n2n2 / determinant,
	        c2 = -cr * n1n2 / determinant,
	        n1xn2 = cartesianCross(n1, n2),
	        A = cartesianScale(n1, c1),
	        B = cartesianScale(n2, c2);
	    cartesianAddInPlace(A, B);

	    // Solve |p(t)|^2 = 1.
	    var u = n1xn2,
	        w = cartesianDot(A, u),
	        uu = cartesianDot(u, u),
	        t2 = w * w - uu * (cartesianDot(A, A) - 1);

	    if (t2 < 0) return;

	    var t = sqrt$1(t2),
	        q = cartesianScale(u, (-w - t) / uu);
	    cartesianAddInPlace(q, A);
	    q = spherical(q);

	    if (!two) return q;

	    // Two intersection points.
	    var lambda0 = a[0],
	        lambda1 = b[0],
	        phi0 = a[1],
	        phi1 = b[1],
	        z;

	    if (lambda1 < lambda0) z = lambda0, lambda0 = lambda1, lambda1 = z;

	    var delta = lambda1 - lambda0,
	        polar = abs(delta - pi$4) < epsilon$4,
	        meridian = polar || delta < epsilon$4;

	    if (!polar && phi1 < phi0) z = phi0, phi0 = phi1, phi1 = z;

	    // Check that the first point is between a and b.
	    if (meridian
	        ? polar
	          ? phi0 + phi1 > 0 ^ q[1] < (abs(q[0] - lambda0) < epsilon$4 ? phi0 : phi1)
	          : phi0 <= q[1] && q[1] <= phi1
	        : delta > pi$4 ^ (lambda0 <= q[0] && q[0] <= lambda1)) {
	      var q1 = cartesianScale(u, (-w + t) / uu);
	      cartesianAddInPlace(q1, A);
	      return [q, spherical(q1)];
	    }
	  }

	  // Generates a 4-bit vector representing the location of a point relative to
	  // the small circle's bounding box.
	  function code(lambda, phi) {
	    var r = smallRadius ? radius : pi$4 - radius,
	        code = 0;
	    if (lambda < -r) code |= 1; // left
	    else if (lambda > r) code |= 2; // right
	    if (phi < -r) code |= 4; // below
	    else if (phi > r) code |= 8; // above
	    return code;
	  }

	  return clip(visible, clipLine, interpolate, smallRadius ? [0, -radius] : [-pi$4, radius - pi$4]);
	};

	var transform$1 = function(methods) {
	  return {
	    stream: transformer(methods)
	  };
	};

	function transformer(methods) {
	  return function(stream) {
	    var s = new TransformStream;
	    for (var key in methods) s[key] = methods[key];
	    s.stream = stream;
	    return s;
	  };
	}

	function TransformStream() {}

	TransformStream.prototype = {
	  constructor: TransformStream,
	  point: function(x, y) { this.stream.point(x, y); },
	  sphere: function() { this.stream.sphere(); },
	  lineStart: function() { this.stream.lineStart(); },
	  lineEnd: function() { this.stream.lineEnd(); },
	  polygonStart: function() { this.stream.polygonStart(); },
	  polygonEnd: function() { this.stream.polygonEnd(); }
	};

	function fitExtent(projection, extent, object) {
	  var w = extent[1][0] - extent[0][0],
	      h = extent[1][1] - extent[0][1],
	      clip = projection.clipExtent && projection.clipExtent();

	  projection
	      .scale(150)
	      .translate([0, 0]);

	  if (clip != null) projection.clipExtent(null);

	  geoStream(object, projection.stream(boundsStream$1));

	  var b = boundsStream$1.result(),
	      k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),
	      x = +extent[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,
	      y = +extent[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;

	  if (clip != null) projection.clipExtent(clip);

	  return projection
	      .scale(k * 150)
	      .translate([x, y]);
	}

	function fitSize(projection, size, object) {
	  return fitExtent(projection, [[0, 0], size], object);
	}

	var maxDepth = 16;
	var cosMinDistance = cos$1(30 * radians); // cos(minimum angular distance)

	var resample = function(project, delta2) {
	  return +delta2 ? resample$1(project, delta2) : resampleNone(project);
	};

	function resampleNone(project) {
	  return transformer({
	    point: function(x, y) {
	      x = project(x, y);
	      this.stream.point(x[0], x[1]);
	    }
	  });
	}

	function resample$1(project, delta2) {

	  function resampleLineTo(x0, y0, lambda0, a0, b0, c0, x1, y1, lambda1, a1, b1, c1, depth, stream) {
	    var dx = x1 - x0,
	        dy = y1 - y0,
	        d2 = dx * dx + dy * dy;
	    if (d2 > 4 * delta2 && depth--) {
	      var a = a0 + a1,
	          b = b0 + b1,
	          c = c0 + c1,
	          m = sqrt$1(a * a + b * b + c * c),
	          phi2 = asin$1(c /= m),
	          lambda2 = abs(abs(c) - 1) < epsilon$4 || abs(lambda0 - lambda1) < epsilon$4 ? (lambda0 + lambda1) / 2 : atan2(b, a),
	          p = project(lambda2, phi2),
	          x2 = p[0],
	          y2 = p[1],
	          dx2 = x2 - x0,
	          dy2 = y2 - y0,
	          dz = dy * dx2 - dx * dy2;
	      if (dz * dz / d2 > delta2 // perpendicular projected distance
	          || abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 // midpoint close to an end
	          || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) { // angular distance
	        resampleLineTo(x0, y0, lambda0, a0, b0, c0, x2, y2, lambda2, a /= m, b /= m, c, depth, stream);
	        stream.point(x2, y2);
	        resampleLineTo(x2, y2, lambda2, a, b, c, x1, y1, lambda1, a1, b1, c1, depth, stream);
	      }
	    }
	  }
	  return function(stream) {
	    var lambda00, x00, y00, a00, b00, c00, // first point
	        lambda0, x0, y0, a0, b0, c0; // previous point

	    var resampleStream = {
	      point: point,
	      lineStart: lineStart,
	      lineEnd: lineEnd,
	      polygonStart: function() { stream.polygonStart(); resampleStream.lineStart = ringStart; },
	      polygonEnd: function() { stream.polygonEnd(); resampleStream.lineStart = lineStart; }
	    };

	    function point(x, y) {
	      x = project(x, y);
	      stream.point(x[0], x[1]);
	    }

	    function lineStart() {
	      x0 = NaN;
	      resampleStream.point = linePoint;
	      stream.lineStart();
	    }

	    function linePoint(lambda, phi) {
	      var c = cartesian([lambda, phi]), p = project(lambda, phi);
	      resampleLineTo(x0, y0, lambda0, a0, b0, c0, x0 = p[0], y0 = p[1], lambda0 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
	      stream.point(x0, y0);
	    }

	    function lineEnd() {
	      resampleStream.point = point;
	      stream.lineEnd();
	    }

	    function ringStart() {
	      lineStart();
	      resampleStream.point = ringPoint;
	      resampleStream.lineEnd = ringEnd;
	    }

	    function ringPoint(lambda, phi) {
	      linePoint(lambda00 = lambda, phi), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
	      resampleStream.point = linePoint;
	    }

	    function ringEnd() {
	      resampleLineTo(x0, y0, lambda0, a0, b0, c0, x00, y00, lambda00, a00, b00, c00, maxDepth, stream);
	      resampleStream.lineEnd = lineEnd;
	      lineEnd();
	    }

	    return resampleStream;
	  };
	}

	var transformRadians = transformer({
	  point: function(x, y) {
	    this.stream.point(x * radians, y * radians);
	  }
	});

	function projection(project) {
	  return projectionMutator(function() { return project; })();
	}

	function projectionMutator(projectAt) {
	  var project,
	      k = 150, // scale
	      x = 480, y = 250, // translate
	      dx, dy, lambda = 0, phi = 0, // center
	      deltaLambda = 0, deltaPhi = 0, deltaGamma = 0, rotate, projectRotate, // rotate
	      theta = null, preclip = clipAntimeridian, // clip angle
	      x0 = null, y0, x1, y1, postclip = identity$7, // clip extent
	      delta2 = 0.5, projectResample = resample(projectTransform, delta2), // precision
	      cache,
	      cacheStream;

	  function projection(point) {
	    point = projectRotate(point[0] * radians, point[1] * radians);
	    return [point[0] * k + dx, dy - point[1] * k];
	  }

	  function invert(point) {
	    point = projectRotate.invert((point[0] - dx) / k, (dy - point[1]) / k);
	    return point && [point[0] * degrees$1, point[1] * degrees$1];
	  }

	  function projectTransform(x, y) {
	    return x = project(x, y), [x[0] * k + dx, dy - x[1] * k];
	  }

	  projection.stream = function(stream) {
	    return cache && cacheStream === stream ? cache : cache = transformRadians(preclip(rotate, projectResample(postclip(cacheStream = stream))));
	  };

	  projection.clipAngle = function(_) {
	    return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians, 6 * radians) : (theta = null, clipAntimeridian), reset()) : theta * degrees$1;
	  };

	  projection.clipExtent = function(_) {
	    return arguments.length ? (postclip = _ == null ? (x0 = y0 = x1 = y1 = null, identity$7) : clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]), reset()) : x0 == null ? null : [[x0, y0], [x1, y1]];
	  };

	  projection.scale = function(_) {
	    return arguments.length ? (k = +_, recenter()) : k;
	  };

	  projection.translate = function(_) {
	    return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
	  };

	  projection.center = function(_) {
	    return arguments.length ? (lambda = _[0] % 360 * radians, phi = _[1] % 360 * radians, recenter()) : [lambda * degrees$1, phi * degrees$1];
	  };

	  projection.rotate = function(_) {
	    return arguments.length ? (deltaLambda = _[0] % 360 * radians, deltaPhi = _[1] % 360 * radians, deltaGamma = _.length > 2 ? _[2] % 360 * radians : 0, recenter()) : [deltaLambda * degrees$1, deltaPhi * degrees$1, deltaGamma * degrees$1];
	  };

	  projection.precision = function(_) {
	    return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt$1(delta2);
	  };

	  projection.fitExtent = function(extent, object) {
	    return fitExtent(projection, extent, object);
	  };

	  projection.fitSize = function(size, object) {
	    return fitSize(projection, size, object);
	  };

	  function recenter() {
	    projectRotate = compose(rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma), project);
	    var center = project(lambda, phi);
	    dx = x - center[0] * k;
	    dy = y + center[1] * k;
	    return reset();
	  }

	  function reset() {
	    cache = cacheStream = null;
	    return projection;
	  }

	  return function() {
	    project = projectAt.apply(this, arguments);
	    projection.invert = project.invert && invert;
	    return recenter();
	  };
	}

	function conicProjection(projectAt) {
	  var phi0 = 0,
	      phi1 = pi$4 / 3,
	      m = projectionMutator(projectAt),
	      p = m(phi0, phi1);

	  p.parallels = function(_) {
	    return arguments.length ? m(phi0 = _[0] * radians, phi1 = _[1] * radians) : [phi0 * degrees$1, phi1 * degrees$1];
	  };

	  return p;
	}

	function cylindricalEqualAreaRaw(phi0) {
	  var cosPhi0 = cos$1(phi0);

	  function forward(lambda, phi) {
	    return [lambda * cosPhi0, sin$1(phi) / cosPhi0];
	  }

	  forward.invert = function(x, y) {
	    return [x / cosPhi0, asin$1(y * cosPhi0)];
	  };

	  return forward;
	}

	function conicEqualAreaRaw(y0, y1) {
	  var sy0 = sin$1(y0), n = (sy0 + sin$1(y1)) / 2;

	  // Are the parallels symmetrical around the Equator?
	  if (abs(n) < epsilon$4) return cylindricalEqualAreaRaw(y0);

	  var c = 1 + sy0 * (2 * n - sy0), r0 = sqrt$1(c) / n;

	  function project(x, y) {
	    var r = sqrt$1(c - 2 * n * sin$1(y)) / n;
	    return [r * sin$1(x *= n), r0 - r * cos$1(x)];
	  }

	  project.invert = function(x, y) {
	    var r0y = r0 - y;
	    return [atan2(x, abs(r0y)) / n * sign$1(r0y), asin$1((c - (x * x + r0y * r0y) * n * n) / (2 * n))];
	  };

	  return project;
	}

	var conicEqualArea = function() {
	  return conicProjection(conicEqualAreaRaw)
	      .scale(155.424)
	      .center([0, 33.6442]);
	};

	var albers = function() {
	  return conicEqualArea()
	      .parallels([29.5, 45.5])
	      .scale(1070)
	      .translate([480, 250])
	      .rotate([96, 0])
	      .center([-0.6, 38.7]);
	};

	// The projections must have mutually exclusive clip regions on the sphere,
	// as this will avoid emitting interleaving lines and polygons.
	function multiplex(streams) {
	  var n = streams.length;
	  return {
	    point: function(x, y) { var i = -1; while (++i < n) streams[i].point(x, y); },
	    sphere: function() { var i = -1; while (++i < n) streams[i].sphere(); },
	    lineStart: function() { var i = -1; while (++i < n) streams[i].lineStart(); },
	    lineEnd: function() { var i = -1; while (++i < n) streams[i].lineEnd(); },
	    polygonStart: function() { var i = -1; while (++i < n) streams[i].polygonStart(); },
	    polygonEnd: function() { var i = -1; while (++i < n) streams[i].polygonEnd(); }
	  };
	}

	// A composite projection for the United States, configured by default for
	// 960×500. The projection also works quite well at 960×600 if you change the
	// scale to 1285 and adjust the translate accordingly. The set of standard
	// parallels for each region comes from USGS, which is published here:
	// http://egsc.usgs.gov/isb/pubs/MapProjections/projections.html#albers
	var albersUsa = function() {
	  var cache,
	      cacheStream,
	      lower48 = albers(), lower48Point,
	      alaska = conicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]), alaskaPoint, // EPSG:3338
	      hawaii = conicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]), hawaiiPoint, // ESRI:102007
	      point, pointStream = {point: function(x, y) { point = [x, y]; }};

	  function albersUsa(coordinates) {
	    var x = coordinates[0], y = coordinates[1];
	    return point = null,
	        (lower48Point.point(x, y), point)
	        || (alaskaPoint.point(x, y), point)
	        || (hawaiiPoint.point(x, y), point);
	  }

	  albersUsa.invert = function(coordinates) {
	    var k = lower48.scale(),
	        t = lower48.translate(),
	        x = (coordinates[0] - t[0]) / k,
	        y = (coordinates[1] - t[1]) / k;
	    return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska
	        : y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii
	        : lower48).invert(coordinates);
	  };

	  albersUsa.stream = function(stream) {
	    return cache && cacheStream === stream ? cache : cache = multiplex([lower48.stream(cacheStream = stream), alaska.stream(stream), hawaii.stream(stream)]);
	  };

	  albersUsa.precision = function(_) {
	    if (!arguments.length) return lower48.precision();
	    lower48.precision(_), alaska.precision(_), hawaii.precision(_);
	    return reset();
	  };

	  albersUsa.scale = function(_) {
	    if (!arguments.length) return lower48.scale();
	    lower48.scale(_), alaska.scale(_ * 0.35), hawaii.scale(_);
	    return albersUsa.translate(lower48.translate());
	  };

	  albersUsa.translate = function(_) {
	    if (!arguments.length) return lower48.translate();
	    var k = lower48.scale(), x = +_[0], y = +_[1];

	    lower48Point = lower48
	        .translate(_)
	        .clipExtent([[x - 0.455 * k, y - 0.238 * k], [x + 0.455 * k, y + 0.238 * k]])
	        .stream(pointStream);

	    alaskaPoint = alaska
	        .translate([x - 0.307 * k, y + 0.201 * k])
	        .clipExtent([[x - 0.425 * k + epsilon$4, y + 0.120 * k + epsilon$4], [x - 0.214 * k - epsilon$4, y + 0.234 * k - epsilon$4]])
	        .stream(pointStream);

	    hawaiiPoint = hawaii
	        .translate([x - 0.205 * k, y + 0.212 * k])
	        .clipExtent([[x - 0.214 * k + epsilon$4, y + 0.166 * k + epsilon$4], [x - 0.115 * k - epsilon$4, y + 0.234 * k - epsilon$4]])
	        .stream(pointStream);

	    return reset();
	  };

	  albersUsa.fitExtent = function(extent, object) {
	    return fitExtent(albersUsa, extent, object);
	  };

	  albersUsa.fitSize = function(size, object) {
	    return fitSize(albersUsa, size, object);
	  };

	  function reset() {
	    cache = cacheStream = null;
	    return albersUsa;
	  }

	  return albersUsa.scale(1070);
	};

	function azimuthalRaw(scale) {
	  return function(x, y) {
	    var cx = cos$1(x),
	        cy = cos$1(y),
	        k = scale(cx * cy);
	    return [
	      k * cy * sin$1(x),
	      k * sin$1(y)
	    ];
	  }
	}

	function azimuthalInvert(angle) {
	  return function(x, y) {
	    var z = sqrt$1(x * x + y * y),
	        c = angle(z),
	        sc = sin$1(c),
	        cc = cos$1(c);
	    return [
	      atan2(x * sc, z * cc),
	      asin$1(z && y * sc / z)
	    ];
	  }
	}

	var azimuthalEqualAreaRaw = azimuthalRaw(function(cxcy) {
	  return sqrt$1(2 / (1 + cxcy));
	});

	azimuthalEqualAreaRaw.invert = azimuthalInvert(function(z) {
	  return 2 * asin$1(z / 2);
	});

	var azimuthalEqualArea = function() {
	  return projection(azimuthalEqualAreaRaw)
	      .scale(124.75)
	      .clipAngle(180 - 1e-3);
	};

	var azimuthalEquidistantRaw = azimuthalRaw(function(c) {
	  return (c = acos(c)) && c / sin$1(c);
	});

	azimuthalEquidistantRaw.invert = azimuthalInvert(function(z) {
	  return z;
	});

	var azimuthalEquidistant = function() {
	  return projection(azimuthalEquidistantRaw)
	      .scale(79.4188)
	      .clipAngle(180 - 1e-3);
	};

	function mercatorRaw(lambda, phi) {
	  return [lambda, log$1(tan((halfPi$3 + phi) / 2))];
	}

	mercatorRaw.invert = function(x, y) {
	  return [x, 2 * atan(exp(y)) - halfPi$3];
	};

	var mercator = function() {
	  return mercatorProjection(mercatorRaw)
	      .scale(961 / tau$4);
	};

	function mercatorProjection(project) {
	  var m = projection(project),
	      scale = m.scale,
	      translate = m.translate,
	      clipExtent = m.clipExtent,
	      clipAuto;

	  m.scale = function(_) {
	    return arguments.length ? (scale(_), clipAuto && m.clipExtent(null), m) : scale();
	  };

	  m.translate = function(_) {
	    return arguments.length ? (translate(_), clipAuto && m.clipExtent(null), m) : translate();
	  };

	  m.clipExtent = function(_) {
	    if (!arguments.length) return clipAuto ? null : clipExtent();
	    if (clipAuto = _ == null) {
	      var k = pi$4 * scale(),
	          t = translate();
	      _ = [[t[0] - k, t[1] - k], [t[0] + k, t[1] + k]];
	    }
	    clipExtent(_);
	    return m;
	  };

	  return m.clipExtent(null);
	}

	function tany(y) {
	  return tan((halfPi$3 + y) / 2);
	}

	function conicConformalRaw(y0, y1) {
	  var cy0 = cos$1(y0),
	      n = y0 === y1 ? sin$1(y0) : log$1(cy0 / cos$1(y1)) / log$1(tany(y1) / tany(y0)),
	      f = cy0 * pow$1(tany(y0), n) / n;

	  if (!n) return mercatorRaw;

	  function project(x, y) {
	    if (f > 0) { if (y < -halfPi$3 + epsilon$4) y = -halfPi$3 + epsilon$4; }
	    else { if (y > halfPi$3 - epsilon$4) y = halfPi$3 - epsilon$4; }
	    var r = f / pow$1(tany(y), n);
	    return [r * sin$1(n * x), f - r * cos$1(n * x)];
	  }

	  project.invert = function(x, y) {
	    var fy = f - y, r = sign$1(n) * sqrt$1(x * x + fy * fy);
	    return [atan2(x, abs(fy)) / n * sign$1(fy), 2 * atan(pow$1(f / r, 1 / n)) - halfPi$3];
	  };

	  return project;
	}

	var conicConformal = function() {
	  return conicProjection(conicConformalRaw)
	      .scale(109.5)
	      .parallels([30, 30]);
	};

	function equirectangularRaw(lambda, phi) {
	  return [lambda, phi];
	}

	equirectangularRaw.invert = equirectangularRaw;

	var equirectangular = function() {
	  return projection(equirectangularRaw)
	      .scale(152.63);
	};

	function conicEquidistantRaw(y0, y1) {
	  var cy0 = cos$1(y0),
	      n = y0 === y1 ? sin$1(y0) : (cy0 - cos$1(y1)) / (y1 - y0),
	      g = cy0 / n + y0;

	  if (abs(n) < epsilon$4) return equirectangularRaw;

	  function project(x, y) {
	    var gy = g - y, nx = n * x;
	    return [gy * sin$1(nx), g - gy * cos$1(nx)];
	  }

	  project.invert = function(x, y) {
	    var gy = g - y;
	    return [atan2(x, abs(gy)) / n * sign$1(gy), g - sign$1(n) * sqrt$1(x * x + gy * gy)];
	  };

	  return project;
	}

	var conicEquidistant = function() {
	  return conicProjection(conicEquidistantRaw)
	      .scale(131.154)
	      .center([0, 13.9389]);
	};

	function gnomonicRaw(x, y) {
	  var cy = cos$1(y), k = cos$1(x) * cy;
	  return [cy * sin$1(x) / k, sin$1(y) / k];
	}

	gnomonicRaw.invert = azimuthalInvert(atan);

	var gnomonic = function() {
	  return projection(gnomonicRaw)
	      .scale(144.049)
	      .clipAngle(60);
	};

	function scaleTranslate(k, tx, ty) {
	  return k === 1 && tx === 0 && ty === 0 ? identity$7 : transformer({
	    point: function(x, y) {
	      this.stream.point(x * k + tx, y * k + ty);
	    }
	  });
	}

	var identity$8 = function() {
	  var k = 1, tx = 0, ty = 0, transform = identity$7, // scale and translate
	      x0 = null, y0, x1, y1, clip = identity$7, // clip extent
	      cache,
	      cacheStream,
	      projection;

	  function reset() {
	    cache = cacheStream = null;
	    return projection;
	  }

	  return projection = {
	    stream: function(stream) {
	      return cache && cacheStream === stream ? cache : cache = transform(clip(cacheStream = stream));
	    },
	    clipExtent: function(_) {
	      return arguments.length ? (clip = _ == null ? (x0 = y0 = x1 = y1 = null, identity$7) : clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]), reset()) : x0 == null ? null : [[x0, y0], [x1, y1]];
	    },
	    scale: function(_) {
	      return arguments.length ? (transform = scaleTranslate(k = +_, tx, ty), reset()) : k;
	    },
	    translate: function(_) {
	      return arguments.length ? (transform = scaleTranslate(k, tx = +_[0], ty = +_[1]), reset()) : [tx, ty];
	    },
	    fitExtent: function(extent, object) {
	      return fitExtent(projection, extent, object);
	    },
	    fitSize: function(size, object) {
	      return fitSize(projection, size, object);
	    }
	  };
	};

	function orthographicRaw(x, y) {
	  return [cos$1(y) * sin$1(x), sin$1(y)];
	}

	orthographicRaw.invert = azimuthalInvert(asin$1);

	var orthographic = function() {
	  return projection(orthographicRaw)
	      .scale(249.5)
	      .clipAngle(90 + epsilon$4);
	};

	function stereographicRaw(x, y) {
	  var cy = cos$1(y), k = 1 + cos$1(x) * cy;
	  return [cy * sin$1(x) / k, sin$1(y) / k];
	}

	stereographicRaw.invert = azimuthalInvert(function(z) {
	  return 2 * atan(z);
	});

	var stereographic = function() {
	  return projection(stereographicRaw)
	      .scale(250)
	      .clipAngle(142);
	};

	function transverseMercatorRaw(lambda, phi) {
	  return [log$1(tan((halfPi$3 + phi) / 2)), -lambda];
	}

	transverseMercatorRaw.invert = function(x, y) {
	  return [-y, 2 * atan(exp(x)) - halfPi$3];
	};

	var transverseMercator = function() {
	  var m = mercatorProjection(transverseMercatorRaw),
	      center = m.center,
	      rotate = m.rotate;

	  m.center = function(_) {
	    return arguments.length ? center([-_[1], _[0]]) : (_ = center(), [_[1], -_[0]]);
	  };

	  m.rotate = function(_) {
	    return arguments.length ? rotate([_[0], _[1], _.length > 2 ? _[2] + 90 : 90]) : (_ = rotate(), [_[0], _[1], _[2] - 90]);
	  };

	  return rotate([0, 0, 90])
	      .scale(159.155);
	};

	exports.version = version;
	exports.bisect = bisectRight;
	exports.bisectRight = bisectRight;
	exports.bisectLeft = bisectLeft;
	exports.ascending = ascending;
	exports.bisector = bisector;
	exports.descending = descending;
	exports.deviation = deviation;
	exports.extent = extent;
	exports.histogram = histogram;
	exports.thresholdFreedmanDiaconis = freedmanDiaconis;
	exports.thresholdScott = scott;
	exports.thresholdSturges = sturges;
	exports.max = max;
	exports.mean = mean;
	exports.median = median;
	exports.merge = merge;
	exports.min = min;
	exports.pairs = pairs;
	exports.permute = permute;
	exports.quantile = threshold;
	exports.range = range;
	exports.scan = scan;
	exports.shuffle = shuffle;
	exports.sum = sum;
	exports.ticks = ticks;
	exports.tickStep = tickStep;
	exports.transpose = transpose;
	exports.variance = variance;
	exports.zip = zip;
	exports.entries = entries;
	exports.keys = keys;
	exports.values = values;
	exports.map = map$1;
	exports.set = set;
	exports.nest = nest;
	exports.randomUniform = uniform;
	exports.randomNormal = normal;
	exports.randomLogNormal = logNormal;
	exports.randomBates = bates;
	exports.randomIrwinHall = irwinHall;
	exports.randomExponential = exponential;
	exports.easeLinear = linear;
	exports.easeQuad = quadInOut;
	exports.easeQuadIn = quadIn;
	exports.easeQuadOut = quadOut;
	exports.easeQuadInOut = quadInOut;
	exports.easeCubic = cubicInOut;
	exports.easeCubicIn = cubicIn;
	exports.easeCubicOut = cubicOut;
	exports.easeCubicInOut = cubicInOut;
	exports.easePoly = polyInOut;
	exports.easePolyIn = polyIn;
	exports.easePolyOut = polyOut;
	exports.easePolyInOut = polyInOut;
	exports.easeSin = sinInOut;
	exports.easeSinIn = sinIn;
	exports.easeSinOut = sinOut;
	exports.easeSinInOut = sinInOut;
	exports.easeExp = expInOut;
	exports.easeExpIn = expIn;
	exports.easeExpOut = expOut;
	exports.easeExpInOut = expInOut;
	exports.easeCircle = circleInOut;
	exports.easeCircleIn = circleIn;
	exports.easeCircleOut = circleOut;
	exports.easeCircleInOut = circleInOut;
	exports.easeBounce = bounceOut;
	exports.easeBounceIn = bounceIn;
	exports.easeBounceOut = bounceOut;
	exports.easeBounceInOut = bounceInOut;
	exports.easeBack = backInOut;
	exports.easeBackIn = backIn;
	exports.easeBackOut = backOut;
	exports.easeBackInOut = backInOut;
	exports.easeElastic = elasticOut;
	exports.easeElasticIn = elasticIn;
	exports.easeElasticOut = elasticOut;
	exports.easeElasticInOut = elasticInOut;
	exports.polygonArea = area;
	exports.polygonCentroid = centroid;
	exports.polygonHull = hull;
	exports.polygonContains = contains;
	exports.polygonLength = length$1;
	exports.path = path;
	exports.quadtree = quadtree;
	exports.queue = queue;
	exports.arc = arc;
	exports.area = area$1;
	exports.line = line;
	exports.pie = pie;
	exports.radialArea = radialArea;
	exports.radialLine = radialLine$1;
	exports.symbol = symbol;
	exports.symbols = symbols;
	exports.symbolCircle = circle;
	exports.symbolCross = cross$1;
	exports.symbolDiamond = diamond;
	exports.symbolSquare = square;
	exports.symbolStar = star;
	exports.symbolTriangle = triangle;
	exports.symbolWye = wye;
	exports.curveBasisClosed = basisClosed;
	exports.curveBasisOpen = basisOpen;
	exports.curveBasis = basis;
	exports.curveBundle = bundle;
	exports.curveCardinalClosed = cardinalClosed;
	exports.curveCardinalOpen = cardinalOpen;
	exports.curveCardinal = cardinal;
	exports.curveCatmullRomClosed = catmullRomClosed;
	exports.curveCatmullRomOpen = catmullRomOpen;
	exports.curveCatmullRom = catmullRom;
	exports.curveLinearClosed = linearClosed;
	exports.curveLinear = curveLinear;
	exports.curveMonotoneX = monotoneX;
	exports.curveMonotoneY = monotoneY;
	exports.curveNatural = natural;
	exports.curveStep = step;
	exports.curveStepAfter = stepAfter;
	exports.curveStepBefore = stepBefore;
	exports.stack = stack;
	exports.stackOffsetExpand = expand;
	exports.stackOffsetNone = none;
	exports.stackOffsetSilhouette = silhouette;
	exports.stackOffsetWiggle = wiggle;
	exports.stackOrderAscending = ascending$1;
	exports.stackOrderDescending = descending$2;
	exports.stackOrderInsideOut = insideOut;
	exports.stackOrderNone = none$1;
	exports.stackOrderReverse = reverse;
	exports.color = color;
	exports.rgb = rgb;
	exports.hsl = hsl;
	exports.lab = lab;
	exports.hcl = hcl;
	exports.cubehelix = cubehelix;
	exports.interpolate = interpolate;
	exports.interpolateArray = array$1;
	exports.interpolateDate = date;
	exports.interpolateNumber = interpolateNumber;
	exports.interpolateObject = object;
	exports.interpolateRound = interpolateRound;
	exports.interpolateString = interpolateString;
	exports.interpolateTransformCss = interpolateTransformCss;
	exports.interpolateTransformSvg = interpolateTransformSvg;
	exports.interpolateZoom = interpolateZoom;
	exports.interpolateRgb = interpolateRgb;
	exports.interpolateRgbBasis = rgbBasis;
	exports.interpolateRgbBasisClosed = rgbBasisClosed;
	exports.interpolateHsl = hsl$2;
	exports.interpolateHslLong = hslLong;
	exports.interpolateLab = lab$1;
	exports.interpolateHcl = hcl$2;
	exports.interpolateHclLong = hclLong;
	exports.interpolateCubehelix = cubehelix$2;
	exports.interpolateCubehelixLong = cubehelixLong;
	exports.interpolateBasis = basis$2;
	exports.interpolateBasisClosed = basisClosed$1;
	exports.quantize = quantize;
	exports.dispatch = dispatch;
	exports.dsvFormat = dsv;
	exports.csvParse = csvParse;
	exports.csvParseRows = csvParseRows;
	exports.csvFormat = csvFormat;
	exports.csvFormatRows = csvFormatRows;
	exports.tsvParse = tsvParse;
	exports.tsvParseRows = tsvParseRows;
	exports.tsvFormat = tsvFormat;
	exports.tsvFormatRows = tsvFormatRows;
	exports.request = request;
	exports.html = html;
	exports.json = json;
	exports.text = text;
	exports.xml = xml;
	exports.csv = csv$1;
	exports.tsv = tsv$1;
	exports.now = now;
	exports.timer = timer;
	exports.timerFlush = timerFlush;
	exports.timeout = timeout$1;
	exports.interval = interval$1;
	exports.timeInterval = newInterval;
	exports.timeMillisecond = millisecond;
	exports.timeMilliseconds = milliseconds;
	exports.timeSecond = second;
	exports.timeSeconds = seconds;
	exports.timeMinute = minute;
	exports.timeMinutes = minutes;
	exports.timeHour = hour;
	exports.timeHours = hours;
	exports.timeDay = day;
	exports.timeDays = days;
	exports.timeWeek = sunday;
	exports.timeWeeks = sundays;
	exports.timeSunday = sunday;
	exports.timeSundays = sundays;
	exports.timeMonday = monday;
	exports.timeMondays = mondays;
	exports.timeTuesday = tuesday;
	exports.timeTuesdays = tuesdays;
	exports.timeWednesday = wednesday;
	exports.timeWednesdays = wednesdays;
	exports.timeThursday = thursday;
	exports.timeThursdays = thursdays;
	exports.timeFriday = friday;
	exports.timeFridays = fridays;
	exports.timeSaturday = saturday;
	exports.timeSaturdays = saturdays;
	exports.timeMonth = month;
	exports.timeMonths = months;
	exports.timeYear = year;
	exports.timeYears = years;
	exports.utcMillisecond = millisecond;
	exports.utcMilliseconds = milliseconds;
	exports.utcSecond = second;
	exports.utcSeconds = seconds;
	exports.utcMinute = utcMinute;
	exports.utcMinutes = utcMinutes;
	exports.utcHour = utcHour;
	exports.utcHours = utcHours;
	exports.utcDay = utcDay;
	exports.utcDays = utcDays;
	exports.utcWeek = utcSunday;
	exports.utcWeeks = utcSundays;
	exports.utcSunday = utcSunday;
	exports.utcSundays = utcSundays;
	exports.utcMonday = utcMonday;
	exports.utcMondays = utcMondays;
	exports.utcTuesday = utcTuesday;
	exports.utcTuesdays = utcTuesdays;
	exports.utcWednesday = utcWednesday;
	exports.utcWednesdays = utcWednesdays;
	exports.utcThursday = utcThursday;
	exports.utcThursdays = utcThursdays;
	exports.utcFriday = utcFriday;
	exports.utcFridays = utcFridays;
	exports.utcSaturday = utcSaturday;
	exports.utcSaturdays = utcSaturdays;
	exports.utcMonth = utcMonth;
	exports.utcMonths = utcMonths;
	exports.utcYear = utcYear;
	exports.utcYears = utcYears;
	exports.formatLocale = formatLocale;
	exports.formatDefaultLocale = defaultLocale;
	exports.formatSpecifier = formatSpecifier;
	exports.precisionFixed = precisionFixed;
	exports.precisionPrefix = precisionPrefix;
	exports.precisionRound = precisionRound;
	exports.isoFormat = formatIso;
	exports.isoParse = parseIso;
	exports.timeFormatLocale = formatLocale$1;
	exports.timeFormatDefaultLocale = defaultLocale$1;
	exports.scaleBand = band;
	exports.scalePoint = point$4;
	exports.scaleIdentity = identity$4;
	exports.scaleLinear = linear$2;
	exports.scaleLog = log;
	exports.scaleOrdinal = ordinal;
	exports.scaleImplicit = implicit;
	exports.scalePow = pow;
	exports.scaleSqrt = sqrt;
	exports.scaleQuantile = quantile$$1;
	exports.scaleQuantize = quantize$1;
	exports.scaleThreshold = threshold$1;
	exports.scaleTime = time;
	exports.scaleUtc = utcTime;
	exports.schemeCategory10 = category10;
	exports.schemeCategory20b = category20b;
	exports.schemeCategory20c = category20c;
	exports.schemeCategory20 = category20;
	exports.scaleSequential = sequential;
	exports.interpolateCubehelixDefault = cubehelix$3;
	exports.interpolateRainbow = rainbow$1;
	exports.interpolateWarm = warm;
	exports.interpolateCool = cool;
	exports.interpolateViridis = viridis;
	exports.interpolateMagma = magma;
	exports.interpolateInferno = inferno;
	exports.interpolatePlasma = plasma;
	exports.creator = creator;
	exports.customEvent = customEvent;
	exports.local = local;
	exports.matcher = matcher$1;
	exports.mouse = mouse;
	exports.namespace = namespace;
	exports.namespaces = namespaces;
	exports.select = select;
	exports.selectAll = selectAll;
	exports.selection = selection;
	exports.selector = selector;
	exports.selectorAll = selectorAll;
	exports.touch = touch;
	exports.touches = touches;
	exports.window = window;
	exports.active = active;
	exports.interrupt = interrupt;
	exports.transition = transition;
	exports.axisTop = axisTop;
	exports.axisRight = axisRight;
	exports.axisBottom = axisBottom;
	exports.axisLeft = axisLeft;
	exports.cluster = cluster;
	exports.hierarchy = hierarchy;
	exports.pack = index;
	exports.packSiblings = siblings;
	exports.packEnclose = enclose;
	exports.partition = partition;
	exports.stratify = stratify;
	exports.tree = tree;
	exports.treemap = index$1;
	exports.treemapBinary = binary;
	exports.treemapDice = treemapDice;
	exports.treemapSlice = treemapSlice;
	exports.treemapSliceDice = sliceDice;
	exports.treemapSquarify = squarify;
	exports.treemapResquarify = resquarify;
	exports.forceCenter = center$1;
	exports.forceCollide = collide;
	exports.forceLink = link;
	exports.forceManyBody = manyBody;
	exports.forceSimulation = simulation;
	exports.forceX = x$3;
	exports.forceY = y$3;
	exports.drag = drag;
	exports.dragDisable = dragDisable;
	exports.dragEnable = yesdrag;
	exports.voronoi = voronoi;
	exports.zoom = zoom;
	exports.zoomIdentity = identity$6;
	exports.zoomTransform = transform;
	exports.brush = brush;
	exports.brushX = brushX;
	exports.brushY = brushY;
	exports.brushSelection = brushSelection;
	exports.chord = chord;
	exports.ribbon = ribbon;
	exports.geoAlbers = albers;
	exports.geoAlbersUsa = albersUsa;
	exports.geoArea = area$2;
	exports.geoAzimuthalEqualArea = azimuthalEqualArea;
	exports.geoAzimuthalEqualAreaRaw = azimuthalEqualAreaRaw;
	exports.geoAzimuthalEquidistant = azimuthalEquidistant;
	exports.geoAzimuthalEquidistantRaw = azimuthalEquidistantRaw;
	exports.geoBounds = bounds;
	exports.geoCentroid = centroid$1;
	exports.geoCircle = circle$1;
	exports.geoClipExtent = extent$1;
	exports.geoConicConformal = conicConformal;
	exports.geoConicConformalRaw = conicConformalRaw;
	exports.geoConicEqualArea = conicEqualArea;
	exports.geoConicEqualAreaRaw = conicEqualAreaRaw;
	exports.geoConicEquidistant = conicEquidistant;
	exports.geoConicEquidistantRaw = conicEquidistantRaw;
	exports.geoDistance = distance;
	exports.geoEquirectangular = equirectangular;
	exports.geoEquirectangularRaw = equirectangularRaw;
	exports.geoGnomonic = gnomonic;
	exports.geoGnomonicRaw = gnomonicRaw;
	exports.geoGraticule = graticule;
	exports.geoGraticule10 = graticule10;
	exports.geoIdentity = identity$8;
	exports.geoInterpolate = interpolate$2;
	exports.geoLength = length$2;
	exports.geoMercator = mercator;
	exports.geoMercatorRaw = mercatorRaw;
	exports.geoOrthographic = orthographic;
	exports.geoOrthographicRaw = orthographicRaw;
	exports.geoPath = index$3;
	exports.geoProjection = projection;
	exports.geoProjectionMutator = projectionMutator;
	exports.geoRotation = rotation;
	exports.geoStereographic = stereographic;
	exports.geoStereographicRaw = stereographicRaw;
	exports.geoStream = geoStream;
	exports.geoTransform = transform$1;
	exports.geoTransverseMercator = transverseMercator;
	exports.geoTransverseMercatorRaw = transverseMercatorRaw;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	(function (global, factory) {
	   true ? factory(exports) :
	  typeof define === 'function' && define.amd ? define(['exports'], factory) :
	  (factory((global.topojson = global.topojson || {})));
	}(this, (function (exports) { 'use strict';

	function noop() {}

	function transformAbsolute(transform) {
	  if (!transform) return noop;
	  var x0,
	      y0,
	      kx = transform.scale[0],
	      ky = transform.scale[1],
	      dx = transform.translate[0],
	      dy = transform.translate[1];
	  return function(point, i) {
	    if (!i) x0 = y0 = 0;
	    point[0] = (x0 += point[0]) * kx + dx;
	    point[1] = (y0 += point[1]) * ky + dy;
	  };
	}

	function transformRelative(transform) {
	  if (!transform) return noop;
	  var x0,
	      y0,
	      kx = transform.scale[0],
	      ky = transform.scale[1],
	      dx = transform.translate[0],
	      dy = transform.translate[1];
	  return function(point, i) {
	    if (!i) x0 = y0 = 0;
	    var x1 = Math.round((point[0] - dx) / kx),
	        y1 = Math.round((point[1] - dy) / ky);
	    point[0] = x1 - x0;
	    point[1] = y1 - y0;
	    x0 = x1;
	    y0 = y1;
	  };
	}

	function reverse(array, n) {
	  var t, j = array.length, i = j - n;
	  while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
	}

	function bisect(a, x) {
	  var lo = 0, hi = a.length;
	  while (lo < hi) {
	    var mid = lo + hi >>> 1;
	    if (a[mid] < x) lo = mid + 1;
	    else hi = mid;
	  }
	  return lo;
	}

	function feature(topology, o) {
	  return o.type === "GeometryCollection" ? {
	    type: "FeatureCollection",
	    features: o.geometries.map(function(o) { return feature$1(topology, o); })
	  } : feature$1(topology, o);
	}

	function feature$1(topology, o) {
	  var f = {
	    type: "Feature",
	    id: o.id,
	    properties: o.properties || {},
	    geometry: object(topology, o)
	  };
	  if (o.id == null) delete f.id;
	  return f;
	}

	function object(topology, o) {
	  var absolute = transformAbsolute(topology.transform),
	      arcs = topology.arcs;

	  function arc(i, points) {
	    if (points.length) points.pop();
	    for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length, p; k < n; ++k) {
	      points.push(p = a[k].slice());
	      absolute(p, k);
	    }
	    if (i < 0) reverse(points, n);
	  }

	  function point(p) {
	    p = p.slice();
	    absolute(p, 0);
	    return p;
	  }

	  function line(arcs) {
	    var points = [];
	    for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
	    if (points.length < 2) points.push(points[0].slice());
	    return points;
	  }

	  function ring(arcs) {
	    var points = line(arcs);
	    while (points.length < 4) points.push(points[0].slice());
	    return points;
	  }

	  function polygon(arcs) {
	    return arcs.map(ring);
	  }

	  function geometry(o) {
	    var t = o.type;
	    return t === "GeometryCollection" ? {type: t, geometries: o.geometries.map(geometry)}
	        : t in geometryType ? {type: t, coordinates: geometryType[t](o)}
	        : null;
	  }

	  var geometryType = {
	    Point: function(o) { return point(o.coordinates); },
	    MultiPoint: function(o) { return o.coordinates.map(point); },
	    LineString: function(o) { return line(o.arcs); },
	    MultiLineString: function(o) { return o.arcs.map(line); },
	    Polygon: function(o) { return polygon(o.arcs); },
	    MultiPolygon: function(o) { return o.arcs.map(polygon); }
	  };

	  return geometry(o);
	}

	function stitchArcs(topology, arcs) {
	  var stitchedArcs = {},
	      fragmentByStart = {},
	      fragmentByEnd = {},
	      fragments = [],
	      emptyIndex = -1;

	  // Stitch empty arcs first, since they may be subsumed by other arcs.
	  arcs.forEach(function(i, j) {
	    var arc = topology.arcs[i < 0 ? ~i : i], t;
	    if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
	      t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
	    }
	  });

	  arcs.forEach(function(i) {
	    var e = ends(i),
	        start = e[0],
	        end = e[1],
	        f, g;

	    if (f = fragmentByEnd[start]) {
	      delete fragmentByEnd[f.end];
	      f.push(i);
	      f.end = end;
	      if (g = fragmentByStart[end]) {
	        delete fragmentByStart[g.start];
	        var fg = g === f ? f : f.concat(g);
	        fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
	      } else {
	        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
	      }
	    } else if (f = fragmentByStart[end]) {
	      delete fragmentByStart[f.start];
	      f.unshift(i);
	      f.start = start;
	      if (g = fragmentByEnd[start]) {
	        delete fragmentByEnd[g.end];
	        var gf = g === f ? f : g.concat(f);
	        fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
	      } else {
	        fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
	      }
	    } else {
	      f = [i];
	      fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
	    }
	  });

	  function ends(i) {
	    var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
	    if (topology.transform) p1 = [0, 0], arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
	    else p1 = arc[arc.length - 1];
	    return i < 0 ? [p1, p0] : [p0, p1];
	  }

	  function flush(fragmentByEnd, fragmentByStart) {
	    for (var k in fragmentByEnd) {
	      var f = fragmentByEnd[k];
	      delete fragmentByStart[f.start];
	      delete f.start;
	      delete f.end;
	      f.forEach(function(i) { stitchedArcs[i < 0 ? ~i : i] = 1; });
	      fragments.push(f);
	    }
	  }

	  flush(fragmentByEnd, fragmentByStart);
	  flush(fragmentByStart, fragmentByEnd);
	  arcs.forEach(function(i) { if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]); });

	  return fragments;
	}

	function mesh(topology) {
	  return object(topology, meshArcs.apply(this, arguments));
	}

	function meshArcs(topology, o, filter) {
	  var arcs = [];

	  function arc(i) {
	    var j = i < 0 ? ~i : i;
	    (geomsByArc[j] || (geomsByArc[j] = [])).push({i: i, g: geom});
	  }

	  function line(arcs) {
	    arcs.forEach(arc);
	  }

	  function polygon(arcs) {
	    arcs.forEach(line);
	  }

	  function geometry(o) {
	    if (o.type === "GeometryCollection") o.geometries.forEach(geometry);
	    else if (o.type in geometryType) geom = o, geometryType[o.type](o.arcs);
	  }

	  if (arguments.length > 1) {
	    var geomsByArc = [],
	        geom;

	    var geometryType = {
	      LineString: line,
	      MultiLineString: polygon,
	      Polygon: polygon,
	      MultiPolygon: function(arcs) { arcs.forEach(polygon); }
	    };

	    geometry(o);

	    geomsByArc.forEach(arguments.length < 3
	        ? function(geoms) { arcs.push(geoms[0].i); }
	        : function(geoms) { if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i); });
	  } else {
	    for (var i = 0, n = topology.arcs.length; i < n; ++i) arcs.push(i);
	  }

	  return {type: "MultiLineString", arcs: stitchArcs(topology, arcs)};
	}

	function cartesianTriangleArea(triangle) {
	  var a = triangle[0], b = triangle[1], c = triangle[2];
	  return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));
	}

	function ring(ring) {
	  var i = -1,
	      n = ring.length,
	      a,
	      b = ring[n - 1],
	      area = 0;

	  while (++i < n) {
	    a = b;
	    b = ring[i];
	    area += a[0] * b[1] - a[1] * b[0];
	  }

	  return area / 2;
	}

	function merge(topology) {
	  return object(topology, mergeArcs.apply(this, arguments));
	}

	function mergeArcs(topology, objects) {
	  var polygonsByArc = {},
	      polygons = [],
	      components = [];

	  objects.forEach(function(o) {
	    if (o.type === "Polygon") register(o.arcs);
	    else if (o.type === "MultiPolygon") o.arcs.forEach(register);
	  });

	  function register(polygon) {
	    polygon.forEach(function(ring$$) {
	      ring$$.forEach(function(arc) {
	        (polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
	      });
	    });
	    polygons.push(polygon);
	  }

	  function area(ring$$) {
	    return Math.abs(ring(object(topology, {type: "Polygon", arcs: [ring$$]}).coordinates[0]));
	  }

	  polygons.forEach(function(polygon) {
	    if (!polygon._) {
	      var component = [],
	          neighbors = [polygon];
	      polygon._ = 1;
	      components.push(component);
	      while (polygon = neighbors.pop()) {
	        component.push(polygon);
	        polygon.forEach(function(ring$$) {
	          ring$$.forEach(function(arc) {
	            polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon) {
	              if (!polygon._) {
	                polygon._ = 1;
	                neighbors.push(polygon);
	              }
	            });
	          });
	        });
	      }
	    }
	  });

	  polygons.forEach(function(polygon) {
	    delete polygon._;
	  });

	  return {
	    type: "MultiPolygon",
	    arcs: components.map(function(polygons) {
	      var arcs = [], n;

	      // Extract the exterior (unique) arcs.
	      polygons.forEach(function(polygon) {
	        polygon.forEach(function(ring$$) {
	          ring$$.forEach(function(arc) {
	            if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
	              arcs.push(arc);
	            }
	          });
	        });
	      });

	      // Stitch the arcs into one or more rings.
	      arcs = stitchArcs(topology, arcs);

	      // If more than one ring is returned,
	      // at most one of these rings can be the exterior;
	      // choose the one with the greatest absolute area.
	      if ((n = arcs.length) > 1) {
	        for (var i = 1, k = area(arcs[0]), ki, t; i < n; ++i) {
	          if ((ki = area(arcs[i])) > k) {
	            t = arcs[0], arcs[0] = arcs[i], arcs[i] = t, k = ki;
	          }
	        }
	      }

	      return arcs;
	    })
	  };
	}

	function neighbors(objects) {
	  var indexesByArc = {}, // arc index -> array of object indexes
	      neighbors = objects.map(function() { return []; });

	  function line(arcs, i) {
	    arcs.forEach(function(a) {
	      if (a < 0) a = ~a;
	      var o = indexesByArc[a];
	      if (o) o.push(i);
	      else indexesByArc[a] = [i];
	    });
	  }

	  function polygon(arcs, i) {
	    arcs.forEach(function(arc) { line(arc, i); });
	  }

	  function geometry(o, i) {
	    if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
	    else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
	  }

	  var geometryType = {
	    LineString: line,
	    MultiLineString: polygon,
	    Polygon: polygon,
	    MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
	  };

	  objects.forEach(geometry);

	  for (var i in indexesByArc) {
	    for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
	      for (var k = j + 1; k < m; ++k) {
	        var ij = indexes[j], ik = indexes[k], n;
	        if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
	        if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
	      }
	    }
	  }

	  return neighbors;
	}

	function compareArea(a, b) {
	  return a[1][2] - b[1][2];
	}

	function minAreaHeap() {
	  var heap = {},
	      array = [],
	      size = 0;

	  heap.push = function(object) {
	    up(array[object._ = size] = object, size++);
	    return size;
	  };

	  heap.pop = function() {
	    if (size <= 0) return;
	    var removed = array[0], object;
	    if (--size > 0) object = array[size], down(array[object._ = 0] = object, 0);
	    return removed;
	  };

	  heap.remove = function(removed) {
	    var i = removed._, object;
	    if (array[i] !== removed) return; // invalid request
	    if (i !== --size) object = array[size], (compareArea(object, removed) < 0 ? up : down)(array[object._ = i] = object, i);
	    return i;
	  };

	  function up(object, i) {
	    while (i > 0) {
	      var j = ((i + 1) >> 1) - 1,
	          parent = array[j];
	      if (compareArea(object, parent) >= 0) break;
	      array[parent._ = i] = parent;
	      array[object._ = i = j] = object;
	    }
	  }

	  function down(object, i) {
	    while (true) {
	      var r = (i + 1) << 1,
	          l = r - 1,
	          j = i,
	          child = array[j];
	      if (l < size && compareArea(array[l], child) < 0) child = array[j = l];
	      if (r < size && compareArea(array[r], child) < 0) child = array[j = r];
	      if (j === i) break;
	      array[child._ = i] = child;
	      array[object._ = i = j] = object;
	    }
	  }

	  return heap;
	}

	function presimplify(topology, triangleArea) {
	  var absolute = transformAbsolute(topology.transform),
	      relative = transformRelative(topology.transform),
	      heap = minAreaHeap();

	  if (!triangleArea) triangleArea = cartesianTriangleArea;

	  topology.arcs.forEach(function(arc) {
	    var triangles = [],
	        maxArea = 0,
	        triangle,
	        i,
	        n,
	        p;

	    // To store each point’s effective area, we create a new array rather than
	    // extending the passed-in point to workaround a Chrome/V8 bug (getting
	    // stuck in smi mode). For midpoints, the initial effective area of
	    // Infinity will be computed in the next step.
	    for (i = 0, n = arc.length; i < n; ++i) {
	      p = arc[i];
	      absolute(arc[i] = [p[0], p[1], Infinity], i);
	    }

	    for (i = 1, n = arc.length - 1; i < n; ++i) {
	      triangle = arc.slice(i - 1, i + 2);
	      triangle[1][2] = triangleArea(triangle);
	      triangles.push(triangle);
	      heap.push(triangle);
	    }

	    for (i = 0, n = triangles.length; i < n; ++i) {
	      triangle = triangles[i];
	      triangle.previous = triangles[i - 1];
	      triangle.next = triangles[i + 1];
	    }

	    while (triangle = heap.pop()) {
	      var previous = triangle.previous,
	          next = triangle.next;

	      // If the area of the current point is less than that of the previous point
	      // to be eliminated, use the latter's area instead. This ensures that the
	      // current point cannot be eliminated without eliminating previously-
	      // eliminated points.
	      if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
	      else maxArea = triangle[1][2];

	      if (previous) {
	        previous.next = next;
	        previous[2] = triangle[2];
	        update(previous);
	      }

	      if (next) {
	        next.previous = previous;
	        next[0] = triangle[0];
	        update(next);
	      }
	    }

	    arc.forEach(relative);
	  });

	  function update(triangle) {
	    heap.remove(triangle);
	    triangle[1][2] = triangleArea(triangle);
	    heap.push(triangle);
	  }

	  return topology;
	}

	var version = "1.6.27";

	exports.version = version;
	exports.mesh = mesh;
	exports.meshArcs = meshArcs;
	exports.merge = merge;
	exports.mergeArcs = mergeArcs;
	exports.feature = feature;
	exports.neighbors = neighbors;
	exports.presimplify = presimplify;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = {
		"type": "Topology",
		"objects": {
			"countries": {
				"type": "GeometryCollection",
				"bbox": [
					-179.99999999999997,
					-90.00000000000003,
					180.00000000000014,
					83.64513000000001
				],
				"geometries": [
					{
						"type": "Polygon",
						"id": 4,
						"arcs": [
							[
								0,
								1,
								2,
								3,
								4,
								5
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 24,
						"arcs": [
							[
								[
									6,
									7,
									8,
									9
								]
							],
							[
								[
									10,
									11,
									12
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 8,
						"arcs": [
							[
								13,
								14,
								15,
								16,
								17
							]
						]
					},
					{
						"type": "Polygon",
						"id": 784,
						"arcs": [
							[
								18,
								19,
								20,
								21,
								22
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 32,
						"arcs": [
							[
								[
									23,
									24
								]
							],
							[
								[
									25,
									26,
									27,
									28,
									29,
									30
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 51,
						"arcs": [
							[
								31,
								32,
								33,
								34,
								35
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 10,
						"arcs": [
							[
								[
									36
								]
							],
							[
								[
									37
								]
							],
							[
								[
									38
								]
							],
							[
								[
									39
								]
							],
							[
								[
									40
								]
							],
							[
								[
									41
								]
							],
							[
								[
									42
								]
							],
							[
								[
									43
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 260,
						"arcs": [
							[
								44
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 36,
						"arcs": [
							[
								[
									45
								]
							],
							[
								[
									46
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 40,
						"arcs": [
							[
								47,
								48,
								49,
								50,
								51,
								52,
								53
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 31,
						"arcs": [
							[
								[
									54,
									-35
								]
							],
							[
								[
									55,
									56,
									-33,
									57,
									58
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 108,
						"arcs": [
							[
								59,
								60,
								61
							]
						]
					},
					{
						"type": "Polygon",
						"id": 56,
						"arcs": [
							[
								62,
								63,
								64,
								65,
								66
							]
						]
					},
					{
						"type": "Polygon",
						"id": 204,
						"arcs": [
							[
								67,
								68,
								69,
								70,
								71
							]
						]
					},
					{
						"type": "Polygon",
						"id": 854,
						"arcs": [
							[
								72,
								73,
								74,
								-70,
								75,
								76
							]
						]
					},
					{
						"type": "Polygon",
						"id": 50,
						"arcs": [
							[
								77,
								78,
								79
							]
						]
					},
					{
						"type": "Polygon",
						"id": 100,
						"arcs": [
							[
								80,
								81,
								82,
								83,
								84,
								85
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 44,
						"arcs": [
							[
								[
									86
								]
							],
							[
								[
									87
								]
							],
							[
								[
									88
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 70,
						"arcs": [
							[
								89,
								90,
								91
							]
						]
					},
					{
						"type": "Polygon",
						"id": 112,
						"arcs": [
							[
								92,
								93,
								94,
								95,
								96
							]
						]
					},
					{
						"type": "Polygon",
						"id": 84,
						"arcs": [
							[
								97,
								98,
								99
							]
						]
					},
					{
						"type": "Polygon",
						"id": 68,
						"arcs": [
							[
								100,
								101,
								102,
								103,
								-31
							]
						]
					},
					{
						"type": "Polygon",
						"id": 76,
						"arcs": [
							[
								-27,
								104,
								-103,
								105,
								106,
								107,
								108,
								109,
								110,
								111,
								112
							]
						]
					},
					{
						"type": "Polygon",
						"id": 96,
						"arcs": [
							[
								113,
								114
							]
						]
					},
					{
						"type": "Polygon",
						"id": 64,
						"arcs": [
							[
								115,
								116
							]
						]
					},
					{
						"type": "Polygon",
						"id": 72,
						"arcs": [
							[
								117,
								118,
								119,
								120
							]
						]
					},
					{
						"type": "Polygon",
						"id": 140,
						"arcs": [
							[
								121,
								122,
								123,
								124,
								125,
								126,
								127
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 124,
						"arcs": [
							[
								[
									128
								]
							],
							[
								[
									129
								]
							],
							[
								[
									130
								]
							],
							[
								[
									131
								]
							],
							[
								[
									132
								]
							],
							[
								[
									133
								]
							],
							[
								[
									134
								]
							],
							[
								[
									135
								]
							],
							[
								[
									136
								]
							],
							[
								[
									137
								]
							],
							[
								[
									138,
									139,
									140,
									141
								]
							],
							[
								[
									142
								]
							],
							[
								[
									143
								]
							],
							[
								[
									144
								]
							],
							[
								[
									145
								]
							],
							[
								[
									146
								]
							],
							[
								[
									147
								]
							],
							[
								[
									148
								]
							],
							[
								[
									149
								]
							],
							[
								[
									150
								]
							],
							[
								[
									151
								]
							],
							[
								[
									152
								]
							],
							[
								[
									153
								]
							],
							[
								[
									154
								]
							],
							[
								[
									155
								]
							],
							[
								[
									156
								]
							],
							[
								[
									157
								]
							],
							[
								[
									158
								]
							],
							[
								[
									159
								]
							],
							[
								[
									160
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 756,
						"arcs": [
							[
								-51,
								161,
								162,
								163
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 152,
						"arcs": [
							[
								[
									-24,
									164
								]
							],
							[
								[
									-30,
									165,
									166,
									-101
								]
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 156,
						"arcs": [
							[
								[
									167
								]
							],
							[
								[
									168,
									169,
									170,
									171,
									172,
									173,
									-117,
									174,
									175,
									176,
									177,
									-4,
									178,
									179,
									180,
									181,
									182,
									183
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 384,
						"arcs": [
							[
								184,
								185,
								186,
								187,
								-73,
								188
							]
						]
					},
					{
						"type": "Polygon",
						"id": 120,
						"arcs": [
							[
								189,
								190,
								191,
								192,
								193,
								194,
								-128,
								195
							]
						]
					},
					{
						"type": "Polygon",
						"id": 180,
						"arcs": [
							[
								196,
								197,
								-60,
								198,
								199,
								-10,
								200,
								-13,
								201,
								-126,
								202
							]
						]
					},
					{
						"type": "Polygon",
						"id": 178,
						"arcs": [
							[
								-12,
								203,
								204,
								-196,
								-127,
								-202
							]
						]
					},
					{
						"type": "Polygon",
						"id": 170,
						"arcs": [
							[
								205,
								206,
								207,
								208,
								209,
								-107,
								210
							]
						]
					},
					{
						"type": "Polygon",
						"id": 188,
						"arcs": [
							[
								211,
								212,
								213,
								214
							]
						]
					},
					{
						"type": "Polygon",
						"id": 192,
						"arcs": [
							[
								215
							]
						]
					},
					{
						"type": "Polygon",
						"id": -99,
						"arcs": [
							[
								216,
								217
							]
						]
					},
					{
						"type": "Polygon",
						"id": 196,
						"arcs": [
							[
								218,
								-218
							]
						]
					},
					{
						"type": "Polygon",
						"id": 203,
						"arcs": [
							[
								-53,
								219,
								220,
								221
							]
						]
					},
					{
						"type": "Polygon",
						"id": 276,
						"arcs": [
							[
								222,
								223,
								-220,
								-52,
								-164,
								224,
								225,
								-64,
								226,
								227,
								228
							]
						]
					},
					{
						"type": "Polygon",
						"id": 262,
						"arcs": [
							[
								229,
								230,
								231,
								232
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 208,
						"arcs": [
							[
								[
									233
								]
							],
							[
								[
									-229,
									234
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 214,
						"arcs": [
							[
								235,
								236
							]
						]
					},
					{
						"type": "Polygon",
						"id": 12,
						"arcs": [
							[
								237,
								238,
								239,
								240,
								241,
								242,
								243,
								244
							]
						]
					},
					{
						"type": "Polygon",
						"id": 218,
						"arcs": [
							[
								245,
								-206,
								246
							]
						]
					},
					{
						"type": "Polygon",
						"id": 818,
						"arcs": [
							[
								247,
								248,
								249,
								250,
								251
							]
						]
					},
					{
						"type": "Polygon",
						"id": 232,
						"arcs": [
							[
								252,
								253,
								254,
								-233
							]
						]
					},
					{
						"type": "Polygon",
						"id": 724,
						"arcs": [
							[
								255,
								256,
								257,
								258
							]
						]
					},
					{
						"type": "Polygon",
						"id": 233,
						"arcs": [
							[
								259,
								260,
								261
							]
						]
					},
					{
						"type": "Polygon",
						"id": 231,
						"arcs": [
							[
								-232,
								262,
								263,
								264,
								265,
								266,
								267,
								-253
							]
						]
					},
					{
						"type": "Polygon",
						"id": 246,
						"arcs": [
							[
								268,
								269,
								270,
								271
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 242,
						"arcs": [
							[
								[
									272
								]
							],
							[
								[
									273
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 238,
						"arcs": [
							[
								274
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 250,
						"arcs": [
							[
								[
									275,
									276,
									277,
									-111
								]
							],
							[
								[
									278
								]
							],
							[
								[
									279,
									-225,
									-163,
									280,
									281,
									-257,
									282,
									-66
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 266,
						"arcs": [
							[
								283,
								284,
								-190,
								-205
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 826,
						"arcs": [
							[
								[
									285,
									286
								]
							],
							[
								[
									287
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 268,
						"arcs": [
							[
								288,
								289,
								-58,
								-32,
								290
							]
						]
					},
					{
						"type": "Polygon",
						"id": 288,
						"arcs": [
							[
								291,
								-189,
								-77,
								292
							]
						]
					},
					{
						"type": "Polygon",
						"id": 324,
						"arcs": [
							[
								293,
								294,
								295,
								296,
								297,
								298,
								-187
							]
						]
					},
					{
						"type": "Polygon",
						"id": 270,
						"arcs": [
							[
								299,
								300
							]
						]
					},
					{
						"type": "Polygon",
						"id": 624,
						"arcs": [
							[
								301,
								302,
								-297
							]
						]
					},
					{
						"type": "Polygon",
						"id": 226,
						"arcs": [
							[
								303,
								-191,
								-285
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 300,
						"arcs": [
							[
								[
									304
								]
							],
							[
								[
									305,
									-15,
									306,
									-84,
									307
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 304,
						"arcs": [
							[
								308
							]
						]
					},
					{
						"type": "Polygon",
						"id": 320,
						"arcs": [
							[
								309,
								310,
								-100,
								311,
								312,
								313
							]
						]
					},
					{
						"type": "Polygon",
						"id": 328,
						"arcs": [
							[
								314,
								315,
								-109,
								316
							]
						]
					},
					{
						"type": "Polygon",
						"id": 340,
						"arcs": [
							[
								317,
								318,
								-313,
								319,
								320
							]
						]
					},
					{
						"type": "Polygon",
						"id": 191,
						"arcs": [
							[
								321,
								-92,
								322,
								323,
								324,
								325
							]
						]
					},
					{
						"type": "Polygon",
						"id": 332,
						"arcs": [
							[
								-237,
								326
							]
						]
					},
					{
						"type": "Polygon",
						"id": 348,
						"arcs": [
							[
								-48,
								327,
								328,
								329,
								330,
								-326,
								331
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 360,
						"arcs": [
							[
								[
									332
								]
							],
							[
								[
									333,
									334
								]
							],
							[
								[
									335
								]
							],
							[
								[
									336
								]
							],
							[
								[
									337
								]
							],
							[
								[
									338
								]
							],
							[
								[
									339
								]
							],
							[
								[
									340
								]
							],
							[
								[
									341,
									342
								]
							],
							[
								[
									343
								]
							],
							[
								[
									344
								]
							],
							[
								[
									345,
									346
								]
							],
							[
								[
									347
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 356,
						"arcs": [
							[
								-177,
								348,
								-175,
								-116,
								-174,
								349,
								-80,
								350,
								351
							]
						]
					},
					{
						"type": "Polygon",
						"id": 372,
						"arcs": [
							[
								352,
								-286
							]
						]
					},
					{
						"type": "Polygon",
						"id": 364,
						"arcs": [
							[
								353,
								-6,
								354,
								355,
								356,
								357,
								-55,
								-34,
								-57,
								358
							]
						]
					},
					{
						"type": "Polygon",
						"id": 368,
						"arcs": [
							[
								359,
								360,
								361,
								362,
								363,
								364,
								-357
							]
						]
					},
					{
						"type": "Polygon",
						"id": 352,
						"arcs": [
							[
								365
							]
						]
					},
					{
						"type": "Polygon",
						"id": 376,
						"arcs": [
							[
								366,
								367,
								368,
								-252,
								369,
								370,
								371
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 380,
						"arcs": [
							[
								[
									372
								]
							],
							[
								[
									373
								]
							],
							[
								[
									374,
									375,
									-281,
									-162,
									-50
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 388,
						"arcs": [
							[
								376
							]
						]
					},
					{
						"type": "Polygon",
						"id": 400,
						"arcs": [
							[
								-367,
								377,
								-363,
								378,
								379,
								-369,
								380
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 392,
						"arcs": [
							[
								[
									381
								]
							],
							[
								[
									382
								]
							],
							[
								[
									383
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 398,
						"arcs": [
							[
								384,
								385,
								386,
								387,
								-181,
								388
							]
						]
					},
					{
						"type": "Polygon",
						"id": 404,
						"arcs": [
							[
								389,
								390,
								391,
								392,
								-265,
								393
							]
						]
					},
					{
						"type": "Polygon",
						"id": 417,
						"arcs": [
							[
								-389,
								-180,
								394,
								395
							]
						]
					},
					{
						"type": "Polygon",
						"id": 116,
						"arcs": [
							[
								396,
								397,
								398,
								399
							]
						]
					},
					{
						"type": "Polygon",
						"id": 410,
						"arcs": [
							[
								400,
								401
							]
						]
					},
					{
						"type": "Polygon",
						"id": -99,
						"arcs": [
							[
								-18,
								402,
								403,
								404
							]
						]
					},
					{
						"type": "Polygon",
						"id": 414,
						"arcs": [
							[
								405,
								406,
								-361
							]
						]
					},
					{
						"type": "Polygon",
						"id": 418,
						"arcs": [
							[
								407,
								408,
								-172,
								409,
								-398
							]
						]
					},
					{
						"type": "Polygon",
						"id": 422,
						"arcs": [
							[
								-371,
								410,
								411
							]
						]
					},
					{
						"type": "Polygon",
						"id": 430,
						"arcs": [
							[
								412,
								413,
								-294,
								-186
							]
						]
					},
					{
						"type": "Polygon",
						"id": 434,
						"arcs": [
							[
								414,
								-245,
								415,
								416,
								-250,
								417,
								418
							]
						]
					},
					{
						"type": "Polygon",
						"id": 144,
						"arcs": [
							[
								419
							]
						]
					},
					{
						"type": "Polygon",
						"id": 426,
						"arcs": [
							[
								420
							]
						]
					},
					{
						"type": "Polygon",
						"id": 440,
						"arcs": [
							[
								421,
								422,
								423,
								-93,
								424
							]
						]
					},
					{
						"type": "Polygon",
						"id": 442,
						"arcs": [
							[
								-226,
								-280,
								-65
							]
						]
					},
					{
						"type": "Polygon",
						"id": 428,
						"arcs": [
							[
								425,
								-262,
								426,
								-94,
								-424
							]
						]
					},
					{
						"type": "Polygon",
						"id": 504,
						"arcs": [
							[
								-242,
								427,
								428
							]
						]
					},
					{
						"type": "Polygon",
						"id": 498,
						"arcs": [
							[
								429,
								430
							]
						]
					},
					{
						"type": "Polygon",
						"id": 450,
						"arcs": [
							[
								431
							]
						]
					},
					{
						"type": "Polygon",
						"id": 484,
						"arcs": [
							[
								432,
								-98,
								-311,
								433,
								434
							]
						]
					},
					{
						"type": "Polygon",
						"id": 807,
						"arcs": [
							[
								-405,
								435,
								-85,
								-307,
								-14
							]
						]
					},
					{
						"type": "Polygon",
						"id": 466,
						"arcs": [
							[
								436,
								-239,
								437,
								-74,
								-188,
								-299,
								438
							]
						]
					},
					{
						"type": "Polygon",
						"id": 104,
						"arcs": [
							[
								439,
								-78,
								-350,
								-173,
								-409,
								440
							]
						]
					},
					{
						"type": "Polygon",
						"id": 499,
						"arcs": [
							[
								441,
								-323,
								-91,
								442,
								-403,
								-17
							]
						]
					},
					{
						"type": "Polygon",
						"id": 496,
						"arcs": [
							[
								443,
								-183
							]
						]
					},
					{
						"type": "Polygon",
						"id": 508,
						"arcs": [
							[
								444,
								445,
								446,
								447,
								448,
								449,
								450,
								451
							]
						]
					},
					{
						"type": "Polygon",
						"id": 478,
						"arcs": [
							[
								452,
								453,
								454,
								-240,
								-437
							]
						]
					},
					{
						"type": "Polygon",
						"id": 454,
						"arcs": [
							[
								-452,
								455,
								456
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 458,
						"arcs": [
							[
								[
									457,
									458
								]
							],
							[
								[
									-346,
									459,
									-115,
									460
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 516,
						"arcs": [
							[
								461,
								-8,
								462,
								-119,
								463
							]
						]
					},
					{
						"type": "Polygon",
						"id": 540,
						"arcs": [
							[
								464
							]
						]
					},
					{
						"type": "Polygon",
						"id": 562,
						"arcs": [
							[
								-75,
								-438,
								-238,
								-415,
								465,
								-194,
								466,
								-71
							]
						]
					},
					{
						"type": "Polygon",
						"id": 566,
						"arcs": [
							[
								467,
								-72,
								-467,
								-193
							]
						]
					},
					{
						"type": "Polygon",
						"id": 558,
						"arcs": [
							[
								468,
								-321,
								469,
								-213
							]
						]
					},
					{
						"type": "Polygon",
						"id": 528,
						"arcs": [
							[
								-227,
								-63,
								470
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 578,
						"arcs": [
							[
								[
									471,
									-272,
									472,
									473
								]
							],
							[
								[
									474
								]
							],
							[
								[
									475
								]
							],
							[
								[
									476
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 524,
						"arcs": [
							[
								-349,
								-176
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 554,
						"arcs": [
							[
								[
									477
								]
							],
							[
								[
									478
								]
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 512,
						"arcs": [
							[
								[
									479,
									480,
									-22,
									481
								]
							],
							[
								[
									-20,
									482
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 586,
						"arcs": [
							[
								-178,
								-352,
								483,
								-355,
								-5
							]
						]
					},
					{
						"type": "Polygon",
						"id": 591,
						"arcs": [
							[
								484,
								-215,
								485,
								-208
							]
						]
					},
					{
						"type": "Polygon",
						"id": 604,
						"arcs": [
							[
								-167,
								486,
								-247,
								-211,
								-106,
								-102
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 608,
						"arcs": [
							[
								[
									487
								]
							],
							[
								[
									488
								]
							],
							[
								[
									489
								]
							],
							[
								[
									490
								]
							],
							[
								[
									491
								]
							],
							[
								[
									492
								]
							],
							[
								[
									493
								]
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 598,
						"arcs": [
							[
								[
									494
								]
							],
							[
								[
									495
								]
							],
							[
								[
									-342,
									496
								]
							],
							[
								[
									497
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 616,
						"arcs": [
							[
								-224,
								498,
								499,
								-425,
								-97,
								500,
								501,
								-221
							]
						]
					},
					{
						"type": "Polygon",
						"id": 630,
						"arcs": [
							[
								502
							]
						]
					},
					{
						"type": "Polygon",
						"id": 408,
						"arcs": [
							[
								503,
								504,
								-402,
								505,
								-169
							]
						]
					},
					{
						"type": "Polygon",
						"id": 620,
						"arcs": [
							[
								-259,
								506
							]
						]
					},
					{
						"type": "Polygon",
						"id": 600,
						"arcs": [
							[
								-104,
								-105,
								-26
							]
						]
					},
					{
						"type": "Polygon",
						"id": 275,
						"arcs": [
							[
								-381,
								-368
							]
						]
					},
					{
						"type": "Polygon",
						"id": 634,
						"arcs": [
							[
								507,
								508
							]
						]
					},
					{
						"type": "Polygon",
						"id": 642,
						"arcs": [
							[
								509,
								-431,
								510,
								511,
								-81,
								512,
								-330
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 643,
						"arcs": [
							[
								[
									513
								]
							],
							[
								[
									-500,
									514,
									-422
								]
							],
							[
								[
									515
								]
							],
							[
								[
									516
								]
							],
							[
								[
									517
								]
							],
							[
								[
									518
								]
							],
							[
								[
									519
								]
							],
							[
								[
									-504,
									-184,
									-444,
									-182,
									-388,
									520,
									-59,
									-290,
									521,
									522,
									-95,
									-427,
									-261,
									523,
									-269,
									-472,
									524
								]
							],
							[
								[
									525
								]
							],
							[
								[
									526
								]
							],
							[
								[
									527
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 646,
						"arcs": [
							[
								528,
								-61,
								-198,
								529
							]
						]
					},
					{
						"type": "Polygon",
						"id": 732,
						"arcs": [
							[
								-241,
								-455,
								530,
								-428
							]
						]
					},
					{
						"type": "Polygon",
						"id": 682,
						"arcs": [
							[
								531,
								-379,
								-362,
								-407,
								532,
								-509,
								533,
								-23,
								-481,
								534
							]
						]
					},
					{
						"type": "Polygon",
						"id": 729,
						"arcs": [
							[
								535,
								536,
								-123,
								537,
								-418,
								-249,
								538,
								-254,
								-268,
								539
							]
						]
					},
					{
						"type": "Polygon",
						"id": 728,
						"arcs": [
							[
								540,
								-266,
								-393,
								541,
								-203,
								-125,
								542,
								-536
							]
						]
					},
					{
						"type": "Polygon",
						"id": 686,
						"arcs": [
							[
								543,
								-453,
								-439,
								-298,
								-303,
								544,
								-301
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 90,
						"arcs": [
							[
								[
									545
								]
							],
							[
								[
									546
								]
							],
							[
								[
									547
								]
							],
							[
								[
									548
								]
							],
							[
								[
									549
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 694,
						"arcs": [
							[
								550,
								-295,
								-414
							]
						]
					},
					{
						"type": "Polygon",
						"id": 222,
						"arcs": [
							[
								551,
								-314,
								-319
							]
						]
					},
					{
						"type": "Polygon",
						"id": -99,
						"arcs": [
							[
								-263,
								-231,
								552,
								553
							]
						]
					},
					{
						"type": "Polygon",
						"id": 706,
						"arcs": [
							[
								-394,
								-264,
								-554,
								554
							]
						]
					},
					{
						"type": "Polygon",
						"id": 688,
						"arcs": [
							[
								-86,
								-436,
								-404,
								-443,
								-90,
								-322,
								-331,
								-513
							]
						]
					},
					{
						"type": "Polygon",
						"id": 740,
						"arcs": [
							[
								555,
								-277,
								556,
								-110,
								-316
							]
						]
					},
					{
						"type": "Polygon",
						"id": 703,
						"arcs": [
							[
								-502,
								557,
								-328,
								-54,
								-222
							]
						]
					},
					{
						"type": "Polygon",
						"id": 705,
						"arcs": [
							[
								-49,
								-332,
								-325,
								558,
								-375
							]
						]
					},
					{
						"type": "Polygon",
						"id": 752,
						"arcs": [
							[
								-473,
								-271,
								559
							]
						]
					},
					{
						"type": "Polygon",
						"id": 748,
						"arcs": [
							[
								560,
								-448
							]
						]
					},
					{
						"type": "Polygon",
						"id": 760,
						"arcs": [
							[
								-378,
								-372,
								-412,
								561,
								562,
								-364
							]
						]
					},
					{
						"type": "Polygon",
						"id": 148,
						"arcs": [
							[
								-466,
								-419,
								-538,
								-122,
								-195
							]
						]
					},
					{
						"type": "Polygon",
						"id": 768,
						"arcs": [
							[
								563,
								-293,
								-76,
								-69
							]
						]
					},
					{
						"type": "Polygon",
						"id": 764,
						"arcs": [
							[
								564,
								-459,
								565,
								-441,
								-408,
								-397
							]
						]
					},
					{
						"type": "Polygon",
						"id": 762,
						"arcs": [
							[
								-395,
								-179,
								-3,
								566
							]
						]
					},
					{
						"type": "Polygon",
						"id": 795,
						"arcs": [
							[
								-354,
								567,
								-386,
								568,
								-1
							]
						]
					},
					{
						"type": "Polygon",
						"id": 626,
						"arcs": [
							[
								569,
								-334
							]
						]
					},
					{
						"type": "Polygon",
						"id": 780,
						"arcs": [
							[
								570
							]
						]
					},
					{
						"type": "Polygon",
						"id": 788,
						"arcs": [
							[
								-244,
								571,
								-416
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 792,
						"arcs": [
							[
								[
									-291,
									-36,
									-358,
									-365,
									-563,
									572
								]
							],
							[
								[
									-308,
									-83,
									573
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 158,
						"arcs": [
							[
								574
							]
						]
					},
					{
						"type": "Polygon",
						"id": 834,
						"arcs": [
							[
								-391,
								575,
								-445,
								-457,
								576,
								-199,
								-62,
								-529,
								577
							]
						]
					},
					{
						"type": "Polygon",
						"id": 800,
						"arcs": [
							[
								-530,
								-197,
								-542,
								-392,
								-578
							]
						]
					},
					{
						"type": "Polygon",
						"id": 804,
						"arcs": [
							[
								-523,
								578,
								-511,
								-430,
								-510,
								-329,
								-558,
								-501,
								-96
							]
						]
					},
					{
						"type": "Polygon",
						"id": 858,
						"arcs": [
							[
								-113,
								579,
								-28
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 840,
						"arcs": [
							[
								[
									580
								]
							],
							[
								[
									581
								]
							],
							[
								[
									582
								]
							],
							[
								[
									583
								]
							],
							[
								[
									584
								]
							],
							[
								[
									585,
									-435,
									586,
									-139
								]
							],
							[
								[
									587
								]
							],
							[
								[
									588
								]
							],
							[
								[
									589
								]
							],
							[
								[
									-141,
									590
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 860,
						"arcs": [
							[
								-569,
								-385,
								-396,
								-567,
								-2
							]
						]
					},
					{
						"type": "Polygon",
						"id": 862,
						"arcs": [
							[
								591,
								-317,
								-108,
								-210
							]
						]
					},
					{
						"type": "Polygon",
						"id": 704,
						"arcs": [
							[
								592,
								-399,
								-410,
								-171
							]
						]
					},
					{
						"type": "MultiPolygon",
						"id": 548,
						"arcs": [
							[
								[
									593
								]
							],
							[
								[
									594
								]
							]
						]
					},
					{
						"type": "Polygon",
						"id": 887,
						"arcs": [
							[
								595,
								-535,
								-480
							]
						]
					},
					{
						"type": "Polygon",
						"id": 710,
						"arcs": [
							[
								-464,
								-118,
								596,
								-449,
								-561,
								-447,
								597
							],
							[
								-421
							]
						]
					},
					{
						"type": "Polygon",
						"id": 894,
						"arcs": [
							[
								-456,
								-451,
								598,
								-120,
								-463,
								-7,
								-200,
								-577
							]
						]
					},
					{
						"type": "Polygon",
						"id": 716,
						"arcs": [
							[
								-597,
								-121,
								-599,
								-450
							]
						]
					}
				]
			},
			"land": {
				"type": "MultiPolygon",
				"arcs": [
					[
						[
							540,
							266,
							539
						],
						[
							123,
							542,
							536
						],
						[
							592,
							399,
							564,
							457,
							565,
							439,
							78,
							350,
							483,
							355,
							359,
							405,
							532,
							507,
							533,
							18,
							482,
							20,
							481,
							595,
							531,
							379,
							247,
							538,
							254,
							229,
							552,
							554,
							389,
							575,
							445,
							597,
							461,
							8,
							200,
							10,
							203,
							283,
							303,
							191,
							467,
							67,
							563,
							291,
							184,
							412,
							550,
							295,
							301,
							544,
							299,
							543,
							453,
							530,
							428,
							242,
							571,
							416,
							250,
							369,
							410,
							561,
							572,
							288,
							521,
							578,
							511,
							81,
							573,
							305,
							15,
							441,
							323,
							558,
							375,
							281,
							257,
							506,
							255,
							282,
							66,
							470,
							227,
							234,
							222,
							498,
							514,
							422,
							425,
							259,
							523,
							269,
							559,
							473,
							524,
							504,
							400,
							505,
							169
						],
						[
							386,
							520,
							55,
							358,
							567
						]
					],
					[
						[
							24,
							164
						]
					],
					[
						[
							556,
							275
						],
						[
							579,
							28,
							165,
							486,
							245,
							206,
							484,
							211,
							468,
							317,
							551,
							309,
							433,
							586,
							139,
							590,
							141,
							585,
							432,
							98,
							311,
							319,
							469,
							213,
							485,
							208,
							591,
							314,
							555,
							277,
							111
						]
					],
					[
						[
							36
						]
					],
					[
						[
							37
						]
					],
					[
						[
							38
						]
					],
					[
						[
							39
						]
					],
					[
						[
							40
						]
					],
					[
						[
							41
						]
					],
					[
						[
							42
						]
					],
					[
						[
							43
						]
					],
					[
						[
							44
						]
					],
					[
						[
							45
						]
					],
					[
						[
							46
						]
					],
					[
						[
							86
						]
					],
					[
						[
							87
						]
					],
					[
						[
							88
						]
					],
					[
						[
							459,
							113,
							460,
							346
						]
					],
					[
						[
							128
						]
					],
					[
						[
							129
						]
					],
					[
						[
							130
						]
					],
					[
						[
							131
						]
					],
					[
						[
							132
						]
					],
					[
						[
							133
						]
					],
					[
						[
							134
						]
					],
					[
						[
							135
						]
					],
					[
						[
							136
						]
					],
					[
						[
							137
						]
					],
					[
						[
							142
						]
					],
					[
						[
							143
						]
					],
					[
						[
							144
						]
					],
					[
						[
							145
						]
					],
					[
						[
							146
						]
					],
					[
						[
							147
						]
					],
					[
						[
							148
						]
					],
					[
						[
							149
						]
					],
					[
						[
							150
						]
					],
					[
						[
							151
						]
					],
					[
						[
							152
						]
					],
					[
						[
							153
						]
					],
					[
						[
							154
						]
					],
					[
						[
							155
						]
					],
					[
						[
							156
						]
					],
					[
						[
							157
						]
					],
					[
						[
							158
						]
					],
					[
						[
							159
						]
					],
					[
						[
							160
						]
					],
					[
						[
							167
						]
					],
					[
						[
							215
						]
					],
					[
						[
							216,
							218
						]
					],
					[
						[
							233
						]
					],
					[
						[
							235,
							326
						]
					],
					[
						[
							272
						]
					],
					[
						[
							273
						]
					],
					[
						[
							274
						]
					],
					[
						[
							278
						]
					],
					[
						[
							286,
							352
						]
					],
					[
						[
							287
						]
					],
					[
						[
							304
						]
					],
					[
						[
							308
						]
					],
					[
						[
							332
						]
					],
					[
						[
							334,
							569
						]
					],
					[
						[
							335
						]
					],
					[
						[
							336
						]
					],
					[
						[
							337
						]
					],
					[
						[
							338
						]
					],
					[
						[
							339
						]
					],
					[
						[
							340
						]
					],
					[
						[
							342,
							496
						]
					],
					[
						[
							343
						]
					],
					[
						[
							344
						]
					],
					[
						[
							347
						]
					],
					[
						[
							365
						]
					],
					[
						[
							372
						]
					],
					[
						[
							373
						]
					],
					[
						[
							376
						]
					],
					[
						[
							381
						]
					],
					[
						[
							382
						]
					],
					[
						[
							383
						]
					],
					[
						[
							419
						]
					],
					[
						[
							431
						]
					],
					[
						[
							464
						]
					],
					[
						[
							474
						]
					],
					[
						[
							475
						]
					],
					[
						[
							476
						]
					],
					[
						[
							477
						]
					],
					[
						[
							478
						]
					],
					[
						[
							487
						]
					],
					[
						[
							488
						]
					],
					[
						[
							489
						]
					],
					[
						[
							490
						]
					],
					[
						[
							491
						]
					],
					[
						[
							492
						]
					],
					[
						[
							493
						]
					],
					[
						[
							494
						]
					],
					[
						[
							495
						]
					],
					[
						[
							497
						]
					],
					[
						[
							502
						]
					],
					[
						[
							513
						]
					],
					[
						[
							515
						]
					],
					[
						[
							516
						]
					],
					[
						[
							517
						]
					],
					[
						[
							518
						]
					],
					[
						[
							519
						]
					],
					[
						[
							525
						]
					],
					[
						[
							526
						]
					],
					[
						[
							527
						]
					],
					[
						[
							545
						]
					],
					[
						[
							546
						]
					],
					[
						[
							547
						]
					],
					[
						[
							548
						]
					],
					[
						[
							549
						]
					],
					[
						[
							570
						]
					],
					[
						[
							574
						]
					],
					[
						[
							580
						]
					],
					[
						[
							581
						]
					],
					[
						[
							582
						]
					],
					[
						[
							583
						]
					],
					[
						[
							584
						]
					],
					[
						[
							587
						]
					],
					[
						[
							588
						]
					],
					[
						[
							589
						]
					],
					[
						[
							593
						]
					],
					[
						[
							594
						]
					]
				]
			}
		},
		"arcs": [
			[
				[
					67002,
					72360
				],
				[
					284,
					-219
				],
				[
					209,
					77
				],
				[
					58,
					261
				],
				[
					219,
					87
				],
				[
					157,
					175
				],
				[
					55,
					460
				],
				[
					234,
					112
				],
				[
					44,
					205
				],
				[
					131,
					-154
				],
				[
					84,
					-18
				]
			],
			[
				[
					68477,
					73346
				],
				[
					154,
					-4
				],
				[
					210,
					-122
				]
			],
			[
				[
					68841,
					73220
				],
				[
					85,
					-70
				],
				[
					201,
					185
				],
				[
					93,
					-111
				],
				[
					90,
					264
				],
				[
					166,
					-12
				],
				[
					43,
					84
				],
				[
					29,
					233
				],
				[
					120,
					200
				],
				[
					150,
					-131
				],
				[
					-30,
					-176
				],
				[
					84,
					-27
				],
				[
					-26,
					-484
				],
				[
					110,
					-189
				],
				[
					97,
					121
				],
				[
					123,
					57
				],
				[
					173,
					258
				],
				[
					192,
					-42
				],
				[
					286,
					-1
				]
			],
			[
				[
					70827,
					73379
				],
				[
					50,
					-165
				]
			],
			[
				[
					70877,
					73214
				],
				[
					-162,
					-65
				],
				[
					-141,
					-106
				],
				[
					-319,
					-67
				],
				[
					-298,
					-121
				],
				[
					-163,
					-251
				],
				[
					66,
					-244
				],
				[
					32,
					-287
				],
				[
					-139,
					-242
				],
				[
					12,
					-221
				],
				[
					-76,
					-207
				],
				[
					-265,
					18
				],
				[
					110,
					-381
				],
				[
					-177,
					-146
				],
				[
					-118,
					-347
				],
				[
					15,
					-346
				],
				[
					-108,
					-162
				],
				[
					-103,
					53
				],
				[
					-212,
					-75
				],
				[
					-31,
					-161
				],
				[
					-207,
					1
				],
				[
					-154,
					-326
				],
				[
					-10,
					-490
				],
				[
					-361,
					-239
				],
				[
					-194,
					50
				],
				[
					-56,
					-126
				],
				[
					-166,
					74
				],
				[
					-278,
					-87
				],
				[
					-465,
					294
				]
			],
			[
				[
					66909,
					69007
				],
				[
					252,
					523
				],
				[
					-23,
					370
				],
				[
					-210,
					97
				],
				[
					-22,
					366
				],
				[
					-91,
					460
				],
				[
					119,
					315
				],
				[
					-121,
					85
				],
				[
					76,
					419
				],
				[
					113,
					718
				]
			],
			[
				[
					56642,
					45537
				],
				[
					29,
					-179
				],
				[
					-32,
					-279
				],
				[
					49,
					-270
				],
				[
					-41,
					-216
				],
				[
					24,
					-199
				],
				[
					-579,
					7
				],
				[
					-13,
					-1832
				],
				[
					188,
					-471
				],
				[
					181,
					-360
				]
			],
			[
				[
					56448,
					41738
				],
				[
					-510,
					-235
				],
				[
					-673,
					82
				],
				[
					-192,
					276
				],
				[
					-1126,
					-25
				],
				[
					-42,
					-40
				],
				[
					-166,
					260
				],
				[
					-180,
					17
				],
				[
					-166,
					-98
				],
				[
					-134,
					-110
				]
			],
			[
				[
					53259,
					41865
				],
				[
					-26,
					363
				],
				[
					38,
					506
				],
				[
					96,
					527
				],
				[
					15,
					247
				],
				[
					90,
					519
				],
				[
					66,
					236
				],
				[
					159,
					377
				],
				[
					90,
					256
				],
				[
					29,
					427
				],
				[
					-15,
					326
				],
				[
					-83,
					206
				],
				[
					-74,
					350
				],
				[
					-68,
					345
				],
				[
					15,
					120
				],
				[
					85,
					228
				],
				[
					-84,
					557
				],
				[
					-57,
					385
				],
				[
					-139,
					364
				],
				[
					26,
					112
				]
			],
			[
				[
					53422,
					48316
				],
				[
					115,
					78
				],
				[
					80,
					-11
				],
				[
					98,
					69
				],
				[
					820,
					-7
				],
				[
					68,
					-430
				],
				[
					80,
					-345
				],
				[
					64,
					-186
				],
				[
					106,
					-301
				],
				[
					184,
					46
				],
				[
					91,
					81
				],
				[
					154,
					-81
				],
				[
					42,
					144
				],
				[
					69,
					336
				],
				[
					172,
					22
				],
				[
					15,
					100
				],
				[
					142,
					2
				],
				[
					-24,
					-207
				],
				[
					337,
					5
				],
				[
					5,
					-363
				],
				[
					56,
					-222
				],
				[
					-41,
					-347
				],
				[
					21,
					-354
				],
				[
					93,
					-214
				],
				[
					-15,
					-685
				],
				[
					68,
					53
				],
				[
					121,
					-15
				],
				[
					172,
					87
				],
				[
					127,
					-34
				]
			],
			[
				[
					53383,
					48495
				],
				[
					-74,
					433
				]
			],
			[
				[
					53309,
					48928
				],
				[
					112,
					249
				],
				[
					84,
					97
				],
				[
					104,
					-198
				]
			],
			[
				[
					53609,
					49076
				],
				[
					-101,
					-121
				],
				[
					-45,
					-148
				],
				[
					-9,
					-251
				],
				[
					-71,
					-61
				]
			],
			[
				[
					55719,
					75933
				],
				[
					-35,
					-196
				],
				[
					39,
					-247
				],
				[
					115,
					-140
				]
			],
			[
				[
					55838,
					75350
				],
				[
					-5,
					-151
				],
				[
					-91,
					-84
				],
				[
					-16,
					-187
				],
				[
					-129,
					-279
				]
			],
			[
				[
					55597,
					74649
				],
				[
					-48,
					40
				],
				[
					-5,
					127
				],
				[
					-154,
					193
				],
				[
					-24,
					274
				],
				[
					23,
					393
				],
				[
					38,
					179
				],
				[
					-47,
					91
				]
			],
			[
				[
					55380,
					75946
				],
				[
					-18,
					183
				],
				[
					120,
					284
				],
				[
					18,
					-109
				],
				[
					75,
					51
				]
			],
			[
				[
					55575,
					76355
				],
				[
					59,
					-154
				],
				[
					66,
					-59
				],
				[
					19,
					-209
				]
			],
			[
				[
					64327,
					65792
				],
				[
					49,
					28
				],
				[
					11,
					-158
				],
				[
					217,
					91
				],
				[
					230,
					-15
				],
				[
					168,
					-17
				],
				[
					190,
					389
				],
				[
					207,
					369
				],
				[
					176,
					355
				]
			],
			[
				[
					65575,
					66834
				],
				[
					52,
					-196
				]
			],
			[
				[
					65627,
					66638
				],
				[
					38,
					-455
				]
			],
			[
				[
					65665,
					66183
				],
				[
					-142,
					-2
				],
				[
					-23,
					-375
				],
				[
					50,
					-80
				],
				[
					-126,
					-114
				],
				[
					-1,
					-235
				],
				[
					-81,
					-238
				],
				[
					-7,
					-232
				]
			],
			[
				[
					65335,
					64907
				],
				[
					-56,
					-122
				],
				[
					-835,
					290
				],
				[
					-106,
					584
				],
				[
					-11,
					133
				]
			],
			[
				[
					31400,
					20215
				],
				[
					-168,
					16
				],
				[
					-297,
					0
				],
				[
					0,
					1286
				]
			],
			[
				[
					30935,
					21517
				],
				[
					106,
					-267
				],
				[
					139,
					-432
				],
				[
					361,
					-345
				],
				[
					389,
					-144
				],
				[
					-125,
					-288
				],
				[
					-264,
					-29
				],
				[
					-141,
					203
				]
			],
			[
				[
					32587,
					39017
				],
				[
					511,
					-940
				],
				[
					227,
					-88
				],
				[
					339,
					-425
				],
				[
					286,
					-225
				],
				[
					40,
					-254
				],
				[
					-273,
					-876
				],
				[
					280,
					-156
				],
				[
					312,
					-88
				],
				[
					220,
					92
				],
				[
					252,
					441
				],
				[
					45,
					509
				]
			],
			[
				[
					34826,
					37007
				],
				[
					138,
					110
				],
				[
					139,
					-332
				],
				[
					-6,
					-460
				],
				[
					-234,
					-318
				],
				[
					-186,
					-234
				],
				[
					-314,
					-559
				],
				[
					-370,
					-786
				]
			],
			[
				[
					33993,
					34428
				],
				[
					-70,
					-461
				],
				[
					-74,
					-592
				],
				[
					3,
					-573
				],
				[
					-61,
					-128
				],
				[
					-21,
					-372
				]
			],
			[
				[
					33770,
					32302
				],
				[
					-19,
					-301
				],
				[
					353,
					-493
				],
				[
					-38,
					-397
				],
				[
					173,
					-251
				],
				[
					-14,
					-282
				],
				[
					-267,
					-738
				],
				[
					-412,
					-309
				],
				[
					-557,
					-120
				],
				[
					-305,
					58
				],
				[
					59,
					-343
				],
				[
					-57,
					-431
				],
				[
					51,
					-291
				],
				[
					-167,
					-202
				],
				[
					-284,
					-80
				],
				[
					-267,
					210
				],
				[
					-108,
					-151
				],
				[
					39,
					-572
				],
				[
					188,
					-173
				],
				[
					152,
					181
				],
				[
					82,
					-299
				],
				[
					-255,
					-179
				],
				[
					-223,
					-358
				],
				[
					-41,
					-579
				],
				[
					-66,
					-309
				],
				[
					-262,
					-1
				],
				[
					-218,
					-295
				],
				[
					-80,
					-432
				],
				[
					273,
					-422
				],
				[
					266,
					-116
				],
				[
					-96,
					-517
				],
				[
					-328,
					-325
				],
				[
					-180,
					-675
				],
				[
					-254,
					-227
				],
				[
					-113,
					-270
				],
				[
					89,
					-598
				],
				[
					185,
					-333
				],
				[
					-117,
					29
				]
			],
			[
				[
					30952,
					21711
				],
				[
					-257,
					90
				],
				[
					-672,
					77
				],
				[
					-115,
					336
				],
				[
					6,
					431
				],
				[
					-185,
					-37
				],
				[
					-98,
					209
				],
				[
					-24,
					611
				],
				[
					213,
					253
				],
				[
					88,
					365
				],
				[
					-33,
					292
				],
				[
					148,
					491
				],
				[
					101,
					763
				],
				[
					-30,
					338
				],
				[
					122,
					109
				],
				[
					-30,
					217
				],
				[
					-129,
					115
				],
				[
					92,
					242
				],
				[
					-126,
					218
				],
				[
					-65,
					665
				],
				[
					112,
					117
				],
				[
					-47,
					702
				],
				[
					65,
					590
				],
				[
					75,
					513
				],
				[
					166,
					209
				],
				[
					-84,
					563
				],
				[
					-1,
					529
				],
				[
					210,
					376
				],
				[
					-7,
					481
				],
				[
					159,
					562
				],
				[
					1,
					530
				],
				[
					-72,
					105
				],
				[
					-128,
					994
				],
				[
					171,
					592
				],
				[
					-27,
					558
				],
				[
					100,
					523
				],
				[
					182,
					540
				],
				[
					196,
					358
				],
				[
					-83,
					226
				],
				[
					58,
					186
				],
				[
					-9,
					960
				],
				[
					302,
					284
				],
				[
					96,
					598
				],
				[
					-34,
					144
				]
			],
			[
				[
					31359,
					38736
				],
				[
					231,
					521
				],
				[
					364,
					-141
				],
				[
					163,
					-416
				],
				[
					109,
					464
				],
				[
					316,
					-24
				],
				[
					45,
					-123
				]
			],
			[
				[
					62106,
					75494
				],
				[
					386,
					89
				]
			],
			[
				[
					62492,
					75583
				],
				[
					57,
					-151
				],
				[
					106,
					-100
				],
				[
					-56,
					-144
				],
				[
					148,
					-198
				],
				[
					-78,
					-183
				],
				[
					118,
					-157
				],
				[
					124,
					-94
				],
				[
					7,
					-399
				]
			],
			[
				[
					62918,
					74157
				],
				[
					-101,
					-17
				]
			],
			[
				[
					62817,
					74140
				],
				[
					-113,
					333
				],
				[
					1,
					89
				],
				[
					-123,
					-2
				],
				[
					-82,
					155
				],
				[
					-58,
					-16
				]
			],
			[
				[
					62442,
					74699
				],
				[
					-109,
					168
				],
				[
					-207,
					144
				],
				[
					27,
					280
				],
				[
					-47,
					203
				]
			],
			[
				[
					33452,
					5736
				],
				[
					-82,
					-294
				],
				[
					-81,
					-259
				],
				[
					-582,
					79
				],
				[
					-621,
					-34
				],
				[
					-348,
					192
				],
				[
					0,
					22
				],
				[
					-152,
					170
				],
				[
					625,
					-23
				],
				[
					599,
					-56
				],
				[
					207,
					237
				],
				[
					147,
					203
				],
				[
					288,
					-237
				]
			],
			[
				[
					5775,
					6048
				],
				[
					-533,
					-79
				],
				[
					-364,
					204
				],
				[
					-163,
					203
				],
				[
					-11,
					34
				],
				[
					-180,
					158
				],
				[
					169,
					214
				],
				[
					517,
					-90
				],
				[
					277,
					-181
				],
				[
					212,
					-203
				],
				[
					76,
					-260
				]
			],
			[
				[
					37457,
					6883
				],
				[
					342,
					-248
				],
				[
					120,
					-350
				],
				[
					33,
					-248
				],
				[
					11,
					-293
				],
				[
					-430,
					-181
				],
				[
					-452,
					-146
				],
				[
					-522,
					-136
				],
				[
					-582,
					-113
				],
				[
					-658,
					34
				],
				[
					-365,
					192
				],
				[
					49,
					237
				],
				[
					593,
					158
				],
				[
					239,
					192
				],
				[
					174,
					248
				],
				[
					126,
					214
				],
				[
					168,
					203
				],
				[
					180,
					238
				],
				[
					0,
					-1
				],
				[
					141,
					0
				],
				[
					414,
					125
				],
				[
					419,
					-125
				]
			],
			[
				[
					16330,
					9501
				],
				[
					359,
					-90
				],
				[
					332,
					102
				],
				[
					-158,
					-203
				],
				[
					-261,
					-147
				],
				[
					-386,
					45
				],
				[
					-278,
					203
				],
				[
					60,
					192
				],
				[
					332,
					-102
				]
			],
			[
				[
					15122,
					9513
				],
				[
					425,
					-226
				],
				[
					-164,
					23
				],
				[
					-359,
					56
				],
				[
					-381,
					158
				],
				[
					202,
					124
				],
				[
					277,
					-135
				]
			],
			[
				[
					22505,
					10404
				],
				[
					305,
					-79
				],
				[
					304,
					68
				],
				[
					163,
					-327
				],
				[
					-217,
					45
				],
				[
					-337,
					-23
				],
				[
					-343,
					23
				],
				[
					-376,
					-34
				],
				[
					-283,
					113
				],
				[
					-146,
					237
				],
				[
					174,
					101
				],
				[
					353,
					-79
				],
				[
					403,
					-45
				]
			],
			[
				[
					30985,
					10967
				],
				[
					33,
					-259
				],
				[
					-49,
					-226
				],
				[
					-76,
					-214
				],
				[
					-326,
					-79
				],
				[
					-311,
					-113
				],
				[
					-364,
					11
				],
				[
					136,
					226
				],
				[
					-327,
					-79
				],
				[
					-310,
					-79
				],
				[
					-212,
					169
				],
				[
					-16,
					237
				],
				[
					305,
					226
				],
				[
					190,
					67
				],
				[
					321,
					-22
				],
				[
					82,
					293
				],
				[
					16,
					215
				],
				[
					-6,
					462
				],
				[
					158,
					271
				],
				[
					256,
					90
				],
				[
					147,
					-214
				],
				[
					65,
					-214
				],
				[
					120,
					-260
				],
				[
					92,
					-248
				],
				[
					76,
					-260
				]
			],
			[
				[
					0,
					3044
				],
				[
					16,
					-4
				],
				[
					245,
					335
				],
				[
					501,
					-181
				],
				[
					32,
					21
				],
				[
					294,
					183
				],
				[
					38,
					-6
				],
				[
					32,
					-5
				],
				[
					402,
					-239
				],
				[
					352,
					239
				],
				[
					63,
					33
				],
				[
					816,
					102
				],
				[
					265,
					-135
				],
				[
					130,
					-68
				],
				[
					419,
					-192
				],
				[
					789,
					-147
				],
				[
					625,
					-180
				],
				[
					1072,
					-136
				],
				[
					800,
					158
				],
				[
					1181,
					-113
				],
				[
					669,
					-180
				],
				[
					734,
					169
				],
				[
					773,
					158
				],
				[
					60,
					271
				],
				[
					-1094,
					22
				],
				[
					-898,
					136
				],
				[
					-234,
					225
				],
				[
					-745,
					125
				],
				[
					49,
					259
				],
				[
					103,
					237
				],
				[
					104,
					214
				],
				[
					-55,
					237
				],
				[
					-462,
					158
				],
				[
					-212,
					204
				],
				[
					-430,
					180
				],
				[
					675,
					-34
				],
				[
					642,
					91
				],
				[
					402,
					-192
				],
				[
					495,
					169
				],
				[
					457,
					214
				],
				[
					223,
					192
				],
				[
					-98,
					237
				],
				[
					-359,
					158
				],
				[
					-408,
					169
				],
				[
					-571,
					34
				],
				[
					-500,
					79
				],
				[
					-539,
					57
				],
				[
					-180,
					214
				],
				[
					-359,
					181
				],
				[
					-217,
					203
				],
				[
					-87,
					654
				],
				[
					136,
					-56
				],
				[
					250,
					-181
				],
				[
					457,
					57
				],
				[
					441,
					79
				],
				[
					228,
					-249
				],
				[
					441,
					57
				],
				[
					370,
					124
				],
				[
					348,
					158
				],
				[
					315,
					192
				],
				[
					419,
					56
				],
				[
					-11,
					215
				],
				[
					-97,
					214
				],
				[
					81,
					203
				],
				[
					359,
					102
				],
				[
					163,
					-192
				],
				[
					425,
					113
				],
				[
					321,
					146
				],
				[
					397,
					12
				],
				[
					375,
					56
				],
				[
					376,
					136
				],
				[
					299,
					124
				],
				[
					337,
					124
				],
				[
					218,
					-34
				],
				[
					190,
					-45
				],
				[
					414,
					79
				],
				[
					370,
					-102
				],
				[
					381,
					12
				],
				[
					364,
					79
				],
				[
					375,
					-57
				],
				[
					414,
					-56
				],
				[
					386,
					22
				],
				[
					403,
					-11
				],
				[
					413,
					-11
				],
				[
					381,
					22
				],
				[
					283,
					170
				],
				[
					337,
					90
				],
				[
					349,
					-124
				],
				[
					331,
					101
				],
				[
					300,
					203
				],
				[
					179,
					-180
				],
				[
					98,
					-203
				],
				[
					180,
					-192
				],
				[
					288,
					169
				],
				[
					332,
					-214
				],
				[
					375,
					-68
				],
				[
					321,
					-158
				],
				[
					392,
					34
				],
				[
					354,
					101
				],
				[
					418,
					-22
				],
				[
					376,
					-79
				],
				[
					381,
					-102
				],
				[
					147,
					249
				],
				[
					-180,
					191
				],
				[
					-136,
					204
				],
				[
					-359,
					45
				],
				[
					-158,
					214
				],
				[
					-60,
					214
				],
				[
					-98,
					429
				],
				[
					213,
					-79
				],
				[
					364,
					-34
				],
				[
					359,
					34
				],
				[
					327,
					-90
				],
				[
					283,
					-169
				],
				[
					119,
					-203
				],
				[
					376,
					-34
				],
				[
					359,
					79
				],
				[
					381,
					113
				],
				[
					342,
					67
				],
				[
					283,
					-135
				],
				[
					370,
					45
				],
				[
					239,
					440
				],
				[
					224,
					-259
				],
				[
					321,
					-102
				],
				[
					348,
					56
				],
				[
					228,
					-225
				],
				[
					365,
					-23
				],
				[
					337,
					-68
				],
				[
					332,
					-124
				],
				[
					218,
					215
				],
				[
					108,
					203
				],
				[
					278,
					-226
				],
				[
					381,
					57
				],
				[
					283,
					-125
				],
				[
					190,
					-191
				],
				[
					370,
					56
				],
				[
					288,
					124
				],
				[
					283,
					147
				],
				[
					337,
					79
				],
				[
					392,
					68
				],
				[
					354,
					79
				],
				[
					272,
					124
				],
				[
					163,
					180
				],
				[
					65,
					249
				],
				[
					-32,
					236
				],
				[
					-87,
					226
				],
				[
					-98,
					226
				],
				[
					-87,
					226
				],
				[
					-71,
					203
				],
				[
					-16,
					225
				],
				[
					27,
					226
				],
				[
					130,
					214
				],
				[
					109,
					237
				],
				[
					44,
					226
				],
				[
					-55,
					248
				],
				[
					-32,
					226
				],
				[
					136,
					260
				],
				[
					152,
					169
				],
				[
					180,
					214
				],
				[
					190,
					181
				],
				[
					223,
					169
				],
				[
					109,
					248
				],
				[
					152,
					158
				],
				[
					174,
					147
				],
				[
					267,
					34
				],
				[
					174,
					180
				],
				[
					196,
					113
				],
				[
					228,
					68
				],
				[
					202,
					147
				],
				[
					157,
					180
				],
				[
					218,
					68
				],
				[
					163,
					-147
				],
				[
					-103,
					-192
				],
				[
					-283,
					-169
				],
				[
					-120,
					-124
				],
				[
					-206,
					90
				],
				[
					-229,
					-56
				],
				[
					-190,
					-136
				],
				[
					-202,
					-146
				],
				[
					-136,
					-170
				],
				[
					-38,
					-225
				],
				[
					17,
					-215
				],
				[
					130,
					-191
				],
				[
					-190,
					-136
				],
				[
					-261,
					-45
				],
				[
					-153,
					-192
				],
				[
					-163,
					-180
				],
				[
					-174,
					-249
				],
				[
					-44,
					-214
				],
				[
					98,
					-237
				],
				[
					147,
					-181
				],
				[
					229,
					-135
				],
				[
					212,
					-181
				],
				[
					114,
					-225
				],
				[
					60,
					-215
				],
				[
					82,
					-225
				],
				[
					130,
					-192
				],
				[
					82,
					-215
				],
				[
					38,
					-530
				],
				[
					81,
					-214
				],
				[
					22,
					-226
				],
				[
					87,
					-226
				],
				[
					-38,
					-304
				],
				[
					-152,
					-237
				],
				[
					-163,
					-192
				],
				[
					-370,
					-79
				],
				[
					-125,
					-203
				],
				[
					-169,
					-192
				],
				[
					-419,
					-215
				],
				[
					-370,
					-90
				],
				[
					-348,
					-124
				],
				[
					-376,
					-124
				],
				[
					-223,
					-237
				],
				[
					-446,
					-23
				],
				[
					-489,
					23
				],
				[
					-441,
					-45
				],
				[
					-468,
					0
				],
				[
					87,
					-226
				],
				[
					424,
					-101
				],
				[
					311,
					-158
				],
				[
					174,
					-204
				],
				[
					-310,
					-180
				],
				[
					-479,
					56
				],
				[
					-397,
					-146
				],
				[
					-17,
					-237
				],
				[
					-11,
					-226
				],
				[
					327,
					-192
				],
				[
					60,
					-214
				],
				[
					353,
					-215
				],
				[
					588,
					-90
				],
				[
					500,
					-158
				],
				[
					398,
					-180
				],
				[
					506,
					-181
				],
				[
					690,
					-90
				],
				[
					681,
					-158
				],
				[
					473,
					-170
				],
				[
					517,
					-191
				],
				[
					272,
					-271
				],
				[
					136,
					-215
				],
				[
					337,
					204
				],
				[
					457,
					169
				],
				[
					484,
					180
				],
				[
					577,
					147
				],
				[
					495,
					158
				],
				[
					691,
					11
				],
				[
					680,
					-79
				],
				[
					560,
					-135
				],
				[
					180,
					248
				],
				[
					386,
					169
				],
				[
					702,
					12
				],
				[
					550,
					124
				],
				[
					522,
					124
				],
				[
					577,
					79
				],
				[
					614,
					102
				],
				[
					430,
					146
				],
				[
					-196,
					203
				],
				[
					-119,
					203
				],
				[
					0,
					215
				],
				[
					-539,
					-23
				],
				[
					-571,
					-90
				],
				[
					-544,
					0
				],
				[
					-77,
					214
				],
				[
					39,
					429
				],
				[
					125,
					124
				],
				[
					397,
					136
				],
				[
					468,
					135
				],
				[
					337,
					169
				],
				[
					337,
					170
				],
				[
					251,
					225
				],
				[
					380,
					102
				],
				[
					376,
					79
				],
				[
					190,
					45
				],
				[
					430,
					23
				],
				[
					408,
					79
				],
				[
					343,
					112
				],
				[
					337,
					136
				],
				[
					305,
					135
				],
				[
					386,
					181
				],
				[
					245,
					192
				],
				[
					261,
					169
				],
				[
					82,
					226
				],
				[
					-294,
					135
				],
				[
					98,
					237
				],
				[
					185,
					181
				],
				[
					288,
					112
				],
				[
					305,
					136
				],
				[
					283,
					180
				],
				[
					217,
					226
				],
				[
					136,
					271
				],
				[
					202,
					158
				],
				[
					331,
					-34
				],
				[
					136,
					-192
				],
				[
					332,
					-22
				],
				[
					11,
					214
				],
				[
					142,
					226
				],
				[
					299,
					-57
				],
				[
					71,
					-214
				],
				[
					331,
					-34
				],
				[
					360,
					102
				],
				[
					348,
					67
				],
				[
					315,
					-34
				],
				[
					120,
					-237
				],
				[
					305,
					192
				],
				[
					283,
					102
				],
				[
					315,
					79
				],
				[
					310,
					79
				],
				[
					283,
					135
				],
				[
					310,
					91
				],
				[
					240,
					124
				],
				[
					168,
					203
				],
				[
					207,
					-147
				],
				[
					288,
					79
				],
				[
					202,
					-271
				],
				[
					157,
					-203
				],
				[
					316,
					113
				],
				[
					125,
					226
				],
				[
					283,
					158
				],
				[
					365,
					-34
				],
				[
					108,
					-215
				],
				[
					229,
					215
				],
				[
					299,
					68
				],
				[
					326,
					22
				],
				[
					294,
					-11
				],
				[
					310,
					-68
				],
				[
					300,
					-34
				],
				[
					130,
					-192
				],
				[
					180,
					-169
				],
				[
					304,
					102
				],
				[
					327,
					22
				],
				[
					315,
					0
				],
				[
					310,
					12
				],
				[
					278,
					79
				],
				[
					294,
					67
				],
				[
					245,
					158
				],
				[
					261,
					102
				],
				[
					283,
					56
				],
				[
					212,
					158
				],
				[
					152,
					316
				],
				[
					158,
					192
				],
				[
					288,
					-90
				],
				[
					109,
					-203
				],
				[
					239,
					-136
				],
				[
					289,
					45
				],
				[
					196,
					-203
				],
				[
					206,
					-146
				],
				[
					283,
					135
				],
				[
					98,
					248
				],
				[
					250,
					102
				],
				[
					289,
					192
				],
				[
					272,
					79
				],
				[
					326,
					112
				],
				[
					218,
					125
				],
				[
					228,
					135
				],
				[
					218,
					124
				],
				[
					261,
					-68
				],
				[
					250,
					203
				],
				[
					180,
					158
				],
				[
					261,
					-11
				],
				[
					229,
					136
				],
				[
					54,
					203
				],
				[
					234,
					158
				],
				[
					228,
					113
				],
				[
					278,
					90
				],
				[
					256,
					45
				],
				[
					244,
					-34
				],
				[
					262,
					-56
				],
				[
					223,
					-158
				],
				[
					27,
					-249
				],
				[
					245,
					-191
				],
				[
					168,
					-158
				],
				[
					332,
					-68
				],
				[
					185,
					-158
				],
				[
					229,
					-158
				],
				[
					266,
					-34
				],
				[
					223,
					113
				],
				[
					240,
					237
				],
				[
					261,
					-124
				],
				[
					272,
					-68
				],
				[
					261,
					-68
				],
				[
					272,
					-45
				],
				[
					277,
					0
				],
				[
					229,
					-598
				],
				[
					-11,
					-147
				],
				[
					-33,
					-259
				],
				[
					-266,
					-147
				],
				[
					-218,
					-214
				],
				[
					38,
					-226
				],
				[
					310,
					11
				],
				[
					-38,
					-225
				],
				[
					-141,
					-215
				],
				[
					-131,
					-237
				],
				[
					212,
					-180
				],
				[
					321,
					-57
				],
				[
					321,
					102
				],
				[
					153,
					226
				],
				[
					92,
					214
				],
				[
					153,
					181
				],
				[
					174,
					169
				],
				[
					70,
					203
				],
				[
					147,
					282
				],
				[
					174,
					57
				],
				[
					316,
					22
				],
				[
					277,
					68
				],
				[
					283,
					90
				],
				[
					136,
					226
				],
				[
					82,
					214
				],
				[
					190,
					215
				],
				[
					272,
					146
				],
				[
					234,
					113
				],
				[
					153,
					192
				],
				[
					157,
					101
				],
				[
					202,
					91
				],
				[
					277,
					-57
				],
				[
					250,
					57
				],
				[
					272,
					67
				],
				[
					305,
					-33
				],
				[
					201,
					158
				],
				[
					142,
					383
				],
				[
					103,
					-158
				],
				[
					131,
					-271
				],
				[
					234,
					-112
				],
				[
					266,
					-46
				],
				[
					267,
					68
				],
				[
					283,
					-45
				],
				[
					261,
					-11
				],
				[
					174,
					56
				],
				[
					234,
					-34
				],
				[
					212,
					-124
				],
				[
					250,
					79
				],
				[
					300,
					0
				],
				[
					255,
					79
				],
				[
					289,
					-79
				],
				[
					185,
					192
				],
				[
					141,
					192
				],
				[
					191,
					158
				],
				[
					348,
					429
				],
				[
					179,
					-79
				],
				[
					212,
					-158
				],
				[
					185,
					-203
				],
				[
					354,
					-350
				],
				[
					272,
					-12
				],
				[
					256,
					0
				],
				[
					299,
					68
				],
				[
					299,
					79
				],
				[
					229,
					158
				],
				[
					190,
					169
				],
				[
					310,
					23
				],
				[
					207,
					124
				],
				[
					218,
					-113
				],
				[
					141,
					-180
				],
				[
					196,
					-181
				],
				[
					305,
					23
				],
				[
					190,
					-147
				],
				[
					332,
					-147
				],
				[
					348,
					-56
				],
				[
					288,
					45
				],
				[
					218,
					181
				],
				[
					185,
					180
				],
				[
					250,
					45
				],
				[
					251,
					-79
				],
				[
					288,
					-56
				],
				[
					261,
					90
				],
				[
					250,
					0
				],
				[
					245,
					-56
				],
				[
					256,
					-57
				],
				[
					250,
					102
				],
				[
					299,
					90
				],
				[
					283,
					23
				],
				[
					316,
					0
				],
				[
					255,
					56
				],
				[
					251,
					45
				],
				[
					76,
					282
				],
				[
					11,
					237
				],
				[
					174,
					-158
				],
				[
					49,
					-259
				],
				[
					92,
					-237
				],
				[
					115,
					-192
				],
				[
					234,
					-102
				],
				[
					315,
					34
				],
				[
					365,
					12
				],
				[
					250,
					33
				],
				[
					364,
					0
				],
				[
					262,
					12
				],
				[
					364,
					-23
				],
				[
					310,
					-45
				],
				[
					196,
					-181
				],
				[
					-54,
					-214
				],
				[
					179,
					-169
				],
				[
					299,
					-136
				],
				[
					310,
					-146
				],
				[
					360,
					-102
				],
				[
					375,
					-90
				],
				[
					283,
					-90
				],
				[
					315,
					-12
				],
				[
					180,
					192
				],
				[
					245,
					-158
				],
				[
					212,
					-180
				],
				[
					245,
					-136
				],
				[
					337,
					-56
				],
				[
					321,
					-68
				],
				[
					136,
					-226
				],
				[
					316,
					-135
				],
				[
					212,
					-203
				],
				[
					310,
					-90
				],
				[
					321,
					11
				],
				[
					299,
					-34
				],
				[
					332,
					11
				],
				[
					332,
					-45
				],
				[
					310,
					-79
				],
				[
					288,
					-135
				],
				[
					289,
					-113
				],
				[
					195,
					-169
				],
				[
					-32,
					-226
				],
				[
					-147,
					-203
				],
				[
					-125,
					-260
				],
				[
					-98,
					-203
				],
				[
					-131,
					-237
				],
				[
					-364,
					-90
				],
				[
					-163,
					-203
				],
				[
					-360,
					-124
				],
				[
					-125,
					-226
				],
				[
					-190,
					-214
				],
				[
					-201,
					-181
				],
				[
					-115,
					-237
				],
				[
					-70,
					-214
				],
				[
					-28,
					-260
				],
				[
					6,
					-214
				],
				[
					158,
					-226
				],
				[
					60,
					-214
				],
				[
					130,
					-204
				],
				[
					517,
					-78
				],
				[
					109,
					-249
				],
				[
					-501,
					-90
				],
				[
					-424,
					-124
				],
				[
					-528,
					-23
				],
				[
					-234,
					-327
				],
				[
					-49,
					-271
				],
				[
					-119,
					-214
				],
				[
					-147,
					-215
				],
				[
					370,
					-191
				],
				[
					141,
					-237
				],
				[
					239,
					-215
				],
				[
					338,
					-192
				],
				[
					386,
					-180
				],
				[
					419,
					-181
				],
				[
					636,
					-180
				],
				[
					142,
					-282
				],
				[
					800,
					-125
				],
				[
					53,
					-44
				],
				[
					208,
					-170
				],
				[
					767,
					147
				],
				[
					636,
					-181
				],
				[
					-99520,
					-139
				]
			],
			[
				[
					69148,
					23827
				],
				[
					179,
					-181
				],
				[
					263,
					-72
				],
				[
					9,
					-110
				],
				[
					-77,
					-262
				],
				[
					-427,
					-37
				],
				[
					-7,
					306
				],
				[
					41,
					238
				],
				[
					19,
					118
				]
			],
			[
				[
					90387,
					28338
				],
				[
					269,
					-199
				],
				[
					151,
					79
				],
				[
					217,
					111
				],
				[
					166,
					-39
				],
				[
					20,
					-684
				],
				[
					-95,
					-198
				],
				[
					-29,
					-463
				],
				[
					-97,
					157
				],
				[
					-193,
					-401
				],
				[
					-57,
					31
				],
				[
					-171,
					18
				],
				[
					-171,
					493
				],
				[
					-38,
					380
				],
				[
					-160,
					502
				],
				[
					7,
					264
				],
				[
					181,
					-51
				]
			],
			[
				[
					89877,
					43903
				],
				[
					100,
					-452
				],
				[
					179,
					217
				],
				[
					92,
					-243
				],
				[
					133,
					-225
				],
				[
					-29,
					-255
				],
				[
					60,
					-494
				],
				[
					42,
					-288
				],
				[
					70,
					-70
				],
				[
					75,
					-492
				],
				[
					-27,
					-299
				],
				[
					90,
					-390
				],
				[
					301,
					-301
				],
				[
					197,
					-274
				],
				[
					186,
					-251
				],
				[
					-37,
					-139
				],
				[
					159,
					-361
				],
				[
					108,
					-623
				],
				[
					111,
					126
				],
				[
					113,
					-249
				],
				[
					68,
					88
				],
				[
					48,
					-610
				],
				[
					197,
					-354
				],
				[
					129,
					-220
				],
				[
					217,
					-466
				],
				[
					78,
					-463
				],
				[
					7,
					-328
				],
				[
					-19,
					-356
				],
				[
					132,
					-490
				],
				[
					-16,
					-509
				],
				[
					-48,
					-267
				],
				[
					-75,
					-514
				],
				[
					6,
					-330
				],
				[
					-55,
					-413
				],
				[
					-123,
					-524
				],
				[
					-205,
					-283
				],
				[
					-102,
					-446
				],
				[
					-93,
					-284
				],
				[
					-82,
					-497
				],
				[
					-107,
					-287
				],
				[
					-70,
					-431
				],
				[
					-36,
					-397
				],
				[
					14,
					-182
				],
				[
					-159,
					-200
				],
				[
					-311,
					-21
				],
				[
					-257,
					-236
				],
				[
					-127,
					-223
				],
				[
					-168,
					-248
				],
				[
					-230,
					255
				],
				[
					-170,
					101
				],
				[
					43,
					301
				],
				[
					-152,
					-109
				],
				[
					-243,
					-417
				],
				[
					-240,
					156
				],
				[
					-158,
					91
				],
				[
					-159,
					41
				],
				[
					-269,
					167
				],
				[
					-179,
					355
				],
				[
					-52,
					437
				],
				[
					-64,
					291
				],
				[
					-137,
					233
				],
				[
					-267,
					70
				],
				[
					91,
					279
				],
				[
					-67,
					428
				],
				[
					-136,
					-399
				],
				[
					-247,
					-106
				],
				[
					146,
					319
				],
				[
					42,
					332
				],
				[
					107,
					282
				],
				[
					-22,
					427
				],
				[
					-226,
					-491
				],
				[
					-174,
					-197
				],
				[
					-106,
					-458
				],
				[
					-217,
					237
				],
				[
					9,
					305
				],
				[
					-174,
					418
				],
				[
					-147,
					216
				],
				[
					52,
					133
				],
				[
					-356,
					349
				],
				[
					-195,
					16
				],
				[
					-267,
					280
				],
				[
					-498,
					-54
				],
				[
					-359,
					-206
				],
				[
					-317,
					-192
				],
				[
					-265,
					38
				],
				[
					-294,
					-296
				],
				[
					-241,
					-132
				],
				[
					-53,
					-302
				],
				[
					-103,
					-234
				],
				[
					-236,
					-14
				],
				[
					-174,
					-52
				],
				[
					-246,
					105
				],
				[
					-199,
					-62
				],
				[
					-191,
					-27
				],
				[
					-165,
					-307
				],
				[
					-81,
					26
				],
				[
					-140,
					-163
				],
				[
					-133,
					-183
				],
				[
					-203,
					23
				],
				[
					-186,
					0
				],
				[
					-295,
					368
				],
				[
					-149,
					109
				],
				[
					6,
					330
				],
				[
					138,
					79
				],
				[
					47,
					131
				],
				[
					-10,
					207
				],
				[
					34,
					400
				],
				[
					-31,
					341
				],
				[
					-147,
					582
				],
				[
					-45,
					329
				],
				[
					12,
					328
				],
				[
					-111,
					375
				],
				[
					-7,
					169
				],
				[
					-123,
					230
				],
				[
					-35,
					451
				],
				[
					-158,
					456
				],
				[
					-39,
					245
				],
				[
					122,
					-249
				],
				[
					-93,
					535
				],
				[
					137,
					-167
				],
				[
					83,
					-223
				],
				[
					-5,
					294
				],
				[
					-138,
					454
				],
				[
					-26,
					181
				],
				[
					-65,
					173
				],
				[
					31,
					333
				],
				[
					56,
					141
				],
				[
					38,
					289
				],
				[
					-29,
					336
				],
				[
					114,
					415
				],
				[
					21,
					-439
				],
				[
					118,
					396
				],
				[
					225,
					193
				],
				[
					136,
					245
				],
				[
					212,
					212
				],
				[
					126,
					45
				],
				[
					77,
					-71
				],
				[
					219,
					214
				],
				[
					168,
					64
				],
				[
					42,
					126
				],
				[
					74,
					53
				],
				[
					153,
					-14
				],
				[
					292,
					169
				],
				[
					151,
					256
				],
				[
					71,
					307
				],
				[
					163,
					293
				],
				[
					13,
					229
				],
				[
					7,
					314
				],
				[
					194,
					489
				],
				[
					117,
					-497
				],
				[
					119,
					115
				],
				[
					-99,
					272
				],
				[
					87,
					279
				],
				[
					122,
					-125
				],
				[
					34,
					439
				],
				[
					152,
					283
				],
				[
					67,
					227
				],
				[
					140,
					98
				],
				[
					4,
					161
				],
				[
					122,
					-67
				],
				[
					5,
					145
				],
				[
					122,
					82
				],
				[
					134,
					78
				],
				[
					205,
					-264
				],
				[
					155,
					-342
				],
				[
					173,
					-3
				],
				[
					177,
					-54
				],
				[
					-59,
					316
				],
				[
					133,
					462
				],
				[
					126,
					150
				],
				[
					-44,
					144
				],
				[
					121,
					329
				],
				[
					168,
					203
				],
				[
					142,
					-68
				],
				[
					234,
					108
				],
				[
					-5,
					294
				],
				[
					-204,
					190
				],
				[
					148,
					84
				],
				[
					184,
					-143
				],
				[
					148,
					-236
				],
				[
					234,
					-148
				],
				[
					79,
					59
				],
				[
					172,
					-177
				],
				[
					162,
					164
				],
				[
					105,
					-50
				],
				[
					65,
					111
				],
				[
					127,
					-285
				],
				[
					-74,
					-308
				],
				[
					-105,
					-233
				],
				[
					-96,
					-19
				],
				[
					32,
					-230
				],
				[
					-81,
					-288
				],
				[
					-99,
					-283
				],
				[
					20,
					-163
				],
				[
					221,
					-318
				],
				[
					214,
					-184
				],
				[
					143,
					-199
				],
				[
					201,
					-341
				],
				[
					78,
					1
				],
				[
					145,
					-148
				],
				[
					43,
					-178
				],
				[
					265,
					-195
				],
				[
					183,
					197
				],
				[
					55,
					309
				],
				[
					56,
					255
				],
				[
					34,
					316
				],
				[
					85,
					458
				],
				[
					-39,
					279
				],
				[
					20,
					167
				],
				[
					-32,
					330
				],
				[
					37,
					434
				],
				[
					53,
					117
				],
				[
					-43,
					192
				],
				[
					67,
					305
				],
				[
					52,
					317
				],
				[
					7,
					164
				],
				[
					104,
					216
				],
				[
					78,
					-282
				],
				[
					19,
					-361
				],
				[
					70,
					-70
				],
				[
					11,
					-242
				],
				[
					101,
					-293
				],
				[
					21,
					-326
				],
				[
					-10,
					-209
				]
			],
			[
				[
					54716,
					79543
				],
				[
					-21,
					-236
				],
				[
					-156,
					-1
				],
				[
					53,
					-125
				],
				[
					-92,
					-370
				]
			],
			[
				[
					54500,
					78811
				],
				[
					-53,
					-97
				],
				[
					-243,
					-15
				],
				[
					-140,
					-130
				],
				[
					-229,
					44
				]
			],
			[
				[
					53835,
					78613
				],
				[
					-398,
					149
				],
				[
					-62,
					200
				],
				[
					-274,
					-100
				],
				[
					-32,
					-109
				],
				[
					-169,
					81
				]
			],
			[
				[
					52900,
					78834
				],
				[
					-142,
					16
				],
				[
					-125,
					105
				],
				[
					42,
					141
				],
				[
					-10,
					102
				]
			],
			[
				[
					52665,
					79198
				],
				[
					83,
					32
				],
				[
					141,
					-160
				],
				[
					39,
					152
				],
				[
					245,
					-25
				],
				[
					199,
					104
				],
				[
					133,
					-18
				],
				[
					87,
					-118
				],
				[
					26,
					98
				],
				[
					-40,
					375
				],
				[
					100,
					73
				],
				[
					98,
					266
				]
			],
			[
				[
					53776,
					79977
				],
				[
					206,
					-186
				],
				[
					157,
					236
				],
				[
					98,
					43
				],
				[
					215,
					-176
				],
				[
					131,
					30
				],
				[
					128,
					-109
				]
			],
			[
				[
					54711,
					79815
				],
				[
					-23,
					-73
				],
				[
					28,
					-199
				]
			],
			[
				[
					62817,
					74140
				],
				[
					-190,
					76
				],
				[
					-141,
					266
				],
				[
					-44,
					217
				]
			],
			[
				[
					63495,
					75906
				],
				[
					146,
					-303
				],
				[
					141,
					-408
				],
				[
					130,
					-27
				],
				[
					85,
					-156
				],
				[
					-228,
					-46
				],
				[
					-49,
					-447
				],
				[
					-48,
					-202
				],
				[
					-101,
					-135
				],
				[
					7,
					-285
				]
			],
			[
				[
					63578,
					73897
				],
				[
					-69,
					-28
				],
				[
					-173,
					301
				],
				[
					95,
					285
				],
				[
					-82,
					169
				],
				[
					-104,
					-43
				],
				[
					-327,
					-424
				]
			],
			[
				[
					62492,
					75583
				],
				[
					68,
					94
				],
				[
					207,
					-165
				],
				[
					149,
					-34
				],
				[
					38,
					67
				],
				[
					-136,
					312
				],
				[
					72,
					79
				]
			],
			[
				[
					62890,
					75936
				],
				[
					78,
					-19
				],
				[
					191,
					-350
				],
				[
					122,
					-39
				],
				[
					48,
					146
				],
				[
					166,
					232
				]
			],
			[
				[
					58149,
					49238
				],
				[
					-17,
					694
				],
				[
					-70,
					262
				]
			],
			[
				[
					58062,
					50194
				],
				[
					169,
					-45
				],
				[
					85,
					328
				],
				[
					147,
					-38
				]
			],
			[
				[
					58463,
					50439
				],
				[
					16,
					-227
				],
				[
					60,
					-130
				],
				[
					3,
					-187
				],
				[
					-69,
					-121
				],
				[
					-108,
					-300
				],
				[
					-101,
					-209
				],
				[
					-115,
					-27
				]
			],
			[
				[
					50920,
					81398
				],
				[
					204,
					-45
				],
				[
					257,
					120
				],
				[
					176,
					-252
				],
				[
					153,
					-135
				]
			],
			[
				[
					51710,
					81086
				],
				[
					-32,
					-389
				]
			],
			[
				[
					51678,
					80697
				],
				[
					-72,
					-22
				],
				[
					-30,
					-323
				]
			],
			[
				[
					51576,
					80352
				],
				[
					-243,
					263
				],
				[
					-143,
					-45
				],
				[
					-194,
					272
				],
				[
					-129,
					231
				],
				[
					-129,
					9
				],
				[
					-40,
					203
				]
			],
			[
				[
					50698,
					81285
				],
				[
					222,
					113
				]
			],
			[
				[
					50747,
					55434
				],
				[
					-229,
					-68
				]
			],
			[
				[
					50518,
					55366
				],
				[
					-69,
					398
				],
				[
					13,
					1322
				],
				[
					-56,
					119
				],
				[
					-11,
					283
				],
				[
					-96,
					201
				],
				[
					-85,
					170
				],
				[
					35,
					303
				]
			],
			[
				[
					50249,
					58162
				],
				[
					96,
					66
				],
				[
					56,
					251
				],
				[
					136,
					54
				],
				[
					61,
					172
				]
			],
			[
				[
					50598,
					58705
				],
				[
					93,
					169
				],
				[
					100,
					2
				],
				[
					212,
					-332
				]
			],
			[
				[
					51003,
					58544
				],
				[
					-11,
					-191
				],
				[
					62,
					-342
				],
				[
					-54,
					-232
				],
				[
					29,
					-154
				],
				[
					-135,
					-357
				],
				[
					-86,
					-176
				],
				[
					-52,
					-364
				],
				[
					7,
					-366
				],
				[
					-16,
					-928
				]
			],
			[
				[
					49214,
					57382
				],
				[
					-190,
					149
				],
				[
					-130,
					-22
				],
				[
					-97,
					-145
				],
				[
					-125,
					122
				],
				[
					-49,
					190
				],
				[
					-125,
					126
				]
			],
			[
				[
					48498,
					57802
				],
				[
					-18,
					334
				],
				[
					76,
					244
				],
				[
					-7,
					195
				],
				[
					221,
					477
				],
				[
					41,
					395
				],
				[
					76,
					141
				],
				[
					134,
					-78
				],
				[
					116,
					117
				],
				[
					38,
					148
				],
				[
					216,
					259
				],
				[
					53,
					180
				],
				[
					259,
					238
				],
				[
					153,
					82
				],
				[
					70,
					-110
				],
				[
					178,
					3
				]
			],
			[
				[
					50104,
					60427
				],
				[
					-22,
					-280
				],
				[
					37,
					-262
				],
				[
					156,
					-376
				],
				[
					9,
					-279
				],
				[
					320,
					-130
				],
				[
					-6,
					-395
				]
			],
			[
				[
					50249,
					58162
				],
				[
					-243,
					13
				]
			],
			[
				[
					50006,
					58175
				],
				[
					-128,
					46
				],
				[
					-90,
					-93
				],
				[
					-123,
					42
				],
				[
					-482,
					-27
				],
				[
					-7,
					-327
				],
				[
					38,
					-434
				]
			],
			[
				[
					75742,
					64522
				],
				[
					-6,
					-413
				],
				[
					-97,
					88
				],
				[
					18,
					-464
				]
			],
			[
				[
					75657,
					63733
				],
				[
					-79,
					301
				],
				[
					-16,
					293
				],
				[
					-53,
					277
				],
				[
					-116,
					335
				],
				[
					-256,
					23
				],
				[
					25,
					-237
				],
				[
					-87,
					-321
				],
				[
					-118,
					117
				],
				[
					-41,
					-105
				],
				[
					-78,
					63
				],
				[
					-108,
					52
				]
			],
			[
				[
					74730,
					64531
				],
				[
					-43,
					474
				],
				[
					-96,
					433
				],
				[
					47,
					347
				],
				[
					-171,
					154
				],
				[
					62,
					210
				],
				[
					173,
					215
				],
				[
					-200,
					305
				],
				[
					98,
					390
				],
				[
					220,
					-248
				],
				[
					133,
					-29
				],
				[
					24,
					-400
				],
				[
					265,
					-79
				],
				[
					257,
					8
				],
				[
					160,
					-98
				],
				[
					-128,
					-487
				],
				[
					-124,
					-34
				],
				[
					-86,
					-327
				],
				[
					152,
					-299
				],
				[
					46,
					368
				],
				[
					76,
					2
				],
				[
					147,
					-914
				]
			],
			[
				[
					56293,
					77303
				],
				[
					80,
					-236
				],
				[
					108,
					42
				],
				[
					213,
					-90
				],
				[
					408,
					-30
				],
				[
					138,
					147
				],
				[
					327,
					133
				],
				[
					202,
					-209
				],
				[
					163,
					-60
				]
			],
			[
				[
					57932,
					77000
				],
				[
					-144,
					-239
				],
				[
					-101,
					-412
				],
				[
					89,
					-328
				]
			],
			[
				[
					57776,
					76021
				],
				[
					-239,
					77
				],
				[
					-283,
					-181
				]
			],
			[
				[
					57254,
					75917
				],
				[
					-3,
					-287
				],
				[
					-252,
					-55
				],
				[
					-196,
					202
				],
				[
					-222,
					-159
				],
				[
					-206,
					17
				]
			],
			[
				[
					56375,
					75635
				],
				[
					-20,
					381
				],
				[
					-139,
					185
				]
			],
			[
				[
					56216,
					76201
				],
				[
					46,
					81
				],
				[
					-30,
					69
				],
				[
					47,
					183
				],
				[
					105,
					180
				],
				[
					-135,
					248
				],
				[
					-24,
					211
				],
				[
					68,
					130
				]
			],
			[
				[
					28462,
					65512
				],
				[
					-68,
					-29
				],
				[
					-70,
					332
				],
				[
					-104,
					167
				],
				[
					60,
					365
				],
				[
					84,
					-23
				],
				[
					97,
					-478
				],
				[
					1,
					-334
				]
			],
			[
				[
					28383,
					67136
				],
				[
					-303,
					-92
				],
				[
					-19,
					213
				],
				[
					130,
					46
				],
				[
					184,
					-17
				],
				[
					8,
					-150
				]
			],
			[
				[
					28611,
					67142
				],
				[
					-48,
					-409
				],
				[
					-51,
					73
				],
				[
					4,
					301
				],
				[
					-124,
					228
				],
				[
					-1,
					66
				],
				[
					220,
					-259
				]
			],
			[
				[
					55279,
					77663
				],
				[
					100,
					2
				],
				[
					-69,
					-253
				],
				[
					134,
					-222
				],
				[
					-41,
					-271
				],
				[
					-65,
					-25
				]
			],
			[
				[
					55338,
					76894
				],
				[
					-52,
					-53
				],
				[
					-90,
					-134
				],
				[
					-41,
					-316
				]
			],
			[
				[
					55155,
					76391
				],
				[
					-246,
					218
				],
				[
					-105,
					240
				],
				[
					-106,
					128
				],
				[
					-127,
					215
				],
				[
					-61,
					178
				],
				[
					-136,
					270
				],
				[
					59,
					239
				],
				[
					99,
					-133
				],
				[
					60,
					120
				],
				[
					130,
					13
				],
				[
					239,
					-96
				],
				[
					192,
					8
				],
				[
					126,
					-128
				]
			],
			[
				[
					56523,
					82877
				],
				[
					268,
					-4
				],
				[
					302,
					217
				],
				[
					64,
					325
				],
				[
					228,
					184
				],
				[
					-26,
					258
				]
			],
			[
				[
					57359,
					83857
				],
				[
					169,
					97
				],
				[
					298,
					222
				]
			],
			[
				[
					57826,
					84176
				],
				[
					293,
					-144
				],
				[
					39,
					-143
				],
				[
					146,
					68
				],
				[
					272,
					-137
				],
				[
					27,
					-270
				],
				[
					-60,
					-156
				],
				[
					174,
					-377
				],
				[
					113,
					-105
				],
				[
					-16,
					-104
				],
				[
					187,
					-101
				],
				[
					80,
					-154
				],
				[
					-108,
					-126
				],
				[
					-224,
					20
				],
				[
					-54,
					-53
				],
				[
					66,
					-192
				],
				[
					68,
					-368
				]
			],
			[
				[
					58829,
					81834
				],
				[
					-239,
					-34
				],
				[
					-85,
					-127
				],
				[
					-18,
					-290
				],
				[
					-111,
					56
				],
				[
					-250,
					-28
				],
				[
					-73,
					135
				],
				[
					-104,
					-100
				],
				[
					-105,
					83
				],
				[
					-218,
					11
				],
				[
					-310,
					139
				],
				[
					-281,
					45
				],
				[
					-215,
					-13
				],
				[
					-152,
					-156
				],
				[
					-133,
					-23
				]
			],
			[
				[
					56535,
					81532
				],
				[
					-6,
					257
				],
				[
					-85,
					267
				],
				[
					166,
					117
				],
				[
					2,
					230
				],
				[
					-77,
					219
				],
				[
					-12,
					255
				]
			],
			[
				[
					25238,
					62085
				],
				[
					-2,
					85
				],
				[
					33,
					26
				],
				[
					51,
					-68
				],
				[
					99,
					348
				],
				[
					53,
					7
				]
			],
			[
				[
					25472,
					62483
				],
				[
					1,
					-84
				],
				[
					53,
					-3
				],
				[
					-5,
					-157
				],
				[
					-45,
					-249
				],
				[
					24,
					-89
				],
				[
					-29,
					-206
				],
				[
					18,
					-55
				],
				[
					-32,
					-291
				],
				[
					-55,
					-153
				],
				[
					-50,
					-18
				],
				[
					-55,
					-199
				]
			],
			[
				[
					25297,
					60979
				],
				[
					-83,
					-1
				],
				[
					22,
					650
				],
				[
					2,
					457
				]
			],
			[
				[
					31359,
					38736
				],
				[
					-200,
					-79
				],
				[
					-109,
					794
				],
				[
					-150,
					646
				],
				[
					88,
					557
				],
				[
					-146,
					244
				],
				[
					-37,
					416
				],
				[
					-136,
					391
				]
			],
			[
				[
					30669,
					41705
				],
				[
					175,
					622
				],
				[
					-119,
					484
				],
				[
					63,
					194
				],
				[
					-49,
					213
				],
				[
					108,
					288
				],
				[
					6,
					490
				],
				[
					13,
					405
				],
				[
					60,
					195
				],
				[
					-240,
					926
				]
			],
			[
				[
					30686,
					45522
				],
				[
					206,
					-48
				],
				[
					143,
					12
				],
				[
					62,
					174
				],
				[
					243,
					234
				],
				[
					147,
					216
				],
				[
					363,
					98
				],
				[
					-29,
					-432
				],
				[
					34,
					-221
				],
				[
					-23,
					-386
				],
				[
					302,
					-516
				],
				[
					311,
					-95
				],
				[
					109,
					-216
				],
				[
					188,
					-114
				],
				[
					115,
					-167
				],
				[
					175,
					6
				],
				[
					161,
					-171
				],
				[
					12,
					-333
				],
				[
					55,
					-168
				],
				[
					3,
					-248
				],
				[
					-81,
					-10
				],
				[
					107,
					-671
				],
				[
					533,
					-23
				],
				[
					-41,
					-333
				],
				[
					30,
					-227
				],
				[
					151,
					-162
				],
				[
					66,
					-358
				],
				[
					-49,
					-453
				],
				[
					-77,
					-253
				],
				[
					27,
					-328
				],
				[
					-87,
					-119
				]
			],
			[
				[
					33842,
					40210
				],
				[
					-4,
					177
				],
				[
					-259,
					295
				],
				[
					-258,
					8
				],
				[
					-484,
					-167
				],
				[
					-133,
					-507
				],
				[
					-7,
					-310
				],
				[
					-110,
					-689
				]
			],
			[
				[
					34826,
					37007
				],
				[
					54,
					332
				],
				[
					38,
					340
				],
				[
					0,
					317
				],
				[
					-100,
					105
				],
				[
					-104,
					-94
				],
				[
					-103,
					26
				],
				[
					-33,
					222
				],
				[
					-26,
					527
				],
				[
					-52,
					172
				],
				[
					-187,
					156
				],
				[
					-114,
					-113
				],
				[
					-293,
					111
				],
				[
					18,
					782
				],
				[
					-82,
					320
				]
			],
			[
				[
					30686,
					45522
				],
				[
					-157,
					-99
				],
				[
					-126,
					66
				],
				[
					18,
					875
				],
				[
					-228,
					-339
				],
				[
					-245,
					15
				],
				[
					-105,
					307
				],
				[
					-184,
					33
				],
				[
					59,
					247
				],
				[
					-155,
					351
				],
				[
					-115,
					518
				],
				[
					73,
					106
				],
				[
					0,
					243
				],
				[
					168,
					166
				],
				[
					-28,
					312
				],
				[
					71,
					200
				],
				[
					20,
					269
				],
				[
					318,
					392
				],
				[
					227,
					111
				],
				[
					37,
					86
				],
				[
					251,
					-27
				]
			],
			[
				[
					30585,
					49354
				],
				[
					125,
					1579
				],
				[
					6,
					250
				],
				[
					-43,
					330
				],
				[
					-123,
					210
				],
				[
					1,
					418
				],
				[
					156,
					95
				],
				[
					56,
					-60
				],
				[
					9,
					221
				],
				[
					-162,
					60
				],
				[
					-4,
					360
				],
				[
					541,
					-13
				],
				[
					92,
					198
				],
				[
					77,
					-182
				],
				[
					55,
					-340
				],
				[
					52,
					71
				]
			],
			[
				[
					31423,
					52551
				],
				[
					153,
					-304
				],
				[
					216,
					37
				],
				[
					54,
					176
				],
				[
					206,
					135
				],
				[
					115,
					94
				],
				[
					32,
					244
				],
				[
					198,
					164
				],
				[
					-15,
					121
				],
				[
					-235,
					49
				],
				[
					-39,
					363
				],
				[
					12,
					386
				],
				[
					-125,
					149
				],
				[
					52,
					53
				],
				[
					206,
					-73
				],
				[
					221,
					-144
				],
				[
					80,
					136
				],
				[
					200,
					89
				],
				[
					310,
					216
				],
				[
					102,
					220
				],
				[
					-37,
					162
				]
			],
			[
				[
					33129,
					54824
				],
				[
					145,
					26
				],
				[
					64,
					-133
				],
				[
					-36,
					-253
				],
				[
					96,
					-87
				],
				[
					63,
					-268
				],
				[
					-77,
					-203
				],
				[
					-44,
					-490
				],
				[
					71,
					-291
				],
				[
					20,
					-267
				],
				[
					171,
					-270
				],
				[
					137,
					-28
				],
				[
					30,
					112
				],
				[
					88,
					25
				],
				[
					126,
					101
				],
				[
					90,
					153
				],
				[
					154,
					-48
				],
				[
					67,
					20
				]
			],
			[
				[
					34294,
					52923
				],
				[
					151,
					-47
				],
				[
					25,
					118
				],
				[
					-46,
					114
				],
				[
					28,
					167
				],
				[
					112,
					-51
				],
				[
					131,
					59
				],
				[
					159,
					-122
				]
			],
			[
				[
					34854,
					53161
				],
				[
					121,
					-119
				],
				[
					86,
					156
				],
				[
					62,
					-24
				],
				[
					38,
					-162
				],
				[
					133,
					41
				],
				[
					107,
					219
				],
				[
					85,
					424
				],
				[
					164,
					527
				]
			],
			[
				[
					35650,
					54223
				],
				[
					95,
					27
				],
				[
					69,
					-318
				],
				[
					155,
					-1008
				],
				[
					149,
					-95
				],
				[
					7,
					-397
				],
				[
					-208,
					-474
				],
				[
					86,
					-174
				],
				[
					491,
					-90
				],
				[
					10,
					-578
				],
				[
					211,
					378
				],
				[
					349,
					-207
				],
				[
					462,
					-351
				],
				[
					135,
					-338
				],
				[
					-45,
					-319
				],
				[
					323,
					178
				],
				[
					540,
					-305
				],
				[
					415,
					23
				],
				[
					411,
					-477
				],
				[
					355,
					-645
				],
				[
					214,
					-166
				],
				[
					237,
					-23
				],
				[
					101,
					-182
				],
				[
					94,
					-733
				],
				[
					46,
					-348
				],
				[
					-110,
					-953
				],
				[
					-142,
					-376
				],
				[
					-391,
					-801
				],
				[
					-177,
					-651
				],
				[
					-206,
					-499
				],
				[
					-69,
					-11
				],
				[
					-78,
					-424
				],
				[
					20,
					-1079
				],
				[
					-77,
					-888
				],
				[
					-30,
					-379
				],
				[
					-88,
					-228
				],
				[
					-49,
					-769
				],
				[
					-282,
					-752
				],
				[
					-47,
					-595
				],
				[
					-225,
					-250
				],
				[
					-65,
					-345
				],
				[
					-302,
					2
				],
				[
					-437,
					-222
				],
				[
					-195,
					-256
				],
				[
					-311,
					-168
				],
				[
					-327,
					-459
				],
				[
					-235,
					-571
				],
				[
					-41,
					-430
				],
				[
					46,
					-318
				],
				[
					-51,
					-582
				],
				[
					-63,
					-281
				],
				[
					-195,
					-317
				],
				[
					-308,
					-1013
				],
				[
					-244,
					-457
				],
				[
					-189,
					-269
				],
				[
					-127,
					-548
				],
				[
					-183,
					-329
				]
			],
			[
				[
					35174,
					32383
				],
				[
					-77,
					326
				],
				[
					122,
					273
				],
				[
					-160,
					392
				],
				[
					-218,
					318
				],
				[
					-286,
					369
				],
				[
					-103,
					-17
				],
				[
					-279,
					446
				],
				[
					-180,
					-62
				]
			],
			[
				[
					81723,
					54436
				],
				[
					110,
					215
				],
				[
					236,
					316
				]
			],
			[
				[
					82069,
					54967
				],
				[
					-13,
					-284
				],
				[
					-16,
					-368
				],
				[
					-133,
					18
				],
				[
					-58,
					-196
				],
				[
					-126,
					299
				]
			],
			[
				[
					75471,
					67823
				],
				[
					113,
					-184
				],
				[
					-20,
					-354
				],
				[
					-227,
					-17
				],
				[
					-234,
					39
				],
				[
					-175,
					-90
				],
				[
					-252,
					218
				],
				[
					-6,
					115
				]
			],
			[
				[
					74670,
					67550
				],
				[
					184,
					429
				],
				[
					150,
					146
				],
				[
					198,
					-134
				],
				[
					147,
					-14
				],
				[
					122,
					-154
				]
			],
			[
				[
					58175,
					39107
				],
				[
					-393,
					-424
				],
				[
					-249,
					-430
				],
				[
					-93,
					-383
				],
				[
					-83,
					-217
				],
				[
					-152,
					-46
				],
				[
					-48,
					-275
				],
				[
					-28,
					-180
				],
				[
					-178,
					-134
				],
				[
					-226,
					28
				],
				[
					-133,
					162
				],
				[
					-117,
					70
				],
				[
					-135,
					-134
				],
				[
					-68,
					-276
				],
				[
					-132,
					-173
				],
				[
					-139,
					-257
				],
				[
					-199,
					-59
				],
				[
					-62,
					202
				],
				[
					26,
					351
				],
				[
					-165,
					548
				],
				[
					-75,
					86
				]
			],
			[
				[
					55526,
					37566
				],
				[
					0,
					1681
				],
				[
					274,
					20
				],
				[
					8,
					2051
				],
				[
					207,
					19
				],
				[
					428,
					202
				],
				[
					106,
					-238
				],
				[
					177,
					226
				],
				[
					85,
					1
				],
				[
					156,
					130
				]
			],
			[
				[
					56967,
					41658
				],
				[
					50,
					-43
				]
			],
			[
				[
					57017,
					41615
				],
				[
					107,
					-460
				],
				[
					56,
					-103
				],
				[
					87,
					-333
				],
				[
					315,
					-633
				],
				[
					119,
					-62
				],
				[
					0,
					-203
				],
				[
					82,
					-365
				],
				[
					215,
					-88
				],
				[
					177,
					-261
				]
			],
			[
				[
					54244,
					56103
				],
				[
					229,
					44
				],
				[
					52,
					148
				],
				[
					46,
					-11
				],
				[
					69,
					-131
				],
				[
					350,
					221
				],
				[
					118,
					224
				],
				[
					145,
					202
				],
				[
					-28,
					202
				],
				[
					78,
					53
				],
				[
					269,
					-35
				],
				[
					261,
					266
				],
				[
					201,
					629
				],
				[
					141,
					233
				],
				[
					176,
					98
				]
			],
			[
				[
					56351,
					58246
				],
				[
					31,
					-246
				],
				[
					160,
					-360
				],
				[
					1,
					-235
				],
				[
					-45,
					-240
				],
				[
					18,
					-179
				],
				[
					96,
					-166
				]
			],
			[
				[
					56612,
					56820
				],
				[
					212,
					-252
				]
			],
			[
				[
					56824,
					56568
				],
				[
					152,
					-232
				],
				[
					2,
					-188
				],
				[
					187,
					-299
				],
				[
					116,
					-250
				],
				[
					70,
					-345
				],
				[
					208,
					-228
				],
				[
					44,
					-183
				]
			],
			[
				[
					57603,
					54843
				],
				[
					-91,
					-61
				],
				[
					-178,
					14
				],
				[
					-209,
					60
				],
				[
					-104,
					-49
				],
				[
					-41,
					-140
				],
				[
					-90,
					-17
				],
				[
					-110,
					121
				],
				[
					-309,
					-287
				],
				[
					-127,
					58
				],
				[
					-38,
					-45
				],
				[
					-83,
					-347
				],
				[
					-207,
					112
				],
				[
					-203,
					57
				],
				[
					-177,
					212
				],
				[
					-229,
					196
				],
				[
					-149,
					-186
				],
				[
					-108,
					-292
				],
				[
					-25,
					-402
				]
			],
			[
				[
					55125,
					53847
				],
				[
					-178,
					33
				],
				[
					-188,
					96
				],
				[
					-166,
					-305
				],
				[
					-146,
					-536
				]
			],
			[
				[
					54447,
					53135
				],
				[
					-29,
					167
				],
				[
					-12,
					263
				],
				[
					-127,
					185
				],
				[
					-103,
					297
				],
				[
					-23,
					207
				],
				[
					-132,
					301
				],
				[
					23,
					171
				],
				[
					-28,
					243
				],
				[
					21,
					446
				],
				[
					67,
					105
				],
				[
					140,
					583
				]
			],
			[
				[
					32315,
					78637
				],
				[
					202,
					-78
				],
				[
					257,
					16
				],
				[
					-137,
					-236
				],
				[
					-102,
					-37
				],
				[
					-353,
					244
				],
				[
					-69,
					193
				],
				[
					105,
					177
				],
				[
					97,
					-279
				]
			],
			[
				[
					32831,
					80108
				],
				[
					-135,
					-10
				],
				[
					-360,
					180
				],
				[
					-258,
					272
				],
				[
					96,
					49
				],
				[
					365,
					-145
				],
				[
					284,
					-240
				],
				[
					8,
					-106
				]
			],
			[
				[
					15692,
					79765
				],
				[
					-140,
					-80
				],
				[
					-456,
					262
				],
				[
					-84,
					204
				],
				[
					-248,
					202
				],
				[
					-50,
					164
				],
				[
					-286,
					103
				],
				[
					-107,
					314
				],
				[
					24,
					133
				],
				[
					291,
					-125
				],
				[
					171,
					-88
				],
				[
					261,
					-61
				],
				[
					94,
					-198
				],
				[
					138,
					-274
				],
				[
					277,
					-238
				],
				[
					115,
					-318
				]
			],
			[
				[
					34407,
					81019
				],
				[
					-184,
					-504
				],
				[
					181,
					195
				],
				[
					187,
					-124
				],
				[
					-98,
					-200
				],
				[
					247,
					-158
				],
				[
					128,
					140
				],
				[
					277,
					-177
				],
				[
					-86,
					-422
				],
				[
					194,
					99
				],
				[
					36,
					-306
				],
				[
					86,
					-358
				],
				[
					-117,
					-507
				],
				[
					-125,
					-21
				],
				[
					-183,
					109
				],
				[
					60,
					471
				],
				[
					-77,
					73
				],
				[
					-322,
					-499
				],
				[
					-166,
					20
				],
				[
					196,
					270
				],
				[
					-267,
					140
				],
				[
					-298,
					-34
				],
				[
					-539,
					17
				],
				[
					-43,
					171
				],
				[
					173,
					202
				],
				[
					-121,
					157
				],
				[
					234,
					347
				],
				[
					287,
					917
				],
				[
					172,
					328
				],
				[
					241,
					198
				],
				[
					129,
					-25
				],
				[
					-54,
					-156
				],
				[
					-148,
					-363
				]
			],
			[
				[
					13005,
					83025
				],
				[
					131,
					-75
				],
				[
					267,
					46
				],
				[
					-84,
					-654
				],
				[
					242,
					-463
				],
				[
					-111,
					1
				],
				[
					-167,
					264
				],
				[
					-103,
					265
				],
				[
					-140,
					179
				],
				[
					-51,
					253
				],
				[
					16,
					184
				]
			],
			[
				[
					27981,
					87625
				],
				[
					-108,
					-302
				],
				[
					-123,
					49
				],
				[
					-73,
					171
				],
				[
					13,
					40
				],
				[
					107,
					173
				],
				[
					114,
					-13
				],
				[
					70,
					-118
				]
			],
			[
				[
					27250,
					87943
				],
				[
					-325,
					-317
				],
				[
					-196,
					13
				],
				[
					-61,
					156
				],
				[
					207,
					265
				],
				[
					381,
					-5
				],
				[
					-6,
					-112
				]
			],
			[
				[
					26344,
					89640
				],
				[
					51,
					-253
				],
				[
					143,
					89
				],
				[
					161,
					-151
				],
				[
					304,
					-198
				],
				[
					318,
					-179
				],
				[
					25,
					-274
				],
				[
					204,
					45
				],
				[
					199,
					-191
				],
				[
					-247,
					-181
				],
				[
					-432,
					138
				],
				[
					-156,
					259
				],
				[
					-275,
					-306
				],
				[
					-396,
					-298
				],
				[
					-95,
					337
				],
				[
					-377,
					-55
				],
				[
					242,
					284
				],
				[
					35,
					454
				],
				[
					95,
					527
				],
				[
					201,
					-47
				]
			],
			[
				[
					28926,
					90499
				],
				[
					-312,
					-29
				],
				[
					-69,
					282
				],
				[
					118,
					323
				],
				[
					255,
					80
				],
				[
					217,
					-160
				],
				[
					3,
					-246
				],
				[
					-32,
					-80
				],
				[
					-180,
					-170
				]
			],
			[
				[
					23431,
					91627
				],
				[
					-173,
					-202
				],
				[
					-374,
					175
				],
				[
					-226,
					-63
				],
				[
					-380,
					259
				],
				[
					245,
					178
				],
				[
					194,
					250
				],
				[
					295,
					-164
				],
				[
					166,
					-103
				],
				[
					84,
					-110
				],
				[
					169,
					-220
				]
			],
			[
				[
					31350,
					77823
				],
				[
					-181,
					326
				],
				[
					0,
					785
				],
				[
					-123,
					166
				],
				[
					-187,
					-98
				],
				[
					-92,
					152
				],
				[
					-212,
					-435
				],
				[
					-84,
					-448
				],
				[
					-99,
					-262
				],
				[
					-118,
					-89
				],
				[
					-89,
					-29
				],
				[
					-28,
					-142
				],
				[
					-512,
					-1
				],
				[
					-422,
					-4
				],
				[
					-125,
					-106
				],
				[
					-294,
					-414
				],
				[
					-34,
					-45
				],
				[
					-89,
					-225
				],
				[
					-255,
					0
				],
				[
					-273,
					-2
				],
				[
					-125,
					-91
				],
				[
					44,
					-113
				],
				[
					25,
					-176
				],
				[
					-5,
					-58
				],
				[
					-363,
					-287
				],
				[
					-286,
					-90
				],
				[
					-323,
					-308
				],
				[
					-70,
					0
				],
				[
					-94,
					91
				],
				[
					-31,
					82
				],
				[
					6,
					60
				],
				[
					61,
					202
				],
				[
					131,
					317
				],
				[
					81,
					340
				],
				[
					-56,
					500
				],
				[
					-59,
					523
				],
				[
					-290,
					270
				],
				[
					35,
					103
				],
				[
					-41,
					70
				],
				[
					-76,
					0
				],
				[
					-56,
					91
				],
				[
					-14,
					137
				],
				[
					-54,
					-60
				],
				[
					-75,
					18
				],
				[
					17,
					57
				],
				[
					-65,
					57
				],
				[
					-27,
					151
				],
				[
					-216,
					185
				],
				[
					-224,
					191
				],
				[
					-272,
					223
				],
				[
					-261,
					209
				],
				[
					-248,
					-163
				],
				[
					-91,
					-6
				],
				[
					-342,
					150
				],
				[
					-225,
					-75
				],
				[
					-269,
					179
				],
				[
					-284,
					91
				],
				[
					-194,
					36
				],
				[
					-86,
					97
				],
				[
					-49,
					317
				],
				[
					-94,
					-3
				],
				[
					-1,
					-221
				],
				[
					-575,
					0
				],
				[
					-951,
					0
				],
				[
					-944,
					-1
				],
				[
					-833,
					1
				],
				[
					-834,
					0
				],
				[
					-819,
					0
				],
				[
					-847,
					0
				],
				[
					-273,
					0
				],
				[
					-825,
					0
				],
				[
					-788,
					0
				]
			],
			[
				[
					15878,
					80048
				],
				[
					-38,
					1
				],
				[
					-537,
					566
				],
				[
					-199,
					248
				],
				[
					-503,
					239
				],
				[
					-155,
					510
				],
				[
					40,
					353
				],
				[
					-356,
					245
				],
				[
					-48,
					464
				],
				[
					-336,
					419
				],
				[
					-6,
					296
				]
			],
			[
				[
					13740,
					83389
				],
				[
					154,
					278
				],
				[
					-7,
					363
				],
				[
					-473,
					367
				],
				[
					-284,
					657
				],
				[
					-173,
					413
				],
				[
					-255,
					259
				],
				[
					-187,
					236
				],
				[
					-147,
					298
				],
				[
					-279,
					-187
				],
				[
					-270,
					-321
				],
				[
					-247,
					378
				],
				[
					-194,
					252
				],
				[
					-271,
					160
				],
				[
					-273,
					17
				],
				[
					1,
					3279
				],
				[
					2,
					2137
				]
			],
			[
				[
					10837,
					91975
				],
				[
					518,
					-139
				],
				[
					438,
					-277
				],
				[
					289,
					-53
				],
				[
					244,
					241
				],
				[
					336,
					179
				],
				[
					413,
					-70
				],
				[
					416,
					253
				],
				[
					455,
					144
				],
				[
					191,
					-239
				],
				[
					207,
					134
				],
				[
					62,
					272
				],
				[
					192,
					-62
				],
				[
					470,
					-516
				],
				[
					369,
					390
				],
				[
					38,
					-437
				],
				[
					341,
					95
				],
				[
					105,
					168
				],
				[
					337,
					-33
				],
				[
					424,
					-242
				],
				[
					650,
					-211
				],
				[
					383,
					-98
				],
				[
					272,
					37
				],
				[
					374,
					-292
				],
				[
					-390,
					-286
				],
				[
					502,
					-123
				],
				[
					750,
					68
				],
				[
					236,
					100
				],
				[
					296,
					-345
				],
				[
					302,
					291
				],
				[
					-283,
					245
				],
				[
					179,
					197
				],
				[
					338,
					26
				],
				[
					223,
					58
				],
				[
					224,
					-138
				],
				[
					279,
					-312
				],
				[
					310,
					46
				],
				[
					491,
					-260
				],
				[
					431,
					91
				],
				[
					405,
					-13
				],
				[
					-32,
					358
				],
				[
					247,
					100
				],
				[
					431,
					-195
				],
				[
					-2,
					-545
				],
				[
					177,
					459
				],
				[
					223,
					-15
				],
				[
					126,
					579
				],
				[
					-298,
					355
				],
				[
					-324,
					233
				],
				[
					22,
					636
				],
				[
					329,
					418
				],
				[
					366,
					-92
				],
				[
					281,
					-255
				],
				[
					378,
					-649
				],
				[
					-247,
					-283
				],
				[
					517,
					-116
				],
				[
					-1,
					-589
				],
				[
					371,
					451
				],
				[
					332,
					-371
				],
				[
					-83,
					-427
				],
				[
					269,
					-388
				],
				[
					290,
					416
				],
				[
					202,
					497
				],
				[
					16,
					632
				],
				[
					394,
					-44
				],
				[
					411,
					-85
				],
				[
					373,
					-286
				],
				[
					17,
					-285
				],
				[
					-207,
					-307
				],
				[
					196,
					-309
				],
				[
					-36,
					-280
				],
				[
					-544,
					-403
				],
				[
					-386,
					-88
				],
				[
					-287,
					173
				],
				[
					-83,
					-289
				],
				[
					-268,
					-486
				],
				[
					-81,
					-252
				],
				[
					-322,
					-389
				],
				[
					-397,
					-38
				],
				[
					-220,
					-244
				],
				[
					-18,
					-374
				],
				[
					-323,
					-72
				],
				[
					-340,
					-467
				],
				[
					-301,
					-648
				],
				[
					-108,
					-454
				],
				[
					-16,
					-669
				],
				[
					409,
					-96
				],
				[
					125,
					-539
				],
				[
					130,
					-437
				],
				[
					388,
					114
				],
				[
					517,
					-250
				],
				[
					277,
					-219
				],
				[
					199,
					-272
				],
				[
					348,
					-158
				],
				[
					294,
					-243
				],
				[
					459,
					-33
				],
				[
					302,
					-56
				],
				[
					-45,
					-499
				],
				[
					86,
					-578
				],
				[
					201,
					-645
				],
				[
					414,
					-547
				],
				[
					214,
					188
				],
				[
					150,
					592
				],
				[
					-145,
					909
				],
				[
					-196,
					303
				],
				[
					445,
					270
				],
				[
					314,
					404
				],
				[
					154,
					401
				],
				[
					-23,
					385
				],
				[
					-188,
					489
				],
				[
					-338,
					434
				],
				[
					328,
					603
				],
				[
					-121,
					522
				],
				[
					-93,
					899
				],
				[
					194,
					133
				],
				[
					476,
					-157
				],
				[
					286,
					-56
				],
				[
					230,
					152
				],
				[
					258,
					-196
				],
				[
					342,
					-333
				],
				[
					85,
					-224
				],
				[
					495,
					-44
				],
				[
					-8,
					-483
				],
				[
					92,
					-728
				],
				[
					254,
					-90
				],
				[
					201,
					-339
				],
				[
					402,
					319
				],
				[
					266,
					636
				],
				[
					184,
					267
				],
				[
					216,
					-514
				],
				[
					362,
					-734
				],
				[
					307,
					-691
				],
				[
					-112,
					-362
				],
				[
					370,
					-325
				],
				[
					250,
					-329
				],
				[
					442,
					-149
				],
				[
					179,
					-183
				],
				[
					110,
					-488
				],
				[
					216,
					-76
				],
				[
					112,
					-217
				],
				[
					20,
					-647
				],
				[
					-202,
					-217
				],
				[
					-199,
					-202
				],
				[
					-458,
					-205
				],
				[
					-349,
					-473
				],
				[
					-470,
					-93
				],
				[
					-594,
					121
				],
				[
					-417,
					4
				],
				[
					-287,
					-40
				],
				[
					-233,
					-413
				],
				[
					-354,
					-255
				],
				[
					-401,
					-762
				],
				[
					-320,
					-532
				],
				[
					236,
					95
				],
				[
					446,
					756
				],
				[
					583,
					480
				],
				[
					415,
					58
				],
				[
					246,
					-283
				],
				[
					-262,
					-387
				],
				[
					88,
					-620
				],
				[
					91,
					-435
				],
				[
					361,
					-287
				],
				[
					459,
					83
				],
				[
					278,
					647
				],
				[
					19,
					-417
				],
				[
					180,
					-209
				],
				[
					-344,
					-377
				],
				[
					-615,
					-343
				],
				[
					-276,
					-233
				],
				[
					-310,
					-415
				],
				[
					-211,
					43
				],
				[
					-11,
					487
				],
				[
					483,
					476
				],
				[
					-445,
					-19
				],
				[
					-309,
					-70
				]
			],
			[
				[
					18287,
					93939
				],
				[
					-139,
					-270
				],
				[
					618,
					174
				],
				[
					386,
					-291
				],
				[
					314,
					294
				],
				[
					254,
					-188
				],
				[
					227,
					-566
				],
				[
					140,
					238
				],
				[
					-197,
					590
				],
				[
					244,
					85
				],
				[
					276,
					-93
				],
				[
					311,
					-232
				],
				[
					175,
					-561
				],
				[
					86,
					-406
				],
				[
					466,
					-285
				],
				[
					502,
					-273
				],
				[
					-31,
					-253
				],
				[
					-456,
					-47
				],
				[
					178,
					-221
				],
				[
					-94,
					-211
				],
				[
					-503,
					90
				],
				[
					-478,
					156
				],
				[
					-322,
					-35
				],
				[
					-522,
					-196
				],
				[
					-704,
					-86
				],
				[
					-494,
					-54
				],
				[
					-151,
					271
				],
				[
					-379,
					157
				],
				[
					-246,
					-64
				],
				[
					-343,
					456
				],
				[
					185,
					61
				],
				[
					429,
					99
				],
				[
					392,
					-26
				],
				[
					362,
					100
				],
				[
					-537,
					135
				],
				[
					-594,
					-46
				],
				[
					-394,
					11
				],
				[
					-146,
					213
				],
				[
					644,
					230
				],
				[
					-428,
					-8
				],
				[
					-485,
					152
				],
				[
					233,
					431
				],
				[
					193,
					229
				],
				[
					744,
					351
				],
				[
					284,
					-111
				]
			],
			[
				[
					20972,
					94111
				],
				[
					-244,
					-381
				],
				[
					-434,
					404
				],
				[
					95,
					80
				],
				[
					372,
					23
				],
				[
					211,
					-126
				]
			],
			[
				[
					28794,
					93928
				],
				[
					25,
					-159
				],
				[
					-296,
					16
				],
				[
					-299,
					13
				],
				[
					-304,
					-78
				],
				[
					-80,
					35
				],
				[
					-306,
					306
				],
				[
					12,
					207
				],
				[
					133,
					38
				],
				[
					636,
					-62
				],
				[
					479,
					-316
				]
			],
			[
				[
					25955,
					93959
				],
				[
					219,
					-359
				],
				[
					256,
					465
				],
				[
					704,
					236
				],
				[
					477,
					-596
				],
				[
					-42,
					-377
				],
				[
					550,
					168
				],
				[
					263,
					228
				],
				[
					616,
					-291
				],
				[
					383,
					-274
				],
				[
					36,
					-252
				],
				[
					515,
					131
				],
				[
					290,
					-367
				],
				[
					670,
					-228
				],
				[
					242,
					-232
				],
				[
					263,
					-539
				],
				[
					-510,
					-268
				],
				[
					654,
					-376
				],
				[
					441,
					-127
				],
				[
					400,
					-529
				],
				[
					437,
					-38
				],
				[
					-87,
					-404
				],
				[
					-487,
					-669
				],
				[
					-342,
					246
				],
				[
					-437,
					554
				],
				[
					-359,
					-72
				],
				[
					-35,
					-330
				],
				[
					292,
					-335
				],
				[
					377,
					-265
				],
				[
					114,
					-153
				],
				[
					181,
					-570
				],
				[
					-96,
					-414
				],
				[
					-350,
					156
				],
				[
					-697,
					461
				],
				[
					393,
					-496
				],
				[
					289,
					-348
				],
				[
					45,
					-201
				],
				[
					-753,
					230
				],
				[
					-596,
					334
				],
				[
					-337,
					281
				],
				[
					97,
					162
				],
				[
					-414,
					296
				],
				[
					-405,
					280
				],
				[
					5,
					-167
				],
				[
					-803,
					-92
				],
				[
					-235,
					198
				],
				[
					183,
					424
				],
				[
					522,
					10
				],
				[
					571,
					74
				],
				[
					-92,
					205
				],
				[
					96,
					287
				],
				[
					360,
					561
				],
				[
					-77,
					255
				],
				[
					-107,
					197
				],
				[
					-425,
					280
				],
				[
					-563,
					196
				],
				[
					178,
					145
				],
				[
					-294,
					358
				],
				[
					-245,
					33
				],
				[
					-219,
					196
				],
				[
					-149,
					-170
				],
				[
					-503,
					-74
				],
				[
					-1011,
					129
				],
				[
					-588,
					169
				],
				[
					-450,
					87
				],
				[
					-231,
					202
				],
				[
					290,
					263
				],
				[
					-394,
					2
				],
				[
					-88,
					583
				],
				[
					213,
					515
				],
				[
					286,
					235
				],
				[
					717,
					154
				],
				[
					-204,
					-373
				]
			],
			[
				[
					22123,
					94355
				],
				[
					331,
					-122
				],
				[
					496,
					73
				],
				[
					72,
					-167
				],
				[
					-259,
					-276
				],
				[
					420,
					-248
				],
				[
					-50,
					-518
				],
				[
					-455,
					-223
				],
				[
					-268,
					48
				],
				[
					-192,
					220
				],
				[
					-690,
					444
				],
				[
					5,
					185
				],
				[
					567,
					-72
				],
				[
					-306,
					377
				],
				[
					329,
					279
				]
			],
			[
				[
					24112,
					93737
				],
				[
					-298,
					-430
				],
				[
					-317,
					21
				],
				[
					-173,
					506
				],
				[
					4,
					287
				],
				[
					145,
					244
				],
				[
					276,
					157
				],
				[
					579,
					-20
				],
				[
					530,
					-140
				],
				[
					-415,
					-513
				],
				[
					-331,
					-112
				]
			],
			[
				[
					16539,
					92938
				],
				[
					-731,
					-278
				],
				[
					-147,
					253
				],
				[
					-641,
					304
				],
				[
					119,
					244
				],
				[
					192,
					421
				],
				[
					241,
					378
				],
				[
					-272,
					353
				],
				[
					939,
					90
				],
				[
					397,
					-119
				],
				[
					709,
					-32
				],
				[
					270,
					-167
				],
				[
					298,
					-243
				],
				[
					-349,
					-145
				],
				[
					-681,
					-405
				],
				[
					-344,
					-403
				],
				[
					0,
					-251
				]
			],
			[
				[
					23996,
					95009
				],
				[
					-151,
					-223
				],
				[
					-403,
					43
				],
				[
					-337,
					150
				],
				[
					148,
					259
				],
				[
					399,
					155
				],
				[
					243,
					-202
				],
				[
					101,
					-182
				]
			],
			[
				[
					22639,
					96011
				],
				[
					212,
					-267
				],
				[
					9,
					-295
				],
				[
					-127,
					-429
				],
				[
					-458,
					-59
				],
				[
					-298,
					92
				],
				[
					5,
					336
				],
				[
					-455,
					-44
				],
				[
					-18,
					445
				],
				[
					299,
					-18
				],
				[
					419,
					197
				],
				[
					390,
					-34
				],
				[
					22,
					76
				]
			],
			[
				[
					19941,
					95712
				],
				[
					109,
					-205
				],
				[
					247,
					97
				],
				[
					291,
					-25
				],
				[
					49,
					-282
				],
				[
					-169,
					-274
				],
				[
					-940,
					-89
				],
				[
					-701,
					-249
				],
				[
					-423,
					-13
				],
				[
					-35,
					187
				],
				[
					577,
					255
				],
				[
					-1255,
					-69
				],
				[
					-389,
					103
				],
				[
					379,
					563
				],
				[
					262,
					161
				],
				[
					782,
					-194
				],
				[
					493,
					-341
				],
				[
					485,
					-44
				],
				[
					-397,
					551
				],
				[
					255,
					210
				],
				[
					286,
					-67
				],
				[
					94,
					-275
				]
			],
			[
				[
					23699,
					96229
				],
				[
					308,
					-186
				],
				[
					547,
					2
				],
				[
					240,
					-190
				],
				[
					-64,
					-216
				],
				[
					319,
					-130
				],
				[
					177,
					-137
				],
				[
					374,
					-26
				],
				[
					406,
					-48
				],
				[
					441,
					125
				],
				[
					566,
					49
				],
				[
					451,
					-40
				],
				[
					298,
					-218
				],
				[
					62,
					-238
				],
				[
					-174,
					-153
				],
				[
					-414,
					-124
				],
				[
					-355,
					70
				],
				[
					-797,
					-88
				],
				[
					-570,
					-11
				],
				[
					-449,
					71
				],
				[
					-738,
					186
				],
				[
					-96,
					316
				],
				[
					-34,
					286
				],
				[
					-279,
					251
				],
				[
					-574,
					70
				],
				[
					-322,
					179
				],
				[
					104,
					236
				],
				[
					573,
					-36
				]
			],
			[
				[
					17722,
					96544
				],
				[
					-38,
					-443
				],
				[
					-214,
					-199
				],
				[
					-259,
					-29
				],
				[
					-517,
					-246
				],
				[
					-444,
					-88
				],
				[
					-377,
					124
				],
				[
					472,
					431
				],
				[
					570,
					373
				],
				[
					426,
					-8
				],
				[
					381,
					85
				]
			],
			[
				[
					23933,
					96472
				],
				[
					-126,
					-17
				],
				[
					-521,
					37
				],
				[
					-74,
					161
				],
				[
					559,
					-9
				],
				[
					195,
					-107
				],
				[
					-33,
					-65
				]
			],
			[
				[
					19392,
					96574
				],
				[
					-518,
					-166
				],
				[
					-411,
					186
				],
				[
					224,
					183
				],
				[
					406,
					59
				],
				[
					392,
					-90
				],
				[
					-93,
					-172
				]
			],
			[
				[
					19538,
					97095
				],
				[
					-339,
					-113
				],
				[
					-461,
					1
				],
				[
					5,
					82
				],
				[
					285,
					173
				],
				[
					149,
					-27
				],
				[
					361,
					-116
				]
			],
			[
				[
					23380,
					96781
				],
				[
					-411,
					-119
				],
				[
					-226,
					134
				],
				[
					-119,
					216
				],
				[
					-22,
					238
				],
				[
					360,
					-23
				],
				[
					162,
					-38
				],
				[
					332,
					-200
				],
				[
					-76,
					-208
				]
			],
			[
				[
					22205,
					96935
				],
				[
					108,
					-240
				],
				[
					-453,
					64
				],
				[
					-457,
					187
				],
				[
					-619,
					21
				],
				[
					268,
					171
				],
				[
					-335,
					139
				],
				[
					-21,
					221
				],
				[
					546,
					-79
				],
				[
					751,
					-210
				],
				[
					212,
					-274
				]
			],
			[
				[
					25828,
					97704
				],
				[
					334,
					-186
				],
				[
					-381,
					-171
				],
				[
					-513,
					-434
				],
				[
					-492,
					-41
				],
				[
					-575,
					74
				],
				[
					-299,
					235
				],
				[
					4,
					208
				],
				[
					220,
					154
				],
				[
					-508,
					-5
				],
				[
					-306,
					192
				],
				[
					-176,
					261
				],
				[
					193,
					256
				],
				[
					192,
					175
				],
				[
					285,
					41
				],
				[
					-122,
					132
				],
				[
					646,
					29
				],
				[
					355,
					-308
				],
				[
					468,
					-123
				],
				[
					455,
					-109
				],
				[
					220,
					-380
				]
			],
			[
				[
					30972,
					99689
				],
				[
					742,
					-45
				],
				[
					597,
					-74
				],
				[
					508,
					-156
				],
				[
					-12,
					-154
				],
				[
					-678,
					-250
				],
				[
					-672,
					-117
				],
				[
					-251,
					-129
				],
				[
					605,
					3
				],
				[
					-656,
					-349
				],
				[
					-452,
					-163
				],
				[
					-476,
					-470
				],
				[
					-573,
					-96
				],
				[
					-177,
					-117
				],
				[
					-841,
					-62
				],
				[
					383,
					-72
				],
				[
					-192,
					-103
				],
				[
					230,
					-284
				],
				[
					-264,
					-198
				],
				[
					-429,
					-163
				],
				[
					-132,
					-225
				],
				[
					-388,
					-172
				],
				[
					39,
					-130
				],
				[
					475,
					22
				],
				[
					6,
					-141
				],
				[
					-742,
					-345
				],
				[
					-726,
					159
				],
				[
					-816,
					-89
				],
				[
					-414,
					69
				],
				[
					-525,
					30
				],
				[
					-35,
					277
				],
				[
					514,
					130
				],
				[
					-137,
					415
				],
				[
					170,
					41
				],
				[
					742,
					-249
				],
				[
					-379,
					370
				],
				[
					-450,
					110
				],
				[
					225,
					223
				],
				[
					492,
					137
				],
				[
					79,
					201
				],
				[
					-392,
					225
				],
				[
					-118,
					297
				],
				[
					759,
					-25
				],
				[
					220,
					-63
				],
				[
					433,
					210
				],
				[
					-625,
					67
				],
				[
					-972,
					-37
				],
				[
					-491,
					196
				],
				[
					-232,
					232
				],
				[
					-324,
					169
				],
				[
					-61,
					197
				],
				[
					413,
					110
				],
				[
					324,
					18
				],
				[
					545,
					94
				],
				[
					409,
					214
				],
				[
					344,
					-30
				],
				[
					300,
					-161
				],
				[
					211,
					311
				],
				[
					367,
					92
				],
				[
					498,
					64
				],
				[
					849,
					24
				],
				[
					148,
					-63
				],
				[
					802,
					98
				],
				[
					601,
					-37
				],
				[
					602,
					-36
				]
			],
			[
				[
					52900,
					78834
				],
				[
					-22,
					-236
				],
				[
					-122,
					-97
				],
				[
					-206,
					72
				],
				[
					-60,
					-232
				],
				[
					-132,
					-18
				],
				[
					-48,
					91
				],
				[
					-156,
					-195
				],
				[
					-134,
					-28
				],
				[
					-120,
					124
				]
			],
			[
				[
					51900,
					78315
				],
				[
					-95,
					252
				],
				[
					-133,
					-90
				],
				[
					5,
					261
				],
				[
					203,
					323
				],
				[
					-9,
					147
				],
				[
					126,
					-53
				],
				[
					77,
					98
				]
			],
			[
				[
					52074,
					79253
				],
				[
					236,
					-4
				],
				[
					57,
					125
				],
				[
					298,
					-176
				]
			],
			[
				[
					31400,
					20215
				],
				[
					-92,
					-233
				],
				[
					-238,
					-178
				],
				[
					-137,
					18
				],
				[
					-164,
					46
				],
				[
					-202,
					174
				],
				[
					-291,
					83
				],
				[
					-350,
					322
				],
				[
					-283,
					309
				],
				[
					-383,
					645
				],
				[
					229,
					-121
				],
				[
					390,
					-384
				],
				[
					369,
					-207
				],
				[
					143,
					264
				],
				[
					90,
					394
				],
				[
					256,
					238
				],
				[
					198,
					-68
				]
			],
			[
				[
					30952,
					21711
				],
				[
					-247,
					4
				],
				[
					-134,
					-141
				],
				[
					-250,
					-208
				],
				[
					-45,
					-538
				],
				[
					-118,
					-14
				],
				[
					-313,
					188
				],
				[
					-318,
					401
				],
				[
					-346,
					329
				],
				[
					-87,
					365
				],
				[
					79,
					337
				],
				[
					-140,
					383
				],
				[
					-36,
					982
				],
				[
					119,
					554
				],
				[
					293,
					445
				],
				[
					-422,
					168
				],
				[
					265,
					509
				],
				[
					94,
					956
				],
				[
					309,
					-202
				],
				[
					145,
					1193
				],
				[
					-186,
					153
				],
				[
					-87,
					-719
				],
				[
					-175,
					81
				],
				[
					87,
					823
				],
				[
					95,
					1067
				],
				[
					127,
					394
				],
				[
					-80,
					562
				],
				[
					-22,
					649
				],
				[
					117,
					18
				],
				[
					170,
					930
				],
				[
					192,
					922
				],
				[
					118,
					858
				],
				[
					-64,
					863
				],
				[
					83,
					475
				],
				[
					-34,
					711
				],
				[
					163,
					703
				],
				[
					50,
					1114
				],
				[
					89,
					1196
				],
				[
					87,
					1287
				],
				[
					-20,
					943
				],
				[
					-58,
					811
				]
			],
			[
				[
					30452,
					41263
				],
				[
					143,
					147
				],
				[
					74,
					295
				]
			],
			[
				[
					80649,
					62586
				],
				[
					-240,
					-277
				],
				[
					-228,
					179
				],
				[
					-8,
					495
				],
				[
					137,
					261
				],
				[
					304,
					161
				],
				[
					159,
					-13
				],
				[
					62,
					-220
				],
				[
					-122,
					-254
				],
				[
					-64,
					-332
				]
			],
			[
				[
					86288,
					76244
				],
				[
					-179,
					340
				],
				[
					-111,
					-323
				],
				[
					-429,
					-248
				],
				[
					44,
					-304
				],
				[
					-241,
					21
				],
				[
					-131,
					181
				],
				[
					-191,
					-409
				],
				[
					-306,
					-309
				],
				[
					-227,
					-370
				]
			],
			[
				[
					84517,
					74823
				],
				[
					-388,
					-167
				],
				[
					-204,
					-269
				],
				[
					-300,
					-157
				],
				[
					148,
					267
				],
				[
					-58,
					224
				],
				[
					220,
					387
				],
				[
					-147,
					302
				],
				[
					-242,
					-204
				],
				[
					-314,
					-400
				],
				[
					-171,
					-372
				],
				[
					-272,
					-28
				],
				[
					-142,
					-268
				],
				[
					147,
					-390
				],
				[
					227,
					-94
				],
				[
					9,
					-259
				],
				[
					220,
					-168
				],
				[
					311,
					411
				],
				[
					247,
					-224
				],
				[
					179,
					-15
				],
				[
					45,
					-302
				],
				[
					-393,
					-161
				],
				[
					-130,
					-311
				],
				[
					-270,
					-289
				],
				[
					-142,
					-403
				],
				[
					299,
					-316
				],
				[
					109,
					-567
				],
				[
					169,
					-527
				],
				[
					189,
					-443
				],
				[
					-5,
					-428
				],
				[
					-174,
					-157
				],
				[
					66,
					-307
				],
				[
					164,
					-179
				],
				[
					-43,
					-469
				],
				[
					-71,
					-456
				],
				[
					-155,
					-52
				],
				[
					-203,
					-623
				],
				[
					-225,
					-756
				],
				[
					-258,
					-687
				],
				[
					-382,
					-532
				],
				[
					-386,
					-484
				],
				[
					-313,
					-67
				],
				[
					-170,
					-255
				],
				[
					-96,
					186
				],
				[
					-157,
					-286
				],
				[
					-388,
					-288
				],
				[
					-294,
					-88
				],
				[
					-95,
					-609
				],
				[
					-154,
					-33
				],
				[
					-73,
					418
				],
				[
					66,
					222
				],
				[
					-373,
					185
				],
				[
					-131,
					-94
				]
			],
			[
				[
					80013,
					64241
				],
				[
					-280,
					149
				],
				[
					-132,
					234
				],
				[
					44,
					332
				],
				[
					-254,
					105
				],
				[
					-134,
					216
				],
				[
					-236,
					-307
				],
				[
					-271,
					-66
				],
				[
					-221,
					3
				],
				[
					-149,
					-141
				]
			],
			[
				[
					78380,
					64766
				],
				[
					-144,
					-84
				],
				[
					42,
					-659
				],
				[
					-148,
					16
				],
				[
					-25,
					135
				]
			],
			[
				[
					78105,
					64174
				],
				[
					-9,
					238
				],
				[
					-203,
					-167
				],
				[
					-121,
					106
				],
				[
					-206,
					216
				],
				[
					81,
					478
				],
				[
					-176,
					112
				],
				[
					-66,
					530
				],
				[
					-293,
					-96
				],
				[
					33,
					684
				],
				[
					263,
					480
				],
				[
					11,
					475
				],
				[
					-8,
					441
				],
				[
					-121,
					137
				],
				[
					-93,
					339
				],
				[
					-162,
					-42
				]
			],
			[
				[
					77035,
					68105
				],
				[
					-300,
					86
				],
				[
					94,
					242
				],
				[
					-130,
					358
				],
				[
					-198,
					-243
				],
				[
					-233,
					142
				],
				[
					-321,
					-367
				],
				[
					-252,
					-428
				],
				[
					-224,
					-72
				]
			],
			[
				[
					74670,
					67550
				],
				[
					-23,
					454
				],
				[
					-170,
					-121
				]
			],
			[
				[
					74477,
					67883
				],
				[
					-324,
					56
				],
				[
					-314,
					132
				],
				[
					-225,
					253
				],
				[
					-216,
					114
				],
				[
					-93,
					276
				],
				[
					-157,
					83
				],
				[
					-280,
					375
				],
				[
					-223,
					177
				],
				[
					-115,
					-138
				]
			],
			[
				[
					72530,
					69211
				],
				[
					-386,
					403
				],
				[
					-273,
					365
				],
				[
					-78,
					635
				],
				[
					200,
					-78
				],
				[
					9,
					294
				],
				[
					-111,
					295
				],
				[
					28,
					470
				],
				[
					-298,
					675
				]
			],
			[
				[
					71621,
					72270
				],
				[
					-457,
					233
				],
				[
					-82,
					442
				],
				[
					-205,
					269
				]
			],
			[
				[
					70827,
					73379
				],
				[
					-42,
					328
				],
				[
					10,
					224
				],
				[
					-169,
					131
				],
				[
					-91,
					-58
				],
				[
					-70,
					533
				]
			],
			[
				[
					70465,
					74537
				],
				[
					79,
					132
				],
				[
					-39,
					135
				],
				[
					266,
					272
				],
				[
					192,
					112
				],
				[
					294,
					-77
				],
				[
					105,
					368
				],
				[
					356,
					68
				],
				[
					99,
					229
				],
				[
					438,
					312
				],
				[
					39,
					130
				]
			],
			[
				[
					72294,
					76218
				],
				[
					-22,
					328
				],
				[
					190,
					150
				],
				[
					-250,
					1000
				],
				[
					550,
					231
				],
				[
					143,
					128
				],
				[
					200,
					1031
				],
				[
					551,
					-190
				],
				[
					155,
					261
				],
				[
					13,
					577
				],
				[
					230,
					54
				],
				[
					212,
					383
				]
			],
			[
				[
					74266,
					80171
				],
				[
					109,
					48
				]
			],
			[
				[
					74375,
					80219
				],
				[
					73,
					-402
				],
				[
					233,
					-306
				],
				[
					396,
					-216
				],
				[
					192,
					-464
				],
				[
					-107,
					-673
				],
				[
					100,
					-249
				],
				[
					330,
					-99
				],
				[
					374,
					-80
				],
				[
					336,
					-359
				],
				[
					171,
					-64
				],
				[
					127,
					-531
				],
				[
					163,
					-342
				],
				[
					306,
					14
				],
				[
					574,
					-129
				],
				[
					369,
					80
				],
				[
					274,
					-86
				],
				[
					411,
					-350
				],
				[
					336,
					1
				],
				[
					123,
					-179
				],
				[
					324,
					309
				],
				[
					448,
					200
				],
				[
					417,
					21
				],
				[
					324,
					203
				],
				[
					200,
					309
				],
				[
					194,
					193
				],
				[
					-45,
					190
				],
				[
					-89,
					222
				],
				[
					146,
					371
				],
				[
					156,
					-52
				],
				[
					286,
					-117
				],
				[
					277,
					306
				],
				[
					423,
					223
				],
				[
					204,
					380
				],
				[
					195,
					164
				],
				[
					404,
					77
				],
				[
					219,
					-65
				],
				[
					30,
					204
				],
				[
					-251,
					403
				],
				[
					-223,
					184
				],
				[
					-214,
					-212
				],
				[
					-274,
					89
				],
				[
					-157,
					-73
				],
				[
					-72,
					236
				],
				[
					197,
					575
				],
				[
					135,
					434
				]
			],
			[
				[
					82410,
					80559
				],
				[
					333,
					-217
				],
				[
					392,
					364
				],
				[
					-3,
					253
				],
				[
					251,
					611
				],
				[
					155,
					184
				],
				[
					-4,
					318
				],
				[
					-152,
					137
				],
				[
					229,
					287
				],
				[
					345,
					104
				],
				[
					369,
					15
				],
				[
					415,
					-171
				],
				[
					244,
					-212
				],
				[
					172,
					-581
				],
				[
					104,
					-248
				],
				[
					97,
					-354
				],
				[
					103,
					-564
				],
				[
					483,
					-184
				],
				[
					329,
					-409
				],
				[
					112,
					-541
				],
				[
					423,
					-1
				],
				[
					240,
					227
				],
				[
					459,
					170
				],
				[
					-146,
					-518
				],
				[
					-107,
					-211
				],
				[
					-96,
					-631
				],
				[
					-186,
					-560
				],
				[
					-338,
					102
				],
				[
					-238,
					-203
				],
				[
					73,
					-494
				],
				[
					-40,
					-680
				],
				[
					-142,
					-16
				],
				[
					2,
					-292
				]
			],
			[
				[
					49206,
					54706
				],
				[
					-126,
					-6
				],
				[
					-194,
					112
				],
				[
					-178,
					-6
				],
				[
					-329,
					-101
				],
				[
					-193,
					-166
				],
				[
					-275,
					-211
				],
				[
					-54,
					15
				]
			],
			[
				[
					47857,
					54343
				],
				[
					22,
					474
				],
				[
					26,
					72
				],
				[
					-8,
					227
				],
				[
					-118,
					241
				],
				[
					-88,
					39
				],
				[
					-81,
					158
				],
				[
					60,
					256
				],
				[
					-28,
					278
				],
				[
					13,
					168
				]
			],
			[
				[
					47655,
					56256
				],
				[
					44,
					0
				],
				[
					17,
					251
				],
				[
					-22,
					112
				],
				[
					27,
					80
				],
				[
					103,
					69
				],
				[
					-69,
					461
				],
				[
					-64,
					238
				],
				[
					23,
					195
				],
				[
					55,
					45
				]
			],
			[
				[
					47769,
					57707
				],
				[
					36,
					52
				],
				[
					77,
					-86
				],
				[
					215,
					-5
				],
				[
					51,
					168
				],
				[
					48,
					-11
				],
				[
					80,
					65
				],
				[
					43,
					-246
				],
				[
					65,
					72
				],
				[
					114,
					86
				]
			],
			[
				[
					49214,
					57382
				],
				[
					74,
					-819
				],
				[
					-117,
					-484
				],
				[
					-73,
					-650
				],
				[
					121,
					-496
				],
				[
					-13,
					-227
				]
			],
			[
				[
					53632,
					53135
				],
				[
					-35,
					31
				],
				[
					-164,
					-74
				],
				[
					-169,
					77
				],
				[
					-132,
					-38
				]
			],
			[
				[
					53132,
					53131
				],
				[
					-452,
					14
				]
			],
			[
				[
					52680,
					53145
				],
				[
					40,
					454
				],
				[
					-108,
					381
				],
				[
					-127,
					98
				],
				[
					-56,
					258
				],
				[
					-72,
					82
				],
				[
					4,
					159
				]
			],
			[
				[
					52361,
					54577
				],
				[
					71,
					408
				],
				[
					132,
					556
				],
				[
					81,
					5
				],
				[
					165,
					337
				],
				[
					105,
					9
				],
				[
					156,
					-236
				],
				[
					191,
					194
				],
				[
					26,
					239
				],
				[
					63,
					232
				],
				[
					43,
					291
				],
				[
					148,
					238
				],
				[
					56,
					403
				],
				[
					59,
					128
				],
				[
					39,
					299
				],
				[
					74,
					368
				],
				[
					234,
					446
				],
				[
					14,
					191
				],
				[
					31,
					104
				],
				[
					-110,
					229
				]
			],
			[
				[
					53939,
					59018
				],
				[
					9,
					184
				],
				[
					78,
					33
				]
			],
			[
				[
					54026,
					59235
				],
				[
					111,
					-369
				],
				[
					18,
					-382
				],
				[
					-10,
					-383
				],
				[
					151,
					-523
				],
				[
					-155,
					6
				],
				[
					-78,
					-41
				],
				[
					-127,
					57
				],
				[
					-60,
					-271
				],
				[
					164,
					-336
				],
				[
					121,
					-98
				],
				[
					39,
					-239
				],
				[
					87,
					-397
				],
				[
					-43,
					-156
				]
			],
			[
				[
					54447,
					53135
				],
				[
					-20,
					-311
				],
				[
					-220,
					136
				],
				[
					-225,
					152
				],
				[
					-350,
					23
				]
			],
			[
				[
					58564,
					53850
				],
				[
					-16,
					-673
				],
				[
					111,
					-78
				],
				[
					-89,
					-205
				],
				[
					-107,
					-153
				],
				[
					-106,
					-300
				],
				[
					-59,
					-268
				],
				[
					-15,
					-462
				],
				[
					-65,
					-220
				],
				[
					-2,
					-434
				]
			],
			[
				[
					58216,
					51057
				],
				[
					-80,
					-161
				],
				[
					-10,
					-342
				],
				[
					-38,
					-45
				],
				[
					-26,
					-315
				]
			],
			[
				[
					58149,
					49238
				],
				[
					50,
					-530
				],
				[
					-27,
					-299
				],
				[
					55,
					-334
				],
				[
					161,
					-323
				],
				[
					150,
					-726
				]
			],
			[
				[
					58538,
					47026
				],
				[
					-109,
					59
				],
				[
					-373,
					-97
				],
				[
					-75,
					-69
				],
				[
					-79,
					-368
				],
				[
					62,
					-254
				],
				[
					-49,
					-681
				],
				[
					-34,
					-578
				],
				[
					75,
					-103
				],
				[
					194,
					-224
				],
				[
					76,
					105
				],
				[
					23,
					-621
				],
				[
					-212,
					4
				],
				[
					-114,
					317
				],
				[
					-103,
					246
				],
				[
					-213,
					80
				],
				[
					-62,
					302
				],
				[
					-170,
					-182
				],
				[
					-222,
					81
				],
				[
					-93,
					261
				],
				[
					-176,
					53
				],
				[
					-131,
					-14
				],
				[
					-15,
					179
				],
				[
					-96,
					15
				]
			],
			[
				[
					53422,
					48316
				],
				[
					-39,
					179
				]
			],
			[
				[
					53609,
					49076
				],
				[
					73,
					-59
				],
				[
					95,
					221
				],
				[
					152,
					-6
				],
				[
					17,
					-163
				],
				[
					104,
					-102
				],
				[
					164,
					361
				],
				[
					161,
					281
				],
				[
					71,
					185
				],
				[
					-10,
					473
				],
				[
					121,
					560
				],
				[
					127,
					296
				],
				[
					183,
					278
				],
				[
					32,
					184
				],
				[
					7,
					211
				],
				[
					45,
					200
				],
				[
					-14,
					326
				],
				[
					34,
					510
				],
				[
					55,
					360
				],
				[
					83,
					308
				],
				[
					16,
					347
				]
			],
			[
				[
					57603,
					54843
				],
				[
					169,
					-475
				],
				[
					124,
					-70
				],
				[
					75,
					97
				],
				[
					128,
					-38
				],
				[
					155,
					122
				],
				[
					66,
					-246
				],
				[
					244,
					-383
				]
			],
			[
				[
					53309,
					48928
				],
				[
					-228,
					610
				]
			],
			[
				[
					53081,
					49538
				],
				[
					212,
					318
				],
				[
					-105,
					381
				],
				[
					95,
					144
				],
				[
					187,
					71
				],
				[
					23,
					255
				],
				[
					148,
					-276
				],
				[
					245,
					-25
				],
				[
					85,
					273
				],
				[
					36,
					382
				],
				[
					-31,
					450
				],
				[
					-131,
					341
				],
				[
					120,
					667
				],
				[
					-69,
					114
				],
				[
					-207,
					-47
				],
				[
					-78,
					298
				],
				[
					21,
					251
				]
			],
			[
				[
					29063,
					51742
				],
				[
					-119,
					136
				],
				[
					-137,
					191
				],
				[
					-79,
					-92
				],
				[
					-235,
					80
				],
				[
					-68,
					248
				],
				[
					-52,
					-9
				],
				[
					-278,
					329
				]
			],
			[
				[
					28095,
					52625
				],
				[
					-37,
					178
				],
				[
					103,
					44
				],
				[
					-12,
					288
				],
				[
					65,
					209
				],
				[
					138,
					38
				],
				[
					117,
					362
				],
				[
					106,
					302
				],
				[
					-102,
					137
				],
				[
					52,
					335
				],
				[
					-62,
					526
				],
				[
					59,
					152
				],
				[
					-44,
					487
				],
				[
					-112,
					306
				]
			],
			[
				[
					28366,
					55989
				],
				[
					36,
					280
				],
				[
					89,
					-41
				],
				[
					52,
					171
				],
				[
					-64,
					339
				],
				[
					34,
					85
				]
			],
			[
				[
					28513,
					56823
				],
				[
					143,
					-19
				],
				[
					209,
					402
				],
				[
					114,
					62
				],
				[
					3,
					190
				],
				[
					51,
					487
				],
				[
					159,
					267
				],
				[
					175,
					11
				],
				[
					22,
					120
				],
				[
					218,
					-48
				],
				[
					218,
					291
				],
				[
					109,
					128
				],
				[
					134,
					278
				],
				[
					98,
					-36
				],
				[
					73,
					-151
				],
				[
					-54,
					-194
				]
			],
			[
				[
					30185,
					58611
				],
				[
					-178,
					-96
				],
				[
					-71,
					-288
				],
				[
					-107,
					-165
				],
				[
					-81,
					-215
				],
				[
					-34,
					-410
				],
				[
					-77,
					-337
				],
				[
					144,
					-39
				],
				[
					35,
					-265
				],
				[
					62,
					-126
				],
				[
					21,
					-232
				],
				[
					-33,
					-213
				],
				[
					10,
					-120
				],
				[
					69,
					-48
				],
				[
					66,
					-201
				],
				[
					357,
					55
				],
				[
					161,
					-73
				],
				[
					196,
					-496
				],
				[
					112,
					62
				],
				[
					200,
					-31
				],
				[
					158,
					66
				],
				[
					99,
					-99
				],
				[
					-50,
					-311
				],
				[
					-62,
					-193
				],
				[
					-22,
					-413
				],
				[
					56,
					-383
				],
				[
					79,
					-171
				],
				[
					9,
					-129
				],
				[
					-140,
					-286
				],
				[
					100,
					-127
				],
				[
					74,
					-202
				],
				[
					85,
					-574
				]
			],
			[
				[
					30585,
					49354
				],
				[
					-139,
					306
				],
				[
					-83,
					14
				],
				[
					179,
					586
				],
				[
					-213,
					270
				],
				[
					-166,
					-50
				],
				[
					-101,
					100
				],
				[
					-153,
					-152
				],
				[
					-207,
					72
				],
				[
					-163,
					603
				],
				[
					-129,
					149
				],
				[
					-89,
					272
				],
				[
					-184,
					272
				],
				[
					-74,
					-54
				]
			],
			[
				[
					26954,
					56566
				],
				[
					-151,
					128
				],
				[
					-56,
					121
				],
				[
					32,
					100
				],
				[
					-11,
					127
				],
				[
					-77,
					138
				],
				[
					-109,
					113
				],
				[
					-95,
					74
				],
				[
					-19,
					168
				],
				[
					-73,
					103
				],
				[
					18,
					-167
				],
				[
					-55,
					-138
				],
				[
					-64,
					160
				],
				[
					-89,
					57
				],
				[
					-38,
					116
				],
				[
					2,
					175
				],
				[
					36,
					182
				],
				[
					-78,
					81
				],
				[
					64,
					111
				]
			],
			[
				[
					26191,
					58215
				],
				[
					42,
					74
				],
				[
					183,
					-152
				],
				[
					63,
					75
				],
				[
					89,
					-48
				],
				[
					46,
					-119
				],
				[
					82,
					-38
				],
				[
					66,
					122
				]
			],
			[
				[
					26762,
					58129
				],
				[
					70,
					-313
				],
				[
					108,
					-232
				],
				[
					130,
					-246
				]
			],
			[
				[
					27070,
					57338
				],
				[
					-107,
					-51
				],
				[
					1,
					-232
				],
				[
					58,
					-86
				],
				[
					-41,
					-68
				],
				[
					10,
					-104
				],
				[
					-23,
					-117
				],
				[
					-14,
					-114
				]
			],
			[
				[
					27147,
					65183
				],
				[
					240,
					-41
				],
				[
					219,
					-6
				],
				[
					261,
					-197
				],
				[
					110,
					-210
				],
				[
					260,
					65
				],
				[
					98,
					-136
				],
				[
					235,
					-356
				],
				[
					173,
					-260
				],
				[
					92,
					8
				],
				[
					165,
					-118
				],
				[
					-20,
					-162
				],
				[
					205,
					-23
				],
				[
					210,
					-236
				],
				[
					-33,
					-135
				],
				[
					-185,
					-73
				],
				[
					-187,
					-29
				],
				[
					-191,
					46
				],
				[
					-398,
					-56
				],
				[
					186,
					321
				],
				[
					-113,
					150
				],
				[
					-179,
					38
				],
				[
					-96,
					166
				],
				[
					-66,
					328
				],
				[
					-157,
					-22
				],
				[
					-259,
					154
				],
				[
					-83,
					121
				],
				[
					-362,
					89
				],
				[
					-97,
					113
				],
				[
					104,
					144
				],
				[
					-273,
					29
				],
				[
					-199,
					-299
				],
				[
					-115,
					-8
				],
				[
					-40,
					-141
				],
				[
					-138,
					-63
				],
				[
					-118,
					55
				],
				[
					146,
					178
				],
				[
					60,
					208
				],
				[
					126,
					128
				],
				[
					142,
					112
				],
				[
					210,
					55
				],
				[
					67,
					63
				]
			],
			[
				[
					59092,
					72066
				],
				[
					19,
					3
				],
				[
					40,
					139
				],
				[
					200,
					-8
				],
				[
					253,
					172
				],
				[
					-188,
					-245
				],
				[
					21,
					-108
				]
			],
			[
				[
					59437,
					72019
				],
				[
					-30,
					20
				],
				[
					-53,
					-44
				],
				[
					-42,
					12
				],
				[
					-14,
					-22
				],
				[
					-5,
					59
				],
				[
					-20,
					35
				],
				[
					-54,
					6
				],
				[
					-75,
					-49
				],
				[
					-52,
					30
				]
			],
			[
				[
					59437,
					72019
				],
				[
					8,
					-46
				],
				[
					-285,
					-234
				],
				[
					-136,
					74
				],
				[
					-64,
					232
				],
				[
					132,
					21
				]
			],
			[
				[
					53776,
					79977
				],
				[
					-157,
					247
				],
				[
					-141,
					139
				],
				[
					-30,
					243
				],
				[
					-49,
					171
				],
				[
					202,
					125
				],
				[
					103,
					144
				],
				[
					200,
					111
				],
				[
					70,
					110
				],
				[
					73,
					-66
				],
				[
					124,
					60
				]
			],
			[
				[
					54171,
					81261
				],
				[
					132,
					-186
				],
				[
					207,
					-50
				],
				[
					-17,
					-158
				],
				[
					151,
					-119
				],
				[
					41,
					148
				],
				[
					191,
					-64
				],
				[
					26,
					-180
				],
				[
					207,
					-35
				],
				[
					127,
					-284
				]
			],
			[
				[
					55236,
					80333
				],
				[
					-82,
					0
				],
				[
					-43,
					-104
				],
				[
					-64,
					-25
				],
				[
					-18,
					-131
				],
				[
					-54,
					-28
				],
				[
					-7,
					-53
				],
				[
					-95,
					-60
				],
				[
					-123,
					10
				],
				[
					-39,
					-127
				]
			],
			[
				[
					52756,
					83493
				],
				[
					4,
					-222
				],
				[
					281,
					-135
				],
				[
					-3,
					-204
				],
				[
					283,
					108
				],
				[
					156,
					158
				],
				[
					313,
					-228
				],
				[
					132,
					-183
				]
			],
			[
				[
					53922,
					82787
				],
				[
					64,
					-293
				],
				[
					-77,
					-154
				],
				[
					101,
					-205
				],
				[
					69,
					-308
				],
				[
					-22,
					-199
				],
				[
					114,
					-367
				]
			],
			[
				[
					52074,
					79253
				],
				[
					35,
					410
				],
				[
					140,
					395
				],
				[
					-400,
					106
				],
				[
					-131,
					151
				]
			],
			[
				[
					51718,
					80315
				],
				[
					16,
					252
				],
				[
					-56,
					130
				]
			],
			[
				[
					51710,
					81086
				],
				[
					-47,
					604
				],
				[
					167,
					0
				],
				[
					70,
					217
				],
				[
					69,
					527
				],
				[
					-51,
					195
				]
			],
			[
				[
					51918,
					82629
				],
				[
					54,
					122
				],
				[
					232,
					31
				],
				[
					52,
					-127
				],
				[
					188,
					284
				],
				[
					-63,
					216
				],
				[
					-13,
					326
				]
			],
			[
				[
					52368,
					83481
				],
				[
					210,
					-76
				],
				[
					178,
					88
				]
			],
			[
				[
					61966,
					59143
				],
				[
					66,
					-178
				],
				[
					-9,
					-240
				],
				[
					-158,
					-137
				],
				[
					119,
					-158
				]
			],
			[
				[
					61984,
					58430
				],
				[
					-102,
					-308
				]
			],
			[
				[
					61882,
					58122
				],
				[
					-62,
					103
				],
				[
					-67,
					-41
				],
				[
					-155,
					9
				],
				[
					-4,
					176
				],
				[
					-22,
					159
				],
				[
					94,
					269
				],
				[
					98,
					255
				]
			],
			[
				[
					61764,
					59052
				],
				[
					119,
					-50
				],
				[
					83,
					141
				]
			],
			[
				[
					53524,
					83854
				],
				[
					-166,
					-466
				],
				[
					-291,
					325
				],
				[
					-39,
					239
				],
				[
					408,
					191
				],
				[
					88,
					-289
				]
			],
			[
				[
					52368,
					83481
				],
				[
					-113,
					320
				],
				[
					-8,
					589
				],
				[
					46,
					155
				],
				[
					80,
					173
				],
				[
					244,
					36
				],
				[
					98,
					159
				],
				[
					223,
					162
				],
				[
					-9,
					-296
				],
				[
					-82,
					-188
				],
				[
					33,
					-161
				],
				[
					151,
					-87
				],
				[
					-68,
					-217
				],
				[
					-83,
					62
				],
				[
					-200,
					-415
				],
				[
					76,
					-280
				]
			],
			[
				[
					30080,
					63183
				],
				[
					34,
					98
				],
				[
					217,
					-3
				],
				[
					165,
					-148
				],
				[
					73,
					14
				],
				[
					50,
					-204
				],
				[
					152,
					11
				],
				[
					-9,
					-171
				],
				[
					124,
					-21
				],
				[
					136,
					-211
				],
				[
					-103,
					-235
				],
				[
					-132,
					126
				],
				[
					-127,
					-25
				],
				[
					-92,
					28
				],
				[
					-50,
					-105
				],
				[
					-106,
					-36
				],
				[
					-43,
					140
				],
				[
					-92,
					-83
				],
				[
					-111,
					-394
				],
				[
					-71,
					92
				],
				[
					-14,
					165
				]
			],
			[
				[
					30081,
					62221
				],
				[
					5,
					157
				],
				[
					-71,
					172
				],
				[
					68,
					97
				],
				[
					21,
					222
				],
				[
					-24,
					314
				]
			],
			[
				[
					53333,
					65346
				],
				[
					-952,
					-1097
				],
				[
					-804,
					-1132
				],
				[
					-392,
					-257
				]
			],
			[
				[
					51185,
					62860
				],
				[
					-308,
					-56
				],
				[
					-3,
					366
				],
				[
					-129,
					94
				],
				[
					-173,
					165
				],
				[
					-66,
					270
				],
				[
					-937,
					1256
				],
				[
					-937,
					1257
				]
			],
			[
				[
					48632,
					66212
				],
				[
					-1045,
					1394
				]
			],
			[
				[
					47587,
					67606
				],
				[
					6,
					112
				],
				[
					-1,
					38
				]
			],
			[
				[
					47592,
					67756
				],
				[
					-2,
					682
				],
				[
					449,
					425
				],
				[
					277,
					88
				],
				[
					227,
					155
				],
				[
					107,
					288
				],
				[
					324,
					228
				],
				[
					12,
					427
				],
				[
					161,
					50
				],
				[
					126,
					213
				],
				[
					363,
					97
				],
				[
					51,
					224
				],
				[
					-73,
					122
				],
				[
					-96,
					608
				],
				[
					-17,
					350
				],
				[
					-104,
					369
				]
			],
			[
				[
					49397,
					72082
				],
				[
					267,
					315
				],
				[
					300,
					100
				],
				[
					175,
					238
				],
				[
					268,
					175
				],
				[
					471,
					102
				],
				[
					459,
					47
				],
				[
					140,
					-85
				],
				[
					262,
					227
				],
				[
					297,
					4
				],
				[
					113,
					-134
				],
				[
					190,
					35
				]
			],
			[
				[
					52339,
					73106
				],
				[
					-57,
					-295
				],
				[
					44,
					-549
				],
				[
					-65,
					-475
				],
				[
					-171,
					-322
				],
				[
					24,
					-433
				],
				[
					227,
					-344
				],
				[
					3,
					-139
				],
				[
					171,
					-232
				],
				[
					118,
					-1034
				]
			],
			[
				[
					52633,
					69283
				],
				[
					90,
					-509
				],
				[
					15,
					-267
				],
				[
					-49,
					-470
				],
				[
					21,
					-263
				],
				[
					-36,
					-315
				],
				[
					24,
					-362
				],
				[
					-110,
					-240
				],
				[
					164,
					-420
				],
				[
					11,
					-247
				],
				[
					99,
					-321
				],
				[
					130,
					105
				],
				[
					219,
					-267
				],
				[
					122,
					-361
				]
			],
			[
				[
					27693,
					49869
				],
				[
					148,
					430
				],
				[
					-60,
					251
				],
				[
					-106,
					-267
				],
				[
					-166,
					252
				],
				[
					56,
					163
				],
				[
					-47,
					522
				],
				[
					97,
					87
				],
				[
					52,
					359
				],
				[
					105,
					371
				],
				[
					-20,
					235
				],
				[
					153,
					123
				],
				[
					190,
					230
				]
			],
			[
				[
					29063,
					51742
				],
				[
					38,
					-438
				],
				[
					-86,
					-374
				],
				[
					-303,
					-603
				],
				[
					-334,
					-227
				],
				[
					-170,
					-501
				],
				[
					-53,
					-389
				],
				[
					-157,
					-237
				],
				[
					-116,
					291
				],
				[
					-113,
					62
				],
				[
					-114,
					-45
				],
				[
					-8,
					211
				],
				[
					79,
					137
				],
				[
					-33,
					240
				]
			],
			[
				[
					59700,
					68819
				],
				[
					-78,
					-232
				],
				[
					-60,
					-435
				],
				[
					-75,
					-300
				],
				[
					-65,
					-100
				],
				[
					-93,
					186
				],
				[
					-125,
					257
				],
				[
					-198,
					825
				],
				[
					-29,
					-52
				],
				[
					115,
					-608
				],
				[
					171,
					-579
				],
				[
					210,
					-897
				],
				[
					102,
					-313
				],
				[
					90,
					-325
				],
				[
					249,
					-638
				],
				[
					-55,
					-100
				],
				[
					9,
					-374
				],
				[
					323,
					-517
				],
				[
					49,
					-118
				]
			],
			[
				[
					60240,
					64499
				],
				[
					-1102,
					0
				],
				[
					-1077,
					0
				],
				[
					-1117,
					0
				]
			],
			[
				[
					56944,
					64499
				],
				[
					0,
					2120
				],
				[
					0,
					2048
				],
				[
					-83,
					464
				],
				[
					71,
					356
				],
				[
					-43,
					246
				],
				[
					101,
					276
				]
			],
			[
				[
					56990,
					70009
				],
				[
					369,
					10
				],
				[
					268,
					-152
				],
				[
					275,
					-171
				],
				[
					129,
					-89
				],
				[
					214,
					182
				],
				[
					114,
					165
				],
				[
					245,
					48
				],
				[
					198,
					-73
				],
				[
					75,
					-286
				],
				[
					65,
					189
				],
				[
					222,
					-136
				],
				[
					217,
					-33
				],
				[
					137,
					145
				]
			],
			[
				[
					59518,
					69808
				],
				[
					182,
					-989
				]
			],
			[
				[
					61764,
					59052
				],
				[
					-95,
					187
				],
				[
					-114,
					337
				],
				[
					-124,
					185
				],
				[
					-71,
					199
				],
				[
					-242,
					231
				],
				[
					-191,
					7
				],
				[
					-67,
					120
				],
				[
					-163,
					-135
				],
				[
					-168,
					261
				],
				[
					-87,
					-430
				],
				[
					-323,
					121
				]
			],
			[
				[
					60119,
					60135
				],
				[
					-30,
					230
				],
				[
					120,
					847
				],
				[
					27,
					382
				],
				[
					88,
					177
				],
				[
					204,
					95
				],
				[
					141,
					328
				]
			],
			[
				[
					60669,
					62194
				],
				[
					161,
					-666
				],
				[
					77,
					-529
				],
				[
					152,
					-281
				],
				[
					379,
					-544
				],
				[
					154,
					-328
				],
				[
					151,
					-332
				],
				[
					87,
					-198
				],
				[
					136,
					-173
				]
			],
			[
				[
					47490,
					75948
				],
				[
					14,
					410
				],
				[
					-114,
					250
				],
				[
					393,
					415
				],
				[
					340,
					-104
				],
				[
					373,
					4
				],
				[
					296,
					-98
				],
				[
					230,
					30
				],
				[
					449,
					-19
				]
			],
			[
				[
					49471,
					76836
				],
				[
					111,
					-224
				],
				[
					511,
					-262
				],
				[
					101,
					125
				],
				[
					313,
					-261
				],
				[
					322,
					75
				]
			],
			[
				[
					50829,
					76289
				],
				[
					15,
					-335
				],
				[
					-263,
					-383
				],
				[
					-356,
					-122
				],
				[
					-25,
					-194
				],
				[
					-171,
					-319
				],
				[
					-107,
					-469
				],
				[
					108,
					-329
				],
				[
					-160,
					-257
				],
				[
					-60,
					-374
				],
				[
					-210,
					-115
				],
				[
					-197,
					-443
				],
				[
					-352,
					-8
				],
				[
					-265,
					10
				],
				[
					-174,
					-203
				],
				[
					-106,
					-218
				],
				[
					-136,
					48
				],
				[
					-103,
					195
				],
				[
					-79,
					331
				],
				[
					-259,
					89
				]
			],
			[
				[
					47929,
					73193
				],
				[
					-23,
					191
				],
				[
					103,
					216
				],
				[
					38,
					156
				],
				[
					-96,
					172
				],
				[
					77,
					378
				],
				[
					-111,
					345
				],
				[
					120,
					48
				],
				[
					11,
					272
				],
				[
					45,
					84
				],
				[
					3,
					449
				],
				[
					129,
					156
				],
				[
					-78,
					289
				],
				[
					-162,
					20
				],
				[
					-47,
					-72
				],
				[
					-164,
					-1
				],
				[
					-70,
					282
				],
				[
					-113,
					-84
				],
				[
					-101,
					-146
				]
			],
			[
				[
					56753,
					85111
				],
				[
					32,
					340
				],
				[
					-102,
					-72
				],
				[
					-176,
					204
				],
				[
					-24,
					331
				],
				[
					351,
					161
				],
				[
					350,
					83
				],
				[
					301,
					-95
				],
				[
					287,
					17
				]
			],
			[
				[
					57772,
					86080
				],
				[
					42,
					-100
				],
				[
					-198,
					-332
				],
				[
					83,
					-537
				],
				[
					-120,
					-183
				]
			],
			[
				[
					57579,
					84928
				],
				[
					-229,
					1
				],
				[
					-239,
					214
				],
				[
					-121,
					70
				],
				[
					-237,
					-102
				]
			],
			[
				[
					61882,
					58122
				],
				[
					-61,
					-204
				],
				[
					103,
					-317
				],
				[
					102,
					-277
				],
				[
					106,
					-206
				],
				[
					909,
					-683
				],
				[
					233,
					3
				]
			],
			[
				[
					63274,
					56438
				],
				[
					-785,
					-1728
				],
				[
					-362,
					-26
				],
				[
					-247,
					-406
				],
				[
					-178,
					-10
				],
				[
					-76,
					-182
				]
			],
			[
				[
					61626,
					54086
				],
				[
					-190,
					0
				],
				[
					-112,
					195
				],
				[
					-254,
					-241
				],
				[
					-82,
					-240
				],
				[
					-185,
					45
				],
				[
					-62,
					67
				],
				[
					-65,
					-16
				],
				[
					-87,
					6
				],
				[
					-352,
					489
				],
				[
					-193,
					0
				],
				[
					-95,
					189
				],
				[
					0,
					324
				],
				[
					-145,
					96
				]
			],
			[
				[
					59804,
					55000
				],
				[
					-164,
					627
				],
				[
					-127,
					133
				],
				[
					-48,
					231
				],
				[
					-141,
					280
				],
				[
					-171,
					42
				],
				[
					95,
					328
				],
				[
					147,
					14
				],
				[
					42,
					176
				]
			],
			[
				[
					59437,
					56831
				],
				[
					-4,
					517
				]
			],
			[
				[
					59433,
					57348
				],
				[
					82,
					603
				],
				[
					132,
					161
				],
				[
					28,
					236
				],
				[
					119,
					440
				],
				[
					168,
					285
				],
				[
					112,
					567
				],
				[
					45,
					495
				]
			],
			[
				[
					57942,
					91602
				],
				[
					-41,
					-403
				],
				[
					425,
					-383
				],
				[
					-256,
					-435
				],
				[
					323,
					-655
				],
				[
					-187,
					-494
				],
				[
					250,
					-429
				],
				[
					-113,
					-375
				],
				[
					411,
					-394
				],
				[
					-105,
					-294
				],
				[
					-258,
					-333
				],
				[
					-594,
					-735
				]
			],
			[
				[
					57797,
					86672
				],
				[
					-504,
					-46
				],
				[
					-489,
					-211
				],
				[
					-452,
					-121
				],
				[
					-161,
					314
				],
				[
					-269,
					189
				],
				[
					62,
					567
				],
				[
					-135,
					520
				],
				[
					133,
					335
				],
				[
					252,
					362
				],
				[
					635,
					624
				],
				[
					185,
					121
				],
				[
					-28,
					243
				],
				[
					-387,
					272
				]
			],
			[
				[
					56639,
					89841
				],
				[
					-93,
					225
				],
				[
					-8,
					886
				],
				[
					-433,
					392
				],
				[
					-371,
					282
				]
			],
			[
				[
					55734,
					91626
				],
				[
					167,
					152
				],
				[
					309,
					-304
				],
				[
					362,
					29
				],
				[
					298,
					-140
				],
				[
					265,
					255
				],
				[
					137,
					422
				],
				[
					431,
					196
				],
				[
					356,
					-229
				],
				[
					-117,
					-405
				]
			],
			[
				[
					99547,
					41844
				],
				[
					96,
					-167
				],
				[
					-46,
					-300
				],
				[
					-172,
					-79
				],
				[
					-153,
					71
				],
				[
					-27,
					253
				],
				[
					107,
					198
				],
				[
					126,
					-71
				],
				[
					69,
					95
				]
			],
			[
				[
					0,
					42577
				],
				[
					57,
					26
				],
				[
					-34,
					-277
				],
				[
					-23,
					-31
				],
				[
					99822,
					-141
				],
				[
					-177,
					-122
				],
				[
					-36,
					215
				],
				[
					139,
					118
				],
				[
					88,
					32
				],
				[
					-99836,
					180
				]
			],
			[
				[
					33000,
					21970
				],
				[
					333,
					345
				],
				[
					236,
					-144
				],
				[
					167,
					231
				],
				[
					222,
					-259
				],
				[
					-83,
					-202
				],
				[
					-375,
					-173
				],
				[
					-125,
					202
				],
				[
					-236,
					-259
				],
				[
					-139,
					259
				]
			],
			[
				[
					34854,
					53161
				],
				[
					70,
					246
				],
				[
					24,
					262
				],
				[
					48,
					246
				],
				[
					-107,
					340
				]
			],
			[
				[
					34889,
					54255
				],
				[
					-22,
					394
				],
				[
					144,
					495
				]
			],
			[
				[
					35011,
					55144
				],
				[
					95,
					-63
				],
				[
					204,
					-136
				],
				[
					294,
					-486
				],
				[
					46,
					-236
				]
			],
			[
				[
					52655,
					76104
				],
				[
					-92,
					-445
				],
				[
					-126,
					118
				],
				[
					-64,
					387
				],
				[
					56,
					214
				],
				[
					179,
					220
				],
				[
					47,
					-494
				]
			],
			[
				[
					51576,
					80352
				],
				[
					62,
					-50
				],
				[
					80,
					13
				]
			],
			[
				[
					51900,
					78315
				],
				[
					-11,
					-163
				],
				[
					82,
					-216
				],
				[
					-97,
					-176
				],
				[
					72,
					-445
				],
				[
					151,
					-73
				],
				[
					-32,
					-250
				]
			],
			[
				[
					52065,
					76992
				],
				[
					-252,
					-326
				],
				[
					-548,
					156
				],
				[
					-404,
					-186
				],
				[
					-32,
					-347
				]
			],
			[
				[
					49471,
					76836
				],
				[
					144,
					345
				],
				[
					53,
					1147
				],
				[
					-287,
					605
				],
				[
					-205,
					291
				],
				[
					-424,
					222
				],
				[
					-28,
					420
				],
				[
					360,
					125
				],
				[
					466,
					-148
				],
				[
					-88,
					652
				],
				[
					263,
					-247
				],
				[
					646,
					449
				],
				[
					84,
					472
				],
				[
					243,
					116
				]
			],
			[
				[
					53081,
					49538
				],
				[
					-285,
					581
				],
				[
					-184,
					475
				],
				[
					-169,
					595
				],
				[
					9,
					192
				],
				[
					61,
					184
				],
				[
					67,
					419
				],
				[
					56,
					427
				]
			],
			[
				[
					52636,
					52411
				],
				[
					94,
					33
				],
				[
					404,
					-6
				],
				[
					-2,
					693
				]
			],
			[
				[
					48278,
					82851
				],
				[
					-210,
					118
				],
				[
					-172,
					-8
				],
				[
					57,
					309
				],
				[
					-57,
					309
				]
			],
			[
				[
					47896,
					83579
				],
				[
					233,
					23
				],
				[
					298,
					-356
				],
				[
					-149,
					-395
				]
			],
			[
				[
					49165,
					85596
				],
				[
					-297,
					-623
				],
				[
					283,
					79
				],
				[
					304,
					-3
				],
				[
					-72,
					-469
				],
				[
					-250,
					-516
				],
				[
					287,
					-37
				],
				[
					22,
					-61
				],
				[
					248,
					-679
				],
				[
					190,
					-93
				],
				[
					171,
					-656
				],
				[
					79,
					-227
				],
				[
					337,
					-110
				],
				[
					-34,
					-368
				],
				[
					-142,
					-169
				],
				[
					111,
					-298
				],
				[
					-250,
					-302
				],
				[
					-371,
					6
				],
				[
					-473,
					-159
				],
				[
					-130,
					114
				],
				[
					-183,
					-270
				],
				[
					-257,
					65
				],
				[
					-195,
					-220
				],
				[
					-148,
					115
				],
				[
					407,
					605
				],
				[
					249,
					125
				],
				[
					-2,
					0
				],
				[
					-434,
					96
				],
				[
					-79,
					229
				],
				[
					291,
					179
				],
				[
					-152,
					310
				],
				[
					52,
					377
				],
				[
					413,
					-52
				],
				[
					1,
					0
				],
				[
					40,
					334
				],
				[
					-186,
					355
				],
				[
					-4,
					8
				],
				[
					-337,
					101
				],
				[
					-66,
					156
				],
				[
					101,
					258
				],
				[
					-92,
					158
				],
				[
					-149,
					-272
				],
				[
					-17,
					555
				],
				[
					-140,
					294
				],
				[
					101,
					595
				],
				[
					216,
					467
				],
				[
					222,
					-45
				],
				[
					335,
					48
				]
			],
			[
				[
					61542,
					75749
				],
				[
					42,
					246
				],
				[
					-70,
					393
				],
				[
					-160,
					212
				],
				[
					-154,
					66
				],
				[
					-102,
					177
				]
			],
			[
				[
					61098,
					76843
				],
				[
					34,
					68
				],
				[
					235,
					-99
				],
				[
					409,
					-93
				],
				[
					378,
					-276
				],
				[
					48,
					-107
				],
				[
					169,
					90
				],
				[
					259,
					-120
				],
				[
					85,
					-236
				],
				[
					175,
					-134
				]
			],
			[
				[
					62106,
					75494
				],
				[
					-268,
					282
				],
				[
					-296,
					-27
				]
			],
			[
				[
					50294,
					55244
				],
				[
					-436,
					-337
				],
				[
					-154,
					-198
				],
				[
					-250,
					-167
				],
				[
					-248,
					164
				]
			],
			[
				[
					50006,
					58175
				],
				[
					-20,
					-180
				],
				[
					116,
					-297
				],
				[
					-1,
					-418
				],
				[
					27,
					-454
				],
				[
					69,
					-210
				],
				[
					-61,
					-518
				],
				[
					22,
					-287
				],
				[
					74,
					-365
				],
				[
					62,
					-202
				]
			],
			[
				[
					47655,
					56256
				],
				[
					-78,
					14
				],
				[
					-57,
					-232
				],
				[
					-78,
					3
				],
				[
					-55,
					123
				],
				[
					19,
					231
				],
				[
					-116,
					353
				],
				[
					-73,
					-65
				],
				[
					-59,
					-13
				]
			],
			[
				[
					47158,
					56670
				],
				[
					-77,
					-33
				],
				[
					3,
					211
				],
				[
					-44,
					151
				],
				[
					9,
					168
				],
				[
					-60,
					242
				],
				[
					-78,
					206
				],
				[
					-222,
					0
				],
				[
					-65,
					-108
				],
				[
					-76,
					-13
				],
				[
					-48,
					-125
				],
				[
					-32,
					-159
				],
				[
					-148,
					-254
				]
			],
			[
				[
					46320,
					56956
				],
				[
					-122,
					341
				],
				[
					-108,
					226
				],
				[
					-71,
					74
				],
				[
					-69,
					115
				],
				[
					-32,
					254
				],
				[
					-41,
					127
				],
				[
					-80,
					94
				]
			],
			[
				[
					45797,
					58187
				],
				[
					123,
					281
				],
				[
					84,
					-11
				],
				[
					73,
					97
				],
				[
					61,
					1
				],
				[
					44,
					76
				],
				[
					-24,
					191
				],
				[
					31,
					60
				],
				[
					5,
					195
				]
			],
			[
				[
					46194,
					59077
				],
				[
					134,
					-5
				],
				[
					200,
					-141
				],
				[
					61,
					13
				],
				[
					21,
					64
				],
				[
					151,
					-45
				],
				[
					40,
					32
				]
			],
			[
				[
					46801,
					58995
				],
				[
					16,
					-211
				],
				[
					44,
					1
				],
				[
					73,
					77
				],
				[
					46,
					-20
				],
				[
					77,
					-146
				],
				[
					119,
					-46
				],
				[
					76,
					125
				],
				[
					90,
					77
				],
				[
					67,
					80
				],
				[
					55,
					-15
				],
				[
					62,
					-126
				],
				[
					33,
					-159
				],
				[
					114,
					-241
				],
				[
					-57,
					-149
				],
				[
					-11,
					-187
				],
				[
					59,
					57
				],
				[
					35,
					-67
				],
				[
					-15,
					-172
				],
				[
					85,
					-166
				]
			],
			[
				[
					45321,
					59403
				],
				[
					36,
					255
				]
			],
			[
				[
					45357,
					59658
				],
				[
					302,
					17
				],
				[
					63,
					136
				],
				[
					88,
					10
				],
				[
					110,
					-142
				],
				[
					86,
					-3
				],
				[
					92,
					97
				],
				[
					56,
					-166
				],
				[
					-120,
					-130
				],
				[
					-121,
					11
				],
				[
					-119,
					121
				],
				[
					-103,
					-133
				],
				[
					-50,
					-5
				],
				[
					-67,
					-80
				],
				[
					-253,
					12
				]
			],
			[
				[
					45797,
					58187
				],
				[
					-149,
					241
				],
				[
					-117,
					38
				],
				[
					-63,
					162
				],
				[
					1,
					88
				],
				[
					-84,
					122
				],
				[
					-18,
					124
				]
			],
			[
				[
					45367,
					58962
				],
				[
					147,
					93
				],
				[
					92,
					-18
				],
				[
					75,
					65
				],
				[
					513,
					-25
				]
			],
			[
				[
					52636,
					52411
				],
				[
					-52,
					87
				],
				[
					96,
					647
				]
			],
			[
				[
					56583,
					72391
				],
				[
					152,
					-194
				],
				[
					216,
					33
				],
				[
					207,
					-41
				],
				[
					-7,
					-100
				],
				[
					151,
					69
				],
				[
					-35,
					-170
				],
				[
					-400,
					-49
				],
				[
					3,
					95
				],
				[
					-339,
					112
				],
				[
					52,
					245
				]
			],
			[
				[
					57237,
					75339
				],
				[
					-169,
					17
				],
				[
					-145,
					54
				],
				[
					-336,
					-150
				],
				[
					192,
					-323
				],
				[
					-141,
					-94
				],
				[
					-154,
					-1
				],
				[
					-147,
					297
				],
				[
					-52,
					-127
				],
				[
					62,
					-344
				],
				[
					139,
					-270
				],
				[
					-105,
					-126
				],
				[
					155,
					-265
				],
				[
					137,
					-167
				],
				[
					4,
					-326
				],
				[
					-257,
					153
				],
				[
					82,
					-294
				],
				[
					-176,
					-60
				],
				[
					105,
					-509
				],
				[
					-184,
					-7
				],
				[
					-228,
					251
				],
				[
					-104,
					460
				],
				[
					-49,
					384
				],
				[
					-108,
					264
				],
				[
					-143,
					329
				],
				[
					-18,
					164
				]
			],
			[
				[
					55838,
					75350
				],
				[
					182,
					51
				],
				[
					106,
					126
				],
				[
					150,
					-11
				],
				[
					46,
					100
				],
				[
					53,
					19
				]
			],
			[
				[
					57254,
					75917
				],
				[
					135,
					-153
				],
				[
					-86,
					-360
				],
				[
					-66,
					-65
				]
			],
			[
				[
					37010,
					99413
				],
				[
					932,
					344
				],
				[
					975,
					-26
				],
				[
					354,
					213
				],
				[
					982,
					55
				],
				[
					2219,
					-72
				],
				[
					1737,
					-457
				],
				[
					-513,
					-222
				],
				[
					-1062,
					-25
				],
				[
					-1496,
					-56
				],
				[
					140,
					-103
				],
				[
					984,
					63
				],
				[
					836,
					-198
				],
				[
					540,
					176
				],
				[
					231,
					-206
				],
				[
					-305,
					-335
				],
				[
					707,
					214
				],
				[
					1348,
					223
				],
				[
					833,
					-111
				],
				[
					156,
					-246
				],
				[
					-1132,
					-410
				],
				[
					-157,
					-133
				],
				[
					-888,
					-99
				],
				[
					643,
					-28
				],
				[
					-324,
					-420
				],
				[
					-224,
					-373
				],
				[
					9,
					-641
				],
				[
					333,
					-376
				],
				[
					-434,
					-24
				],
				[
					-457,
					-182
				],
				[
					513,
					-305
				],
				[
					65,
					-490
				],
				[
					-297,
					-53
				],
				[
					360,
					-495
				],
				[
					-617,
					-42
				],
				[
					322,
					-234
				],
				[
					-91,
					-203
				],
				[
					-391,
					-89
				],
				[
					-388,
					-2
				],
				[
					348,
					-390
				],
				[
					4,
					-256
				],
				[
					-549,
					238
				],
				[
					-143,
					-154
				],
				[
					375,
					-144
				],
				[
					364,
					-352
				],
				[
					105,
					-464
				],
				[
					-495,
					-111
				],
				[
					-214,
					222
				],
				[
					-344,
					331
				],
				[
					95,
					-391
				],
				[
					-322,
					-303
				],
				[
					732,
					-24
				],
				[
					383,
					-31
				],
				[
					-745,
					-502
				],
				[
					-755,
					-454
				],
				[
					-813,
					-199
				],
				[
					-306,
					-2
				],
				[
					-288,
					-222
				],
				[
					-386,
					-608
				],
				[
					-597,
					-404
				],
				[
					-192,
					-23
				],
				[
					-370,
					-142
				],
				[
					-399,
					-134
				],
				[
					-238,
					-357
				],
				[
					-4,
					-403
				],
				[
					-141,
					-378
				],
				[
					-453,
					-461
				],
				[
					112,
					-450
				],
				[
					-125,
					-476
				],
				[
					-142,
					-563
				],
				[
					-391,
					-35
				],
				[
					-410,
					471
				],
				[
					-556,
					3
				],
				[
					-269,
					315
				],
				[
					-186,
					563
				],
				[
					-481,
					716
				],
				[
					-141,
					375
				],
				[
					-38,
					517
				],
				[
					-384,
					532
				],
				[
					100,
					424
				],
				[
					-186,
					203
				],
				[
					275,
					673
				],
				[
					418,
					214
				],
				[
					110,
					241
				],
				[
					58,
					450
				],
				[
					-318,
					-204
				],
				[
					-151,
					-85
				],
				[
					-249,
					-83
				],
				[
					-341,
					188
				],
				[
					-19,
					392
				],
				[
					109,
					306
				],
				[
					258,
					8
				],
				[
					567,
					-153
				],
				[
					-478,
					366
				],
				[
					-249,
					197
				],
				[
					-276,
					-81
				],
				[
					-232,
					143
				],
				[
					310,
					536
				],
				[
					-169,
					215
				],
				[
					-220,
					398
				],
				[
					-335,
					611
				],
				[
					-353,
					223
				],
				[
					3,
					241
				],
				[
					-745,
					337
				],
				[
					-590,
					42
				],
				[
					-743,
					-23
				],
				[
					-677,
					-42
				],
				[
					-323,
					183
				],
				[
					-482,
					362
				],
				[
					729,
					181
				],
				[
					559,
					31
				],
				[
					-1188,
					149
				],
				[
					-627,
					236
				],
				[
					39,
					223
				],
				[
					1051,
					277
				],
				[
					1018,
					277
				],
				[
					107,
					210
				],
				[
					-750,
					206
				],
				[
					243,
					230
				],
				[
					961,
					402
				],
				[
					404,
					62
				],
				[
					-115,
					258
				],
				[
					658,
					152
				],
				[
					854,
					90
				],
				[
					853,
					6
				],
				[
					303,
					-180
				],
				[
					737,
					317
				],
				[
					663,
					-215
				],
				[
					390,
					-45
				],
				[
					577,
					-188
				],
				[
					-660,
					311
				],
				[
					38,
					246
				]
			],
			[
				[
					24973,
					59739
				],
				[
					-142,
					101
				],
				[
					-174,
					10
				],
				[
					-127,
					114
				],
				[
					-149,
					238
				]
			],
			[
				[
					24381,
					60202
				],
				[
					7,
					168
				],
				[
					32,
					135
				],
				[
					-39,
					107
				],
				[
					133,
					470
				],
				[
					357,
					1
				],
				[
					7,
					197
				],
				[
					-45,
					35
				],
				[
					-31,
					124
				],
				[
					-103,
					133
				],
				[
					-103,
					193
				],
				[
					125,
					1
				],
				[
					1,
					324
				],
				[
					259,
					1
				],
				[
					257,
					-6
				]
			],
			[
				[
					25297,
					60979
				],
				[
					90,
					-105
				],
				[
					24,
					86
				],
				[
					82,
					-73
				]
			],
			[
				[
					25493,
					60887
				],
				[
					-127,
					-220
				],
				[
					-131,
					-161
				],
				[
					-20,
					-111
				],
				[
					22,
					-113
				],
				[
					-58,
					-146
				]
			],
			[
				[
					25179,
					60136
				],
				[
					-65,
					-36
				],
				[
					15,
					-67
				],
				[
					-52,
					-64
				],
				[
					-95,
					-145
				],
				[
					-9,
					-85
				]
			],
			[
				[
					33400,
					56648
				],
				[
					183,
					-212
				],
				[
					171,
					-375
				],
				[
					8,
					-297
				],
				[
					105,
					-13
				],
				[
					149,
					-281
				],
				[
					109,
					-201
				]
			],
			[
				[
					34125,
					55269
				],
				[
					-44,
					-518
				],
				[
					-169,
					-150
				],
				[
					15,
					-136
				],
				[
					-51,
					-297
				],
				[
					123,
					-418
				],
				[
					89,
					-1
				],
				[
					37,
					-325
				],
				[
					169,
					-501
				]
			],
			[
				[
					33129,
					54824
				],
				[
					-188,
					437
				],
				[
					75,
					159
				],
				[
					-5,
					265
				],
				[
					171,
					93
				],
				[
					69,
					108
				],
				[
					-95,
					213
				],
				[
					24,
					210
				],
				[
					220,
					339
				]
			],
			[
				[
					25745,
					59307
				],
				[
					-48,
					180
				],
				[
					-84,
					50
				]
			],
			[
				[
					25613,
					59537
				],
				[
					19,
					231
				],
				[
					-38,
					62
				],
				[
					-57,
					41
				],
				[
					-122,
					-68
				],
				[
					-10,
					77
				],
				[
					-84,
					93
				],
				[
					-60,
					114
				],
				[
					-82,
					49
				]
			],
			[
				[
					25493,
					60887
				],
				[
					29,
					-23
				],
				[
					61,
					101
				],
				[
					79,
					9
				],
				[
					26,
					-47
				],
				[
					43,
					28
				],
				[
					129,
					-52
				],
				[
					128,
					15
				],
				[
					90,
					64
				],
				[
					32,
					65
				],
				[
					89,
					-30
				],
				[
					66,
					-39
				],
				[
					73,
					13
				],
				[
					55,
					50
				],
				[
					127,
					-80
				],
				[
					44,
					-13
				],
				[
					85,
					-107
				],
				[
					80,
					-129
				],
				[
					101,
					-88
				],
				[
					73,
					-159
				]
			],
			[
				[
					26903,
					60465
				],
				[
					-95,
					12
				],
				[
					-38,
					-79
				],
				[
					-97,
					-75
				],
				[
					-70,
					0
				],
				[
					-61,
					-73
				],
				[
					-56,
					26
				],
				[
					-47,
					88
				],
				[
					-29,
					-17
				],
				[
					-36,
					-138
				],
				[
					-27,
					5
				],
				[
					-4,
					-118
				],
				[
					-97,
					-159
				],
				[
					-51,
					-68
				],
				[
					-29,
					-72
				],
				[
					-82,
					117
				],
				[
					-60,
					-154
				],
				[
					-58,
					4
				],
				[
					-65,
					-14
				],
				[
					6,
					-283
				],
				[
					-41,
					-5
				],
				[
					-35,
					-131
				],
				[
					-86,
					-24
				]
			],
			[
				[
					55230,
					78267
				],
				[
					67,
					-223
				],
				[
					89,
					-164
				],
				[
					-107,
					-217
				]
			],
			[
				[
					55155,
					76391
				],
				[
					-31,
					-98
				]
			],
			[
				[
					55124,
					76293
				],
				[
					-261,
					213
				],
				[
					-161,
					207
				],
				[
					-254,
					171
				],
				[
					-233,
					424
				],
				[
					56,
					43
				],
				[
					-127,
					242
				],
				[
					-5,
					195
				],
				[
					-179,
					91
				],
				[
					-85,
					-249
				],
				[
					-82,
					193
				],
				[
					6,
					200
				],
				[
					10,
					9
				]
			],
			[
				[
					53809,
					78032
				],
				[
					194,
					-20
				],
				[
					51,
					98
				],
				[
					94,
					-94
				],
				[
					109,
					-12
				],
				[
					-1,
					161
				],
				[
					97,
					59
				],
				[
					27,
					233
				],
				[
					221,
					153
				]
			],
			[
				[
					54601,
					78610
				],
				[
					88,
					-71
				],
				[
					208,
					-247
				],
				[
					229,
					-111
				],
				[
					104,
					86
				]
			],
			[
				[
					30081,
					62221
				],
				[
					-185,
					98
				],
				[
					-131,
					-40
				],
				[
					-169,
					42
				],
				[
					-130,
					-108
				],
				[
					-149,
					179
				],
				[
					24,
					186
				],
				[
					256,
					-80
				],
				[
					210,
					-46
				],
				[
					100,
					128
				],
				[
					-127,
					250
				],
				[
					2,
					220
				],
				[
					-175,
					89
				],
				[
					62,
					159
				],
				[
					170,
					-25
				],
				[
					241,
					-90
				]
			],
			[
				[
					54716,
					79543
				],
				[
					141,
					-148
				],
				[
					103,
					-62
				],
				[
					233,
					70
				],
				[
					22,
					116
				],
				[
					111,
					17
				],
				[
					135,
					89
				],
				[
					30,
					-37
				],
				[
					130,
					72
				],
				[
					66,
					136
				],
				[
					91,
					35
				],
				[
					297,
					-175
				],
				[
					59,
					59
				]
			],
			[
				[
					56134,
					79715
				],
				[
					155,
					-157
				],
				[
					19,
					-154
				]
			],
			[
				[
					56308,
					79404
				],
				[
					-170,
					-121
				],
				[
					-131,
					-391
				],
				[
					-168,
					-390
				],
				[
					-223,
					-109
				]
			],
			[
				[
					55616,
					78393
				],
				[
					-173,
					26
				],
				[
					-213,
					-152
				]
			],
			[
				[
					54601,
					78610
				],
				[
					-54,
					194
				],
				[
					-47,
					7
				]
			],
			[
				[
					83531,
					45933
				],
				[
					-117,
					-11
				],
				[
					-368,
					403
				],
				[
					259,
					113
				],
				[
					146,
					-175
				],
				[
					97,
					-175
				],
				[
					-17,
					-155
				]
			],
			[
				[
					84713,
					46708
				],
				[
					28,
					-113
				],
				[
					5,
					-175
				]
			],
			[
				[
					84746,
					46420
				],
				[
					-181,
					-430
				],
				[
					-238,
					-127
				],
				[
					-33,
					69
				],
				[
					25,
					196
				],
				[
					119,
					351
				],
				[
					275,
					229
				]
			],
			[
				[
					82749,
					47167
				],
				[
					100,
					-153
				],
				[
					172,
					47
				],
				[
					69,
					-245
				],
				[
					-321,
					-116
				],
				[
					-193,
					-77
				],
				[
					-149,
					4
				],
				[
					95,
					332
				],
				[
					153,
					5
				],
				[
					74,
					203
				]
			],
			[
				[
					84139,
					47168
				],
				[
					-41,
					-320
				],
				[
					-417,
					-163
				],
				[
					-370,
					71
				],
				[
					0,
					210
				],
				[
					220,
					120
				],
				[
					174,
					-173
				],
				[
					185,
					44
				],
				[
					249,
					211
				]
			],
			[
				[
					80172,
					47926
				],
				[
					533,
					-57
				],
				[
					61,
					237
				],
				[
					515,
					-277
				],
				[
					101,
					-373
				],
				[
					417,
					-105
				],
				[
					341,
					-342
				],
				[
					-317,
					-220
				],
				[
					-306,
					232
				],
				[
					-251,
					-15
				],
				[
					-288,
					42
				],
				[
					-260,
					104
				],
				[
					-322,
					220
				],
				[
					-204,
					57
				],
				[
					-116,
					-72
				],
				[
					-506,
					237
				],
				[
					-48,
					247
				],
				[
					-255,
					43
				],
				[
					191,
					550
				],
				[
					337,
					-34
				],
				[
					224,
					-225
				],
				[
					115,
					-44
				],
				[
					38,
					-205
				]
			],
			[
				[
					87423,
					48251
				],
				[
					-143,
					-393
				],
				[
					-27,
					434
				],
				[
					49,
					207
				],
				[
					58,
					195
				],
				[
					63,
					-169
				],
				[
					0,
					-274
				]
			],
			[
				[
					85346,
					49837
				],
				[
					-104,
					-191
				],
				[
					-192,
					106
				],
				[
					-54,
					248
				],
				[
					281,
					27
				],
				[
					69,
					-190
				]
			],
			[
				[
					86241,
					50048
				],
				[
					101,
					-441
				],
				[
					-234,
					238
				],
				[
					-232,
					48
				],
				[
					-157,
					-38
				],
				[
					-192,
					20
				],
				[
					65,
					317
				],
				[
					344,
					24
				],
				[
					305,
					-168
				]
			],
			[
				[
					89166,
					50332
				],
				[
					5,
					-1877
				],
				[
					4,
					-1876
				]
			],
			[
				[
					89175,
					46579
				],
				[
					-247,
					472
				],
				[
					-282,
					116
				],
				[
					-69,
					-164
				],
				[
					-352,
					-18
				],
				[
					118,
					469
				],
				[
					175,
					160
				],
				[
					-72,
					626
				],
				[
					-134,
					483
				],
				[
					-538,
					488
				],
				[
					-229,
					48
				],
				[
					-417,
					532
				],
				[
					-82,
					-279
				],
				[
					-107,
					-51
				],
				[
					-63,
					211
				],
				[
					-1,
					250
				],
				[
					-212,
					283
				],
				[
					299,
					207
				],
				[
					198,
					-11
				],
				[
					-23,
					153
				],
				[
					-407,
					1
				],
				[
					-110,
					343
				],
				[
					-248,
					106
				],
				[
					-117,
					285
				],
				[
					374,
					140
				],
				[
					142,
					188
				],
				[
					446,
					-237
				],
				[
					44,
					-214
				],
				[
					78,
					-931
				],
				[
					287,
					-345
				],
				[
					232,
					611
				],
				[
					319,
					347
				],
				[
					247,
					1
				],
				[
					238,
					-201
				],
				[
					206,
					-206
				],
				[
					298,
					-110
				]
			],
			[
				[
					84788,
					52647
				],
				[
					-223,
					-571
				],
				[
					-209,
					-111
				],
				[
					-267,
					113
				],
				[
					-463,
					-29
				],
				[
					-243,
					-83
				],
				[
					-39,
					-436
				],
				[
					248,
					-512
				],
				[
					150,
					261
				],
				[
					518,
					196
				],
				[
					-22,
					-265
				],
				[
					-121,
					83
				],
				[
					-121,
					-337
				],
				[
					-245,
					-223
				],
				[
					263,
					-738
				],
				[
					-50,
					-198
				],
				[
					249,
					-665
				],
				[
					-2,
					-378
				],
				[
					-148,
					-170
				],
				[
					-109,
					203
				],
				[
					134,
					471
				],
				[
					-273,
					-222
				],
				[
					-69,
					159
				],
				[
					36,
					222
				],
				[
					-200,
					338
				],
				[
					21,
					561
				],
				[
					-186,
					-175
				],
				[
					24,
					-671
				],
				[
					11,
					-824
				],
				[
					-176,
					-84
				],
				[
					-119,
					169
				],
				[
					79,
					530
				],
				[
					-43,
					556
				],
				[
					-117,
					4
				],
				[
					-86,
					395
				],
				[
					115,
					377
				],
				[
					40,
					457
				],
				[
					139,
					868
				],
				[
					58,
					238
				],
				[
					237,
					427
				],
				[
					217,
					-170
				],
				[
					350,
					-80
				],
				[
					319,
					24
				],
				[
					275,
					419
				],
				[
					48,
					-129
				]
			],
			[
				[
					85746,
					52481
				],
				[
					-15,
					-503
				],
				[
					-143,
					57
				],
				[
					-42,
					-351
				],
				[
					114,
					-304
				],
				[
					-78,
					-69
				],
				[
					-112,
					365
				],
				[
					-82,
					736
				],
				[
					56,
					460
				],
				[
					92,
					210
				],
				[
					20,
					-315
				],
				[
					164,
					-50
				],
				[
					26,
					-236
				]
			],
			[
				[
					80461,
					52985
				],
				[
					47,
					-385
				],
				[
					190,
					-325
				],
				[
					179,
					117
				],
				[
					177,
					-42
				],
				[
					162,
					291
				],
				[
					133,
					51
				],
				[
					263,
					-162
				],
				[
					226,
					123
				],
				[
					143,
					801
				],
				[
					107,
					200
				],
				[
					96,
					655
				],
				[
					319,
					0
				],
				[
					241,
					-97
				]
			],
			[
				[
					82744,
					54212
				],
				[
					-158,
					-520
				],
				[
					204,
					-545
				],
				[
					-48,
					-265
				],
				[
					312,
					-533
				],
				[
					-329,
					-68
				],
				[
					-93,
					-393
				],
				[
					12,
					-522
				],
				[
					-267,
					-393
				],
				[
					-7,
					-574
				],
				[
					-107,
					-881
				],
				[
					-41,
					205
				],
				[
					-316,
					-259
				],
				[
					-110,
					352
				],
				[
					-198,
					33
				],
				[
					-139,
					184
				],
				[
					-330,
					-207
				],
				[
					-101,
					279
				],
				[
					-182,
					-32
				],
				[
					-229,
					67
				],
				[
					-43,
					772
				],
				[
					-138,
					160
				],
				[
					-134,
					493
				],
				[
					-38,
					504
				],
				[
					32,
					533
				],
				[
					165,
					383
				]
			],
			[
				[
					79393,
					48459
				],
				[
					-308,
					-12
				],
				[
					-234,
					481
				],
				[
					-356,
					471
				],
				[
					-119,
					349
				],
				[
					-210,
					469
				],
				[
					-138,
					432
				],
				[
					-212,
					806
				],
				[
					-244,
					480
				],
				[
					-81,
					495
				],
				[
					-103,
					449
				],
				[
					-250,
					363
				],
				[
					-145,
					493
				],
				[
					-209,
					322
				],
				[
					-290,
					635
				],
				[
					-24,
					293
				],
				[
					178,
					-23
				],
				[
					430,
					-111
				],
				[
					246,
					-564
				],
				[
					215,
					-390
				],
				[
					153,
					-240
				],
				[
					263,
					-619
				],
				[
					283,
					-9
				],
				[
					233,
					-394
				],
				[
					161,
					-482
				],
				[
					211,
					-263
				],
				[
					-111,
					-471
				],
				[
					159,
					-200
				],
				[
					100,
					-14
				],
				[
					47,
					-402
				],
				[
					97,
					-321
				],
				[
					204,
					-51
				],
				[
					135,
					-365
				],
				[
					-70,
					-716
				],
				[
					-11,
					-891
				]
			],
			[
				[
					72530,
					69211
				],
				[
					-176,
					-261
				],
				[
					-108,
					-538
				],
				[
					269,
					-218
				],
				[
					262,
					-283
				],
				[
					362,
					-323
				],
				[
					381,
					-75
				],
				[
					160,
					-293
				],
				[
					215,
					-54
				],
				[
					334,
					-135
				],
				[
					231,
					10
				],
				[
					32,
					228
				],
				[
					-36,
					366
				],
				[
					21,
					248
				]
			],
			[
				[
					77035,
					68105
				],
				[
					20,
					-219
				],
				[
					-97,
					-105
				],
				[
					23,
					-355
				],
				[
					-199,
					104
				],
				[
					-359,
					-397
				],
				[
					8,
					-330
				],
				[
					-153,
					-483
				],
				[
					-14,
					-281
				],
				[
					-124,
					-474
				],
				[
					-217,
					131
				],
				[
					-11,
					-596
				],
				[
					-63,
					-196
				],
				[
					30,
					-245
				],
				[
					-137,
					-137
				]
			],
			[
				[
					74730,
					64531
				],
				[
					-39,
					-210
				],
				[
					-189,
					7
				],
				[
					-343,
					-120
				],
				[
					16,
					-433
				],
				[
					-148,
					-341
				],
				[
					-400,
					-387
				],
				[
					-311,
					-678
				],
				[
					-209,
					-363
				],
				[
					-276,
					-377
				],
				[
					-1,
					-265
				],
				[
					-138,
					-142
				],
				[
					-251,
					-206
				],
				[
					-129,
					-31
				],
				[
					-84,
					-439
				],
				[
					58,
					-749
				],
				[
					15,
					-478
				],
				[
					-118,
					-547
				],
				[
					-1,
					-978
				],
				[
					-144,
					-28
				],
				[
					-126,
					-439
				],
				[
					84,
					-190
				],
				[
					-253,
					-163
				],
				[
					-93,
					-392
				],
				[
					-112,
					-165
				],
				[
					-263,
					537
				],
				[
					-128,
					807
				],
				[
					-107,
					581
				],
				[
					-97,
					272
				],
				[
					-148,
					553
				],
				[
					-69,
					720
				],
				[
					-48,
					360
				],
				[
					-253,
					791
				],
				[
					-115,
					1116
				],
				[
					-83,
					737
				],
				[
					1,
					698
				],
				[
					-54,
					539
				],
				[
					-404,
					-345
				],
				[
					-196,
					69
				],
				[
					-362,
					698
				],
				[
					133,
					208
				],
				[
					-82,
					226
				],
				[
					-326,
					489
				]
			],
			[
				[
					68937,
					65473
				],
				[
					185,
					384
				],
				[
					612,
					-1
				],
				[
					-56,
					494
				],
				[
					-156,
					292
				],
				[
					-31,
					444
				],
				[
					-182,
					258
				],
				[
					306,
					604
				],
				[
					323,
					-44
				],
				[
					290,
					604
				],
				[
					174,
					584
				],
				[
					270,
					578
				],
				[
					-4,
					411
				],
				[
					236,
					333
				],
				[
					-224,
					284
				],
				[
					-96,
					390
				],
				[
					-99,
					504
				],
				[
					137,
					249
				],
				[
					421,
					-141
				],
				[
					310,
					86
				],
				[
					268,
					484
				]
			],
			[
				[
					48278,
					82851
				],
				[
					46,
					-412
				],
				[
					-210,
					-514
				],
				[
					-493,
					-340
				],
				[
					-393,
					87
				],
				[
					225,
					601
				],
				[
					-145,
					586
				],
				[
					378,
					451
				],
				[
					210,
					269
				]
			],
			[
				[
					64978,
					73251
				],
				[
					244,
					112
				],
				[
					197,
					329
				],
				[
					186,
					-17
				],
				[
					122,
					108
				],
				[
					197,
					-53
				],
				[
					308,
					-292
				],
				[
					221,
					-63
				],
				[
					318,
					-510
				],
				[
					207,
					-21
				],
				[
					24,
					-484
				]
			],
			[
				[
					66909,
					69007
				],
				[
					137,
					-302
				],
				[
					112,
					-348
				],
				[
					266,
					-253
				],
				[
					7,
					-508
				],
				[
					133,
					-93
				],
				[
					23,
					-265
				],
				[
					-400,
					-298
				],
				[
					-105,
					-669
				]
			],
			[
				[
					67082,
					66271
				],
				[
					-523,
					174
				],
				[
					-303,
					133
				],
				[
					-313,
					74
				],
				[
					-118,
					707
				],
				[
					-133,
					102
				],
				[
					-214,
					-103
				],
				[
					-280,
					-279
				],
				[
					-339,
					191
				],
				[
					-281,
					443
				],
				[
					-267,
					164
				],
				[
					-186,
					546
				],
				[
					-205,
					768
				],
				[
					-149,
					-93
				],
				[
					-177,
					190
				],
				[
					-104,
					-224
				]
			],
			[
				[
					63490,
					69064
				],
				[
					-153,
					302
				],
				[
					-3,
					307
				],
				[
					-89,
					0
				],
				[
					46,
					417
				],
				[
					-143,
					438
				],
				[
					-340,
					315
				],
				[
					-193,
					548
				],
				[
					65,
					449
				],
				[
					139,
					199
				],
				[
					-21,
					336
				],
				[
					-182,
					173
				],
				[
					-180,
					687
				]
			],
			[
				[
					62436,
					73235
				],
				[
					-152,
					461
				],
				[
					55,
					179
				],
				[
					-87,
					660
				],
				[
					190,
					164
				]
			],
			[
				[
					63578,
					73897
				],
				[
					88,
					-424
				],
				[
					263,
					-120
				],
				[
					193,
					-289
				],
				[
					395,
					-100
				],
				[
					434,
					153
				],
				[
					27,
					134
				]
			],
			[
				[
					63490,
					69064
				],
				[
					-164,
					28
				]
			],
			[
				[
					63326,
					69092
				],
				[
					-187,
					48
				],
				[
					-204,
					-553
				]
			],
			[
				[
					62935,
					68587
				],
				[
					-516,
					46
				],
				[
					-784,
					1158
				],
				[
					-413,
					403
				],
				[
					-335,
					156
				]
			],
			[
				[
					60887,
					70350
				],
				[
					-112,
					701
				]
			],
			[
				[
					60775,
					71051
				],
				[
					615,
					600
				],
				[
					105,
					696
				],
				[
					-26,
					421
				],
				[
					152,
					142
				],
				[
					142,
					359
				]
			],
			[
				[
					61763,
					73269
				],
				[
					119,
					90
				],
				[
					324,
					-75
				],
				[
					97,
					-146
				],
				[
					133,
					97
				]
			],
			[
				[
					45969,
					90100
				],
				[
					-64,
					-373
				],
				[
					314,
					-392
				],
				[
					-361,
					-440
				],
				[
					-801,
					-394
				],
				[
					-240,
					-105
				],
				[
					-365,
					85
				],
				[
					-775,
					182
				],
				[
					273,
					254
				],
				[
					-605,
					282
				],
				[
					492,
					112
				],
				[
					-12,
					169
				],
				[
					-583,
					134
				],
				[
					188,
					375
				],
				[
					421,
					85
				],
				[
					433,
					-391
				],
				[
					422,
					314
				],
				[
					349,
					-163
				],
				[
					453,
					307
				],
				[
					461,
					-41
				]
			],
			[
				[
					59922,
					70666
				],
				[
					-49,
					-182
				]
			],
			[
				[
					59873,
					70484
				],
				[
					-100,
					80
				],
				[
					-58,
					-383
				],
				[
					69,
					-65
				],
				[
					-71,
					-79
				],
				[
					-12,
					-152
				],
				[
					131,
					78
				]
			],
			[
				[
					59832,
					69963
				],
				[
					7,
					-224
				],
				[
					-139,
					-920
				]
			],
			[
				[
					59518,
					69808
				],
				[
					80,
					190
				],
				[
					-19,
					32
				],
				[
					74,
					270
				],
				[
					56,
					434
				],
				[
					40,
					146
				],
				[
					8,
					6
				]
			],
			[
				[
					59757,
					70886
				],
				[
					93,
					-1
				],
				[
					25,
					101
				],
				[
					75,
					7
				]
			],
			[
				[
					59950,
					70993
				],
				[
					4,
					-236
				],
				[
					-38,
					-87
				],
				[
					6,
					-4
				]
			],
			[
				[
					54311,
					73846
				],
				[
					-100,
					-453
				],
				[
					41,
					-179
				],
				[
					-58,
					-296
				],
				[
					-213,
					217
				],
				[
					-141,
					62
				],
				[
					-387,
					293
				],
				[
					38,
					296
				],
				[
					325,
					-53
				],
				[
					284,
					63
				],
				[
					211,
					50
				]
			],
			[
				[
					52558,
					75561
				],
				[
					166,
					-408
				],
				[
					-39,
					-762
				],
				[
					-126,
					36
				],
				[
					-113,
					-192
				],
				[
					-105,
					153
				],
				[
					-11,
					694
				],
				[
					-64,
					330
				],
				[
					153,
					-29
				],
				[
					139,
					178
				]
			],
			[
				[
					53835,
					78613
				],
				[
					-31,
					-283
				],
				[
					67,
					-246
				]
			],
			[
				[
					53871,
					78084
				],
				[
					-221,
					84
				],
				[
					-226,
					-204
				],
				[
					15,
					-286
				],
				[
					-34,
					-164
				],
				[
					91,
					-293
				],
				[
					261,
					-290
				],
				[
					140,
					-476
				],
				[
					309,
					-464
				],
				[
					217,
					3
				],
				[
					68,
					-127
				],
				[
					-78,
					-115
				],
				[
					249,
					-208
				],
				[
					204,
					-174
				],
				[
					238,
					-301
				],
				[
					29,
					-107
				],
				[
					-52,
					-206
				],
				[
					-154,
					268
				],
				[
					-242,
					95
				],
				[
					-116,
					-372
				],
				[
					200,
					-214
				],
				[
					-33,
					-300
				],
				[
					-116,
					-34
				],
				[
					-148,
					-494
				],
				[
					-116,
					-45
				],
				[
					1,
					176
				],
				[
					57,
					309
				],
				[
					60,
					123
				],
				[
					-108,
					334
				],
				[
					-85,
					290
				],
				[
					-115,
					72
				],
				[
					-82,
					249
				],
				[
					-179,
					104
				],
				[
					-120,
					232
				],
				[
					-206,
					37
				],
				[
					-217,
					260
				],
				[
					-254,
					375
				],
				[
					-189,
					332
				],
				[
					-86,
					569
				],
				[
					-138,
					67
				],
				[
					-226,
					190
				],
				[
					-128,
					-78
				],
				[
					-161,
					-267
				],
				[
					-115,
					-42
				]
			],
			[
				[
					28453,
					62478
				],
				[
					187,
					-52
				],
				[
					147,
					-138
				],
				[
					46,
					-158
				],
				[
					-195,
					-11
				],
				[
					-84,
					-96
				],
				[
					-156,
					92
				],
				[
					-159,
					210
				],
				[
					34,
					132
				],
				[
					116,
					40
				],
				[
					64,
					-19
				]
			],
			[
				[
					59922,
					70666
				],
				[
					309,
					-228
				],
				[
					544,
					613
				]
			],
			[
				[
					60887,
					70350
				],
				[
					-53,
					-87
				],
				[
					-556,
					-289
				],
				[
					277,
					-575
				],
				[
					-92,
					-98
				],
				[
					-46,
					-193
				],
				[
					-212,
					-80
				],
				[
					-66,
					-207
				],
				[
					-120,
					-177
				],
				[
					-310,
					91
				]
			],
			[
				[
					59709,
					68735
				],
				[
					-9,
					84
				]
			],
			[
				[
					59832,
					69963
				],
				[
					41,
					169
				],
				[
					0,
					352
				]
			],
			[
				[
					87399,
					71495
				],
				[
					35,
					-197
				],
				[
					-156,
					-349
				],
				[
					-114,
					185
				],
				[
					-143,
					-134
				],
				[
					-73,
					-337
				],
				[
					-181,
					164
				],
				[
					2,
					273
				],
				[
					154,
					344
				],
				[
					158,
					-67
				],
				[
					114,
					242
				],
				[
					204,
					-124
				]
			],
			[
				[
					89159,
					73219
				],
				[
					-104,
					-460
				],
				[
					48,
					-288
				],
				[
					-145,
					-406
				],
				[
					-355,
					-271
				],
				[
					-488,
					-36
				],
				[
					-396,
					-657
				],
				[
					-186,
					221
				],
				[
					-12,
					431
				],
				[
					-483,
					-127
				],
				[
					-329,
					-271
				],
				[
					-325,
					-11
				],
				[
					282,
					-424
				],
				[
					-186,
					-979
				],
				[
					-179,
					-242
				],
				[
					-135,
					224
				],
				[
					69,
					519
				],
				[
					-176,
					167
				],
				[
					-113,
					395
				],
				[
					263,
					177
				],
				[
					145,
					362
				],
				[
					280,
					298
				],
				[
					203,
					394
				],
				[
					553,
					171
				],
				[
					297,
					-117
				],
				[
					291,
					1024
				],
				[
					185,
					-275
				],
				[
					408,
					575
				],
				[
					158,
					224
				],
				[
					174,
					704
				],
				[
					-47,
					648
				],
				[
					117,
					364
				],
				[
					295,
					105
				],
				[
					152,
					-798
				],
				[
					-9,
					-467
				],
				[
					-256,
					-580
				],
				[
					4,
					-594
				]
			],
			[
				[
					89974,
					77268
				],
				[
					195,
					-122
				],
				[
					197,
					244
				],
				[
					62,
					-647
				],
				[
					-412,
					-157
				],
				[
					-244,
					-572
				],
				[
					-436,
					393
				],
				[
					-152,
					-630
				],
				[
					-308,
					-9
				],
				[
					-39,
					573
				],
				[
					138,
					443
				],
				[
					296,
					32
				],
				[
					81,
					797
				],
				[
					83,
					449
				],
				[
					326,
					-600
				],
				[
					213,
					-194
				]
			],
			[
				[
					69711,
					76170
				],
				[
					-159,
					-107
				],
				[
					-367,
					-401
				],
				[
					-121,
					-412
				],
				[
					-104,
					-4
				],
				[
					-76,
					273
				],
				[
					-353,
					18
				],
				[
					-57,
					472
				],
				[
					-135,
					4
				],
				[
					21,
					578
				],
				[
					-333,
					421
				],
				[
					-476,
					-45
				],
				[
					-326,
					-84
				],
				[
					-265,
					519
				],
				[
					-227,
					218
				],
				[
					-431,
					412
				],
				[
					-52,
					50
				],
				[
					-715,
					-340
				],
				[
					11,
					-2124
				]
			],
			[
				[
					65546,
					75618
				],
				[
					-142,
					-28
				],
				[
					-195,
					452
				],
				[
					-188,
					161
				],
				[
					-315,
					-120
				],
				[
					-123,
					-191
				]
			],
			[
				[
					64583,
					75892
				],
				[
					-15,
					140
				],
				[
					68,
					240
				],
				[
					-53,
					201
				],
				[
					-322,
					196
				],
				[
					-125,
					517
				],
				[
					-154,
					146
				],
				[
					-9,
					187
				],
				[
					270,
					-54
				],
				[
					11,
					421
				],
				[
					236,
					93
				],
				[
					243,
					-86
				],
				[
					50,
					562
				],
				[
					-50,
					356
				],
				[
					-278,
					-28
				],
				[
					-236,
					141
				],
				[
					-321,
					-253
				],
				[
					-259,
					-121
				]
			],
			[
				[
					63639,
					78550
				],
				[
					-142,
					93
				],
				[
					29,
					296
				],
				[
					-177,
					385
				],
				[
					-207,
					-16
				],
				[
					-235,
					391
				],
				[
					160,
					436
				],
				[
					-81,
					118
				],
				[
					222,
					632
				],
				[
					285,
					-334
				],
				[
					35,
					421
				],
				[
					573,
					626
				],
				[
					434,
					15
				],
				[
					612,
					-399
				],
				[
					329,
					-233
				],
				[
					295,
					243
				],
				[
					440,
					12
				],
				[
					356,
					-298
				],
				[
					80,
					170
				],
				[
					391,
					-24
				],
				[
					69,
					272
				],
				[
					-450,
					396
				],
				[
					267,
					281
				],
				[
					-52,
					157
				],
				[
					266,
					150
				],
				[
					-200,
					394
				],
				[
					127,
					197
				],
				[
					1039,
					200
				],
				[
					136,
					142
				],
				[
					695,
					213
				],
				[
					250,
					239
				],
				[
					499,
					-124
				],
				[
					88,
					-597
				],
				[
					290,
					140
				],
				[
					356,
					-197
				],
				[
					-23,
					-314
				],
				[
					267,
					33
				],
				[
					696,
					543
				],
				[
					-102,
					-180
				],
				[
					355,
					-445
				],
				[
					620,
					-1463
				],
				[
					148,
					302
				],
				[
					383,
					-332
				],
				[
					399,
					148
				],
				[
					154,
					-104
				],
				[
					133,
					-332
				],
				[
					194,
					-112
				],
				[
					119,
					-244
				],
				[
					358,
					77
				],
				[
					147,
					-353
				]
			],
			[
				[
					72294,
					76218
				],
				[
					-171,
					84
				],
				[
					-140,
					207
				],
				[
					-412,
					61
				],
				[
					-461,
					15
				],
				[
					-100,
					-63
				],
				[
					-396,
					242
				],
				[
					-158,
					-119
				],
				[
					-43,
					-340
				],
				[
					-457,
					198
				],
				[
					-183,
					-81
				],
				[
					-62,
					-252
				]
			],
			[
				[
					61551,
					50860
				],
				[
					-195,
					-230
				],
				[
					-68,
					-240
				],
				[
					-104,
					-42
				],
				[
					-40,
					-406
				],
				[
					-89,
					-233
				],
				[
					-54,
					-383
				],
				[
					-112,
					-190
				]
			],
			[
				[
					60889,
					49136
				],
				[
					-399,
					576
				],
				[
					-19,
					334
				],
				[
					-1007,
					1173
				],
				[
					-47,
					63
				]
			],
			[
				[
					59417,
					51282
				],
				[
					-3,
					611
				],
				[
					80,
					233
				],
				[
					137,
					381
				],
				[
					101,
					420
				],
				[
					-123,
					661
				],
				[
					-32,
					289
				],
				[
					-132,
					400
				]
			],
			[
				[
					59445,
					54277
				],
				[
					171,
					344
				],
				[
					188,
					379
				]
			],
			[
				[
					61626,
					54086
				],
				[
					-243,
					-653
				],
				[
					3,
					-2098
				],
				[
					165,
					-475
				]
			],
			[
				[
					70465,
					74537
				],
				[
					-526,
					-87
				],
				[
					-343,
					187
				],
				[
					-301,
					-45
				],
				[
					26,
					332
				],
				[
					303,
					-96
				],
				[
					101,
					177
				]
			],
			[
				[
					69725,
					75005
				],
				[
					212,
					-56
				],
				[
					355,
					414
				],
				[
					-329,
					304
				],
				[
					-198,
					-144
				],
				[
					-205,
					217
				],
				[
					234,
					373
				],
				[
					-83,
					57
				]
			],
			[
				[
					78495,
					58847
				],
				[
					-66,
					696
				],
				[
					178,
					479
				],
				[
					359,
					110
				],
				[
					261,
					-83
				]
			],
			[
				[
					79227,
					60049
				],
				[
					229,
					-226
				],
				[
					126,
					397
				],
				[
					246,
					-212
				]
			],
			[
				[
					79828,
					60008
				],
				[
					64,
					-384
				],
				[
					-34,
					-690
				],
				[
					-467,
					-443
				],
				[
					122,
					-349
				],
				[
					-292,
					-42
				],
				[
					-240,
					-232
				]
			],
			[
				[
					78981,
					57868
				],
				[
					-233,
					84
				],
				[
					-112,
					301
				],
				[
					-141,
					594
				]
			],
			[
				[
					85652,
					74065
				],
				[
					240,
					-679
				],
				[
					68,
					-373
				],
				[
					3,
					-664
				],
				[
					-105,
					-316
				],
				[
					-252,
					-111
				],
				[
					-222,
					-239
				],
				[
					-250,
					-49
				],
				[
					-31,
					313
				],
				[
					51,
					432
				],
				[
					-122,
					600
				],
				[
					206,
					97
				],
				[
					-190,
					493
				]
			],
			[
				[
					85048,
					73569
				],
				[
					17,
					52
				],
				[
					124,
					-21
				],
				[
					108,
					260
				],
				[
					197,
					28
				],
				[
					118,
					38
				],
				[
					40,
					139
				]
			],
			[
				[
					55575,
					76355
				],
				[
					52,
					129
				]
			],
			[
				[
					55627,
					76484
				],
				[
					66,
					42
				],
				[
					38,
					191
				],
				[
					50,
					32
				],
				[
					40,
					-81
				],
				[
					52,
					-36
				],
				[
					36,
					-92
				],
				[
					46,
					-27
				],
				[
					54,
					-107
				],
				[
					39,
					3
				],
				[
					-31,
					-140
				],
				[
					-33,
					-68
				],
				[
					9,
					-43
				]
			],
			[
				[
					55993,
					76158
				],
				[
					-62,
					-23
				],
				[
					-164,
					-89
				],
				[
					-13,
					-118
				],
				[
					-35,
					5
				]
			],
			[
				[
					63326,
					69092
				],
				[
					58,
					-254
				],
				[
					-25,
					-132
				],
				[
					89,
					-434
				]
			],
			[
				[
					63448,
					68272
				],
				[
					-196,
					-15
				],
				[
					-69,
					274
				],
				[
					-248,
					56
				]
			],
			[
				[
					79227,
					60049
				],
				[
					90,
					260
				],
				[
					12,
					487
				],
				[
					-224,
					502
				],
				[
					-18,
					568
				],
				[
					-211,
					468
				],
				[
					-210,
					40
				],
				[
					-56,
					-201
				],
				[
					-163,
					-17
				],
				[
					-83,
					102
				],
				[
					-293,
					-344
				],
				[
					-6,
					517
				],
				[
					68,
					606
				],
				[
					-188,
					27
				],
				[
					-16,
					346
				],
				[
					-120,
					178
				]
			],
			[
				[
					77809,
					63588
				],
				[
					59,
					212
				],
				[
					237,
					374
				]
			],
			[
				[
					78380,
					64766
				],
				[
					162,
					-454
				],
				[
					125,
					-524
				],
				[
					342,
					-4
				],
				[
					108,
					-502
				],
				[
					-178,
					-151
				],
				[
					-80,
					-207
				],
				[
					333,
					-345
				],
				[
					231,
					-680
				],
				[
					175,
					-508
				],
				[
					210,
					-400
				],
				[
					70,
					-407
				],
				[
					-50,
					-576
				]
			],
			[
				[
					59757,
					70886
				],
				[
					99,
					469
				],
				[
					138,
					406
				],
				[
					5,
					20
				]
			],
			[
				[
					59999,
					71781
				],
				[
					125,
					-30
				],
				[
					45,
					-226
				],
				[
					-151,
					-217
				],
				[
					-68,
					-315
				]
			],
			[
				[
					47857,
					54343
				],
				[
					-73,
					-5
				],
				[
					-286,
					274
				],
				[
					-252,
					439
				],
				[
					-237,
					315
				],
				[
					-187,
					371
				]
			],
			[
				[
					46822,
					55737
				],
				[
					66,
					184
				],
				[
					15,
					168
				],
				[
					126,
					313
				],
				[
					129,
					268
				]
			],
			[
				[
					54125,
					64996
				],
				[
					-197,
					-214
				],
				[
					-156,
					316
				],
				[
					-439,
					248
				]
			],
			[
				[
					52633,
					69283
				],
				[
					136,
					133
				],
				[
					24,
					244
				],
				[
					-30,
					238
				],
				[
					191,
					222
				],
				[
					86,
					185
				],
				[
					135,
					165
				],
				[
					16,
					442
				]
			],
			[
				[
					53191,
					70912
				],
				[
					326,
					-198
				],
				[
					117,
					50
				],
				[
					232,
					-96
				],
				[
					368,
					-258
				],
				[
					130,
					-512
				],
				[
					250,
					-111
				],
				[
					391,
					-242
				],
				[
					296,
					-286
				],
				[
					136,
					150
				],
				[
					133,
					264
				],
				[
					-65,
					442
				],
				[
					87,
					280
				],
				[
					200,
					270
				],
				[
					192,
					78
				],
				[
					375,
					-118
				],
				[
					95,
					-257
				],
				[
					104,
					-3
				],
				[
					88,
					-98
				],
				[
					276,
					-67
				],
				[
					68,
					-191
				]
			],
			[
				[
					56944,
					64499
				],
				[
					0,
					-1150
				],
				[
					-320,
					-2
				],
				[
					-3,
					-242
				]
			],
			[
				[
					56621,
					63105
				],
				[
					-1108,
					1103
				],
				[
					-1108,
					1103
				],
				[
					-280,
					-315
				]
			],
			[
				[
					72718,
					56162
				],
				[
					-42,
					-600
				],
				[
					-116,
					-164
				],
				[
					-242,
					-132
				],
				[
					-132,
					458
				],
				[
					-49,
					828
				],
				[
					126,
					935
				],
				[
					192,
					-320
				],
				[
					129,
					-406
				],
				[
					134,
					-599
				]
			],
			[
				[
					58049,
					35154
				],
				[
					96,
					-173
				],
				[
					-85,
					-281
				],
				[
					-47,
					-187
				],
				[
					-155,
					-90
				],
				[
					-51,
					-184
				],
				[
					-99,
					-58
				],
				[
					-209,
					443
				],
				[
					148,
					365
				],
				[
					151,
					225
				],
				[
					130,
					118
				],
				[
					121,
					-178
				]
			],
			[
				[
					56314,
					83116
				],
				[
					-23,
					147
				],
				[
					30,
					157
				],
				[
					-123,
					92
				],
				[
					-291,
					100
				]
			],
			[
				[
					55907,
					83612
				],
				[
					-59,
					485
				]
			],
			[
				[
					55848,
					84097
				],
				[
					318,
					176
				],
				[
					466,
					-37
				],
				[
					273,
					57
				],
				[
					39,
					-120
				],
				[
					148,
					-37
				],
				[
					267,
					-279
				]
			],
			[
				[
					56523,
					82877
				],
				[
					-67,
					177
				],
				[
					-142,
					62
				]
			],
			[
				[
					55848,
					84097
				],
				[
					10,
					433
				],
				[
					136,
					362
				],
				[
					262,
					196
				],
				[
					221,
					-430
				],
				[
					223,
					11
				],
				[
					53,
					442
				]
			],
			[
				[
					57579,
					84928
				],
				[
					134,
					-133
				],
				[
					24,
					-279
				],
				[
					89,
					-340
				]
			],
			[
				[
					47592,
					67756
				],
				[
					-42,
					0
				],
				[
					7,
					-308
				],
				[
					-172,
					-19
				],
				[
					-90,
					-131
				],
				[
					-126,
					0
				],
				[
					-100,
					75
				],
				[
					-234,
					-62
				],
				[
					-91,
					-449
				],
				[
					-86,
					-42
				],
				[
					-131,
					-726
				],
				[
					-386,
					-621
				],
				[
					-92,
					-796
				],
				[
					-114,
					-258
				],
				[
					-33,
					-208
				],
				[
					-625,
					-46
				],
				[
					-5,
					1
				]
			],
			[
				[
					45272,
					64166
				],
				[
					13,
					267
				],
				[
					106,
					157
				],
				[
					91,
					300
				],
				[
					-18,
					195
				],
				[
					96,
					406
				],
				[
					155,
					366
				],
				[
					93,
					93
				],
				[
					74,
					336
				],
				[
					6,
					307
				],
				[
					100,
					356
				],
				[
					185,
					210
				],
				[
					177,
					588
				],
				[
					5,
					8
				],
				[
					139,
					221
				],
				[
					259,
					64
				],
				[
					218,
					393
				],
				[
					140,
					154
				],
				[
					232,
					481
				],
				[
					-70,
					716
				],
				[
					106,
					495
				],
				[
					37,
					304
				],
				[
					179,
					389
				],
				[
					278,
					263
				],
				[
					206,
					238
				],
				[
					186,
					596
				],
				[
					87,
					354
				],
				[
					205,
					-3
				],
				[
					167,
					-244
				],
				[
					264,
					39
				],
				[
					288,
					-127
				],
				[
					121,
					-6
				]
			],
			[
				[
					57394,
					79599
				],
				[
					66,
					85
				],
				[
					185,
					57
				],
				[
					204,
					-180
				],
				[
					115,
					-21
				],
				[
					125,
					-155
				],
				[
					-20,
					-195
				],
				[
					101,
					-95
				],
				[
					40,
					-240
				],
				[
					97,
					-147
				],
				[
					-19,
					-86
				],
				[
					52,
					-58
				],
				[
					-74,
					-43
				],
				[
					-164,
					17
				],
				[
					-27,
					80
				],
				[
					-58,
					-46
				],
				[
					20,
					-103
				],
				[
					-76,
					-184
				],
				[
					-49,
					-197
				],
				[
					-70,
					-63
				]
			],
			[
				[
					57842,
					78025
				],
				[
					-50,
					263
				],
				[
					30,
					246
				],
				[
					-9,
					253
				],
				[
					-160,
					342
				],
				[
					-89,
					243
				],
				[
					-86,
					171
				],
				[
					-84,
					56
				]
			],
			[
				[
					63761,
					44648
				],
				[
					74,
					-245
				],
				[
					69,
					-380
				],
				[
					45,
					-693
				],
				[
					72,
					-269
				],
				[
					-28,
					-277
				],
				[
					-49,
					-169
				],
				[
					-94,
					338
				],
				[
					-53,
					-171
				],
				[
					53,
					-427
				],
				[
					-24,
					-244
				],
				[
					-77,
					-133
				],
				[
					-18,
					-488
				],
				[
					-109,
					-671
				],
				[
					-137,
					-793
				],
				[
					-172,
					-1092
				],
				[
					-106,
					-800
				],
				[
					-125,
					-668
				],
				[
					-226,
					-136
				],
				[
					-243,
					-244
				],
				[
					-160,
					147
				],
				[
					-220,
					206
				],
				[
					-77,
					304
				],
				[
					-18,
					510
				],
				[
					-98,
					460
				],
				[
					-26,
					414
				],
				[
					50,
					415
				],
				[
					128,
					100
				],
				[
					1,
					191
				],
				[
					133,
					437
				],
				[
					25,
					367
				],
				[
					-65,
					272
				],
				[
					-52,
					364
				],
				[
					-23,
					530
				],
				[
					97,
					322
				],
				[
					38,
					366
				],
				[
					138,
					21
				],
				[
					155,
					118
				],
				[
					103,
					104
				],
				[
					122,
					8
				],
				[
					158,
					328
				],
				[
					229,
					355
				],
				[
					83,
					289
				],
				[
					-38,
					247
				],
				[
					118,
					-70
				],
				[
					153,
					401
				],
				[
					6,
					346
				],
				[
					92,
					257
				],
				[
					96,
					-247
				]
			],
			[
				[
					23016,
					66727
				],
				[
					-107,
					-505
				],
				[
					-49,
					-415
				],
				[
					-20,
					-771
				],
				[
					-27,
					-281
				],
				[
					48,
					-315
				],
				[
					86,
					-280
				],
				[
					56,
					-447
				],
				[
					184,
					-429
				],
				[
					65,
					-328
				],
				[
					109,
					-284
				],
				[
					295,
					-153
				],
				[
					114,
					-241
				],
				[
					244,
					161
				],
				[
					212,
					58
				],
				[
					208,
					104
				],
				[
					175,
					99
				],
				[
					176,
					235
				],
				[
					67,
					336
				],
				[
					22,
					483
				],
				[
					48,
					169
				],
				[
					188,
					151
				],
				[
					294,
					133
				],
				[
					246,
					-20
				],
				[
					169,
					49
				],
				[
					66,
					-122
				],
				[
					-9,
					-278
				],
				[
					-149,
					-342
				],
				[
					-66,
					-351
				],
				[
					51,
					-100
				],
				[
					-42,
					-249
				],
				[
					-69,
					-449
				],
				[
					-71,
					148
				],
				[
					-58,
					-10
				]
			],
			[
				[
					24381,
					60202
				],
				[
					-314,
					620
				],
				[
					-144,
					187
				],
				[
					-226,
					150
				],
				[
					-156,
					-42
				],
				[
					-223,
					-216
				],
				[
					-140,
					-57
				],
				[
					-196,
					152
				],
				[
					-208,
					109
				],
				[
					-260,
					264
				],
				[
					-208,
					81
				],
				[
					-314,
					268
				],
				[
					-233,
					275
				],
				[
					-70,
					154
				],
				[
					-155,
					34
				],
				[
					-284,
					183
				],
				[
					-116,
					262
				],
				[
					-299,
					327
				],
				[
					-139,
					363
				],
				[
					-66,
					281
				],
				[
					93,
					56
				],
				[
					-29,
					164
				],
				[
					64,
					150
				],
				[
					1,
					199
				],
				[
					-93,
					259
				],
				[
					-25,
					229
				],
				[
					-94,
					290
				],
				[
					-244,
					573
				],
				[
					-280,
					450
				],
				[
					-135,
					359
				],
				[
					-238,
					235
				],
				[
					-51,
					140
				],
				[
					42,
					356
				],
				[
					-142,
					135
				],
				[
					-164,
					279
				],
				[
					-69,
					402
				],
				[
					-149,
					47
				],
				[
					-162,
					303
				],
				[
					-130,
					281
				],
				[
					-12,
					180
				],
				[
					-149,
					434
				],
				[
					-99,
					441
				],
				[
					5,
					221
				],
				[
					-201,
					229
				],
				[
					-93,
					-26
				],
				[
					-159,
					159
				],
				[
					-44,
					-234
				],
				[
					46,
					-276
				],
				[
					27,
					-433
				],
				[
					95,
					-237
				],
				[
					206,
					-397
				],
				[
					46,
					-135
				],
				[
					42,
					-41
				],
				[
					37,
					-198
				],
				[
					49,
					8
				],
				[
					56,
					-372
				],
				[
					85,
					-146
				],
				[
					59,
					-204
				],
				[
					174,
					-293
				],
				[
					92,
					-536
				],
				[
					83,
					-252
				],
				[
					77,
					-270
				],
				[
					15,
					-304
				],
				[
					134,
					-19
				],
				[
					112,
					-261
				],
				[
					100,
					-257
				],
				[
					-6,
					-104
				],
				[
					-117,
					-211
				],
				[
					-49,
					3
				],
				[
					-74,
					350
				],
				[
					-181,
					328
				],
				[
					-201,
					278
				],
				[
					-142,
					147
				],
				[
					9,
					421
				],
				[
					-42,
					312
				],
				[
					-132,
					179
				],
				[
					-191,
					257
				],
				[
					-37,
					-75
				],
				[
					-70,
					151
				],
				[
					-171,
					139
				],
				[
					-164,
					334
				],
				[
					20,
					44
				],
				[
					115,
					-33
				],
				[
					103,
					215
				],
				[
					10,
					260
				],
				[
					-214,
					411
				],
				[
					-163,
					159
				],
				[
					-102,
					360
				],
				[
					-103,
					377
				],
				[
					-129,
					461
				],
				[
					-113,
					518
				]
			],
			[
				[
					17464,
					70566
				],
				[
					316,
					44
				],
				[
					353,
					63
				],
				[
					-26,
					-113
				],
				[
					419,
					-280
				],
				[
					634,
					-406
				],
				[
					552,
					5
				],
				[
					221,
					0
				],
				[
					0,
					237
				],
				[
					481,
					0
				],
				[
					102,
					-204
				],
				[
					142,
					-182
				],
				[
					165,
					-253
				],
				[
					92,
					-301
				],
				[
					69,
					-317
				],
				[
					144,
					-174
				],
				[
					230,
					-172
				],
				[
					175,
					455
				],
				[
					227,
					11
				],
				[
					196,
					-230
				],
				[
					139,
					-394
				],
				[
					96,
					-338
				],
				[
					164,
					-328
				],
				[
					61,
					-403
				],
				[
					78,
					-271
				],
				[
					217,
					-178
				],
				[
					197,
					-127
				],
				[
					108,
					17
				]
			],
			[
				[
					55993,
					76158
				],
				[
					95,
					33
				],
				[
					128,
					10
				]
			],
			[
				[
					46619,
					60247
				],
				[
					93,
					105
				],
				[
					47,
					339
				],
				[
					88,
					13
				],
				[
					194,
					-160
				],
				[
					157,
					114
				],
				[
					107,
					-38
				],
				[
					42,
					128
				],
				[
					1114,
					8
				],
				[
					62,
					404
				],
				[
					-48,
					71
				],
				[
					-134,
					2485
				],
				[
					-134,
					2485
				],
				[
					425,
					11
				]
			],
			[
				[
					51185,
					62860
				],
				[
					1,
					-1326
				],
				[
					-152,
					-384
				],
				[
					-24,
					-355
				],
				[
					-247,
					-92
				],
				[
					-379,
					-49
				],
				[
					-102,
					-205
				],
				[
					-178,
					-22
				]
			],
			[
				[
					46801,
					58995
				],
				[
					13,
					179
				],
				[
					-24,
					223
				],
				[
					-104,
					162
				],
				[
					-54,
					330
				],
				[
					-13,
					358
				]
			],
			[
				[
					77375,
					57550
				],
				[
					-27,
					427
				],
				[
					86,
					441
				],
				[
					-94,
					341
				],
				[
					23,
					627
				],
				[
					-113,
					299
				],
				[
					-90,
					689
				],
				[
					-50,
					727
				],
				[
					-121,
					477
				],
				[
					-183,
					-289
				],
				[
					-315,
					-410
				],
				[
					-156,
					51
				],
				[
					-172,
					135
				],
				[
					96,
					714
				],
				[
					-58,
					539
				],
				[
					-218,
					664
				],
				[
					34,
					208
				],
				[
					-163,
					74
				],
				[
					-197,
					469
				]
			],
			[
				[
					77809,
					63588
				],
				[
					-159,
					-134
				],
				[
					-162,
					-249
				],
				[
					-196,
					-26
				],
				[
					-127,
					-623
				],
				[
					-117,
					-104
				],
				[
					134,
					-506
				],
				[
					177,
					-420
				],
				[
					113,
					-380
				],
				[
					-101,
					-501
				],
				[
					-96,
					-106
				],
				[
					66,
					-289
				],
				[
					185,
					-458
				],
				[
					32,
					-321
				],
				[
					-4,
					-268
				],
				[
					108,
					-525
				],
				[
					-152,
					-537
				],
				[
					-135,
					-591
				]
			],
			[
				[
					55380,
					75946
				],
				[
					-58,
					44
				],
				[
					-78,
					188
				],
				[
					-120,
					115
				]
			],
			[
				[
					55338,
					76894
				],
				[
					74,
					-99
				],
				[
					40,
					-80
				],
				[
					91,
					-62
				],
				[
					106,
					-119
				],
				[
					-22,
					-50
				]
			],
			[
				[
					74375,
					80219
				],
				[
					292,
					99
				],
				[
					530,
					496
				],
				[
					423,
					271
				],
				[
					242,
					-176
				],
				[
					289,
					-9
				],
				[
					186,
					-269
				],
				[
					277,
					-21
				],
				[
					402,
					-144
				],
				[
					270,
					401
				],
				[
					-113,
					339
				],
				[
					288,
					596
				],
				[
					311,
					-238
				],
				[
					252,
					-67
				],
				[
					327,
					-148
				],
				[
					53,
					-432
				],
				[
					394,
					-242
				],
				[
					263,
					107
				],
				[
					351,
					75
				],
				[
					279,
					-76
				],
				[
					272,
					-276
				],
				[
					168,
					-295
				],
				[
					258,
					6
				],
				[
					350,
					-94
				],
				[
					255,
					143
				],
				[
					366,
					96
				],
				[
					407,
					405
				],
				[
					166,
					-62
				],
				[
					146,
					-193
				],
				[
					331,
					48
				]
			],
			[
				[
					59599,
					45195
				],
				[
					209,
					47
				],
				[
					334,
					-163
				],
				[
					73,
					73
				],
				[
					193,
					15
				],
				[
					99,
					173
				],
				[
					167,
					-10
				],
				[
					303,
					224
				],
				[
					221,
					334
				]
			],
			[
				[
					61198,
					45888
				],
				[
					45,
					-258
				],
				[
					-11,
					-574
				],
				[
					34,
					-505
				],
				[
					11,
					-900
				],
				[
					49,
					-282
				],
				[
					-83,
					-412
				],
				[
					-108,
					-400
				],
				[
					-177,
					-357
				],
				[
					-254,
					-219
				],
				[
					-313,
					-279
				],
				[
					-313,
					-618
				],
				[
					-107,
					-106
				],
				[
					-194,
					-409
				],
				[
					-115,
					-133
				],
				[
					-23,
					-411
				],
				[
					132,
					-436
				],
				[
					54,
					-337
				],
				[
					4,
					-173
				],
				[
					49,
					29
				],
				[
					-8,
					-565
				],
				[
					-45,
					-267
				],
				[
					65,
					-99
				],
				[
					-41,
					-239
				],
				[
					-116,
					-205
				],
				[
					-229,
					-195
				],
				[
					-334,
					-312
				],
				[
					-122,
					-213
				],
				[
					24,
					-242
				],
				[
					71,
					-39
				],
				[
					-24,
					-303
				]
			],
			[
				[
					59119,
					36429
				],
				[
					-211,
					5
				]
			],
			[
				[
					58908,
					36434
				],
				[
					-24,
					254
				],
				[
					-41,
					259
				]
			],
			[
				[
					58843,
					36947
				],
				[
					-23,
					206
				],
				[
					49,
					642
				],
				[
					-72,
					410
				],
				[
					-133,
					810
				]
			],
			[
				[
					58664,
					39015
				],
				[
					292,
					654
				],
				[
					74,
					415
				],
				[
					42,
					52
				],
				[
					31,
					339
				],
				[
					-45,
					171
				],
				[
					12,
					430
				],
				[
					54,
					400
				],
				[
					0,
					728
				],
				[
					-145,
					185
				],
				[
					-132,
					42
				],
				[
					-60,
					143
				],
				[
					-128,
					121
				],
				[
					-232,
					-11
				],
				[
					-18,
					215
				]
			],
			[
				[
					58409,
					42899
				],
				[
					-26,
					410
				],
				[
					843,
					474
				]
			],
			[
				[
					59226,
					43783
				],
				[
					159,
					-276
				],
				[
					77,
					53
				],
				[
					110,
					-146
				],
				[
					16,
					-231
				],
				[
					-59,
					-268
				],
				[
					21,
					-405
				],
				[
					181,
					-356
				],
				[
					85,
					399
				],
				[
					120,
					122
				],
				[
					-24,
					740
				],
				[
					-116,
					417
				],
				[
					-100,
					185
				],
				[
					-97,
					-8
				],
				[
					-77,
					748
				],
				[
					77,
					438
				]
			],
			[
				[
					46619,
					60247
				],
				[
					-184,
					395
				],
				[
					-168,
					424
				],
				[
					-184,
					153
				],
				[
					-133,
					169
				],
				[
					-155,
					-6
				],
				[
					-135,
					-126
				],
				[
					-138,
					50
				],
				[
					-96,
					-185
				]
			],
			[
				[
					45426,
					61121
				],
				[
					-24,
					311
				],
				[
					78,
					283
				],
				[
					34,
					543
				],
				[
					-30,
					569
				],
				[
					-34,
					286
				],
				[
					28,
					287
				],
				[
					-72,
					274
				],
				[
					-146,
					249
				]
			],
			[
				[
					45260,
					63923
				],
				[
					60,
					192
				],
				[
					1088,
					-4
				],
				[
					-53,
					832
				],
				[
					68,
					296
				],
				[
					261,
					51
				],
				[
					-9,
					1474
				],
				[
					911,
					-30
				],
				[
					1,
					872
				]
			],
			[
				[
					59226,
					43783
				],
				[
					-147,
					149
				],
				[
					85,
					535
				],
				[
					87,
					201
				],
				[
					-53,
					477
				],
				[
					56,
					467
				],
				[
					47,
					156
				],
				[
					-71,
					489
				],
				[
					-131,
					257
				]
			],
			[
				[
					59099,
					46514
				],
				[
					273,
					-108
				],
				[
					55,
					-159
				],
				[
					95,
					-269
				],
				[
					77,
					-783
				]
			],
			[
				[
					78372,
					55412
				],
				[
					64,
					-54
				],
				[
					164,
					-347
				],
				[
					116,
					-386
				],
				[
					16,
					-388
				],
				[
					-29,
					-262
				],
				[
					27,
					-198
				],
				[
					20,
					-340
				],
				[
					98,
					-159
				],
				[
					109,
					-509
				],
				[
					-5,
					-195
				],
				[
					-197,
					-38
				],
				[
					-263,
					426
				],
				[
					-329,
					457
				],
				[
					-32,
					294
				],
				[
					-161,
					385
				],
				[
					-38,
					477
				],
				[
					-100,
					314
				],
				[
					30,
					419
				],
				[
					-61,
					244
				]
			],
			[
				[
					77801,
					55552
				],
				[
					48,
					103
				],
				[
					227,
					-252
				],
				[
					22,
					-296
				],
				[
					183,
					69
				],
				[
					91,
					236
				]
			],
			[
				[
					80461,
					52985
				],
				[
					204,
					-198
				],
				[
					214,
					108
				],
				[
					56,
					488
				],
				[
					119,
					108
				],
				[
					333,
					125
				],
				[
					199,
					456
				],
				[
					137,
					364
				]
			],
			[
				[
					82069,
					54967
				],
				[
					214,
					400
				],
				[
					140,
					450
				],
				[
					112,
					2
				],
				[
					143,
					-291
				],
				[
					13,
					-251
				],
				[
					183,
					-160
				],
				[
					231,
					-173
				],
				[
					-20,
					-226
				],
				[
					-186,
					-29
				],
				[
					50,
					-281
				],
				[
					-205,
					-196
				]
			],
			[
				[
					54540,
					35373
				],
				[
					-207,
					435
				],
				[
					-108,
					420
				],
				[
					-62,
					561
				],
				[
					-68,
					417
				],
				[
					-93,
					887
				],
				[
					-7,
					689
				],
				[
					-35,
					314
				],
				[
					-108,
					237
				],
				[
					-144,
					476
				],
				[
					-146,
					691
				],
				[
					-60,
					361
				],
				[
					-226,
					563
				],
				[
					-17,
					441
				]
			],
			[
				[
					56448,
					41738
				],
				[
					228,
					131
				],
				[
					180,
					-33
				],
				[
					109,
					-130
				],
				[
					2,
					-48
				]
			],
			[
				[
					55526,
					37566
				],
				[
					0,
					-2127
				],
				[
					-248,
					-294
				],
				[
					-149,
					-42
				],
				[
					-175,
					108
				],
				[
					-125,
					42
				],
				[
					-47,
					247
				],
				[
					-109,
					157
				],
				[
					-133,
					-284
				]
			],
			[
				[
					96049,
					39690
				],
				[
					228,
					-357
				],
				[
					144,
					-265
				],
				[
					-105,
					-138
				],
				[
					-153,
					155
				],
				[
					-199,
					259
				],
				[
					-179,
					306
				],
				[
					-184,
					406
				],
				[
					-38,
					195
				],
				[
					119,
					-8
				],
				[
					156,
					-196
				],
				[
					122,
					-196
				],
				[
					89,
					-161
				]
			],
			[
				[
					54125,
					64996
				],
				[
					68,
					-895
				],
				[
					104,
					-150
				],
				[
					4,
					-183
				],
				[
					116,
					-198
				],
				[
					-60,
					-248
				],
				[
					-107,
					-1168
				],
				[
					-15,
					-749
				],
				[
					-354,
					-543
				],
				[
					-120,
					-759
				],
				[
					115,
					-213
				],
				[
					0,
					-371
				],
				[
					178,
					-13
				],
				[
					-28,
					-271
				]
			],
			[
				[
					53939,
					59018
				],
				[
					-52,
					-12
				],
				[
					-188,
					630
				],
				[
					-65,
					23
				],
				[
					-217,
					-322
				],
				[
					-215,
					168
				],
				[
					-150,
					34
				],
				[
					-80,
					-81
				],
				[
					-163,
					17
				],
				[
					-164,
					-245
				],
				[
					-141,
					-14
				],
				[
					-337,
					298
				],
				[
					-131,
					-142
				],
				[
					-142,
					10
				],
				[
					-104,
					218
				],
				[
					-279,
					214
				],
				[
					-298,
					-68
				],
				[
					-72,
					-124
				],
				[
					-39,
					-331
				],
				[
					-80,
					-233
				],
				[
					-19,
					-514
				]
			],
			[
				[
					52361,
					54577
				],
				[
					-289,
					-207
				],
				[
					-105,
					30
				],
				[
					-107,
					-129
				],
				[
					-222,
					13
				],
				[
					-149,
					360
				],
				[
					-91,
					417
				],
				[
					-197,
					379
				],
				[
					-209,
					-7
				],
				[
					-245,
					1
				]
			],
			[
				[
					26191,
					58215
				],
				[
					-96,
					181
				],
				[
					-130,
					233
				],
				[
					-61,
					194
				],
				[
					-117,
					181
				],
				[
					-140,
					260
				],
				[
					31,
					89
				],
				[
					46,
					-87
				],
				[
					21,
					41
				]
			],
			[
				[
					26903,
					60465
				],
				[
					-24,
					-55
				],
				[
					-14,
					-129
				],
				[
					29,
					-210
				],
				[
					-64,
					-197
				],
				[
					-30,
					-231
				],
				[
					-9,
					-254
				],
				[
					15,
					-148
				],
				[
					7,
					-260
				],
				[
					-43,
					-56
				],
				[
					-26,
					-247
				],
				[
					19,
					-152
				],
				[
					-56,
					-147
				],
				[
					12,
					-156
				],
				[
					43,
					-94
				]
			],
			[
				[
					50920,
					81398
				],
				[
					143,
					159
				],
				[
					244,
					847
				],
				[
					380,
					241
				],
				[
					231,
					-16
				]
			],
			[
				[
					58639,
					91887
				],
				[
					-473,
					-231
				],
				[
					-224,
					-54
				]
			],
			[
				[
					55734,
					91626
				],
				[
					-172,
					-23
				],
				[
					-41,
					-379
				],
				[
					-523,
					92
				],
				[
					-74,
					-321
				],
				[
					-267,
					2
				],
				[
					-183,
					-409
				],
				[
					-278,
					-639
				],
				[
					-431,
					-810
				],
				[
					101,
					-197
				],
				[
					-97,
					-228
				],
				[
					-275,
					10
				],
				[
					-180,
					-540
				],
				[
					17,
					-765
				],
				[
					177,
					-292
				],
				[
					-92,
					-677
				],
				[
					-231,
					-395
				],
				[
					-122,
					-332
				]
			],
			[
				[
					53063,
					85723
				],
				[
					-187,
					354
				],
				[
					-548,
					-666
				],
				[
					-371,
					-135
				],
				[
					-384,
					293
				],
				[
					-99,
					619
				],
				[
					-88,
					1329
				],
				[
					256,
					371
				],
				[
					733,
					483
				],
				[
					549,
					595
				],
				[
					508,
					802
				],
				[
					668,
					1112
				],
				[
					465,
					434
				],
				[
					763,
					722
				],
				[
					610,
					252
				],
				[
					457,
					-31
				],
				[
					423,
					477
				],
				[
					506,
					-25
				],
				[
					499,
					115
				],
				[
					869,
					-422
				],
				[
					-358,
					-154
				],
				[
					305,
					-361
				]
			],
			[
				[
					56867,
					96664
				],
				[
					-620,
					-236
				],
				[
					-490,
					134
				],
				[
					191,
					149
				],
				[
					-167,
					184
				],
				[
					575,
					115
				],
				[
					110,
					-216
				],
				[
					401,
					-130
				]
			],
			[
				[
					55069,
					97728
				],
				[
					915,
					-429
				],
				[
					-699,
					-227
				],
				[
					-155,
					-424
				],
				[
					-243,
					-108
				],
				[
					-132,
					-478
				],
				[
					-335,
					-22
				],
				[
					-598,
					351
				],
				[
					252,
					205
				],
				[
					-416,
					166
				],
				[
					-541,
					487
				],
				[
					-216,
					451
				],
				[
					757,
					206
				],
				[
					152,
					-202
				],
				[
					396,
					8
				],
				[
					105,
					197
				],
				[
					408,
					20
				],
				[
					350,
					-201
				]
			],
			[
				[
					57068,
					98134
				],
				[
					545,
					-202
				],
				[
					-412,
					-310
				],
				[
					-806,
					-68
				],
				[
					-819,
					96
				],
				[
					-50,
					159
				],
				[
					-398,
					10
				],
				[
					-304,
					264
				],
				[
					858,
					161
				],
				[
					403,
					-138
				],
				[
					281,
					172
				],
				[
					702,
					-144
				]
			],
			[
				[
					98060,
					28265
				],
				[
					63,
					-238
				],
				[
					198,
					233
				],
				[
					80,
					-243
				],
				[
					0,
					-242
				],
				[
					-103,
					-267
				],
				[
					-182,
					-424
				],
				[
					-142,
					-232
				],
				[
					103,
					-277
				],
				[
					-214,
					-7
				],
				[
					-238,
					-217
				],
				[
					-75,
					-377
				],
				[
					-157,
					-583
				],
				[
					-219,
					-257
				],
				[
					-138,
					-164
				],
				[
					-256,
					12
				],
				[
					-180,
					190
				],
				[
					-302,
					40
				],
				[
					-46,
					212
				],
				[
					149,
					427
				],
				[
					349,
					568
				],
				[
					179,
					109
				],
				[
					200,
					219
				],
				[
					238,
					301
				],
				[
					167,
					299
				],
				[
					123,
					429
				],
				[
					106,
					146
				],
				[
					41,
					321
				],
				[
					195,
					267
				],
				[
					61,
					-245
				]
			],
			[
				[
					98502,
					31008
				],
				[
					202,
					-607
				],
				[
					5,
					394
				],
				[
					126,
					-158
				],
				[
					41,
					-435
				],
				[
					224,
					-188
				],
				[
					188,
					-46
				],
				[
					158,
					220
				],
				[
					141,
					-67
				],
				[
					-67,
					-511
				],
				[
					-85,
					-336
				],
				[
					-212,
					12
				],
				[
					-74,
					-175
				],
				[
					26,
					-248
				],
				[
					-41,
					-107
				],
				[
					-105,
					-310
				],
				[
					-138,
					-395
				],
				[
					-214,
					-229
				],
				[
					-48,
					151
				],
				[
					-116,
					83
				],
				[
					160,
					474
				],
				[
					-91,
					317
				],
				[
					-299,
					230
				],
				[
					8,
					209
				],
				[
					201,
					200
				],
				[
					47,
					444
				],
				[
					-13,
					372
				],
				[
					-113,
					386
				],
				[
					8,
					102
				],
				[
					-133,
					237
				],
				[
					-218,
					510
				],
				[
					-117,
					408
				],
				[
					104,
					45
				],
				[
					151,
					-320
				],
				[
					216,
					-149
				],
				[
					78,
					-513
				]
			],
			[
				[
					64752,
					61418
				],
				[
					-91,
					403
				],
				[
					-217,
					950
				]
			],
			[
				[
					64444,
					62771
				],
				[
					833,
					576
				],
				[
					185,
					1152
				],
				[
					-127,
					408
				]
			],
			[
				[
					65665,
					66183
				],
				[
					125,
					-393
				],
				[
					155,
					-209
				],
				[
					203,
					-76
				],
				[
					165,
					-105
				],
				[
					125,
					-330
				],
				[
					75,
					-191
				],
				[
					100,
					-73
				],
				[
					-1,
					-128
				],
				[
					-101,
					-344
				],
				[
					-44,
					-161
				],
				[
					-117,
					-184
				],
				[
					-104,
					-395
				],
				[
					-126,
					30
				],
				[
					-58,
					-137
				],
				[
					-44,
					-292
				],
				[
					34,
					-385
				],
				[
					-26,
					-71
				],
				[
					-128,
					2
				],
				[
					-174,
					-215
				],
				[
					-27,
					-281
				],
				[
					-63,
					-121
				],
				[
					-173,
					4
				],
				[
					-109,
					-145
				],
				[
					1,
					-232
				],
				[
					-134,
					-160
				],
				[
					-153,
					54
				],
				[
					-186,
					-194
				],
				[
					-128,
					-33
				]
			],
			[
				[
					65575,
					66834
				],
				[
					80,
					196
				],
				[
					35,
					-50
				],
				[
					-26,
					-238
				],
				[
					-37,
					-104
				]
			],
			[
				[
					68937,
					65473
				],
				[
					-203,
					146
				],
				[
					-83,
					414
				],
				[
					-215,
					438
				],
				[
					-512,
					-108
				],
				[
					-451,
					-11
				],
				[
					-391,
					-81
				]
			],
			[
				[
					28366,
					55989
				],
				[
					-93,
					166
				],
				[
					-59,
					311
				],
				[
					68,
					154
				],
				[
					-70,
					40
				],
				[
					-52,
					190
				],
				[
					-138,
					160
				],
				[
					-122,
					-37
				],
				[
					-56,
					-200
				],
				[
					-112,
					-145
				],
				[
					-61,
					-20
				],
				[
					-27,
					-120
				],
				[
					132,
					-312
				],
				[
					-75,
					-74
				],
				[
					-40,
					-85
				],
				[
					-130,
					-29
				],
				[
					-48,
					344
				],
				[
					-36,
					-98
				],
				[
					-92,
					33
				],
				[
					-56,
					232
				],
				[
					-114,
					38
				],
				[
					-72,
					68
				],
				[
					-119,
					-1
				],
				[
					-8,
					-125
				],
				[
					-32,
					87
				]
			],
			[
				[
					27070,
					57338
				],
				[
					100,
					-206
				],
				[
					-6,
					-122
				],
				[
					111,
					-26
				],
				[
					26,
					47
				],
				[
					77,
					-142
				],
				[
					136,
					42
				],
				[
					119,
					145
				],
				[
					168,
					116
				],
				[
					95,
					172
				],
				[
					153,
					-33
				],
				[
					-10,
					-57
				],
				[
					155,
					-20
				],
				[
					124,
					-99
				],
				[
					90,
					-173
				],
				[
					105,
					-159
				]
			],
			[
				[
					30452,
					41263
				],
				[
					-279,
					331
				],
				[
					-24,
					236
				],
				[
					-551,
					578
				],
				[
					-498,
					630
				],
				[
					-214,
					355
				],
				[
					-115,
					476
				],
				[
					46,
					166
				],
				[
					-236,
					755
				],
				[
					-274,
					1063
				],
				[
					-262,
					1147
				],
				[
					-114,
					262
				],
				[
					-87,
					424
				],
				[
					-216,
					376
				],
				[
					-198,
					233
				],
				[
					90,
					257
				],
				[
					-134,
					550
				],
				[
					86,
					403
				],
				[
					221,
					364
				]
			],
			[
				[
					85104,
					56675
				],
				[
					28,
					-382
				],
				[
					16,
					-323
				],
				[
					-94,
					-527
				],
				[
					-102,
					587
				],
				[
					-130,
					-292
				],
				[
					89,
					-425
				],
				[
					-79,
					-270
				],
				[
					-327,
					335
				],
				[
					-78,
					416
				],
				[
					84,
					274
				],
				[
					-176,
					273
				],
				[
					-87,
					-239
				],
				[
					-131,
					22
				],
				[
					-205,
					-321
				],
				[
					-46,
					168
				],
				[
					109,
					486
				],
				[
					175,
					161
				],
				[
					151,
					217
				],
				[
					98,
					-260
				],
				[
					212,
					157
				],
				[
					45,
					257
				],
				[
					196,
					16
				],
				[
					-16,
					445
				],
				[
					225,
					-273
				],
				[
					23,
					-290
				],
				[
					20,
					-212
				]
			],
			[
				[
					84439,
					57749
				],
				[
					-100,
					-190
				],
				[
					-87,
					-363
				],
				[
					-87,
					-171
				],
				[
					-171,
					398
				],
				[
					57,
					154
				],
				[
					70,
					162
				],
				[
					30,
					357
				],
				[
					153,
					34
				],
				[
					-44,
					-388
				],
				[
					205,
					556
				],
				[
					-26,
					-549
				]
			],
			[
				[
					82917,
					57194
				],
				[
					-369,
					-546
				],
				[
					136,
					403
				],
				[
					200,
					355
				],
				[
					167,
					399
				],
				[
					146,
					572
				],
				[
					49,
					-470
				],
				[
					-183,
					-317
				],
				[
					-146,
					-396
				]
			],
			[
				[
					83856,
					58678
				],
				[
					166,
					-179
				],
				[
					177,
					1
				],
				[
					-5,
					-240
				],
				[
					-129,
					-245
				],
				[
					-176,
					-173
				],
				[
					-10,
					268
				],
				[
					20,
					293
				],
				[
					-43,
					275
				]
			],
			[
				[
					84861,
					58834
				],
				[
					78,
					-643
				],
				[
					-214,
					152
				],
				[
					5,
					-193
				],
				[
					68,
					-355
				],
				[
					-132,
					-129
				],
				[
					-11,
					405
				],
				[
					-84,
					30
				],
				[
					-43,
					348
				],
				[
					163,
					-46
				],
				[
					-4,
					218
				],
				[
					-169,
					440
				],
				[
					266,
					-13
				],
				[
					77,
					-214
				]
			],
			[
				[
					83757,
					59356
				],
				[
					-74,
					-498
				],
				[
					-119,
					288
				],
				[
					-142,
					438
				],
				[
					238,
					-21
				],
				[
					97,
					-207
				]
			],
			[
				[
					83700,
					62485
				],
				[
					171,
					-164
				],
				[
					85,
					150
				],
				[
					26,
					-146
				],
				[
					-46,
					-239
				],
				[
					95,
					-413
				],
				[
					-73,
					-478
				],
				[
					-164,
					-191
				],
				[
					-43,
					-465
				],
				[
					62,
					-458
				],
				[
					147,
					-64
				],
				[
					123,
					68
				],
				[
					347,
					-319
				],
				[
					-27,
					-313
				],
				[
					91,
					-139
				],
				[
					-29,
					-265
				],
				[
					-216,
					283
				],
				[
					-103,
					302
				],
				[
					-71,
					-211
				],
				[
					-177,
					345
				],
				[
					-253,
					-86
				],
				[
					-138,
					128
				],
				[
					14,
					238
				],
				[
					87,
					146
				],
				[
					-83,
					133
				],
				[
					-36,
					-207
				],
				[
					-137,
					331
				],
				[
					-41,
					251
				],
				[
					-11,
					551
				],
				[
					112,
					-190
				],
				[
					29,
					901
				],
				[
					90,
					522
				],
				[
					169,
					-1
				]
			],
			[
				[
					93299,
					47902
				],
				[
					-78,
					-58
				],
				[
					-120,
					221
				],
				[
					-122,
					366
				],
				[
					-59,
					439
				],
				[
					38,
					55
				],
				[
					30,
					-171
				],
				[
					84,
					-130
				],
				[
					135,
					-366
				],
				[
					131,
					-195
				],
				[
					-39,
					-161
				]
			],
			[
				[
					92217,
					48675
				],
				[
					-146,
					-48
				],
				[
					-44,
					-161
				],
				[
					-152,
					-140
				],
				[
					-142,
					-135
				],
				[
					-148,
					1
				],
				[
					-228,
					167
				],
				[
					-158,
					161
				],
				[
					23,
					178
				],
				[
					249,
					-84
				],
				[
					152,
					45
				],
				[
					42,
					276
				],
				[
					40,
					14
				],
				[
					27,
					-306
				],
				[
					158,
					44
				],
				[
					78,
					197
				],
				[
					155,
					206
				],
				[
					-30,
					339
				],
				[
					166,
					11
				],
				[
					56,
					-94
				],
				[
					-5,
					-320
				],
				[
					-93,
					-351
				]
			],
			[
				[
					89166,
					50332
				],
				[
					482,
					-397
				],
				[
					513,
					-329
				],
				[
					192,
					-295
				],
				[
					154,
					-290
				],
				[
					43,
					-339
				],
				[
					462,
					-356
				],
				[
					68,
					-306
				],
				[
					-256,
					-62
				],
				[
					62,
					-383
				],
				[
					248,
					-378
				],
				[
					180,
					-611
				],
				[
					159,
					19
				],
				[
					-11,
					-255
				],
				[
					215,
					-98
				],
				[
					-84,
					-108
				],
				[
					295,
					-243
				],
				[
					-30,
					-166
				],
				[
					-184,
					-40
				],
				[
					-69,
					149
				],
				[
					-238,
					65
				],
				[
					-281,
					86
				],
				[
					-216,
					368
				],
				[
					-158,
					316
				],
				[
					-144,
					504
				],
				[
					-362,
					252
				],
				[
					-235,
					-164
				],
				[
					-170,
					-190
				],
				[
					35,
					-425
				],
				[
					-218,
					-198
				],
				[
					-155,
					96
				],
				[
					-288,
					25
				]
			],
			[
				[
					92538,
					49238
				],
				[
					-87,
					-154
				],
				[
					-52,
					340
				],
				[
					-65,
					223
				],
				[
					-126,
					189
				],
				[
					-158,
					245
				],
				[
					-200,
					170
				],
				[
					77,
					139
				],
				[
					150,
					-162
				],
				[
					94,
					-126
				],
				[
					117,
					-139
				],
				[
					111,
					-241
				],
				[
					106,
					-185
				],
				[
					33,
					-299
				]
			],
			[
				[
					53922,
					82787
				],
				[
					189,
					169
				],
				[
					434,
					266
				],
				[
					350,
					195
				],
				[
					277,
					-97
				],
				[
					21,
					-140
				],
				[
					268,
					-8
				]
			],
			[
				[
					55461,
					83172
				],
				[
					342,
					-65
				],
				[
					511,
					9
				]
			],
			[
				[
					56535,
					81532
				],
				[
					139,
					-502
				],
				[
					-29,
					-162
				],
				[
					-138,
					-67
				],
				[
					-252,
					-479
				],
				[
					71,
					-259
				],
				[
					-60,
					34
				]
			],
			[
				[
					56266,
					80097
				],
				[
					-264,
					221
				],
				[
					-200,
					-81
				],
				[
					-131,
					59
				],
				[
					-165,
					-123
				],
				[
					-140,
					204
				],
				[
					-114,
					-78
				],
				[
					-16,
					34
				]
			],
			[
				[
					31588,
					62492
				],
				[
					142,
					-51
				],
				[
					50,
					-114
				],
				[
					-71,
					-146
				],
				[
					-209,
					4
				],
				[
					-163,
					-21
				],
				[
					-16,
					247
				],
				[
					40,
					84
				],
				[
					227,
					-3
				]
			],
			[
				[
					86288,
					76244
				],
				[
					39,
					-101
				]
			],
			[
				[
					86327,
					76143
				],
				[
					-106,
					35
				],
				[
					-120,
					-195
				],
				[
					-83,
					-196
				],
				[
					10,
					-414
				],
				[
					-143,
					-127
				],
				[
					-50,
					-102
				],
				[
					-104,
					-170
				],
				[
					-185,
					-95
				],
				[
					-121,
					-154
				],
				[
					-9,
					-250
				],
				[
					-32,
					-63
				],
				[
					111,
					-94
				],
				[
					157,
					-253
				]
			],
			[
				[
					85048,
					73569
				],
				[
					-135,
					109
				],
				[
					-34,
					-108
				],
				[
					-81,
					-48
				],
				[
					-10,
					109
				],
				[
					-72,
					52
				],
				[
					-75,
					92
				],
				[
					76,
					254
				],
				[
					66,
					67
				],
				[
					-25,
					105
				],
				[
					71,
					311
				],
				[
					-18,
					94
				],
				[
					-163,
					63
				],
				[
					-131,
					154
				]
			],
			[
				[
					47929,
					73193
				],
				[
					-112,
					-149
				],
				[
					-146,
					81
				],
				[
					-143,
					-64
				],
				[
					42,
					451
				],
				[
					-26,
					354
				],
				[
					-124,
					53
				],
				[
					-67,
					218
				],
				[
					22,
					377
				],
				[
					111,
					210
				],
				[
					20,
					232
				],
				[
					58,
					347
				],
				[
					-6,
					244
				],
				[
					-56,
					206
				],
				[
					-12,
					195
				]
			],
			[
				[
					64113,
					66085
				],
				[
					-18,
					419
				],
				[
					75,
					302
				],
				[
					76,
					62
				],
				[
					84,
					-180
				],
				[
					5,
					-337
				],
				[
					-61,
					-339
				]
			],
			[
				[
					64274,
					66012
				],
				[
					-77,
					-41
				],
				[
					-84,
					114
				]
			],
			[
				[
					56308,
					79404
				],
				[
					120,
					123
				],
				[
					172,
					-64
				],
				[
					178,
					-2
				],
				[
					129,
					-141
				],
				[
					95,
					89
				],
				[
					205,
					55
				],
				[
					69,
					135
				],
				[
					118,
					0
				]
			],
			[
				[
					57842,
					78025
				],
				[
					124,
					-106
				],
				[
					131,
					93
				],
				[
					126,
					-99
				]
			],
			[
				[
					58223,
					77913
				],
				[
					6,
					-149
				],
				[
					-135,
					-124
				],
				[
					-84,
					54
				],
				[
					-78,
					-694
				]
			],
			[
				[
					56293,
					77303
				],
				[
					-51,
					101
				],
				[
					65,
					97
				],
				[
					-69,
					72
				],
				[
					-87,
					-129
				],
				[
					-162,
					167
				],
				[
					-22,
					237
				],
				[
					-169,
					136
				],
				[
					-31,
					183
				],
				[
					-151,
					226
				]
			],
			[
				[
					89901,
					81054
				],
				[
					280,
					-1020
				],
				[
					-411,
					190
				],
				[
					-171,
					-832
				],
				[
					271,
					-590
				],
				[
					-8,
					-403
				],
				[
					-211,
					347
				],
				[
					-182,
					-445
				],
				[
					-51,
					483
				],
				[
					31,
					561
				],
				[
					-32,
					621
				],
				[
					64,
					436
				],
				[
					13,
					770
				],
				[
					-163,
					566
				],
				[
					24,
					787
				],
				[
					257,
					265
				],
				[
					-110,
					267
				],
				[
					123,
					81
				],
				[
					73,
					-381
				],
				[
					96,
					-555
				],
				[
					-7,
					-567
				],
				[
					114,
					-581
				]
			],
			[
				[
					55461,
					83172
				],
				[
					63,
					254
				],
				[
					383,
					186
				]
			],
			[
				[
					99999,
					92620
				],
				[
					-305,
					-29
				],
				[
					-49,
					183
				],
				[
					-99645,
					240
				],
				[
					36,
					24
				],
				[
					235,
					-1
				],
				[
					402,
					-165
				],
				[
					-24,
					-79
				],
				[
					-286,
					-138
				],
				[
					-363,
					-35
				],
				[
					99999,
					0
				]
			],
			[
				[
					89889,
					93991
				],
				[
					-421,
					-4
				],
				[
					-569,
					64
				],
				[
					-49,
					31
				],
				[
					263,
					227
				],
				[
					348,
					54
				],
				[
					394,
					-221
				],
				[
					34,
					-151
				]
			],
			[
				[
					91869,
					95069
				],
				[
					-321,
					-228
				],
				[
					-444,
					52
				],
				[
					-516,
					227
				],
				[
					66,
					187
				],
				[
					518,
					-87
				],
				[
					697,
					-151
				]
			],
			[
				[
					90301,
					95344
				],
				[
					-219,
					-427
				],
				[
					-1023,
					16
				],
				[
					-461,
					-136
				],
				[
					-550,
					374
				],
				[
					149,
					396
				],
				[
					366,
					108
				],
				[
					734,
					-25
				],
				[
					1004,
					-306
				]
			],
			[
				[
					65981,
					92556
				],
				[
					-164,
					-51
				],
				[
					-907,
					75
				],
				[
					-74,
					256
				],
				[
					-503,
					154
				],
				[
					-40,
					311
				],
				[
					284,
					124
				],
				[
					-10,
					314
				],
				[
					551,
					491
				],
				[
					-255,
					70
				],
				[
					665,
					506
				],
				[
					-75,
					261
				],
				[
					621,
					304
				],
				[
					917,
					370
				],
				[
					925,
					108
				],
				[
					475,
					214
				],
				[
					541,
					74
				],
				[
					193,
					-227
				],
				[
					-187,
					-179
				],
				[
					-984,
					-286
				],
				[
					-848,
					-274
				],
				[
					-863,
					-548
				],
				[
					-414,
					-563
				],
				[
					-435,
					-553
				],
				[
					56,
					-479
				],
				[
					531,
					-472
				]
			],
			[
				[
					63639,
					78550
				],
				[
					-127,
					-342
				],
				[
					-269,
					-95
				],
				[
					-276,
					-594
				],
				[
					252,
					-547
				],
				[
					-27,
					-388
				],
				[
					303,
					-678
				]
			],
			[
				[
					61098,
					76843
				],
				[
					-354,
					486
				],
				[
					-317,
					218
				],
				[
					-240,
					338
				],
				[
					202,
					92
				],
				[
					231,
					482
				],
				[
					-156,
					227
				],
				[
					410,
					236
				],
				[
					-8,
					125
				],
				[
					-249,
					-92
				]
			],
			[
				[
					60617,
					78955
				],
				[
					9,
					255
				],
				[
					143,
					161
				],
				[
					269,
					42
				],
				[
					44,
					192
				],
				[
					-62,
					318
				],
				[
					113,
					302
				],
				[
					-3,
					169
				],
				[
					-410,
					187
				],
				[
					-162,
					-6
				],
				[
					-172,
					270
				],
				[
					-213,
					-92
				],
				[
					-352,
					203
				],
				[
					6,
					113
				],
				[
					-99,
					250
				],
				[
					-222,
					28
				],
				[
					-23,
					178
				],
				[
					70,
					117
				],
				[
					-178,
					326
				],
				[
					-288,
					-56
				],
				[
					-84,
					29
				],
				[
					-70,
					-131
				],
				[
					-104,
					24
				]
			],
			[
				[
					57772,
					86080
				],
				[
					316,
					318
				],
				[
					-291,
					274
				]
			],
			[
				[
					58639,
					91887
				],
				[
					286,
					200
				],
				[
					456,
					-348
				],
				[
					761,
					-137
				],
				[
					1050,
					-652
				],
				[
					213,
					-273
				],
				[
					18,
					-384
				],
				[
					-308,
					-302
				],
				[
					-454,
					-154
				],
				[
					-1240,
					438
				],
				[
					-204,
					-73
				],
				[
					453,
					-422
				],
				[
					18,
					-267
				],
				[
					18,
					-589
				],
				[
					358,
					-175
				],
				[
					217,
					-150
				],
				[
					36,
					279
				],
				[
					-168,
					248
				],
				[
					177,
					218
				],
				[
					672,
					-358
				],
				[
					233,
					140
				],
				[
					-186,
					422
				],
				[
					647,
					564
				],
				[
					256,
					-33
				],
				[
					260,
					-202
				],
				[
					161,
					396
				],
				[
					-231,
					343
				],
				[
					136,
					345
				],
				[
					-204,
					357
				],
				[
					777,
					-185
				],
				[
					158,
					-322
				],
				[
					-351,
					-71
				],
				[
					1,
					-321
				],
				[
					219,
					-197
				],
				[
					429,
					125
				],
				[
					68,
					367
				],
				[
					580,
					274
				],
				[
					970,
					495
				],
				[
					209,
					-28
				],
				[
					-273,
					-350
				],
				[
					344,
					-60
				],
				[
					199,
					197
				],
				[
					521,
					16
				],
				[
					412,
					239
				],
				[
					317,
					-347
				],
				[
					315,
					381
				],
				[
					-291,
					334
				],
				[
					145,
					190
				],
				[
					820,
					-175
				],
				[
					385,
					-180
				],
				[
					1006,
					-658
				],
				[
					186,
					302
				],
				[
					-282,
					304
				],
				[
					-8,
					122
				],
				[
					-335,
					57
				],
				[
					92,
					273
				],
				[
					-149,
					449
				],
				[
					-8,
					185
				],
				[
					512,
					521
				],
				[
					183,
					523
				],
				[
					206,
					114
				],
				[
					736,
					-152
				],
				[
					57,
					-320
				],
				[
					-263,
					-468
				],
				[
					173,
					-183
				],
				[
					89,
					-403
				],
				[
					-63,
					-789
				],
				[
					307,
					-353
				],
				[
					-120,
					-384
				],
				[
					-544,
					-818
				],
				[
					318,
					-85
				],
				[
					110,
					207
				],
				[
					306,
					148
				],
				[
					74,
					285
				],
				[
					240,
					274
				],
				[
					-162,
					328
				],
				[
					130,
					380
				],
				[
					-304,
					47
				],
				[
					-67,
					321
				],
				[
					222,
					578
				],
				[
					-361,
					469
				],
				[
					497,
					389
				],
				[
					-64,
					409
				],
				[
					139,
					13
				],
				[
					145,
					-319
				],
				[
					-109,
					-556
				],
				[
					297,
					-105
				],
				[
					-127,
					415
				],
				[
					465,
					227
				],
				[
					577,
					30
				],
				[
					513,
					-328
				],
				[
					-247,
					479
				],
				[
					-28,
					614
				],
				[
					483,
					116
				],
				[
					669,
					-25
				],
				[
					602,
					75
				],
				[
					-226,
					301
				],
				[
					321,
					378
				],
				[
					319,
					16
				],
				[
					540,
					286
				],
				[
					734,
					77
				],
				[
					93,
					157
				],
				[
					729,
					54
				],
				[
					227,
					-129
				],
				[
					624,
					306
				],
				[
					510,
					-10
				],
				[
					77,
					249
				],
				[
					265,
					245
				],
				[
					656,
					236
				],
				[
					476,
					-186
				],
				[
					-378,
					-142
				],
				[
					629,
					-89
				],
				[
					75,
					-284
				],
				[
					254,
					140
				],
				[
					812,
					-8
				],
				[
					626,
					-281
				],
				[
					223,
					-215
				],
				[
					-69,
					-300
				],
				[
					-307,
					-170
				],
				[
					-730,
					-320
				],
				[
					-209,
					-171
				],
				[
					345,
					-80
				],
				[
					410,
					-146
				],
				[
					251,
					109
				],
				[
					141,
					-369
				],
				[
					122,
					149
				],
				[
					444,
					91
				],
				[
					892,
					-95
				],
				[
					67,
					-269
				],
				[
					1162,
					-86
				],
				[
					15,
					440
				],
				[
					590,
					-101
				],
				[
					443,
					3
				],
				[
					449,
					-303
				],
				[
					128,
					-369
				],
				[
					-165,
					-241
				],
				[
					349,
					-453
				],
				[
					437,
					-234
				],
				[
					268,
					605
				],
				[
					446,
					-260
				],
				[
					473,
					155
				],
				[
					538,
					-177
				],
				[
					204,
					162
				],
				[
					455,
					-81
				],
				[
					-201,
					534
				],
				[
					367,
					250
				],
				[
					2509,
					-374
				],
				[
					236,
					-342
				],
				[
					727,
					-440
				],
				[
					1122,
					109
				],
				[
					553,
					-95
				],
				[
					231,
					-238
				],
				[
					-33,
					-421
				],
				[
					342,
					-164
				],
				[
					372,
					118
				],
				[
					492,
					15
				],
				[
					525,
					-113
				],
				[
					526,
					64
				],
				[
					484,
					-512
				],
				[
					344,
					184
				],
				[
					-224,
					368
				],
				[
					123,
					256
				],
				[
					886,
					-161
				],
				[
					578,
					34
				],
				[
					799,
					-275
				],
				[
					-99610,
					-251
				],
				[
					681,
					-440
				],
				[
					728,
					-572
				],
				[
					-24,
					-358
				],
				[
					187,
					-143
				],
				[
					-64,
					418
				],
				[
					754,
					-86
				],
				[
					544,
					-539
				],
				[
					-276,
					-251
				],
				[
					-455,
					-59
				],
				[
					-7,
					-563
				],
				[
					-111,
					-120
				],
				[
					-260,
					17
				],
				[
					-212,
					201
				],
				[
					-369,
					168
				],
				[
					-62,
					250
				],
				[
					-283,
					94
				],
				[
					-315,
					-74
				],
				[
					-151,
					201
				],
				[
					60,
					214
				],
				[
					-333,
					-137
				],
				[
					126,
					-271
				],
				[
					-158,
					-244
				],
				[
					0,
					-3
				],
				[
					99640,
					-253
				],
				[
					-360,
					42
				],
				[
					250,
					-307
				],
				[
					166,
					-474
				],
				[
					128,
					-155
				],
				[
					32,
					-238
				],
				[
					-71,
					-153
				],
				[
					-518,
					126
				],
				[
					-777,
					-434
				],
				[
					-247,
					-67
				],
				[
					-425,
					-405
				],
				[
					-403,
					-353
				],
				[
					-102,
					-262
				],
				[
					-397,
					399
				],
				[
					-724,
					-453
				],
				[
					-126,
					214
				],
				[
					-268,
					-246
				],
				[
					-371,
					79
				],
				[
					-90,
					-379
				],
				[
					-333,
					-557
				],
				[
					10,
					-233
				],
				[
					316,
					-129
				],
				[
					-37,
					-839
				],
				[
					-258,
					-21
				],
				[
					-119,
					-482
				],
				[
					116,
					-248
				],
				[
					-486,
					-294
				],
				[
					-96,
					-657
				],
				[
					-415,
					-141
				],
				[
					-83,
					-585
				],
				[
					-400,
					-536
				],
				[
					-103,
					396
				],
				[
					-119,
					841
				],
				[
					-155,
					1279
				],
				[
					134,
					799
				],
				[
					234,
					344
				],
				[
					14,
					269
				],
				[
					432,
					129
				],
				[
					496,
					725
				],
				[
					479,
					592
				],
				[
					499,
					459
				],
				[
					223,
					812
				],
				[
					-337,
					-49
				],
				[
					-167,
					-474
				],
				[
					-705,
					-632
				],
				[
					-227,
					708
				],
				[
					-717,
					-196
				],
				[
					-696,
					-965
				],
				[
					230,
					-353
				],
				[
					-620,
					-151
				],
				[
					-430,
					-59
				],
				[
					20,
					417
				],
				[
					-431,
					87
				],
				[
					-344,
					-283
				],
				[
					-850,
					99
				],
				[
					-914,
					-171
				],
				[
					-899,
					-1124
				],
				[
					-1065,
					-1358
				],
				[
					438,
					-73
				],
				[
					136,
					-360
				],
				[
					270,
					-128
				],
				[
					178,
					288
				],
				[
					305,
					-38
				],
				[
					401,
					-633
				],
				[
					9,
					-490
				],
				[
					-217,
					-576
				],
				[
					-23,
					-687
				],
				[
					-126,
					-921
				],
				[
					-418,
					-833
				],
				[
					-94,
					-399
				],
				[
					-377,
					-670
				],
				[
					-374,
					-665
				],
				[
					-179,
					-340
				],
				[
					-370,
					-338
				],
				[
					-175,
					-8
				],
				[
					-175,
					280
				],
				[
					-373,
					-421
				],
				[
					-43,
					-192
				]
			],
			[
				[
					79187,
					96925
				],
				[
					-1566,
					-222
				],
				[
					507,
					756
				],
				[
					229,
					64
				],
				[
					208,
					-37
				],
				[
					704,
					-327
				],
				[
					-82,
					-234
				]
			],
			[
				[
					64204,
					98215
				],
				[
					-373,
					-76
				],
				[
					-250,
					-44
				],
				[
					-39,
					-94
				],
				[
					-324,
					-95
				],
				[
					-301,
					136
				],
				[
					158,
					180
				],
				[
					-618,
					17
				],
				[
					542,
					105
				],
				[
					422,
					7
				],
				[
					57,
					-155
				],
				[
					159,
					138
				],
				[
					262,
					95
				],
				[
					412,
					-126
				],
				[
					-107,
					-88
				]
			],
			[
				[
					77760,
					97255
				],
				[
					-606,
					-71
				],
				[
					-773,
					166
				],
				[
					-462,
					220
				],
				[
					-213,
					413
				],
				[
					-379,
					113
				],
				[
					722,
					394
				],
				[
					600,
					130
				],
				[
					540,
					-290
				],
				[
					640,
					-557
				],
				[
					-69,
					-518
				]
			],
			[
				[
					58449,
					51176
				],
				[
					110,
					-325
				],
				[
					-16,
					-339
				],
				[
					-80,
					-73
				]
			],
			[
				[
					58216,
					51057
				],
				[
					67,
					-59
				],
				[
					166,
					178
				]
			],
			[
				[
					45260,
					63923
				],
				[
					12,
					243
				]
			],
			[
				[
					61883,
					61244
				],
				[
					-37,
					246
				],
				[
					-83,
					173
				],
				[
					-22,
					230
				],
				[
					-143,
					206
				],
				[
					-148,
					483
				],
				[
					-79,
					469
				],
				[
					-192,
					397
				],
				[
					-124,
					94
				],
				[
					-184,
					549
				],
				[
					-32,
					400
				],
				[
					12,
					342
				],
				[
					-159,
					638
				],
				[
					-130,
					225
				],
				[
					-150,
					119
				],
				[
					-92,
					330
				],
				[
					15,
					130
				],
				[
					-77,
					299
				],
				[
					-81,
					128
				],
				[
					-108,
					429
				],
				[
					-170,
					464
				],
				[
					-141,
					395
				],
				[
					-139,
					-2
				],
				[
					44,
					316
				],
				[
					12,
					201
				],
				[
					34,
					230
				]
			],
			[
				[
					63448,
					68272
				],
				[
					109,
					-497
				],
				[
					137,
					-131
				],
				[
					47,
					-203
				],
				[
					190,
					-242
				],
				[
					16,
					-237
				],
				[
					-27,
					-192
				],
				[
					35,
					-193
				],
				[
					80,
					-162
				],
				[
					37,
					-189
				],
				[
					41,
					-141
				]
			],
			[
				[
					64274,
					66012
				],
				[
					53,
					-220
				]
			],
			[
				[
					64444,
					62771
				],
				[
					-801,
					-221
				],
				[
					-259,
					-259
				],
				[
					-199,
					-604
				],
				[
					-130,
					-96
				],
				[
					-70,
					191
				],
				[
					-106,
					-28
				],
				[
					-269,
					57
				],
				[
					-50,
					58
				],
				[
					-321,
					-13
				],
				[
					-75,
					-52
				],
				[
					-114,
					149
				],
				[
					-74,
					-283
				],
				[
					28,
					-243
				],
				[
					-121,
					-183
				]
			],
			[
				[
					59434,
					57280
				],
				[
					-39,
					11
				],
				[
					5,
					287
				],
				[
					-33,
					197
				],
				[
					-143,
					228
				],
				[
					-34,
					415
				],
				[
					34,
					425
				],
				[
					-129,
					40
				],
				[
					-19,
					-129
				],
				[
					-167,
					-29
				],
				[
					67,
					-169
				],
				[
					23,
					-346
				],
				[
					-152,
					-316
				],
				[
					-138,
					-415
				],
				[
					-144,
					-59
				],
				[
					-233,
					336
				],
				[
					-105,
					-119
				],
				[
					-29,
					-168
				],
				[
					-143,
					-109
				],
				[
					-9,
					-118
				],
				[
					-277,
					0
				],
				[
					-38,
					118
				],
				[
					-200,
					20
				],
				[
					-100,
					-99
				],
				[
					-77,
					50
				],
				[
					-143,
					336
				],
				[
					-48,
					158
				],
				[
					-200,
					-79
				],
				[
					-76,
					-267
				],
				[
					-72,
					-514
				],
				[
					-95,
					-109
				],
				[
					-85,
					-63
				]
			],
			[
				[
					56635,
					56793
				],
				[
					-23,
					27
				]
			],
			[
				[
					56351,
					58246
				],
				[
					3,
					140
				],
				[
					-102,
					169
				],
				[
					-3,
					335
				],
				[
					-58,
					222
				],
				[
					-98,
					-33
				],
				[
					28,
					211
				],
				[
					72,
					240
				],
				[
					-32,
					239
				],
				[
					92,
					176
				],
				[
					-58,
					135
				],
				[
					73,
					355
				],
				[
					127,
					425
				],
				[
					240,
					-41
				],
				[
					-14,
					2286
				]
			],
			[
				[
					60240,
					64499
				],
				[
					90,
					-565
				],
				[
					-61,
					-105
				],
				[
					40,
					-593
				],
				[
					102,
					-687
				],
				[
					106,
					-142
				],
				[
					152,
					-213
				]
			],
			[
				[
					59433,
					57348
				],
				[
					1,
					-68
				]
			],
			[
				[
					59434,
					57280
				],
				[
					3,
					-449
				]
			],
			[
				[
					59445,
					54277
				],
				[
					-171,
					-265
				],
				[
					-195,
					1
				],
				[
					-224,
					-135
				],
				[
					-176,
					129
				],
				[
					-115,
					-157
				]
			],
			[
				[
					56824,
					56568
				],
				[
					-189,
					225
				]
			],
			[
				[
					45357,
					59658
				],
				[
					-115,
					449
				],
				[
					-138,
					205
				],
				[
					122,
					109
				],
				[
					134,
					404
				],
				[
					66,
					296
				]
			],
			[
				[
					45367,
					58962
				],
				[
					-46,
					441
				]
			],
			[
				[
					95032,
					45793
				],
				[
					78,
					-198
				],
				[
					-194,
					3
				],
				[
					-106,
					355
				],
				[
					166,
					-140
				],
				[
					56,
					-20
				]
			],
			[
				[
					94680,
					46144
				],
				[
					-108,
					-13
				],
				[
					-170,
					58
				],
				[
					-58,
					89
				],
				[
					17,
					228
				],
				[
					183,
					-90
				],
				[
					91,
					-121
				],
				[
					45,
					-151
				]
			],
			[
				[
					94910,
					46301
				],
				[
					-42,
					-106
				],
				[
					-206,
					499
				],
				[
					-57,
					344
				],
				[
					94,
					0
				],
				[
					100,
					-461
				],
				[
					111,
					-276
				]
			],
			[
				[
					94409,
					47028
				],
				[
					12,
					-116
				],
				[
					-218,
					245
				],
				[
					-152,
					206
				],
				[
					-104,
					192
				],
				[
					41,
					59
				],
				[
					128,
					-138
				],
				[
					228,
					-265
				],
				[
					65,
					-183
				]
			],
			[
				[
					93760,
					47598
				],
				[
					-56,
					-33
				],
				[
					-121,
					131
				],
				[
					-114,
					237
				],
				[
					14,
					96
				],
				[
					166,
					-243
				],
				[
					111,
					-188
				]
			],
			[
				[
					46822,
					55737
				],
				[
					-75,
					43
				],
				[
					-200,
					232
				],
				[
					-144,
					308
				],
				[
					-49,
					211
				],
				[
					-34,
					425
				]
			],
			[
				[
					25613,
					59537
				],
				[
					-31,
					-135
				],
				[
					-161,
					8
				],
				[
					-100,
					55
				],
				[
					-115,
					115
				],
				[
					-154,
					36
				],
				[
					-79,
					123
				]
			],
			[
				[
					61984,
					58430
				],
				[
					91,
					-106
				],
				[
					54,
					-238
				],
				[
					125,
					-241
				],
				[
					138,
					-2
				],
				[
					262,
					147
				],
				[
					302,
					68
				],
				[
					245,
					179
				],
				[
					138,
					38
				],
				[
					99,
					105
				],
				[
					158,
					20
				]
			],
			[
				[
					63596,
					58400
				],
				[
					-2,
					-9
				],
				[
					-1,
					-237
				],
				[
					0,
					-581
				],
				[
					0,
					-301
				],
				[
					-125,
					-353
				],
				[
					-194,
					-481
				]
			],
			[
				[
					63596,
					58400
				],
				[
					89,
					12
				],
				[
					128,
					85
				],
				[
					147,
					58
				],
				[
					132,
					198
				],
				[
					105,
					1
				],
				[
					6,
					-159
				],
				[
					-25,
					-335
				],
				[
					1,
					-303
				],
				[
					-59,
					-208
				],
				[
					-78,
					-622
				],
				[
					-134,
					-644
				],
				[
					-172,
					-735
				],
				[
					-238,
					-844
				],
				[
					-237,
					-645
				],
				[
					-327,
					-785
				],
				[
					-278,
					-467
				],
				[
					-415,
					-571
				],
				[
					-259,
					-438
				],
				[
					-304,
					-698
				],
				[
					-64,
					-304
				],
				[
					-63,
					-136
				]
			],
			[
				[
					34125,
					55269
				],
				[
					333,
					-115
				],
				[
					30,
					104
				],
				[
					225,
					41
				],
				[
					298,
					-155
				]
			],
			[
				[
					34889,
					54255
				],
				[
					109,
					-341
				],
				[
					-49,
					-248
				],
				[
					-24,
					-263
				],
				[
					-71,
					-242
				]
			],
			[
				[
					56266,
					80097
				],
				[
					-77,
					-150
				],
				[
					-55,
					-232
				]
			],
			[
				[
					53809,
					78032
				],
				[
					62,
					52
				]
			],
			[
				[
					56639,
					89841
				],
				[
					-478,
					-163
				],
				[
					-269,
					-401
				],
				[
					43,
					-353
				],
				[
					-441,
					-463
				],
				[
					-537,
					-495
				],
				[
					-202,
					-811
				],
				[
					198,
					-406
				],
				[
					265,
					-320
				],
				[
					-255,
					-649
				],
				[
					-289,
					-135
				],
				[
					-106,
					-967
				],
				[
					-157,
					-539
				],
				[
					-337,
					55
				],
				[
					-158,
					-456
				],
				[
					-321,
					-27
				],
				[
					-89,
					545
				],
				[
					-232,
					653
				],
				[
					-211,
					814
				]
			],
			[
				[
					58908,
					36434
				],
				[
					-56,
					-256
				],
				[
					-163,
					-62
				],
				[
					-166,
					312
				],
				[
					-2,
					199
				],
				[
					76,
					216
				],
				[
					26,
					168
				],
				[
					80,
					41
				],
				[
					140,
					-105
				]
			],
			[
				[
					59999,
					71781
				],
				[
					-26,
					440
				],
				[
					68,
					237
				]
			],
			[
				[
					60041,
					72458
				],
				[
					74,
					126
				],
				[
					75,
					127
				],
				[
					15,
					321
				],
				[
					91,
					-112
				],
				[
					306,
					160
				],
				[
					147,
					-108
				],
				[
					229,
					1
				],
				[
					320,
					217
				],
				[
					149,
					-10
				],
				[
					316,
					89
				]
			],
			[
				[
					50518,
					55366
				],
				[
					-224,
					-122
				]
			],
			[
				[
					78495,
					58847
				],
				[
					-249,
					265
				],
				[
					-238,
					-11
				],
				[
					41,
					452
				],
				[
					-245,
					-3
				],
				[
					-22,
					-633
				],
				[
					-150,
					-841
				],
				[
					-90,
					-509
				],
				[
					19,
					-417
				],
				[
					181,
					-18
				],
				[
					113,
					-526
				],
				[
					50,
					-498
				],
				[
					155,
					-330
				],
				[
					168,
					-67
				],
				[
					144,
					-299
				]
			],
			[
				[
					77801,
					55552
				],
				[
					-110,
					221
				],
				[
					-47,
					285
				],
				[
					-148,
					325
				],
				[
					-135,
					274
				],
				[
					-45,
					-339
				],
				[
					-53,
					320
				],
				[
					30,
					359
				],
				[
					82,
					553
				]
			],
			[
				[
					68841,
					73220
				],
				[
					156,
					583
				],
				[
					-60,
					429
				],
				[
					-204,
					137
				],
				[
					72,
					254
				],
				[
					232,
					-27
				],
				[
					132,
					318
				],
				[
					89,
					370
				],
				[
					371,
					134
				],
				[
					-58,
					-267
				],
				[
					40,
					-161
				],
				[
					114,
					15
				]
			],
			[
				[
					64978,
					73251
				],
				[
					-52,
					408
				],
				[
					40,
					602
				],
				[
					-216,
					195
				],
				[
					71,
					394
				],
				[
					-184,
					34
				],
				[
					61,
					485
				],
				[
					262,
					-141
				],
				[
					244,
					184
				],
				[
					-202,
					346
				],
				[
					-80,
					329
				],
				[
					-224,
					-147
				],
				[
					-28,
					-422
				],
				[
					-87,
					374
				]
			],
			[
				[
					65546,
					75618
				],
				[
					313,
					8
				],
				[
					-45,
					290
				],
				[
					237,
					199
				],
				[
					234,
					334
				],
				[
					374,
					-304
				],
				[
					30,
					-460
				],
				[
					106,
					-118
				],
				[
					301,
					27
				],
				[
					93,
					-105
				],
				[
					137,
					-593
				],
				[
					317,
					-398
				],
				[
					181,
					-271
				],
				[
					291,
					-282
				],
				[
					369,
					-247
				],
				[
					-7,
					-352
				]
			],
			[
				[
					84713,
					46708
				],
				[
					32,
					136
				],
				[
					239,
					129
				],
				[
					194,
					20
				],
				[
					87,
					72
				],
				[
					105,
					-72
				],
				[
					-102,
					-156
				],
				[
					-289,
					-252
				],
				[
					-233,
					-165
				]
			],
			[
				[
					32866,
					58026
				],
				[
					160,
					75
				],
				[
					58,
					-20
				],
				[
					-11,
					-430
				],
				[
					-232,
					-63
				],
				[
					-50,
					52
				],
				[
					81,
					158
				],
				[
					-6,
					228
				]
			],
			[
				[
					52339,
					73106
				],
				[
					302,
					232
				],
				[
					195,
					-69
				],
				[
					-9,
					-291
				],
				[
					236,
					212
				],
				[
					20,
					-111
				],
				[
					-139,
					-282
				],
				[
					-2,
					-266
				],
				[
					96,
					-143
				],
				[
					-36,
					-499
				],
				[
					-183,
					-289
				],
				[
					53,
					-314
				],
				[
					143,
					-10
				],
				[
					70,
					-274
				],
				[
					106,
					-90
				]
			],
			[
				[
					60041,
					72458
				],
				[
					-102,
					261
				],
				[
					105,
					217
				],
				[
					-169,
					-49
				],
				[
					-233,
					132
				],
				[
					-191,
					-331
				],
				[
					-421,
					-65
				],
				[
					-225,
					309
				],
				[
					-300,
					19
				],
				[
					-64,
					-238
				],
				[
					-192,
					-69
				],
				[
					-268,
					307
				],
				[
					-303,
					-11
				],
				[
					-165,
					573
				],
				[
					-203,
					320
				],
				[
					135,
					447
				],
				[
					-176,
					276
				],
				[
					308,
					550
				],
				[
					428,
					23
				],
				[
					117,
					438
				],
				[
					529,
					-76
				],
				[
					334,
					373
				],
				[
					324,
					163
				],
				[
					459,
					13
				],
				[
					485,
					-406
				],
				[
					399,
					-223
				],
				[
					323,
					89
				],
				[
					239,
					-52
				],
				[
					328,
					301
				]
			],
			[
				[
					57776,
					76021
				],
				[
					33,
					-222
				],
				[
					243,
					-186
				],
				[
					-51,
					-141
				],
				[
					-330,
					-32
				],
				[
					-118,
					-178
				],
				[
					-232,
					-310
				],
				[
					-87,
					268
				],
				[
					3,
					119
				]
			],
			[
				[
					83826,
					65878
				],
				[
					-167,
					-924
				],
				[
					-119,
					-472
				],
				[
					-146,
					486
				],
				[
					-32,
					427
				],
				[
					163,
					566
				],
				[
					223,
					436
				],
				[
					127,
					-172
				],
				[
					-49,
					-347
				]
			],
			[
				[
					60889,
					49136
				],
				[
					-128,
					-710
				],
				[
					16,
					-326
				],
				[
					178,
					-210
				],
				[
					8,
					-149
				],
				[
					-76,
					-348
				],
				[
					16,
					-175
				],
				[
					-18,
					-275
				],
				[
					97,
					-361
				],
				[
					115,
					-568
				],
				[
					101,
					-126
				]
			],
			[
				[
					59099,
					46514
				],
				[
					-157,
					172
				],
				[
					-177,
					97
				],
				[
					-111,
					97
				],
				[
					-116,
					146
				]
			],
			[
				[
					58449,
					51176
				],
				[
					98,
					69
				],
				[
					304,
					-7
				],
				[
					566,
					44
				]
			],
			[
				[
					60617,
					78955
				],
				[
					-222,
					-46
				],
				[
					-185,
					-187
				],
				[
					-260,
					-30
				],
				[
					-239,
					-215
				],
				[
					16,
					-358
				],
				[
					136,
					-139
				],
				[
					284,
					35
				],
				[
					-55,
					-206
				],
				[
					-304,
					-100
				],
				[
					-377,
					-333
				],
				[
					-154,
					117
				],
				[
					61,
					271
				],
				[
					-304,
					169
				],
				[
					50,
					110
				],
				[
					265,
					191
				],
				[
					-80,
					132
				],
				[
					-432,
					146
				],
				[
					-19,
					215
				],
				[
					-257,
					-71
				],
				[
					-103,
					-317
				],
				[
					-215,
					-426
				]
			],
			[
				[
					35174,
					32383
				],
				[
					-121,
					-362
				],
				[
					-313,
					-320
				],
				[
					-205,
					115
				],
				[
					-151,
					-62
				],
				[
					-256,
					247
				],
				[
					-189,
					-18
				],
				[
					-169,
					319
				]
			],
			[
				[
					6794,
					62819
				],
				[
					-41,
					-96
				],
				[
					-69,
					82
				],
				[
					8,
					161
				],
				[
					-46,
					210
				],
				[
					14,
					64
				],
				[
					48,
					94
				],
				[
					-19,
					113
				],
				[
					16,
					54
				],
				[
					21,
					-11
				],
				[
					107,
					-97
				],
				[
					49,
					-50
				],
				[
					45,
					-77
				],
				[
					71,
					-202
				],
				[
					-7,
					-32
				],
				[
					-108,
					-123
				],
				[
					-89,
					-90
				]
			],
			[
				[
					6645,
					63718
				],
				[
					-94,
					-41
				],
				[
					-47,
					121
				],
				[
					-32,
					47
				],
				[
					-3,
					36
				],
				[
					27,
					49
				],
				[
					99,
					-55
				],
				[
					73,
					-88
				],
				[
					-23,
					-69
				]
			],
			[
				[
					6456,
					64025
				],
				[
					-9,
					-63
				],
				[
					-149,
					17
				],
				[
					21,
					70
				],
				[
					137,
					-24
				]
			],
			[
				[
					6207,
					64108
				],
				[
					-15,
					-33
				],
				[
					-19,
					8
				],
				[
					-97,
					20
				],
				[
					-35,
					130
				],
				[
					-11,
					23
				],
				[
					74,
					80
				],
				[
					23,
					-37
				],
				[
					80,
					-191
				]
			],
			[
				[
					5737,
					64488
				],
				[
					-33,
					-57
				],
				[
					-93,
					105
				],
				[
					14,
					42
				],
				[
					43,
					57
				],
				[
					64,
					-13
				],
				[
					5,
					-134
				]
			],
			[
				[
					31350,
					77823
				],
				[
					48,
					-189
				],
				[
					-296,
					-279
				],
				[
					-286,
					-198
				],
				[
					-293,
					-171
				],
				[
					-147,
					-342
				],
				[
					-47,
					-129
				],
				[
					-3,
					-306
				],
				[
					92,
					-305
				],
				[
					115,
					-14
				],
				[
					-29,
					210
				],
				[
					83,
					-128
				],
				[
					-22,
					-165
				],
				[
					-188,
					-93
				],
				[
					-133,
					11
				],
				[
					-205,
					-100
				],
				[
					-121,
					-29
				],
				[
					-162,
					-28
				],
				[
					-231,
					-167
				],
				[
					408,
					108
				],
				[
					82,
					-109
				],
				[
					-389,
					-173
				],
				[
					-177,
					-1
				],
				[
					8,
					71
				],
				[
					-84,
					-160
				],
				[
					82,
					-26
				],
				[
					-60,
					-414
				],
				[
					-203,
					-443
				],
				[
					-20,
					148
				],
				[
					-61,
					30
				],
				[
					-91,
					144
				],
				[
					57,
					-310
				],
				[
					69,
					-103
				],
				[
					5,
					-217
				],
				[
					-89,
					-224
				],
				[
					-157,
					-460
				],
				[
					-25,
					23
				],
				[
					86,
					392
				],
				[
					-142,
					220
				],
				[
					-33,
					478
				],
				[
					-53,
					-249
				],
				[
					59,
					-365
				],
				[
					-183,
					90
				],
				[
					191,
					-185
				],
				[
					12,
					-548
				],
				[
					79,
					-40
				],
				[
					29,
					-199
				],
				[
					39,
					-577
				],
				[
					-176,
					-427
				],
				[
					-288,
					-171
				],
				[
					-182,
					-338
				],
				[
					-139,
					-37
				],
				[
					-141,
					-211
				],
				[
					-39,
					-193
				],
				[
					-305,
					-374
				],
				[
					-157,
					-274
				],
				[
					-131,
					-342
				],
				[
					-43,
					-409
				],
				[
					50,
					-400
				],
				[
					92,
					-492
				],
				[
					124,
					-408
				],
				[
					1,
					-249
				],
				[
					132,
					-668
				],
				[
					-9,
					-388
				],
				[
					-12,
					-224
				],
				[
					-69,
					-352
				],
				[
					-83,
					-73
				],
				[
					-137,
					70
				],
				[
					-44,
					253
				],
				[
					-105,
					132
				],
				[
					-148,
					496
				],
				[
					-129,
					440
				],
				[
					-42,
					225
				],
				[
					57,
					383
				],
				[
					-77,
					316
				],
				[
					-217,
					482
				],
				[
					-108,
					89
				],
				[
					-281,
					-262
				],
				[
					-49,
					29
				],
				[
					-135,
					269
				],
				[
					-174,
					142
				],
				[
					-314,
					-72
				],
				[
					-247,
					63
				],
				[
					-212,
					-39
				],
				[
					-114,
					-90
				],
				[
					50,
					-153
				],
				[
					-5,
					-234
				],
				[
					59,
					-113
				],
				[
					-53,
					-76
				],
				[
					-103,
					85
				],
				[
					-104,
					-109
				],
				[
					-202,
					17
				],
				[
					-207,
					305
				],
				[
					-242,
					-72
				],
				[
					-202,
					133
				],
				[
					-173,
					-40
				],
				[
					-234,
					-135
				],
				[
					-253,
					-427
				],
				[
					-276,
					-248
				],
				[
					-152,
					-275
				],
				[
					-63,
					-259
				],
				[
					-3,
					-397
				],
				[
					14,
					-277
				],
				[
					52,
					-196
				]
			],
			[
				[
					17464,
					70566
				],
				[
					-46,
					294
				],
				[
					-180,
					331
				],
				[
					-130,
					69
				],
				[
					-30,
					165
				],
				[
					-156,
					29
				],
				[
					-100,
					156
				],
				[
					-258,
					57
				],
				[
					-71,
					93
				],
				[
					-33,
					316
				],
				[
					-270,
					578
				],
				[
					-231,
					801
				],
				[
					10,
					133
				],
				[
					-123,
					190
				],
				[
					-215,
					483
				],
				[
					-38,
					469
				],
				[
					-148,
					315
				],
				[
					61,
					477
				],
				[
					-10,
					494
				],
				[
					-89,
					441
				],
				[
					109,
					543
				],
				[
					34,
					523
				],
				[
					33,
					522
				],
				[
					-50,
					773
				],
				[
					-88,
					492
				],
				[
					-80,
					268
				],
				[
					33,
					112
				],
				[
					402,
					-195
				],
				[
					148,
					-544
				],
				[
					69,
					152
				],
				[
					-45,
					472
				],
				[
					-94,
					473
				]
			],
			[
				[
					7498,
					84721
				],
				[
					-277,
					-219
				],
				[
					-142,
					148
				],
				[
					-43,
					270
				],
				[
					252,
					205
				],
				[
					148,
					88
				],
				[
					185,
					-39
				],
				[
					117,
					-179
				],
				[
					-240,
					-274
				]
			],
			[
				[
					4006,
					86330
				],
				[
					-171,
					-89
				],
				[
					-182,
					107
				],
				[
					-168,
					157
				],
				[
					274,
					98
				],
				[
					220,
					-52
				],
				[
					27,
					-221
				]
			],
			[
				[
					2297,
					88560
				],
				[
					171,
					-109
				],
				[
					173,
					59
				],
				[
					225,
					-152
				],
				[
					276,
					-77
				],
				[
					-23,
					-63
				],
				[
					-211,
					-121
				],
				[
					-211,
					125
				],
				[
					-106,
					104
				],
				[
					-245,
					-33
				],
				[
					-66,
					51
				],
				[
					17,
					216
				]
			],
			[
				[
					13740,
					83389
				],
				[
					-153,
					217
				],
				[
					-245,
					183
				],
				[
					-78,
					503
				],
				[
					-358,
					466
				],
				[
					-150,
					543
				],
				[
					-267,
					38
				],
				[
					-441,
					14
				],
				[
					-326,
					165
				],
				[
					-574,
					598
				],
				[
					-266,
					109
				],
				[
					-486,
					206
				],
				[
					-385,
					-49
				],
				[
					-546,
					264
				],
				[
					-330,
					246
				],
				[
					-309,
					-122
				],
				[
					58,
					-400
				],
				[
					-154,
					-37
				],
				[
					-321,
					-120
				],
				[
					-245,
					-195
				],
				[
					-308,
					-122
				],
				[
					-39,
					339
				],
				[
					125,
					565
				],
				[
					295,
					177
				],
				[
					-76,
					145
				],
				[
					-354,
					-321
				],
				[
					-190,
					-383
				],
				[
					-400,
					-410
				],
				[
					203,
					-280
				],
				[
					-262,
					-413
				],
				[
					-299,
					-241
				],
				[
					-278,
					-176
				],
				[
					-69,
					-255
				],
				[
					-434,
					-297
				],
				[
					-87,
					-271
				],
				[
					-325,
					-246
				],
				[
					-191,
					44
				],
				[
					-259,
					-160
				],
				[
					-282,
					-196
				],
				[
					-231,
					-193
				],
				[
					-477,
					-164
				],
				[
					-43,
					96
				],
				[
					304,
					270
				],
				[
					271,
					177
				],
				[
					296,
					315
				],
				[
					345,
					65
				],
				[
					137,
					236
				],
				[
					385,
					345
				],
				[
					62,
					115
				],
				[
					205,
					204
				],
				[
					48,
					437
				],
				[
					141,
					340
				],
				[
					-320,
					-175
				],
				[
					-90,
					99
				],
				[
					-150,
					-209
				],
				[
					-181,
					292
				],
				[
					-75,
					-207
				],
				[
					-104,
					287
				],
				[
					-278,
					-230
				],
				[
					-170,
					0
				],
				[
					-24,
					343
				],
				[
					50,
					211
				],
				[
					-179,
					205
				],
				[
					-361,
					-110
				],
				[
					-235,
					270
				],
				[
					-190,
					138
				],
				[
					-1,
					327
				],
				[
					-214,
					245
				],
				[
					108,
					331
				],
				[
					226,
					322
				],
				[
					99,
					295
				],
				[
					225,
					42
				],
				[
					191,
					-92
				],
				[
					224,
					278
				],
				[
					201,
					-50
				],
				[
					212,
					179
				],
				[
					-52,
					263
				],
				[
					-155,
					104
				],
				[
					205,
					222
				],
				[
					-170,
					-7
				],
				[
					-295,
					-125
				],
				[
					-85,
					-127
				],
				[
					-219,
					127
				],
				[
					-392,
					-65
				],
				[
					-407,
					138
				],
				[
					-117,
					232
				],
				[
					-351,
					334
				],
				[
					390,
					241
				],
				[
					620,
					282
				],
				[
					228,
					0
				],
				[
					-38,
					-288
				],
				[
					586,
					22
				],
				[
					-225,
					357
				],
				[
					-342,
					219
				],
				[
					-197,
					288
				],
				[
					-267,
					246
				],
				[
					-381,
					182
				],
				[
					155,
					302
				],
				[
					493,
					19
				],
				[
					350,
					262
				],
				[
					66,
					280
				],
				[
					284,
					274
				],
				[
					271,
					66
				],
				[
					526,
					256
				],
				[
					256,
					-39
				],
				[
					427,
					307
				],
				[
					421,
					-121
				],
				[
					201,
					-260
				],
				[
					123,
					112
				],
				[
					469,
					-35
				],
				[
					-16,
					-132
				],
				[
					425,
					-98
				],
				[
					283,
					57
				],
				[
					585,
					-182
				],
				[
					534,
					-54
				],
				[
					214,
					-75
				],
				[
					370,
					94
				],
				[
					421,
					-173
				],
				[
					302,
					-81
				]
			],
			[
				[
					30185,
					58611
				],
				[
					-8,
					-136
				],
				[
					-163,
					-67
				],
				[
					91,
					-262
				],
				[
					-3,
					-301
				],
				[
					-123,
					-334
				],
				[
					105,
					-457
				],
				[
					120,
					37
				],
				[
					62,
					417
				],
				[
					-86,
					202
				],
				[
					-14,
					436
				],
				[
					346,
					234
				],
				[
					-38,
					272
				],
				[
					97,
					181
				],
				[
					100,
					-404
				],
				[
					195,
					-10
				],
				[
					180,
					-321
				],
				[
					11,
					-190
				],
				[
					249,
					-6
				],
				[
					297,
					60
				],
				[
					159,
					-258
				],
				[
					213,
					-71
				],
				[
					155,
					180
				],
				[
					4,
					145
				],
				[
					344,
					34
				],
				[
					333,
					8
				],
				[
					-236,
					-170
				],
				[
					95,
					-272
				],
				[
					222,
					-43
				],
				[
					210,
					-283
				],
				[
					45,
					-462
				],
				[
					144,
					13
				],
				[
					109,
					-135
				]
			],
			[
				[
					80013,
					64241
				],
				[
					-371,
					-493
				],
				[
					-231,
					-544
				],
				[
					-61,
					-399
				],
				[
					212,
					-607
				],
				[
					260,
					-753
				],
				[
					252,
					-356
				],
				[
					169,
					-462
				],
				[
					127,
					-1066
				],
				[
					-37,
					-1013
				],
				[
					-232,
					-379
				],
				[
					-318,
					-371
				],
				[
					-227,
					-480
				],
				[
					-346,
					-536
				],
				[
					-101,
					369
				],
				[
					78,
					390
				],
				[
					-206,
					327
				]
			],
			[
				[
					96623,
					42347
				],
				[
					-92,
					-76
				],
				[
					-93,
					252
				],
				[
					10,
					155
				],
				[
					175,
					-331
				]
			],
			[
				[
					96418,
					43229
				],
				[
					45,
					-464
				],
				[
					-75,
					72
				],
				[
					-58,
					-31
				],
				[
					-39,
					159
				],
				[
					-6,
					441
				],
				[
					133,
					-177
				]
			],
			[
				[
					64752,
					61418
				],
				[
					-201,
					-154
				],
				[
					-54,
					-256
				],
				[
					-6,
					-196
				],
				[
					-277,
					-244
				],
				[
					-444,
					-268
				],
				[
					-249,
					-406
				],
				[
					-122,
					-32
				],
				[
					-83,
					34
				],
				[
					-163,
					-239
				],
				[
					-177,
					-111
				],
				[
					-233,
					-30
				],
				[
					-70,
					-33
				],
				[
					-61,
					-152
				],
				[
					-73,
					-42
				],
				[
					-43,
					-146
				],
				[
					-137,
					12
				],
				[
					-89,
					-78
				],
				[
					-192,
					30
				],
				[
					-72,
					336
				],
				[
					8,
					315
				],
				[
					-46,
					170
				],
				[
					-54,
					426
				],
				[
					-80,
					236
				],
				[
					56,
					28
				],
				[
					-29,
					264
				],
				[
					34,
					111
				],
				[
					-12,
					251
				]
			],
			[
				[
					58175,
					39107
				],
				[
					113,
					-6
				],
				[
					134,
					-97
				],
				[
					94,
					69
				],
				[
					148,
					-58
				]
			],
			[
				[
					59119,
					36429
				],
				[
					-70,
					-419
				],
				[
					-32,
					-479
				],
				[
					-72,
					-260
				],
				[
					-190,
					-290
				],
				[
					-54,
					-84
				],
				[
					-118,
					-292
				],
				[
					-77,
					-296
				],
				[
					-158,
					-413
				],
				[
					-314,
					-594
				],
				[
					-196,
					-345
				],
				[
					-210,
					-262
				],
				[
					-290,
					-224
				],
				[
					-141,
					-30
				],
				[
					-36,
					-160
				],
				[
					-169,
					85
				],
				[
					-138,
					-109
				],
				[
					-301,
					111
				],
				[
					-168,
					-71
				],
				[
					-115,
					31
				],
				[
					-286,
					-228
				],
				[
					-238,
					-91
				],
				[
					-171,
					-218
				],
				[
					-127,
					-13
				],
				[
					-117,
					205
				],
				[
					-94,
					10
				],
				[
					-120,
					258
				],
				[
					-13,
					-80
				],
				[
					-37,
					155
				],
				[
					2,
					337
				],
				[
					-90,
					386
				],
				[
					89,
					105
				],
				[
					-7,
					442
				],
				[
					-182,
					539
				],
				[
					-139,
					488
				],
				[
					-1,
					1
				],
				[
					-199,
					749
				]
			],
			[
				[
					58409,
					42899
				],
				[
					-210,
					-79
				],
				[
					-159,
					-230
				],
				[
					-33,
					-199
				],
				[
					-100,
					-46
				],
				[
					-241,
					-473
				],
				[
					-154,
					-373
				],
				[
					-94,
					-13
				],
				[
					-90,
					66
				],
				[
					-311,
					63
				]
			]
		],
		"transform": {
			"scale": [
				0.0036000360003600037,
				0.0017364686646866468
			],
			"translate": [
				-180,
				-90
			]
		}
	};

/***/ }
/******/ ]);