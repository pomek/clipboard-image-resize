/**
 * @param {HTMLImageElement} image
 * @param {Observable} observableScale
 * @returns {Promise}
 */
export default function copyImage( image, observableScale ) {
	const scale = observableScale.value / 100;
	const newCanvas = document.createElement( 'canvas' );
	const newContext = newCanvas.getContext( '2d' );

	newCanvas.width = image.width * scale;
	newCanvas.height = image.height * scale;

	newContext.scale( scale, scale );
	newContext.drawImage( image, 0, 0 );

	const clipboardItem = new ClipboardItem( {
		'image/png': new Promise( resolve => newCanvas.toBlob( resolve ) )
	} );

	return navigator.clipboard.write( [ clipboardItem ] );
}
