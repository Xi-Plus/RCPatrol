/* eslint indent: ["error", "tab"] */

mw.loader.using(['mediawiki.api', 'jquery.i18n', 'mediawiki.jqueryMsg'], function() {
	mw.loader.load('http://localhost:3000/dist/RCPatrol.css', 'text/css');
	mw.loader.load('http://localhost:3000/dist/RCPatrol.iife.js');
});

/*

Usage:

mw.loader.load('http://localhost:3000/dist/load-local.js');

*/
