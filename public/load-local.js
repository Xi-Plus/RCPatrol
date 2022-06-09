/* eslint indent: ["error", "tab"] */

mw.loader.using(['mediawiki.api', 'jquery.i18n', 'mediawiki.jqueryMsg'], function() {
	mw.loader.load('http://localhost:4173/RCPatrol.css', 'text/css');
	mw.loader.load('http://localhost:4173/RCPatrol.iife.js');
});

/*

Usage:

mw.loader.load('http://localhost:4173/load-local.js');

*/
