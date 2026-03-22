import { afterEach, vi } from 'vitest';

afterEach( () => {
	document.body.innerHTML = '';
	window.localStorage.clear();
	vi.useRealTimers();

	if ( 'clipboard' in navigator ) {
		delete navigator.clipboard;
	}

	if ( 'ClipboardItem' in globalThis ) {
		delete globalThis.ClipboardItem;
	}
} );
