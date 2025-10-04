const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/extension/background.ts',
    content: './src/extension/content.ts',
    popup: './src/extension/popup.ts',
    logs: './src/extension/logs.ts',
    report: './src/extension/report.ts',
    'floating-button': './src/extension/floating-button.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.extension.json'
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@/extension': path.resolve(__dirname, '../src/extension'),
      '@/backend': path.resolve(__dirname, '../src/backend'),
      '@/shared': path.resolve(__dirname, '../src/shared')
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../dist'),
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src/extension/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/extension/popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/extension/popup.css',
          to: 'popup.css'
        },
            {
              from: 'src/extension/logs.html',
              to: 'logs.html'
            },
            {
              from: 'src/extension/report.html',
              to: 'report.html'
            },
            {
              from: 'src/extension/floating-button.html',
              to: 'floating-button.html'
            },
        {
          from: 'src/extension/icons',
          to: 'icons'
        }
      ]
    })
  ],
  devtool: 'source-map',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};
