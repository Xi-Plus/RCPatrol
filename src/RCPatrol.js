import hansLocale from '../i18n/zh-hans.json';
import hantLocale from '../i18n/zh-hant.json';

$.i18n({
	locale: mw.config.get('wgUserLanguage'),
});
$.i18n().load({
	'zh-hans': hansLocale,
	'zh-hant': hantLocale,
});
function msg(key, ...parameters) {
	if (!mw.messages.exists(key)) {
		mw.messages.set(key, $.i18n(key));
	}
	return mw.message(key, ...parameters).text();
}
function parsedmsg(key, ...parameters) {
	if (!mw.messages.exists(key)) {
		mw.messages.set(key, $.i18n(key));
	}
	return mw.message(key, ...parameters).parse();
}

let api = new mw.Api();

/**
 * 在歷史頁面標記未巡查編輯
 */
if (mw.config.get('wgAction') === 'history') {
	api.get({
		'action': 'query',
		'format': 'json',
		'list': 'recentchanges',
		'rctype': 'edit|new',
		'rcprop': 'ids|patrolled',
		'rclimit': 'max',
		'rctitle': mw.config.get('wgPageName'),
	}).then(function(data) {
		let recentchanges = data.query.recentchanges;
		let found_patrolled = false;
		let recnetly_patrolled_id = recentchanges[recentchanges.length - 1].old_revid;
		for (let i = 0; i < recentchanges.length; i++) {
			if (recentchanges[i].patrolled !== undefined) {
				recnetly_patrolled_id = recentchanges[i].revid;
				break;
			}
		}
		for (let i = 0; i < recentchanges.length; i++) {
			const recentchange = recentchanges[i];
			let $contribution_row = $('.mw-contributions-list li[data-mw-revid=' + recentchange.revid + ']');
			if (recentchange.autopatrolled !== undefined) {
				$contribution_row.addClass('gadget-rcp-autopatrolled');
				$('<span>').text('[' + msg('gadget-rcp-hist-basic-auto') + ']').addClass('gadget-rcp-hist-basic-auto').appendTo($contribution_row);
				found_patrolled = true;
			} else if (recentchange.patrolled !== undefined) {
				$contribution_row.addClass('gadget-rcp-patrolled');
				found_patrolled = true;
			} else {
				$contribution_row.addClass('gadget-rcp-unpatrolled');
				if (!found_patrolled) {
					$contribution_row.addClass('gadget-rcp-pending');
					$('<span>').html('[' + parsedmsg('gadget-rcp-hist-pending-difflink', recnetly_patrolled_id, recentchange.revid) + ']').addClass('gadget-rcp-hist-difflink').appendTo($contribution_row);
				}
			}
		}
	});

	api.get({
		'action': 'query',
		'format': 'json',
		'list': 'logevents',
		'leprop': 'user|details',
		'leaction': 'patrol/patrol',
		'letitle': mw.config.get('wgPageName'),
		'lelimit': 'max',
	}).then(function(data) {
		let logevents = data.query.logevents;
		for (let i = 0; i < logevents.length; i++) {
			const logevent = logevents[i];
			let $contribution_row = $('.mw-contributions-list li[data-mw-revid=' + logevent.params.curid + ']');
			$('<span>').html('[' + parsedmsg('gadget-rcp-hist-basic-user', logevent.user) + ']').addClass('gadget-rcp-hist-basic-user').appendTo($contribution_row);
		}
	});
}
