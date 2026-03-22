import { defineConfig } from 'vitest/config';

export default defineConfig( {
	server: {
		open: true,
		port: 9000,
	},
	test: {
		environment: 'jsdom',
		include: [ 'src/**/*.test.js' ],
		setupFiles: [ './tests/setup.js' ],
		clearMocks: true,
		restoreMocks: true,
	},
} );
