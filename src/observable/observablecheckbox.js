import ObservableAbstract from './observableabstract';

/**
 * The observable class for `input[type=checkbox]` elements.
 *
 * @extends {ObservableAbstract}
 */
export default class ObservableCheckbox extends ObservableAbstract {
	_getInputEvent() {
		return 'change';
	}

	/**
	 * @protected
	 */
	get _defaultValue() {
		return this._element.checked || super._defaultValue;
	}

	/**
	 * @protected
	 */
	_synchronizeElementValue() {
		this._element.checked = this.value;
	}

	/**
	 * @protected
	 * @returns {Boolean}
	 */
	_getInputValue() {
		return this._element.checked;
	}
}

