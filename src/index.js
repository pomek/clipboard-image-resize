import ObservableSet from './observable/observableset';
import ObservableInput from './observable/observableinput';
import ObservableCheckbox from './observable/observablecheckbox';

const previewElement = document.getElementById( 'canvas-preview' );
const progressBar = document.getElementById( 'progress-bar' );
const gallery = document.getElementById( 'gallery' );

const context = previewElement.getContext( '2d' );

const pastedImages = new ObservableSet();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Canvas requires the `[width]` and `[height]` attributes to set to scale its content properly.
const screenWidthInput = new ObservableInput( document.getElementById( 'input-screen-width' ), {
	defaultValue: screen.width
} );

const screenHeightInput = new ObservableInput( document.getElementById( 'input-screen-height' ), {
	defaultValue: screen.height
} );

screenWidthInput.on( 'change', () => {
	previewElement.width = screenWidthInput.value;
} );

screenHeightInput.on( 'change', () => {
	previewElement.height = screenHeightInput.value;
} );

screenWidthInput.attach();
screenHeightInput.attach();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const copyClipboardInput = new ObservableCheckbox( document.getElementById( 'resize-copy-clipboard' ), {
	defaultValue: true
} );
copyClipboardInput.attach();

pastedImages.on( 'add', ( event, item ) => {
	const div = document.createElement( 'div' );
	div.classList.add( 'gallery-item' );
	div.style.backgroundImage = `url(${ item.src })`;

	gallery.appendChild( div );
} );

// Make an observable from the value.
let resizeValue = 75;

[ ...document.querySelectorAll( '.js-resize-button' ) ].forEach( element => {
	element.addEventListener( 'click', () => {
		resizeValue = pxToNumber( element.getAttribute( 'data-option' ) );

		progressBar.innerText = resizeValue + '%';
		progressBar.style.width = progressBar.innerText;
	} )
} );

window.addEventListener( 'paste', ( event ) => {
	const content = [ ...event.clipboardData.items ]
		.filter( item => item.kind === 'file' )
		.shift();

	if ( !content ) {
		return;
	}

	const uploadedFile = content.getAsFile();

	if ( !isImage( uploadedFile ) ) {
		return;
	}

	const reader = new FileReader();
	const image = new Image();

	reader.addEventListener( 'load', () => {
		image.src = reader.result;
	} );

	image.addEventListener( 'load', async () => {
		const scale = resizeValue / 100;
		const newCanvas = document.createElement('canvas');
		const newContext = newCanvas.getContext( '2d' );

		newCanvas.width = image.width * scale;
		newCanvas.height = image.height * scale;

		newContext.scale( resizeValue / 100, resizeValue / 100 );
		newContext.drawImage( image, 0, 0 );

		context.clearRect( 0, 0, previewElement.width, previewElement.height );
		context.drawImage( image, 0, 0 );

		if ( copyClipboardInput.value ) {
			console.log( 'Auto-copy enabled.' );
		}

		const clipboardItem = new ClipboardItem( {
			'image/png': new Promise( resolve => newCanvas.toBlob( resolve ) )
		} );

		await navigator.clipboard.write( [ clipboardItem ] );

		context.resetTransform();

		pastedImages.add( image );
	} );

	reader.readAsDataURL( uploadedFile )
} );

function isImage( file ) {
	if ( !file ) {
		return false;
	}

	return file.type === 'image/png' || file.type === 'image/jpeg';
}

function pxToNumber( value ) {
	return Number( value.replace( 'px', '' ) );
}
