'use strict';

const path = require( 'path' );

module.exports = {
	devtool: 'source-map',
	performance: { hints: false },

	entry: path.resolve( __dirname, 'src', 'index.js' ),

	output: {
		path: path.resolve( __dirname, 'build' ),
		filename: 'script.js',
	}
};
