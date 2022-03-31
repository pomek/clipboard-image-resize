/**
 * @param {Function} callback
 * @param {Number} time
 * @returns {Function}
 */
export default function debounce( callback, time ) {
	let timeout;

	return function () {
		if ( timeout ) {
			clearTimeout( timeout );
		}

		const fn = () => {
			timeout = null;
			callback.apply( this, arguments )
		};

		timeout = setTimeout( fn, time )
	};
}
