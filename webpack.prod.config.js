const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    toolbar: './src/renderer/toolbar.tsx',
    explanation: './src/renderer/explanation.tsx',
    panel: './src/renderer/panel.tsx',
    notebook: './src/renderer/notebook.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
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
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource'
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
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/panel.html',
      filename: 'panel.html',
      chunks: ['panel']
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/notebook.html',
      filename: 'notebook.html',
      chunks: ['notebook']
    })
  ],
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
