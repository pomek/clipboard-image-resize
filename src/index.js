import ObservableInput from './observable/observableinput';
import Observable from './observable/observable';
import copyImage from './utils/copyimage';
import drawImage from './utils/drawimage';
import throttle from './utils/throttle';

import trashIcon from 'bootstrap-icons/icons/trash3-fill.svg';
import 'bootstrap/dist/css/bootstrap-grid.css';
import '@forevolve/bootstrap-dark/dist/css/bootstrap-dark.css';
import '../template/theme/style.css';

const loaderElement = document.getElementById( 'loader' );
const previewElement = document.getElementById( 'canvas-preview' );
const galleryElement = document.getElementById( 'recent-uploads' );
const galleryTemplate = document.getElementById( 'template-gallery-tile' );
const context = previewElement.getContext( '2d' );
const resizeScale = new Observable( 75 );
const activeImage = new Observable( null );
const loader = new Observable( false );
const screenWidthInput = new ObservableInput( document.getElementById( 'input-screen-width' ), { defaultValue: screen.width } );
const screenHeightInput = new ObservableInput( document.getElementById( 'input-screen-height' ), { defaultValue: screen.height } );

// React to changes in the screen size.
screenWidthInput.on( 'change', () => {
	previewElement.width = screenWidthInput.value;
} );

screenHeightInput.on( 'change', () => {
	previewElement.height = screenHeightInput.value;
} );

screenWidthInput.attach();
screenHeightInput.attach();

// Draw or clear the canvas when set the active image.
activeImage.on( 'change', async ( event, { newValue } ) => {
	drawImage( context, newValue );

	if ( newValue ) {
		previewElement.classList.add( 'paste-preview--with-screenshot' );
		await copyImage( newValue, resizeScale );
	} else {
		previewElement.classList.remove( 'paste-preview--with-screenshot' );
	}
} );

// Display or hide the loader.
loader.on( 'change', async ( event, { newValue } ) => {
	if ( newValue ) {
		loaderElement.classList.add( 'loader--enabled' )
	} else {
		loaderElement.classList.remove( 'loader--enabled' )
	}
} );

// Update the view when changed the output scale.
resizeScale.on( 'change', ( event, { newValue } ) => {
	document.querySelector( '.js-resize-button.active' ).classList.remove( 'active' );
	document.querySelector( `.js-resize-button[data-resize-value="${ newValue }"]` ).classList.add( 'active' );
} );

// Copy an image when changed the output scale while showing it.
resizeScale.on( 'change', async () => {
	const image = activeImage.value;

	if ( image ) {
		await copyImage( image, resizeScale );
	}
} );

// Attach events for button with resize scale.
[ ...document.querySelectorAll( '.js-resize-button' ) ].forEach( element => {
	element.addEventListener( 'click', () => {
		resizeScale.set( Number( element.dataset.resizeValue ) );
	} )
} );

// Attach event when pasting content to the window.
window.addEventListener( 'paste', throttle( event => {
	if ( loader.value ) {
		return;
	}

	const content = [ ...event.clipboardData.items ]
		.filter( item => item.kind === 'file' )
		.shift();

	if ( !content ) {
		return;
	}

	loader.set( true );

	const uploadedFile = content.getAsFile();

	if ( !isImage( uploadedFile ) ) {
		return;
	}

	const image = new Image();
	const reader = new FileReader();

	reader.addEventListener( 'load', () => {
		image.src = reader.result;
	} );

	image.addEventListener( 'load', async () => {
		activeImage.set( image );
		createGalleryItem( image );
		loader.set( false );
	} );

	reader.readAsDataURL( uploadedFile )
}, 100 ) );

/**
 * Returns true if the given file is an image (PNG or JPG).
 *
 * @param {File} file
 * @returns {Boolean}
 */
function isImage( file ) {
	if ( !file ) {
		return false;
	}

	return file.type === 'image/png' || file.type === 'image/jpeg';
}

/**
 * Creates a new tile that represents the uploaded image in the gallery.
 *
 * @param {HTMLImageElement} image
 */
function createGalleryItem( image ) {
	const id = 'u' + crypto.randomUUID();
	const galleryContent = galleryTemplate.content.cloneNode( true );
	const galleryTile = galleryContent.querySelector( '.js-gallery-tile' );
	const galleryRemove = galleryTile.querySelector( '.js-gallery-remove' );
	const galleryPreview = galleryTile.querySelector( '.js-gallery-preview' );

	galleryTile.id = id;

	const onPreviewClick = () => {
		activeImage.set( image );
	};

	const onRemoveClick = () => {
		if ( activeImage.value === image ) {
			activeImage.set( null );
		}

		galleryRemove.removeEventListener( 'click', onRemoveClick );
		galleryPreview.removeEventListener( 'click', onPreviewClick );

		// `galleryContent` is a document fragment so it can't be removed directly.
		// Hence, we generate a unique identifier that allows finding the gallery tile when requesting removal.
		document.getElementById( id ).remove();
	};

	galleryRemove.style.backgroundImage = `url(${ trashIcon })`;
	galleryPreview.style.backgroundImage = `url(${ image.src })`;

	galleryPreview.addEventListener( 'click', onPreviewClick );
	galleryRemove.addEventListener( 'click', onRemoveClick );

	galleryElement.prepend( galleryTile );
}
