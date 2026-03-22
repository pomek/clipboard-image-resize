import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import path from 'node:path';

const devServerUrl = 'http://127.0.0.1:4269';
const playwrightOutputDir = path.join( tmpdir(), 'clipboard-image-resize-playwright' );

export default defineConfig( {
	testDir: './e2e',
	fullyParallel: true,
	reporter: 'list',
	outputDir: playwrightOutputDir,
	use: {
		baseURL: devServerUrl,
		colorScheme: 'light',
		headless: true,
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'pnpm dev:test',
		url: devServerUrl,
		reuseExistingServer: true,
		timeout: 120000,
	},
} );
