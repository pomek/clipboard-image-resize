import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import {
	listSavedScreenshots,
	removeSavedScreenshot,
	resetScreenshotStore,
	saveScreenshot,
	SCREENSHOT_DATABASE_NAME,
	touchSavedScreenshot,
} from '../../src/storage/screenshotstore';

	describe( 'screenshot store', () => {
	afterEach( async () => {
		await resetScreenshotStore();
		await deleteDatabase( SCREENSHOT_DATABASE_NAME );
	} );

	it( 'lists saved screenshots from newest to oldest', async () => {
		await saveScreenshot( createScreenshot( 'older', 1000 ) );
		await saveScreenshot( createScreenshot( 'newer', 2000 ) );

		const screenshots = await listSavedScreenshots();

		expect( screenshots.map( screenshot => screenshot.id ) ).toEqual( [ 'newer', 'older' ] );
	} );

	it( 'removes saved screenshots by id', async () => {
		await saveScreenshot( createScreenshot( 'capture-1', 1000 ) );
		await saveScreenshot( createScreenshot( 'capture-2', 2000 ) );
		await removeSavedScreenshot( 'capture-1' );

		const screenshots = await listSavedScreenshots();

		expect( screenshots.map( screenshot => screenshot.id ) ).toEqual( [ 'capture-2' ] );
	} );

	it( 'keeps the most recently viewed screenshots when trimming', async () => {
		await saveScreenshot( createScreenshot( 'capture-1', 1000 ) );
		await saveScreenshot( createScreenshot( 'capture-2', 2000 ) );
		await touchSavedScreenshot( 'capture-1', 4000 );

		const { trimmedIds } = await saveScreenshot( createScreenshot( 'capture-3', 3000 ), { maxEntries: 2 } );
		const screenshots = await listSavedScreenshots();

		expect( trimmedIds ).toEqual( [ 'capture-2' ] );
		expect( screenshots.map( screenshot => screenshot.id ) ).toEqual( [ 'capture-3', 'capture-1' ] );
	} );
} );

function createScreenshot( id, createdAt ) {
	return {
		blob: new Blob( [ id ], { type: 'image/png' } ),
		createdAt,
		height: 1080,
		id,
		lastViewedAt: createdAt,
		mimeType: 'image/png',
		width: 1920,
	};
}

function deleteDatabase( name ) {
	return new Promise( ( resolve, reject ) => {
		const request = indexedDB.deleteDatabase( name );

		request.addEventListener( 'success', () => {
			resolve();
		} );

		request.addEventListener( 'error', () => {
			reject( request.error || new Error( 'Could not delete the test database.' ) );
		} );

		request.addEventListener( 'blocked', () => {
			reject( new Error( 'The test database is blocked.' ) );
		} );
	} );
}
