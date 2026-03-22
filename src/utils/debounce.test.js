import { describe, expect, it, vi } from 'vitest';

import debounce from './debounce';

describe( 'debounce', () => {
	it( 'calls the callback once with the latest arguments', () => {
		vi.useFakeTimers();

		const callback = vi.fn();
		const debounced = debounce( callback, 100 );

		debounced( 'first' );
		debounced( 'second' );

		expect( callback ).not.toHaveBeenCalled();

		vi.advanceTimersByTime( 100 );

		expect( callback ).toHaveBeenCalledTimes( 1 );
		expect( callback ).toHaveBeenCalledWith( 'second' );
	} );
} );
