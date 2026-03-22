import { describe, expect, it, vi } from 'vitest';

import ObservableInput from './observableinput';

describe( 'ObservableInput', () => {
	it( 'synchronizes the input value on attach and emits debounced changes', () => {
		vi.useFakeTimers();

		const input = document.createElement( 'input' );
		const observableInput = new ObservableInput( input, {
			defaultValue: '1920',
			delay: 25,
		} );
		const callback = vi.fn();

		observableInput.on( 'change', callback );
		observableInput.attach();

		expect( input.value ).toBe( '1920' );
		expect( callback ).toHaveBeenCalledTimes( 1 );

		input.value = '1280';
		input.dispatchEvent( new Event( 'input' ) );

		vi.advanceTimersByTime( 25 );

		expect( observableInput.value ).toBe( '1280' );
		expect( callback ).toHaveBeenCalledTimes( 2 );
		expect( callback ).toHaveBeenLastCalledWith( { name: 'change' }, {
			oldValue: '1920',
			newValue: '1280',
		} );
	} );

	it( 'casts number inputs to numbers', () => {
		vi.useFakeTimers();

		const input = document.createElement( 'input' );
		input.type = 'number';

		const observableInput = new ObservableInput( input, {
			defaultValue: 1080,
			delay: 25,
		} );

		observableInput.attach();

		input.value = '720';
		input.dispatchEvent( new Event( 'input' ) );

		vi.advanceTimersByTime( 25 );

		expect( observableInput.value ).toBe( 720 );
		expect( typeof observableInput.value ).toBe( 'number' );
	} );
} );
