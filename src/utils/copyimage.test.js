import { describe, expect, it, vi } from 'vitest';

import copyImage from './copyimage';

describe( 'copyImage', () => {
	it( 'creates a scaled canvas image and writes it to the clipboard', async () => {
		const image = { width: 400, height: 200 };
		const blob = new Blob( [ 'image-data' ], { type: 'image/png' } );
		const context = {
			scale: vi.fn(),
			drawImage: vi.fn(),
		};
		const canvas = {
			width: 0,
			height: 0,
			getContext: vi.fn().mockReturnValue( context ),
			toBlob: vi.fn( callback => callback( blob ) ),
		};
		const createElement = vi.spyOn( document, 'createElement' );
		const originalCreateElement = createElement.getMockImplementation() || document.createElement.bind( document );

		createElement.mockImplementation( tagName => {
			if ( tagName === 'canvas' ) {
				return canvas;
			}

			return originalCreateElement( tagName );
		} );

		Object.defineProperty( navigator, 'clipboard', {
			configurable: true,
			value: {
				write: vi.fn().mockResolvedValue(),
			},
		} );

		globalThis.ClipboardItem = vi.fn( function ClipboardItem( items ) {
			this.items = items;
		} );

		const copiedBlob = await copyImage( image, { value: 50 } );

		expect( canvas.width ).toBe( 200 );
		expect( canvas.height ).toBe( 100 );
		expect( context.scale ).toHaveBeenCalledWith( 0.5, 0.5 );
		expect( context.drawImage ).toHaveBeenCalledWith( image, 0, 0 );
		expect( navigator.clipboard.write ).toHaveBeenCalledTimes( 1 );
		expect( copiedBlob ).toBe( blob );

		const clipboardItem = navigator.clipboard.write.mock.calls[ 0 ][ 0 ][ 0 ];

		expect( clipboardItem ).toBeInstanceOf( globalThis.ClipboardItem );
		expect( clipboardItem.items[ 'image/png' ] ).toBe( blob );
	} );
} );
