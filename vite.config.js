import { defineConfig } from 'vite';
import babel from '@rollup/plugin-babel';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		babel({
			presets: [[
				"@babel/preset-env",
			]]
		})
	],
	esbuild: {
		charset: 'utf8',
	},
	build: {
		minify: false,
		lib: {
			entry: 'src/RCPatrol.js',
			formats: ['iife'],
			name: 'RCPatrol.js',
			fileName: 'RCPatrol',
		},
		rollupOptions: {
			output: {
				banner:
					'/*! <nowiki>\nUnminify code: https://github.com/Xi-Plus/RCPatrol\n*/',
				footer: '/*! </nowiki> */',
			},
		},
	},
});
