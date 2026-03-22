import ObservableInput from './observable/observableinput';
import Observable from './observable/observable';
import {
	listSavedScreenshots,
	removeSavedScreenshot,
	saveScreenshot,
	touchSavedScreenshot,
} from './storage/screenshotstore';
import copyImage from './utils/copyimage';
import drawImage from './utils/drawimage';
import throttle from './utils/throttle';

const ACTIVE_CAPTURE_STORAGE_KEY = 'clipboard-image-resize:active-capture-id';
const SUPPORTED_MIME_TYPES = new Set( [ 'image/png', 'image/jpeg' ] );

export default function setupClipboardResizeApp() {
	const elements = {
		clipboardStatus: document.getElementById( 'clipboard-status' ),
		copyButton: document.getElementById( 'copy-active-image' ),
		gallery: document.getElementById( 'recent-uploads' ),
		galleryTemplate: document.getElementById( 'template-gallery-tile' ),
		loader: document.getElementById( 'loader' ),
		preview: document.getElementById( 'canvas-preview' ),
		previewCaption: document.getElementById( 'preview-caption' ),
		previewEmptyState: document.getElementById( 'preview-empty-state' ),
		screenHeightInput: document.getElementById( 'input-screen-height' ),
		screenWidthInput: document.getElementById( 'input-screen-width' ),
	};
	const entries = new Map();
	const galleryTiles = new Map();
	const context = elements.preview.getContext( '2d' );
	const resizeScale = new Observable( 75 );
	const activeEntry = new Observable( null );
	const loader = new Observable( false );
	const screenWidthInput = new ObservableInput( elements.screenWidthInput, { defaultValue: screen.width } );
	const screenHeightInput = new ObservableInput( elements.screenHeightInput, { defaultValue: screen.height } );

	const syncCanvasSize = () => {
		elements.preview.width = toCanvasDimension( screenWidthInput.value );
		elements.preview.height = toCanvasDimension( screenHeightInput.value );

		if ( activeEntry.value ) {
			drawImage( context, activeEntry.value.image );
		}

		updatePreviewCaption();
	};

	screenWidthInput.on( 'change', syncCanvasSize );
	screenHeightInput.on( 'change', syncCanvasSize );

	screenWidthInput.attach();
	screenHeightInput.attach();

	activeEntry.on( 'change', ( event, { newValue } ) => {
		drawImage( context, newValue ? newValue.image : null );
		updateGallerySelection();
		updatePreviewState();
		updatePreviewCaption();
		updateCopyButton();
		persistActiveCaptureId( newValue?.id || null );

		if ( newValue ) {
			newValue.lastViewedAt = Date.now();
			touchSavedScreenshot( newValue.id, newValue.lastViewedAt ).catch( error => {
				console.error( error );
			} );
		}
	} );

	loader.on( 'change', ( event, { newValue } ) => {
		elements.loader.classList.toggle( 'loader--enabled', newValue );
		updateCopyButton();
	} );

	resizeScale.on( 'change', async ( event, { newValue } ) => {
		for ( const button of document.querySelectorAll( '.js-resize-button' ) ) {
			const isActive = Number( button.dataset.resizeValue ) === newValue;

			button.classList.toggle( 'active', isActive );
			button.setAttribute( 'aria-pressed', String( isActive ) );
		}

		updatePreviewCaption();

		if ( activeEntry.value ) {
			await copyActiveImage( 'Resized image copied to the clipboard.' );
		}
	} );

	for ( const button of document.querySelectorAll( '.js-resize-button' ) ) {
		button.setAttribute( 'aria-pressed', String( button.classList.contains( 'active' ) ) );

		button.addEventListener( 'click', () => {
			resizeScale.set( Number( button.dataset.resizeValue ) );
		} );
	}

	elements.copyButton.addEventListener( 'click', async () => {
		await copyActiveImage( 'Resized image copied to the clipboard.' );
	} );

	window.addEventListener( 'paste', throttle( async event => {
		if ( loader.value ) {
			return;
		}

		const content = [ ...event.clipboardData.items ]
			.find( item => item.kind === 'file' );

		if ( !content ) {
			setClipboardStatus( 'Paste a PNG or JPEG screenshot from your clipboard.', true );
			return;
		}

		loader.set( true );

		try {
			const uploadedFile = content.getAsFile();

			if ( !isImage( uploadedFile ) ) {
				setClipboardStatus( 'That paste did not contain a supported PNG or JPEG image.', true );
				return;
			}

			const entry = await createImageEntry( uploadedFile );

			createGalleryItem( entry );
			await persistEntry( entry );
			setActiveEntry( entry.id );
			await copyActiveImage( 'Screenshot resized and copied to the clipboard.' );
		} catch ( error ) {
			console.error( error );
			setClipboardStatus( 'The screenshot could not be processed in this browser.', true );
		} finally {
			loader.set( false );
		}
	}, 100 ) );

	window.addEventListener( 'beforeunload', () => {
		for ( const entry of entries.values() ) {
			cleanupEntryResources( entry );
		}
	} );

	hydrateSavedEntries();
	updatePreviewState();
	updatePreviewCaption();
	updateCopyButton();

	async function hydrateSavedEntries() {
		try {
			const screenshots = await listSavedScreenshots();

			if ( !screenshots.length ) {
				return;
			}

			for ( const screenshot of screenshots ) {
				const entry = await createImageEntryFromRecord( screenshot );

				createGalleryItem( entry, { prepend: false } );
			}

			const activeCaptureId = readPersistedActiveCaptureId();
			const initialEntryId = entries.has( activeCaptureId ) ? activeCaptureId : screenshots[ 0 ].id;

			setActiveEntry( initialEntryId );
			setClipboardStatus( `Restored ${ screenshots.length } saved screenshot${ screenshots.length === 1 ? '' : 's' } from this browser.` );
		} catch ( error ) {
			console.error( error );
			setClipboardStatus( 'Saved screenshots are unavailable in this browser, but live paste still works.', true );
		}
	}

	async function persistEntry( entry ) {
		try {
			const { trimmedIds } = await saveScreenshot( createStoredScreenshot( entry ) );

			for ( const trimmedId of trimmedIds ) {
				if ( trimmedId !== entry.id ) {
					await removeEntry( trimmedId, { persist: false, announce: false } );
				}
			}
		} catch ( error ) {
			console.error( error );
			setClipboardStatus( 'Saved screenshots are unavailable, but this session still works.', true );
		}
	}

	function setActiveEntry( entryId ) {
		activeEntry.set( entryId ? entries.get( entryId ) || null : null );
	}

	async function copyActiveImage( successMessage ) {
		if ( !activeEntry.value ) {
			return;
		}

		try {
			await copyImage( activeEntry.value.image, resizeScale );
			setClipboardStatus( successMessage );
		} catch ( error ) {
			console.error( error );
			setClipboardStatus( 'Clipboard access is unavailable. Use a secure browser context to copy images.', true );
		}
	}

	function updateGallerySelection() {
		for ( const [ entryId, tile ] of galleryTiles ) {
			const isActive = entryId === activeEntry.value?.id;

			tile.classList.toggle( 'gallery-tile--active', isActive );
		}
	}

	function updatePreviewState() {
		const hasImage = Boolean( activeEntry.value );

		elements.preview.classList.toggle( 'paste-preview--with-screenshot', hasImage );
		elements.previewEmptyState.hidden = hasImage;
	}

	function updatePreviewCaption() {
		if ( !activeEntry.value ) {
			elements.previewCaption.textContent = 'Paste a screenshot to render it here.';
			return;
		}

		const { image } = activeEntry.value;
		const outputWidth = Math.max( 1, Math.round( image.width * resizeScale.value / 100 ) );
		const outputHeight = Math.max( 1, Math.round( image.height * resizeScale.value / 100 ) );

		elements.previewCaption.textContent = `Original ${ image.width } x ${ image.height } - Output ${ outputWidth } x ${ outputHeight } at ${ resizeScale.value }%.`;
	}

	function updateCopyButton() {
		elements.copyButton.disabled = !activeEntry.value || loader.value;
	}

	function setClipboardStatus( message, isWarning = false ) {
		elements.clipboardStatus.textContent = message;
		elements.clipboardStatus.classList.toggle( 'status-pill--warning', isWarning );
		elements.clipboardStatus.classList.toggle( 'status-pill--accent', !isWarning );
	}

	function createGalleryItem( entry, { prepend = true } = {} ) {
		if ( entries.has( entry.id ) ) {
			return;
		}

		const galleryContent = elements.galleryTemplate.content.cloneNode( true );
		const galleryTile = galleryContent.querySelector( '.js-gallery-tile' );
		const galleryRemove = galleryTile.querySelector( '.js-gallery-remove' );
		const galleryPreview = galleryTile.querySelector( '.js-gallery-preview' );
		const galleryPreviewMeta = galleryTile.querySelector( '.js-gallery-preview-meta' );

		galleryTile.dataset.entryId = entry.id;
		galleryPreview.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.55)), url(${ entry.sourceUrl })`;
		galleryPreviewMeta.textContent = `${ entry.image.width } x ${ entry.image.height }`;

		galleryPreview.addEventListener( 'click', async () => {
			setActiveEntry( entry.id );
			await copyActiveImage( 'Selected screenshot copied at the current scale.' );
		} );

		galleryRemove.addEventListener( 'click', async () => {
			await removeEntry( entry.id );
		} );

		entries.set( entry.id, entry );
		galleryTiles.set( entry.id, galleryTile );

		if ( prepend ) {
			elements.gallery.prepend( galleryTile );
		} else {
			elements.gallery.append( galleryTile );
		}
	}

	async function removeEntry( entryId, { persist = true, announce = true } = {} ) {
		const entry = entries.get( entryId );

		if ( !entry ) {
			return;
		}

		galleryTiles.get( entryId )?.remove();
		galleryTiles.delete( entryId );
		entries.delete( entryId );
		cleanupEntryResources( entry );

		if ( persist ) {
			try {
				await removeSavedScreenshot( entryId );
			} catch ( error ) {
				console.error( error );

				if ( announce ) {
					setClipboardStatus( 'Could not update the saved screenshots for this browser.', true );
				}
			}
		}

		if ( activeEntry.value?.id === entryId ) {
			const fallbackEntry = getFirstEntry();

			setActiveEntry( fallbackEntry?.id || null );

			if ( announce ) {
				if ( fallbackEntry ) {
					setClipboardStatus( 'Removed the selected screenshot and switched to the next saved capture.' );
				} else {
					setClipboardStatus( 'Removed the selected screenshot from this browser.' );
				}
			}
		}
	}

	function getFirstEntry() {
		const firstTile = elements.gallery.querySelector( '.js-gallery-tile' );

		if ( !firstTile ) {
			return null;
		}

		return entries.get( firstTile.dataset.entryId ) || null;
	}
}

function toCanvasDimension( value ) {
	const number = Number( value );

	if ( Number.isNaN( number ) || number < 1 ) {
		return 1;
	}

	return Math.round( number );
}

function isImage( file ) {
	if ( !file ) {
		return false;
	}

	return SUPPORTED_MIME_TYPES.has( file.type );
}

function readPersistedActiveCaptureId() {
	try {
		return window.localStorage.getItem( ACTIVE_CAPTURE_STORAGE_KEY );
	} catch ( error ) {
		return null;
	}
}

function persistActiveCaptureId( entryId ) {
	try {
		if ( entryId ) {
			window.localStorage.setItem( ACTIVE_CAPTURE_STORAGE_KEY, entryId );
		} else {
			window.localStorage.removeItem( ACTIVE_CAPTURE_STORAGE_KEY );
		}
	} catch ( error ) {
		// Ignore storage failures and keep the current session working.
	}
}

async function createImageEntry( file ) {
	const sourceUrl = URL.createObjectURL( file );

	try {
		const image = await loadImage( sourceUrl );

		return {
			blob: file,
			createdAt: Date.now(),
			id: `u${ crypto.randomUUID() }`,
			image,
			lastViewedAt: Date.now(),
			objectUrl: sourceUrl,
			sourceUrl,
		};
	} catch ( error ) {
		URL.revokeObjectURL( sourceUrl );
		throw error;
	}
}

async function createImageEntryFromRecord( record ) {
	const sourceUrl = URL.createObjectURL( record.blob );

	try {
		const image = await loadImage( sourceUrl );

		return {
			blob: record.blob,
			createdAt: record.createdAt,
			id: record.id,
			image,
			lastViewedAt: record.lastViewedAt || record.createdAt,
			objectUrl: sourceUrl,
			sourceUrl,
		};
	} catch ( error ) {
		URL.revokeObjectURL( sourceUrl );
		throw error;
	}
}

function createStoredScreenshot( entry ) {
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

function cleanupEntryResources( entry ) {
	if ( entry?.objectUrl ) {
		URL.revokeObjectURL( entry.objectUrl );
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
