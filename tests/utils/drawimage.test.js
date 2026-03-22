import { describe, expect, it, vi } from 'vitest';

import drawImage from '../../src/utils/drawimage';

describe( 'drawImage', () => {
	it( 'clears the canvas when no image is provided', () => {
		const context = {
			canvas: { width: 300, height: 150 },
			clearRect: vi.fn(),
			drawImage: vi.fn(),
		};

		drawImage( context );

		expect( context.clearRect ).toHaveBeenCalledWith( 0, 0, 300, 150 );
		expect( context.drawImage ).not.toHaveBeenCalled();
	} );

	it( 'draws the given image after clearing the canvas', () => {
		const image = { width: 400, height: 200 };
		const context = {
			canvas: { width: 300, height: 150 },
			clearRect: vi.fn(),
			drawImage: vi.fn(),
		};

		drawImage( context, image );

		expect( context.clearRect ).toHaveBeenCalledWith( 0, 0, 300, 150 );
		expect( context.drawImage ).toHaveBeenCalledWith( image, 0, 0 );
	} );
} );
