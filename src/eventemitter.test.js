import { describe, expect, it, vi } from 'vitest';

import EventEmitter from './eventemitter';
import mix from './utils/mix';

describe( 'EventEmitter mixin', () => {
	it( 'fires registered callbacks with the event name and data', () => {
		class Subject {}

		mix( Subject, EventEmitter );

		const instance = new Subject();
		const callback = vi.fn();

		instance.on( 'change', callback );
		instance.fire( 'change', { value: 75 } );

		expect( callback ).toHaveBeenCalledWith( { name: 'change' }, { value: 75 } );
	} );

	it( 'removes a registered callback', () => {
		class Subject {}

		mix( Subject, EventEmitter );

		const instance = new Subject();
		const callback = vi.fn();

		instance.on( 'change', callback );
		instance.off( 'change', callback );
		instance.fire( 'change', { value: 75 } );

		expect( callback ).not.toHaveBeenCalled();
	} );
} );
