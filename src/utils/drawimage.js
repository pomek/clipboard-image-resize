/**
 * Draws the given image on the specified context. When passing `null` as image, the context is cleared.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {HTMLImageElement|null} [image=null]
 */
export default function drawImage( context, image = null ) {
	const { canvas } = context;

	context.clearRect( 0, 0, canvas.width, canvas.height );

	if ( image ) {
		context.drawImage( image, 0, 0 );
	}
}
