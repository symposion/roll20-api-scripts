module.exports = {
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json' }
    ]
  },
  output: {
    path: __dirname,
    filename: 'ShapedScripts.js',
    library: 'ShapedScripts'
  },
  externals: {
    'underscore': '_'
  }
};
