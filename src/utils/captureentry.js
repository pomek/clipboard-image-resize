const ACTIVE_CAPTURE_STORAGE_KEY = 'clipboard-image-resize:active-capture-id';
const SUPPORTED_MIME_TYPES = new Set( [ 'image/png', 'image/jpeg' ] );

export function toCanvasDimension( value ) {
	const number = Number( value );

	if ( Number.isNaN( number ) || number < 1 ) {
		return 1;
	}

	return Math.round( number );
}

export function isImage( file ) {
	if ( !file ) {
		return false;
	}

	return SUPPORTED_MIME_TYPES.has( file.type );
}

export function readPersistedActiveCaptureId( storage = window.localStorage ) {
	try {
		return storage.getItem( ACTIVE_CAPTURE_STORAGE_KEY );
	} catch ( error ) {
		return null;
	}
}

export function persistActiveCaptureId( entryId, storage = window.localStorage ) {
	try {
		if ( entryId ) {
			storage.setItem( ACTIVE_CAPTURE_STORAGE_KEY, entryId );
		} else {
			storage.removeItem( ACTIVE_CAPTURE_STORAGE_KEY );
		}
	} catch ( error ) {
		// Ignore storage failures and keep the current session working.
	}
}

export function cleanupEntryResources( entry ) {
	if ( entry?.objectUrl ) {
		URL.revokeObjectURL( entry.objectUrl );
	}
}

export function createStoredScreenshot( entry ) {
	return {
		blob: entry.blob,
		createdAt: entry.createdAt,
		height: entry.image.height,
		id: entry.id,
		lastViewedAt: entry.lastViewedAt,
		mimeType: entry.blob.type,
		width: entry.image.width,
	};
}

export async function createImageEntry( file ) {
	return createImageEntryFromBlob( file );
}

export async function createImageEntryFromRecord( record ) {
	return createImageEntryFromBlob( record.blob, {
		createdAt: record.createdAt,
		id: record.id,
		lastViewedAt: record.lastViewedAt || record.createdAt,
	} );
}

async function createImageEntryFromBlob( blob, metadata = {} ) {
	const sourceUrl = URL.createObjectURL( blob );

	try {
		const image = await loadImage( sourceUrl );

		return {
			blob,
			createdAt: metadata.createdAt || Date.now(),
			id: metadata.id || `u${ crypto.randomUUID() }`,
			image,
			lastViewedAt: metadata.lastViewedAt || Date.now(),
			objectUrl: sourceUrl,
			sourceUrl,
		};
	} catch ( error ) {
		URL.revokeObjectURL( sourceUrl );
		throw error;
	}
}

function loadImage( sourceUrl ) {
	return new Promise( ( resolve, reject ) => {
		const image = new Image();

		image.addEventListener( 'load', () => {
			resolve( image );
		} );

		image.addEventListener( 'error', () => {
			reject( new Error( 'Could not load the pasted image.' ) );
		} );

		image.src = sourceUrl;
	} );
}
