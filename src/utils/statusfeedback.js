export function createTemporaryClassController( element, { className, duration = 1600 } ) {
	let timeoutId = null;

	const clear = () => {
		if ( !element ) {
			return;
		}

		window.clearTimeout( timeoutId );
		element.classList.remove( className );
	};

	return {
		clear,
		trigger() {
			if ( !element ) {
				return;
			}

			clear();
			element.classList.add( className );
			timeoutId = window.setTimeout( clear, duration );
		},
	};
}

export function createTransientStatusController( element, {
	duration = 2600,
	warningClass = 'status-note--warning',
	warningDuration = 5000,
} = {} ) {
	let timeoutId = null;

	const clear = () => {
		if ( !element ) {
			return;
		}

		window.clearTimeout( timeoutId );
		element.hidden = true;
		element.textContent = '';
		element.classList.remove( warningClass );
	};

	return {
		clear,
		show( message, { warning = false } = {} ) {
			if ( !element ) {
				return;
			}

			clear();
			element.textContent = message;
			element.hidden = false;
			element.classList.toggle( warningClass, warning );
			timeoutId = window.setTimeout( clear, warning ? warningDuration : duration );
		},
	};
}
