'use strict';

const path = require( 'path' );
const HtmlWebpackPlugin = require( 'html-webpack-plugin' );

module.exports = {
	devtool: 'source-map',
	performance: { hints: false },

	entry: path.resolve( __dirname, 'src', 'index.js' ),

	output: {
		path: path.resolve( __dirname, 'build' ),
		filename: 'script.js',
	},

	devServer: {
		static: {
			directory: path.join( __dirname ),
		},
		compress: true,
		port: 9000,
	},

	plugins: [
		new HtmlWebpackPlugin( {
			template: path.join( __dirname, 'template', 'index.hbs' )
		} )
	]
};
