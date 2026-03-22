import { afterEach, vi } from 'vitest';

afterEach( () => {
	document.body.innerHTML = '';
	vi.useRealTimers();

	if ( 'clipboard' in navigator ) {
		delete navigator.clipboard;
	}

	if ( 'ClipboardItem' in globalThis ) {
		delete globalThis.ClipboardItem;
	}
} );
