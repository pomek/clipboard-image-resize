const ACTIVE_CAPTURE_STORAGE_KEY = 'clipboard-image-resize:active-capture-id';
const SUPPORTED_MIME_TYPES = new Set( [ 'image/png', 'image/jpeg' ] );
const IMAGE_FINGERPRINT_SIZE = 8;

export function areImageFingerprintsEquivalent( leftFingerprint, rightFingerprint, {
	maxDistance = 6,
} = {} ) {
	if ( !leftFingerprint || !rightFingerprint ) {
		return false;
	}

	const [ leftSize, leftHash ] = leftFingerprint.split( ':' );
	const [ rightSize, rightHash ] = rightFingerprint.split( ':' );

	if ( leftSize !== rightSize || !leftHash || !rightHash || leftHash.length !== rightHash.length ) {
		return false;
	}

	let distance = 0;

	for ( let index = 0; index < leftHash.length; index++ ) {
		if ( leftHash[ index ] !== rightHash[ index ] ) {
			distance++;

			if ( distance > maxDistance ) {
				return false;
			}
		}
	}

	return true;
}

export async function createImageFingerprint( image, {
	height = image.height,
	width = image.width,
} = {} ) {
	const resizedCanvas = document.createElement( 'canvas' );
	const resizedContext = resizedCanvas.getContext( '2d', { willReadFrequently: true } );
	const canvas = document.createElement( 'canvas' );
	const context = canvas.getContext( '2d', { willReadFrequently: true } );
	const grayscaleValues = [];
	let grayscaleTotal = 0;

	resizedCanvas.width = width;
	resizedCanvas.height = height;
	resizedContext.drawImage( image, 0, 0, width, height );

	canvas.width = IMAGE_FINGERPRINT_SIZE;
	canvas.height = IMAGE_FINGERPRINT_SIZE;
	context.drawImage( resizedCanvas, 0, 0, IMAGE_FINGERPRINT_SIZE, IMAGE_FINGERPRINT_SIZE );

	const { data } = context.getImageData( 0, 0, IMAGE_FINGERPRINT_SIZE, IMAGE_FINGERPRINT_SIZE );

	for ( let index = 0; index < data.length; index += 4 ) {
		const grayscaleValue = Math.round(
			data[ index ] * 0.299 +
			data[ index + 1 ] * 0.587 +
			data[ index + 2 ] * 0.114
		);

		grayscaleValues.push( grayscaleValue );
		grayscaleTotal += grayscaleValue;
	}

	const grayscaleAverage = grayscaleTotal / grayscaleValues.length;
	const hash = grayscaleValues
		.map( value => value >= grayscaleAverage ? '1' : '0' )
		.join( '' );

	return `${ width }x${ height }:${ hash }`;
}

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
