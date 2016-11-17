# World map

Create and add world maps to your pages, enable zoom to get a more interactive views of the lands, and load additional resources to draw and customize the maps.

![alt tag](https://raw.githubusercontent.com/santiagohecar/world-map/master/example/world-map.png)

## Usage

Download the [latest release](https://github.com/santiagohecar/world-map/releases/latest), copy `world-map.js` or `world-map.min.js` (for minified version) from the dist folder into your project and simply load the file in a script tag:

```html
<script type="text/javascript" src="worl-map.min.js"></script>
```

You can also install with npm: 
    
    npm install world-map --save

Then require it in your code 

```javascript
var WorldMap = require("world-map");
```    
Add a container where map can be loaded

```html
<div id="my-map"></div>
```
Pass the id as first param of the constructor   

```javascript
var map = new WorldMap("my-map");
```

A optional second param is a object with the map options 

```javascript
WorldMap("my-map", 
{
  width: 960,
  height: 480,
  zoom: false,                             // enable/disable dragging and zooming
  resources:                               // load additional resources to customize the maps 
  [
    { 
      name: 'stations',                    // when loaded can access as map.resources.stations
      type: 'json',                        // also could be 'csv' 
      src: 'example.com/a.json',           // path to the resource
      onLoad: function (map, resource) {}, // called after the resource is loaded
      row: myOtherFunction,                // called for all row of the resource, used whit csv  
    }
  ], 
  onLoad: function (map) {},               // called when all resources loading is complete
  hideAntarctic: true,                       
  landsColor: '#ddd',
  landsBorder: '#fff',
  onDraw: function (map) {}                // draw additional shapes inside
});
```

Take a look to a [live example](http://plnkr.co/edit/sOvkiTxQMgwtRFERq4qr?p=preview).

## License
Copyright &copy; 2016 [Santiago H. Cardona](https://github.com/santiagohecar).
Licensed under the [MIT License](LICENSE).
