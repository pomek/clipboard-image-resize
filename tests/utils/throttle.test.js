import { describe, expect, it, vi } from 'vitest';

import throttle from '../../src/utils/throttle';

describe( 'throttle', () => {
	it( 'ignores calls until the cooldown ends', () => {
		vi.useFakeTimers();

		const callback = vi.fn();
		const throttled = throttle( callback, 100 );

		throttled( 'first' );
		throttled( 'second' );

		expect( callback ).toHaveBeenCalledTimes( 1 );
		expect( callback ).toHaveBeenCalledWith( 'first' );

		vi.advanceTimersByTime( 100 );

		throttled( 'third' );

		expect( callback ).toHaveBeenCalledTimes( 2 );
		expect( callback ).toHaveBeenLastCalledWith( 'third' );
	} );
} );
