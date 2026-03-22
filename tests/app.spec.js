import { expect, test } from '@playwright/test';

test.beforeEach( async ( { page } ) => {
	await page.addInitScript( () => {
		window.__clipboardWrites = 0;
		window.__lastClipboardBlob = null;

		Object.defineProperty( navigator, 'clipboard', {
			configurable: true,
			value: {
				write: async items => {
					window.__clipboardWrites += items.length;
					window.__lastClipboardBlob = items[ 0 ]?.items?.[ 'image/png' ] || null;
				},
			},
		} );

		globalThis.ClipboardItem = class ClipboardItem {
			constructor( items ) {
				this.items = items;
			}
		};
	} );

	await page.goto( '/' );
	await page.waitForLoadState( 'networkidle' );
} );

test( 'pastes a screenshot and shows the resized result', async ( { page } ) => {
	await pasteImageFromClipboard( page );

	await expect( page.getByText( 'Original 4 x 4 - Output 3 x 3 at 75%.' ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: '4 x 4' } ) ).toBeVisible();

	await waitForCopiedClipboardImage( page );
} );

test( 'ignores pasting an already resized clipboard image', async ( { page } ) => {
	await pasteImageFromClipboard( page );
	await waitForCopiedClipboardImage( page );
	await pasteCopiedImageFromClipboard( page );

	await expect.poll( async () => page.locator( '.js-gallery-tile' ).count() ).toBe( 1 );
	await expect( page.getByText( 'Ignored the already resized clipboard image.' ) ).toBeVisible();
} );

test( 'shows temporary success feedback after copying the active image', async ( { page } ) => {
	await pasteImageFromClipboard( page );

	const copyButton = page.locator( '#copy-active-image' );

	await copyButton.click();

	await expect.poll( async () => getClassFlag( copyButton, 'action-button--success' ) ).toBe( true );
	await expect.poll(
		async () => getClassFlag( copyButton, 'action-button--success' ),
		{ timeout: 3000 }
	).toBe( false );
} );

test( 'restores pasted screenshots after reload', async ( { page } ) => {
	await pasteImageFromClipboard( page );

	await expect( page.getByRole( 'button', { name: '4 x 4' } ) ).toBeVisible();
	await expect( page.getByText( 'Original 4 x 4 - Output 3 x 3 at 75%.' ) ).toBeVisible();

	await page.reload();
	await page.waitForLoadState( 'networkidle' );

	await expect( page.getByRole( 'button', { name: '4 x 4' } ) ).toBeVisible();
	await expect( page.getByText( 'Original 4 x 4 - Output 3 x 3 at 75%.' ) ).toBeVisible();
} );

test( 'applies the selected dark theme', async ( { page } ) => {
	await page.getByRole( 'button', { name: 'Dark' } ).click();

	await expect.poll(
		async () => page.evaluate( () => document.documentElement.dataset.themePreference )
	).toBe( 'dark' );

	await expect.poll(
		async () => page.evaluate( () => document.documentElement.dataset.theme )
	).toBe( 'dark' );

	await expect( page.getByRole( 'button', { name: 'Dark' } ) ).toHaveAttribute( 'aria-pressed', 'true' );
} );

test( 'restores the selected dark theme after reload', async ( { page } ) => {
	await page.getByRole( 'button', { name: 'Dark' } ).click();

	await expect.poll(
		async () => page.evaluate( () => document.documentElement.dataset.themePreference )
	).toBe( 'dark' );

	await page.reload();
	await page.waitForLoadState( 'networkidle' );

	await expect.poll(
		async () => page.evaluate( () => document.documentElement.dataset.themePreference )
	).toBe( 'dark' );

	await expect.poll(
		async () => page.evaluate( () => document.documentElement.dataset.theme )
	).toBe( 'dark' );

	await expect( page.getByRole( 'button', { name: 'Dark' } ) ).toHaveAttribute( 'aria-pressed', 'true' );
} );

async function waitForCopiedClipboardImage( page ) {
	await expect.poll(
		async () => page.evaluate( () => window.__clipboardWrites )
	).toBeGreaterThan( 0 );

	await expect.poll(
		async () => page.evaluate( () => Boolean( window.__lastClipboardBlob ) )
	).toBe( true );
}

async function pasteImageFromClipboard( page ) {
	await page.evaluate( async () => {
		const canvas = document.createElement( 'canvas' );
		const context = canvas.getContext( '2d' );

		canvas.width = 4;
		canvas.height = 4;
		context.fillStyle = '#101010';
		context.fillRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = '#ff4d4d';
		context.fillRect( 0, 0, 2, 2 );
		context.fillStyle = '#4da6ff';
		context.fillRect( 2, 0, 2, 2 );
		context.fillStyle = '#46c46a';
		context.fillRect( 0, 2, 2, 2 );
		context.fillStyle = '#f4d03f';
		context.fillRect( 2, 2, 2, 2 );

		const blob = await new Promise( resolve => {
			canvas.toBlob( resolve, 'image/png', 1 );
		} );
		const file = new File( [ blob ], 'capture.png', { type: 'image/png' } );
		const event = new Event( 'paste', { bubbles: true, cancelable: true } );

		Object.defineProperty( event, 'clipboardData', {
			value: {
				items: [ {
					kind: 'file',
					getAsFile() {
						return file;
					},
				} ],
			},
		} );

		window.dispatchEvent( event );
	} );
}

async function pasteCopiedImageFromClipboard( page ) {
	await expect.poll(
		async () => page.evaluate( () => Boolean( window.__lastClipboardBlob ) )
	).toBe( true );

	await page.evaluate( async () => {
		const clipboardImage = await new Promise( ( resolve, reject ) => {
			const sourceUrl = URL.createObjectURL( window.__lastClipboardBlob );
			const image = new Image();

			image.addEventListener( 'load', () => {
				URL.revokeObjectURL( sourceUrl );
				resolve( image );
			} );

			image.addEventListener( 'error', () => {
				URL.revokeObjectURL( sourceUrl );
				reject( new Error( 'Could not load the clipboard image.' ) );
			} );

			image.src = sourceUrl;
		} );
		const canvas = document.createElement( 'canvas' );
		const context = canvas.getContext( '2d' );

		canvas.width = clipboardImage.width;
		canvas.height = clipboardImage.height;
		context.drawImage( clipboardImage, 0, 0 );

		const reencodedBlob = await new Promise( resolve => {
			canvas.toBlob( resolve, 'image/jpeg', 1 );
		} );
		const file = new File( [ reencodedBlob ], 'resized.jpg', { type: 'image/jpeg' } );
		const event = new Event( 'paste', { bubbles: true, cancelable: true } );

		Object.defineProperty( event, 'clipboardData', {
			value: {
				items: [ {
					kind: 'file',
					getAsFile() {
						return file;
					},
				} ],
			},
		} );

		window.dispatchEvent( event );
	} );
}

async function getClassFlag( locator, className ) {
	return locator.evaluate( ( element, name ) => element.classList.contains( name ), className );
}
