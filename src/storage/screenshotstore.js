export const SCREENSHOT_DATABASE_NAME = 'clipboard-image-resize';
export const SCREENSHOT_STORE_NAME = 'screenshots';
export const SCREENSHOT_STORE_VERSION = 1;
export const MAX_SAVED_SCREENSHOTS = 40;

let databasePromise;

export function supportsScreenshotStore() {
	return typeof indexedDB !== 'undefined';
}

export async function listSavedScreenshots() {
	if ( !supportsScreenshotStore() ) {
		return [];
	}

	const screenshots = await runTransaction( 'readonly', store => requestToPromise( store.getAll() ) );

	return screenshots.sort( ( left, right ) => right.createdAt - left.createdAt );
}

export async function saveScreenshot( screenshot, { maxEntries = MAX_SAVED_SCREENSHOTS } = {} ) {
	if ( !supportsScreenshotStore() ) {
		return { trimmedIds: [] };
	}

	await runTransaction( 'readwrite', store => requestToPromise( store.put( screenshot ) ) );

	const trimmedIds = await trimSavedScreenshots( maxEntries );

	return { trimmedIds };
}

export async function removeSavedScreenshot( id ) {
	if ( !supportsScreenshotStore() ) {
		return;
	}

	await runTransaction( 'readwrite', store => requestToPromise( store.delete( id ) ) );
}

export async function touchSavedScreenshot( id, timestamp = Date.now() ) {
	if ( !supportsScreenshotStore() ) {
		return;
	}

	await runTransaction( 'readwrite', async store => {
		const screenshot = await requestToPromise( store.get( id ) );

		if ( !screenshot ) {
			return;
		}

		screenshot.lastViewedAt = timestamp;

		await requestToPromise( store.put( screenshot ) );
	} );
}

export async function resetScreenshotStore() {
	if ( databasePromise ) {
		const database = await databasePromise.catch( () => null );

		database?.close();
	}

	databasePromise = null;
}

async function trimSavedScreenshots( maxEntries ) {
	const screenshots = await listSavedScreenshots();

	if ( screenshots.length <= maxEntries ) {
		return [];
	}

	const staleScreenshots = screenshots
		.sort( ( left, right ) => getLastViewedTime( right ) - getLastViewedTime( left ) )
		.slice( maxEntries );

	await runTransaction( 'readwrite', async store => {
		for ( const screenshot of staleScreenshots ) {
			await requestToPromise( store.delete( screenshot.id ) );
		}
	} );

	return staleScreenshots.map( screenshot => screenshot.id );
}

function getLastViewedTime( screenshot ) {
	return screenshot.lastViewedAt || screenshot.createdAt;
}

async function runTransaction( mode, callback ) {
	const database = await openScreenshotDatabase();
	const transaction = database.transaction( SCREENSHOT_STORE_NAME, mode );
	const store = transaction.objectStore( SCREENSHOT_STORE_NAME );
	const result = await callback( store );

	await transactionToPromise( transaction );

	return result;
}

async function openScreenshotDatabase() {
	if ( !databasePromise ) {
		databasePromise = new Promise( ( resolve, reject ) => {
			const request = indexedDB.open( SCREENSHOT_DATABASE_NAME, SCREENSHOT_STORE_VERSION );

			request.addEventListener( 'upgradeneeded', event => {
				const database = event.target.result;

				if ( !database.objectStoreNames.contains( SCREENSHOT_STORE_NAME ) ) {
					const store = database.createObjectStore( SCREENSHOT_STORE_NAME, { keyPath: 'id' } );

					store.createIndex( 'createdAt', 'createdAt' );
					store.createIndex( 'lastViewedAt', 'lastViewedAt' );
				}
			} );

			request.addEventListener( 'success', () => {
				resolve( request.result );
			} );

			request.addEventListener( 'error', () => {
				reject( request.error || new Error( 'The screenshot database could not be opened.' ) );
			} );
		} );
	}

	return databasePromise;
}

function requestToPromise( request ) {
	return new Promise( ( resolve, reject ) => {
		request.addEventListener( 'success', () => {
			resolve( request.result );
		} );

		request.addEventListener( 'error', () => {
			reject( request.error || new Error( 'IndexedDB request failed.' ) );
		} );
	} );
}

function transactionToPromise( transaction ) {
	return new Promise( ( resolve, reject ) => {
		transaction.addEventListener( 'complete', () => {
			resolve();
		} );

		transaction.addEventListener( 'abort', () => {
			reject( transaction.error || new Error( 'IndexedDB transaction aborted.' ) );
		} );

		transaction.addEventListener( 'error', () => {
			reject( transaction.error || new Error( 'IndexedDB transaction failed.' ) );
		} );
	} );
}
