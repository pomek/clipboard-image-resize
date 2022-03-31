export default function drawImage( context, image = null ) {
	const { canvas } = context;

	context.clearRect( 0, 0, canvas.width, canvas.height );

	if ( image ) {
		context.drawImage( image, 0, 0 );
	}
}
