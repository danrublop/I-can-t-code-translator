const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    toolbar: './src/renderer/toolbar.tsx',
    explanation: './src/renderer/explanation.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json'
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/toolbar.html',
      filename: 'toolbar.html',
      chunks: ['toolbar']
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/explanation.html',
      filename: 'explanation.html',
      chunks: ['explanation']
    })
  ],
  devtool: 'source-map'
};
