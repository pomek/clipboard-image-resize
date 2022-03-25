const eventSymbol = Symbol( 'events-collection' );

/**
 * @type {Object}
 */
const EmitterMixin = {
	/**
	 * @param {String} name
	 * @param {Function} callback
	 */
	on( name, callback ) {
		const events = this._getEvent( name );
		events.push( callback );
	},

	off( name, callback ) {
		const events = this._getEvent( name );
		const index = events.indexOf( callback );

		events.splice( index, 1 );
	},

	fire( name, ...data ) {
		for ( const callback of this._getEvent( name ) ) {
			callback( { name }, ...data );
		}
	},

	get _events() {
		if ( !this[ eventSymbol ] ) {
			Object.defineProperty( this, eventSymbol, {
				value() {
					return {};
				}
			} );
		}

		return this[ eventSymbol ];
	},

	_getEvent( name ) {
		if ( !this._events[ name ] ) {
			this._events[ name ] = [];
		}

		return this._events[ name ];
	}
};

export default EmitterMixin;

/**
 * @interface Eventable
 */

/**
 * @function
 * @name Eventable#on
 */

/**
 * @function
 * @name Eventable#off
 */

/**
 * @function
 * @name Eventable#fire
 */
