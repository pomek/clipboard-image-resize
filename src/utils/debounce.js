/**
 * @param {Function} callback
 * @param {Number} time
 * @returns {Function}
 */
export default function debounce( callback, time ) {
	let timeout;

	return function ( ...args ) {
		const context = this;

		if ( timeout ) {
			clearTimeout( timeout );
		}

		const fn = () => {
			timeout = null;
			callback.apply( context, args )
		};

		timeout = setTimeout( fn, time )
	};
}
