import EventEmitter from '../eventemitter';
import mix from '../utils/mix'

/**
 * An instance of the `Observable` class allow listening for changes regarding its value.
 *
 * @implements {Eventable}
 * @extends {Set}
 */
export default class Observable {
	constructor( value = null ) {
		this._value = value;
	}

	get value() {
		return this._value;
	}

	set( value ) {
		if ( this._value === value ) {
			return;
		}

		const oldValue = this.value;

		this._value = value;

		this.fire( 'change', {
			oldValue,
			newValue: value
		} )
	}

}

mix( Observable, EventEmitter );
