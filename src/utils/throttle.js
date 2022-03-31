/**
 * @param {Function} callback
 * @param {Number} time
 * @returns {Function}
 */
export default function throttle( callback, time ) {
	let isPending = false;

	return function () {
		if ( isPending ) {
			return;
		}

		isPending = true;
		callback.apply( this, arguments );

		setTimeout( () => {
			isPending = false;
		}, time)
	}
}
