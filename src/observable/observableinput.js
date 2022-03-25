import ObservableAbstract from './observableabstract';

/**
 * The observable class for inputs with the typing feature.
 *
 * @extends {ObservableAbstract}
 */
export default class ObservableInput extends ObservableAbstract {
	_getInputEvent() {
		return 'input';
	}

	/**
	 * @protected
	 */
	get _defaultValue() {
		return this._element.value || super._defaultValue;
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
