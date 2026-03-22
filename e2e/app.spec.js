import { expect, test } from '@playwright/test';

const ONE_PIXEL_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2B7e8AAAAASUVORK5CYII=';

test.beforeEach( async ( { page } ) => {
	await page.addInitScript( () => {
		window.__clipboardWrites = 0;

		Object.defineProperty( navigator, 'clipboard', {
			configurable: true,
			value: {
				write: async items => {
					window.__clipboardWrites += items.length;
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

test( 'pastes screenshots, restores them after reload, and shows copy feedback', async ( { page } ) => {
	await pasteImageFromClipboard( page );

	await expect( page.getByText( 'Original 1 x 1 - Output 1 x 1 at 75%.' ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: '1 x 1' } ) ).toBeVisible();
	await expect.poll( async () => page.evaluate( () => window.__clipboardWrites ) ).toBeGreaterThan( 0 );

	const copyButton = page.locator( '#copy-active-image' );

	await copyButton.click();
	await expect.poll( async () => getClassFlag( copyButton, 'action-button--success' ) ).toBe( true );
	await expect.poll( async () => getClassFlag( copyButton, 'action-button--success' ), { timeout: 3000 } ).toBe( false );

	await page.reload();
	await page.waitForLoadState( 'networkidle' );

	await expect( page.getByRole( 'button', { name: '1 x 1' } ) ).toBeVisible();
	await expect( page.getByText( 'Original 1 x 1 - Output 1 x 1 at 75%.' ) ).toBeVisible();
} );

test( 'persists the selected theme across reloads', async ( { page } ) => {
	await page.getByRole( 'button', { name: 'Dark' } ).click();

	await expect.poll( async () => page.evaluate( () => document.documentElement.dataset.themePreference ) ).toBe( 'dark' );
	await expect.poll( async () => page.evaluate( () => document.documentElement.dataset.theme ) ).toBe( 'dark' );

	await page.reload();
	await page.waitForLoadState( 'networkidle' );

	await expect.poll( async () => page.evaluate( () => document.documentElement.dataset.themePreference ) ).toBe( 'dark' );
	await expect.poll( async () => page.evaluate( () => document.documentElement.dataset.theme ) ).toBe( 'dark' );
	await expect( page.getByRole( 'button', { name: 'Dark' } ) ).toHaveAttribute( 'aria-pressed', 'true' );
} );

async function pasteImageFromClipboard( page ) {
	await page.evaluate( async dataUrl => {
		const blob = await fetch( dataUrl ).then( response => response.blob() );
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
	}, ONE_PIXEL_PNG_DATA_URL );
}

async function getClassFlag( locator, className ) {
	return locator.evaluate( ( element, name ) => element.classList.contains( name ), className );
}
