import EventEmitter from '../eventemitter';
import mix from '../utils/mix'
import debounce from '../utils/debounce';
import Observable from './observable';

/**
 * An abstract observable for `HTMLInputElement`.
 *
 * @abstract
 * @implements {Eventable}
 */
export default class ObservableAbstract {
	/**
	 * @param {HTMLInputElement} element
	 * @param {Object} [options={}]
	 * @param {Number} [options.delay]
	 * @param {*} [options.defaultValue=null]
	 */
	constructor( element, options = {} ) {
		this._element = element;
		this._options = options;
		this._observable = new Observable( this._defaultValue );
	}

	get value() {
		return this._observable.get();
	}

	get _defaultValue() {
		return this._options.defaultValue || null;
	}

	attach() {
		// Prepare the initial state of the input..
		if ( this._getInputValue() !== this.value ) {
			this._synchronizeElementValue();
		}

		// React when typing in the input element.
		const delay = this._options.delay || 250;

		this._element.addEventListener( this._getInputEvent(), debounce( () => {
			this._observable.set( this._getInputValue() );
		}, delay ) );

		// Fire an event when updating the value.
		this._observable.on( 'change', ( event, details ) => {
			// If modified directly via API (not the element), update the element value too.
			if ( this._getInputValue() !== this.value ) {
				this._synchronizeElementValue();
			}

			this.fire( 'change', details );
		} );

		// Call the `change` event for setting up the initial state if listeners are already attached..
		this.fire( 'change' );
	}

	/**
	 * @protected
	 * @abstract
	 * @method
	 * @name ObservableAbstract#_getInputEvent
	 */

	/**
	 * @protected
	 * @abstract
	 * @method
	 * @name ObservableAbstract#_synchronizeElementValue
	 */

	/**
	 * @protected
	 * @abstract
	 * @method
	 * @name ObservableAbstract#_getInputValue
	 */
}

mix( ObservableAbstract, EventEmitter );
