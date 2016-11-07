const webpack = require("webpack");
const EVENT   = process.env.npm_lifecycle_event;
const PROD    = EVENT.includes('prod');
const config  = {};

config.entry = './src/world-map.js'

config.output =
{
  library: 'WorldMap',
  path: './dist',
  filename: PROD? 'world-map.min.js': 'world-map.js'
};

config.module =
{
  loaders: 
  [
    {
      test: /\.json$/,
      loader: 'json-loader'
    }
  ]
};

config.plugins = [];

if (PROD) 
{
  config.plugins.push(
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin(
    {
      beautify: false,
      comments: false
    })
  );
}

console.log(PROD? 'PRODUCTION BUILD': 'DEVELOPMENT BUILD');

module.exports = config;