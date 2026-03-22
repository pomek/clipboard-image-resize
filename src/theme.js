export const THEME_STORAGE_KEY = 'clipboard-image-resize:theme-preference';
const VALID_THEME_PREFERENCES = new Set( [ 'light', 'dark', 'auto' ] );
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function normalizeThemePreference( value ) {
	return VALID_THEME_PREFERENCES.has( value ) ? value : 'auto';
}

export function resolveTheme( preference, prefersDark ) {
	const normalizedPreference = normalizeThemePreference( preference );

	if ( normalizedPreference === 'auto' ) {
		return prefersDark ? 'dark' : 'light';
	}

	return normalizedPreference;
}

export function readThemePreference( storage = window.localStorage ) {
	try {
		return normalizeThemePreference( storage.getItem( THEME_STORAGE_KEY ) );
	} catch ( error ) {
		return 'auto';
	}
}

export default function setupThemeController( {
	buttons = [ ...document.querySelectorAll( '.js-theme-button' ) ],
	statusElement = document.getElementById( 'theme-status' ),
	storage = window.localStorage,
	mediaQuery = window.matchMedia( THEME_MEDIA_QUERY ),
} = {} ) {
	let preference = readThemePreference( storage );

	const applyTheme = ( nextPreference, { persist = true } = {} ) => {
		preference = normalizeThemePreference( nextPreference );

		const resolvedTheme = resolveTheme( preference, mediaQuery.matches );

		document.documentElement.dataset.themePreference = preference;
		document.documentElement.dataset.theme = resolvedTheme;

		for ( const button of buttons ) {
			const isActive = button.dataset.themeMode === preference;

			button.classList.toggle( 'active', isActive );
			button.setAttribute( 'aria-pressed', String( isActive ) );
		}

		if ( statusElement ) {
			statusElement.textContent = getThemeStatusLabel( preference, resolvedTheme );
		}

		if ( persist ) {
			try {
				storage.setItem( THEME_STORAGE_KEY, preference );
			} catch ( error ) {
				// Ignore storage failures and keep the theme applied for the current session.
			}
		}
	};

	const onThemeChange = event => {
		applyTheme( event.currentTarget.dataset.themeMode );
	};

	const onSystemThemeChange = () => {
		if ( preference === 'auto' ) {
			applyTheme( preference, { persist: false } );
		}
	};

	for ( const button of buttons ) {
		button.addEventListener( 'click', onThemeChange );
	}

	if ( typeof mediaQuery.addEventListener === 'function' ) {
		mediaQuery.addEventListener( 'change', onSystemThemeChange );
	} else if ( typeof mediaQuery.addListener === 'function' ) {
		mediaQuery.addListener( onSystemThemeChange );
	}

	applyTheme( preference, { persist: false } );

	return {
		applyTheme,
		getPreference() {
			return preference;
		},
		destroy() {
			for ( const button of buttons ) {
				button.removeEventListener( 'click', onThemeChange );
			}

			if ( typeof mediaQuery.removeEventListener === 'function' ) {
				mediaQuery.removeEventListener( 'change', onSystemThemeChange );
			} else if ( typeof mediaQuery.removeListener === 'function' ) {
				mediaQuery.removeListener( onSystemThemeChange );
			}
		},
	};
}

function getThemeStatusLabel( preference, resolvedTheme ) {
	if ( preference === 'auto' ) {
		return `Theme follows your system appearance (${ resolvedTheme }).`;
	}

	return `Theme locked to ${ preference } mode.`;
}
