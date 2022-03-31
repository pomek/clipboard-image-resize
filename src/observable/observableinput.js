import EventEmitter from '../eventemitter';
import Observable from './observable';
import debounce from '../utils/debounce';
import mix from '../utils/mix';

/**
 * The observable class for inputs with the typing feature.
 */
export default class ObservableInput {
	/**
	 * @param {HTMLInputElement} element
	 * @param {Object} [options={}]
	 * @param {Number} [options.delay]
	 * @param {*} [options.defaultValue=null]
	 */
	constructor( element, options = {} ) {
		this._element = element;
		this._options = options;
		this._observable = new Observable( options.defaultValue );
	}

	get value() {
		return this._observable.value;
	}

	attach() {
		// Prepare the initial state of the input..
		if ( this._getInputValue() !== this.value ) {
			this._synchronizeElementValue();
		}

		// React when typing in the input element.
		const delay = this._options.delay || 250;

		this._element.addEventListener( 'input', debounce( () => {
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
	 */
	_synchronizeElementValue() {
		this._element.value = this.value;
	}

	/**
	 * @protected
	 * @returns {String|Number}
	 */
	_getInputValue() {
		if ( this._element.type === 'number' ) {
			return Number( this._element.value );
		}

		return this._element.value;
	}
}

mix( ObservableInput, EventEmitter );
