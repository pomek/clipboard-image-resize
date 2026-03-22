/**
 * @param {HTMLImageElement} image
 * @param {Observable} observableScale
 * @returns {Promise}
 */
export default function copyImage( image, observableScale ) {
	if ( typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write ) {
		throw new Error( 'Clipboard image writing is unavailable.' );
	}

	const scale = observableScale.value / 100;
	const newCanvas = document.createElement( 'canvas' );
	const newContext = newCanvas.getContext( '2d' );

	newCanvas.width = Math.max( 1, Math.round( image.width * scale ) );
	newCanvas.height = Math.max( 1, Math.round( image.height * scale ) );

	newContext.scale( scale, scale );
	newContext.drawImage( image, 0, 0 );

	const clipboardItem = new ClipboardItem( {
		'image/png': new Promise( resolve => newCanvas.toBlob( resolve ) )
	} );

	return navigator.clipboard.write( [ clipboardItem ] );
}
