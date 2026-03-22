import { defineConfig } from '@playwright/test';

export default defineConfig( {
	testDir: './e2e',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4269',
		colorScheme: 'light',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4269 --strictPort',
		url: 'http://127.0.0.1:4269',
		reuseExistingServer: false,
		timeout: 120000,
	},
} );
