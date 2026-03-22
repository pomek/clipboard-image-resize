import ObservableInput from './observable/observableinput';
import Observable from './observable/observable';
import {
	areImageFingerprintsEquivalent,
	cleanupEntryResources,
	createImageFingerprint,
	createImageEntry,
	createImageEntryFromRecord,
	createStoredScreenshot,
	isImage,
	persistActiveCaptureId,
	readPersistedActiveCaptureId,
	toCanvasDimension,
} from './utils/captureentry';
import createGalleryTile from './utils/gallerytile';
import {
	createTemporaryClassController,
	createTransientStatusController,
} from './utils/statusfeedback';
import {
	listSavedScreenshots,
	removeSavedScreenshot,
	saveScreenshot,
	touchSavedScreenshot,
} from './storage/screenshotstore';
import copyImage from './utils/copyimage';
import drawImage from './utils/drawimage';
import throttle from './utils/throttle';

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
	const context = elements.preview.getContext( '2d' );
	const entries = new Map();
	const galleryTiles = new Map();
	let lastCopiedFingerprint = null;
	const statusFeedback = createTransientStatusController( elements.clipboardStatus );
	const copyFeedback = createTemporaryClassController( elements.copyButton, {
		className: 'action-button--success',
	} );
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
			touchSavedScreenshot( newValue.id, newValue.lastViewedAt ).catch( console.error );
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
			await copyActiveImage();
		}
	} );

	for ( const button of document.querySelectorAll( '.js-resize-button' ) ) {
		button.setAttribute( 'aria-pressed', String( button.classList.contains( 'active' ) ) );
		button.addEventListener( 'click', () => {
			resizeScale.set( Number( button.dataset.resizeValue ) );
		} );
	}

	elements.copyButton.addEventListener( 'click', async () => {
		await copyActiveImage( { showSuccessFeedback: true } );
	} );

	window.addEventListener( 'paste', throttle( async event => {
		if ( loader.value ) {
			return;
		}

		const content = [ ...event.clipboardData.items ].find( item => item.kind === 'file' );

		if ( !content ) {
			statusFeedback.show( 'Paste a PNG or JPEG screenshot from your clipboard.', { warning: true } );
			return;
		}

		loader.set( true );

		try {
			const uploadedFile = content.getAsFile();

			if ( !isImage( uploadedFile ) ) {
				statusFeedback.show( 'That paste did not contain a supported PNG or JPEG image.', { warning: true } );
				return;
			}

			const entry = await createImageEntry( uploadedFile );
			const pastedFingerprint = await createImageFingerprint( entry.image );

			if ( areImageFingerprintsEquivalent( pastedFingerprint, lastCopiedFingerprint ) ) {
				cleanupEntryResources( entry );
				statusFeedback.show( 'Ignored the already resized clipboard image.', { warning: true } );
				return;
			}

			createGalleryItem( entry );
			await persistEntry( entry );
			setActiveEntry( entry.id );
			await copyActiveImage();
		} catch ( error ) {
			console.error( error );
			statusFeedback.show( 'The screenshot could not be processed in this browser.', { warning: true } );
		} finally {
			loader.set( false );
		}
	}, 100 ) );

	window.addEventListener( 'beforeunload', () => {
		statusFeedback.clear();
		copyFeedback.clear();

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
		} catch ( error ) {
			console.error( error );
			statusFeedback.show( 'Saved screenshots are unavailable in this browser, but live paste still works.', { warning: true } );
		}
	}

	async function persistEntry( entry ) {
		try {
			const { trimmedIds } = await saveScreenshot( createStoredScreenshot( entry ) );

			for ( const trimmedId of trimmedIds ) {
				if ( trimmedId !== entry.id ) {
					await removeEntry( trimmedId, { persist: false } );
				}
			}
		} catch ( error ) {
			console.error( error );
			statusFeedback.show( 'Saved screenshots are unavailable, but this session still works.', { warning: true } );
		}
	}

	function setActiveEntry( entryId ) {
		activeEntry.set( entryId ? entries.get( entryId ) || null : null );
	}

	async function copyActiveImage( { showSuccessFeedback = false } = {} ) {
		if ( !activeEntry.value ) {
			return;
		}

		try {
			await copyImage( activeEntry.value.image, resizeScale );
			lastCopiedFingerprint = await createImageFingerprint( activeEntry.value.image, {
				height: Math.max( 1, Math.round( activeEntry.value.image.height * resizeScale.value / 100 ) ),
				width: Math.max( 1, Math.round( activeEntry.value.image.width * resizeScale.value / 100 ) ),
			} );
			statusFeedback.clear();

			if ( showSuccessFeedback ) {
				copyFeedback.trigger();
			}
		} catch ( error ) {
			console.error( error );
			statusFeedback.show( 'Clipboard access is unavailable. Use a secure browser context to copy images.', { warning: true } );
		}
	}

	function updateGallerySelection() {
		for ( const [ entryId, tile ] of galleryTiles ) {
			tile.classList.toggle( 'gallery-tile--active', entryId === activeEntry.value?.id );
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

	function createGalleryItem( entry, { prepend = true } = {} ) {
		if ( entries.has( entry.id ) ) {
			return;
		}

		const galleryTile = createGalleryTile( {
			entry,
			template: elements.galleryTemplate,
			onRemove: entryId => {
				void removeEntry( entryId );
			},
			onSelect: entryId => {
				setActiveEntry( entryId );
				void copyActiveImage();
			},
		} );

		entries.set( entry.id, entry );
		galleryTiles.set( entry.id, galleryTile );

		if ( prepend ) {
			elements.gallery.prepend( galleryTile );
		} else {
			elements.gallery.append( galleryTile );
		}
	}

	async function removeEntry( entryId, { persist = true } = {} ) {
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
				statusFeedback.show( 'Could not update the saved screenshots for this browser.', { warning: true } );
			}
		}

		if ( activeEntry.value?.id === entryId ) {
			setActiveEntry( getFirstEntry()?.id || null );
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
