'use strict';

// Copied from: https://dev.to/the_one/deploy-to-github-pages-like-a-pro-with-github-actions-4hdg.
const execa = require( 'execa' );
const fs = require( 'fs/promises' );
const path = require( 'path' );

( async () => {
	try {
		const commitMessage = `Build: ${ new Date().toISOString() }.`;
		const outputDirectory = 'dist';

		// Create an empty branch for deploying a new version.
		await execa( 'git', [ 'checkout', '--orphan', 'gh-pages' ] );

		console.log( 'Building...' );
		await execa( 'pnpm', [ 'build' ] );
		await fs.writeFile( path.join( outputDirectory, '.nojekyll' ), '' );
		await execa( 'git', [ '--work-tree', outputDirectory, 'add', '--all' ] );
		await execa( 'git', [ '--work-tree', outputDirectory, 'commit', '-m', commitMessage ] );

		console.log( 'Pushing to gh-pages...' );
		await execa( 'git', [ 'push', 'origin', 'HEAD:gh-pages', '--force' ] );
		await execa( 'rm', [ '-r', outputDirectory ] );
		await execa( 'git', [ 'checkout', '-f', 'master' ] );
		await execa( 'git', [ 'branch', '-D', 'gh-pages' ] );

		console.log( 'Successfully deployed.' );
	} catch ( e ) {
		console.log( e.message );
		process.exit( 1 );
	}
} )();
