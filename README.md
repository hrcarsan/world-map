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
var myMap = new WorldMap("my-map");
```

A optional second param is a object with the map options 

```javascript
WorldMap("my-map", 
{
  width: 800,
  height: 400,
  landsColor: '#008282',
  zoom: true
});
```

Take a look to a [live example](http://plnkr.co/edit/sOvkiTxQMgwtRFERq4qr?p=preview).

## License
Copyright &copy; 2016 [Santiago H. Cardona](https://github.com/santiagohecar).
Licensed under the [MIT License](LICENSE).
