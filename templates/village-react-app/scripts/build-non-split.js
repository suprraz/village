const rewire = require('rewire')
const defaults = rewire('react-scripts/scripts/build.js') // If you ejected, use this instead: const defaults = rewire('./build.js')
let config = defaults.__get__('config')

const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default;
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

config.optimization.splitChunks = {
  cacheGroups: {
    default: false
  }
}

config.optimization.runtimeChunk = false

// Renames main.00455bcf.js to main.js
config.output.filename = 'static/js/[name].js'

const miniCssExtractPlugin = config.plugins.find((p => p.constructor.name === 'MiniCssExtractPlugin'));

if(miniCssExtractPlugin) {
  // Renames main.b100e6da.css to main.css
  miniCssExtractPlugin.options.filename = 'static/css/[name].css'
  miniCssExtractPlugin.options.moduleFilename = () => 'static/css/main.css'
}

config.plugins.push( new HtmlInlineScriptPlugin() );
config.plugins.push(new HTMLInlineCSSWebpackPlugin());

const htmlWebpackPlugin = config.plugins.find((p => p.constructor.name === 'HtmlWebpackPlugin'));
if(htmlWebpackPlugin) {
  htmlWebpackPlugin.userOptions.inject = 'body';
}
