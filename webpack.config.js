module.exports = 
{
  entry: 
  {
    'main': './src/main.js'
  },
  output: 
  {
    path: './dist',
    filename: '[name].js'
  },
  module: 
  {
    loaders: 
    [
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  }
};
