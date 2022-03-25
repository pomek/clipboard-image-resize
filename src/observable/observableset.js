import EventEmitter from '../eventemitter';
import mix from '../utils/mix';

/**
 * The `Set` collection on steroids emits events when a new item is being added or removed.
 *
 * @implements {Eventable}
 * @extends {Set}
 */
export default class ObservableSet extends Set {
	constructor( items ) {
		super( items );
	}

	/**
	 * @param {*} item
	 */
	add( item ) {
		super.add( item );
		this.fire( 'add', item );
	}

	/**
	 * @param {*} item
	 */
	delete( item ) {
		super.delete( item );
		this.fire( 'delete', item );
	}
}

mix( ObservableSet, EventEmitter );
