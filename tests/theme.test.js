import { afterEach, describe, expect, it, vi } from 'vitest';

import setupThemeController, {
	normalizeThemePreference,
	readThemePreference,
	resolveTheme,
	THEME_STORAGE_KEY,
} from '../src/theme';

describe( 'theme helpers', () => {
	it( 'normalizes unexpected values to auto', () => {
		expect( normalizeThemePreference( 'sepia' ) ).toBe( 'auto' );
		expect( normalizeThemePreference( 'dark' ) ).toBe( 'dark' );
	} );

	it( 'resolves auto based on the system preference', () => {
		expect( resolveTheme( 'auto', true ) ).toBe( 'dark' );
		expect( resolveTheme( 'auto', false ) ).toBe( 'light' );
		expect( resolveTheme( 'light', true ) ).toBe( 'light' );
	} );

	it( 'reads the persisted preference from storage', () => {
		const storage = {
			getItem: vi.fn().mockReturnValue( 'dark' ),
		};

		expect( readThemePreference( storage ) ).toBe( 'dark' );
		expect( storage.getItem ).toHaveBeenCalledWith( THEME_STORAGE_KEY );
	} );
} );

describe( 'setupThemeController', () => {
	afterEach( () => {
		document.documentElement.dataset.theme = '';
		document.documentElement.dataset.themePreference = '';
	} );

	it( 'applies the selected theme and persists the preference', () => {
		document.body.innerHTML = `
			<button class="js-theme-button" data-theme-mode="light"></button>
			<button class="js-theme-button" data-theme-mode="dark"></button>
			<button class="js-theme-button" data-theme-mode="auto"></button>
			<p id="theme-status"></p>
		`;

		const storage = {
			getItem: vi.fn().mockReturnValue( 'auto' ),
			setItem: vi.fn(),
		};
		const mediaQuery = {
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		const controller = setupThemeController( {
			buttons: [ ...document.querySelectorAll( '.js-theme-button' ) ],
			statusElement: document.getElementById( 'theme-status' ),
			storage,
			mediaQuery,
		} );

		document.querySelector( '[data-theme-mode="dark"]' ).click();

		expect( document.documentElement.dataset.themePreference ).toBe( 'dark' );
		expect( document.documentElement.dataset.theme ).toBe( 'dark' );
		expect( storage.setItem ).toHaveBeenLastCalledWith( THEME_STORAGE_KEY, 'dark' );
		expect( document.getElementById( 'theme-status' ).textContent ).toContain( 'locked to dark' );

		controller.destroy();
		expect( mediaQuery.removeEventListener ).toHaveBeenCalled();
	} );
} );
