import ObservableInput from './observable/observableinput';
import Observable from './observable/observable';
import copyImage from './utils/copyimage';
import drawImage from './utils/drawimage';
import throttle from './utils/throttle';

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
			activeEntry.set( entry );
			await copyActiveImage( 'Screenshot resized and copied to the clipboard.' );
		} catch ( error ) {
			console.error( error );
			setClipboardStatus( 'The screenshot could not be processed in this browser.', true );
		} finally {
			loader.set( false );
		}
	}, 100 ) );

	updatePreviewState();
	updatePreviewCaption();
	updateCopyButton();

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
		for ( const tile of elements.gallery.querySelectorAll( '.js-gallery-tile' ) ) {
			const isActive = tile.dataset.entryId === activeEntry.value?.id;

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

	function createGalleryItem( entry ) {
		const galleryContent = elements.galleryTemplate.content.cloneNode( true );
		const galleryTile = galleryContent.querySelector( '.js-gallery-tile' );
		const galleryRemove = galleryTile.querySelector( '.js-gallery-remove' );
		const galleryPreview = galleryTile.querySelector( '.js-gallery-preview' );
		const galleryPreviewMeta = galleryTile.querySelector( '.js-gallery-preview-meta' );

		galleryTile.dataset.entryId = entry.id;
		galleryPreview.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.55)), url(${ entry.sourceUrl })`;
		galleryPreviewMeta.textContent = `${ entry.image.width } x ${ entry.image.height }`;

		galleryPreview.addEventListener( 'click', async () => {
			activeEntry.set( entry );
			await copyActiveImage( 'Selected screenshot copied at the current scale.' );
		} );

		galleryRemove.addEventListener( 'click', () => {
			galleryTile.remove();

			if ( activeEntry.value?.id === entry.id ) {
				activeEntry.set( null );
				setClipboardStatus( 'Removed the selected screenshot from the current session.', false );
			}
		} );

		elements.gallery.prepend( galleryTile );
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

async function createImageEntry( file ) {
	const sourceUrl = await readFileAsDataUrl( file );
	const image = await loadImage( sourceUrl );

	return {
		createdAt: Date.now(),
		file,
		id: `u${ crypto.randomUUID() }`,
		image,
		sourceUrl,
	};
}

function readFileAsDataUrl( file ) {
	return new Promise( ( resolve, reject ) => {
		const reader = new FileReader();

		reader.addEventListener( 'load', () => {
			resolve( reader.result );
		} );

		reader.addEventListener( 'error', () => {
			reject( reader.error || new Error( 'Could not read the file.' ) );
		} );

		reader.readAsDataURL( file );
	} );
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
