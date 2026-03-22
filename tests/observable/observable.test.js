import { describe, expect, it, vi } from 'vitest';

import Observable from '../../src/observable/observable';

describe( 'Observable', () => {
	it( 'fires a change event when the value changes', () => {
		const observable = new Observable( 25 );
		const callback = vi.fn();

		observable.on( 'change', callback );
		observable.set( 50 );

		expect( callback ).toHaveBeenCalledTimes( 1 );
		expect( callback ).toHaveBeenCalledWith( { name: 'change' }, {
			oldValue: 25,
			newValue: 50,
		} );
	} );

	it( 'does not fire when setting the same value', () => {
		const observable = new Observable( 25 );
		const callback = vi.fn();

		observable.on( 'change', callback );
		observable.set( 25 );

		expect( callback ).not.toHaveBeenCalled();
	} );
} );
