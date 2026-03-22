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
		const scale = Math.min( canvas.width / image.width, canvas.height / image.height, 1 );
		const drawWidth = image.width * scale;
		const drawHeight = image.height * scale;
		const offsetX = ( canvas.width - drawWidth ) / 2;
		const offsetY = ( canvas.height - drawHeight ) / 2;

		context.drawImage( image, offsetX, offsetY, drawWidth, drawHeight );
	}
}
