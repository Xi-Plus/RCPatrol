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

const api = new mw.Api();
const hasPatrol = mw.config.get('wgUserGroups').includes('patroller') || mw.config.get('wgUserGroups').includes('sysop');

let rcpOptions = {
	multiPatrolConfirm: true,
	patrolInRC: false,
};

/**
 * 最近巡查的版本ID，為以下數值中的最大值
 * 1. 如果沒有任何最近更改（30天），則為目前版本ID
 * 2. （對於巡查員）最近更改中的最近巡查標記
 * 3. （對於非巡查員）巡查日誌中的版本ID
 * 4. （對於非巡查員）最近更改中屬於巡查豁免者的版本ID
 */
var last_patrolled_revid = 0;

/**
 * 最近更改中最老的版本的前一版本ID
 * 如果沒有最近更改則為目前版本ID
 */
var last_rc_revid = 0;

var recentchanges = null;
var autopatrollers = [];
var patrol_logs = null;

async function getAutopatrollers() {
	if (autopatrollers.length > 0) {
		return;
	}

	let query = {
		'action': 'query',
		'format': 'json',
		'list': 'allusers',
		'aurights': 'autopatrol',
		'aulimit': 'max'
	}
	while (true) {
		let data = await api.get(query);
		for (const user of data.query.allusers) {
			autopatrollers.push(user.name);
		}
		if (data.continue) {
			query = { ...query, ...data.continue };
		} else {
			break;
		}
	}
}

async function getPatrolLogs() {
	if (patrol_logs) {
		return;
	}

	await api.get({
		'action': 'query',
		'format': 'json',
		'list': 'logevents',
		'leprop': 'user|details',
		'leaction': 'patrol/patrol',
		'letitle': mw.config.get('wgPageName'),
		'lelimit': 'max',
	}).then(function(data) {
		patrol_logs = data.query.logevents;
	});

	patrol_logs.forEach(log => {
		last_patrolled_revid = Math.max(last_patrolled_revid, log.params.curid);
	});
}

async function getPatrolRecords() {
	if (recentchanges) {
		return;
	}

	let query = {
		'action': 'query',
		'format': 'json',
		'list': 'recentchanges',
		'rctype': 'edit|new',
		'rcprop': 'ids',
		'rclimit': 'max',
		'rctitle': mw.config.get('wgPageName'),
	};
	if (hasPatrol) {
		query.rcprop += '|patrolled';
	} else {
		query.rcprop += '|user';
	}

	await api.get(query).then(function(data) {
		recentchanges = data.query.recentchanges;
	});

	if (!hasPatrol) {
		await getAutopatrollers();
		await getPatrolLogs();
	}

	if (recentchanges.length === 0) {
		last_patrolled_revid = mw.config.get('wgCurRevisionId');
		last_rc_revid = mw.config.get('wgCurRevisionId');
	} else {
		last_patrolled_revid = Math.max(last_patrolled_revid, recentchanges[recentchanges.length - 1].old_revid);
		last_rc_revid = recentchanges[recentchanges.length - 1].old_revid;
		if (hasPatrol) {
			recentchanges.forEach(recentchange => {
				if (recentchange.patrolled !== undefined) {
					last_patrolled_revid = Math.max(last_patrolled_revid, recentchange.revid);
					return;
				}
			});
		} else {
			recentchanges.forEach(recentchange => {
				// 巡查豁免者的編輯
				if (autopatrollers.includes(recentchange.user)) {
					last_patrolled_revid = Math.max(last_patrolled_revid, recentchange.revid);
					return;
				}
			});
		}
	}
}

function markHistByRC() {
	recentchanges.forEach(recentchange => {
		let $contribution_row = $('.mw-contributions-list li[data-mw-revid=' + recentchange.revid + ']');
		if (recentchange.autopatrolled !== undefined) {
			$contribution_row.addClass('gadget-rcp-autopatrolled');
			$('<span>').text('[' + msg('gadget-rcp-hist-basic-auto') + ']').addClass('gadget-rcp-hist-basic-auto').appendTo($contribution_row);
		} else if (recentchange.patrolled !== undefined) {
			$contribution_row.addClass('gadget-rcp-patrolled');
		} else {
			$contribution_row.addClass('gadget-rcp-unpatrolled');
			if (recentchange.revid > last_patrolled_revid) {
				$contribution_row.addClass('gadget-rcp-pending');
				if (last_patrolled_revid > 0) {
					$('<span>').html('[' + parsedmsg('gadget-rcp-hist-pending-difflink', last_patrolled_revid, recentchange.revid) + ']').addClass('gadget-rcp-hist-difflink').appendTo($contribution_row);
				}
			}
		}
	});
}

async function markHistByPatrolLog() {
	await getPatrolLogs();

	patrol_logs.forEach(log => {
		let $contribution_row = $('.mw-contributions-list li[data-mw-revid=' + log.params.curid + ']');
		$('<span>').html('[' + parsedmsg('gadget-rcp-hist-basic-user', log.user) + ']').addClass('gadget-rcp-hist-basic-user').appendTo($contribution_row);
		$contribution_row.addClass('gadget-rcp-patrolled');
	});
}

async function markHistByAutopatrollers() {
	await getAutopatrollers();

	for (const contribution_row of $('.mw-contributions-list li')) {
		const revid = $(contribution_row).data('mw-revid');
		const username = $(contribution_row).find('.history-user a bdi').text();
		if (autopatrollers.includes(username) && (!hasPatrol || revid <= last_rc_revid)) {
			$(contribution_row).addClass('gadget-rcp-autopatrolled');
			$('<span>').text('[' + msg('gadget-rcp-hist-basic-auto') + ']').addClass('gadget-rcp-hist-basic-auto').appendTo(contribution_row);
		}
	}
}

function markHistWithoutRC() {
	for (const contribution_row of $('.mw-contributions-list li')) {
		const revid = $(contribution_row).data('mw-revid');
		if (revid > last_patrolled_revid) {
			$(contribution_row).addClass('gadget-rcp-pending');
			if (last_patrolled_revid > 0) {
				$('<span>').html('[' + parsedmsg('gadget-rcp-hist-pending-difflink', last_patrolled_revid, revid) + ']').addClass('gadget-rcp-hist-difflink').appendTo($(contribution_row));
			}
		}
	}
}

function markDiffPatrolStatus() {
	const $diffHeaderItems = $('<div>').attr('id', 'gadget-rcp-diff-headeritems').insertBefore('#mw-content-text table.diff');
	const $diffToStable = $('<div>').addClass('gadget-rcp-diff-to-stable').appendTo($diffHeaderItems);
	$diffToStable.css({ 'text-align': 'center' });

	if (last_patrolled_revid > 0
		&& mw.config.get('wgCurRevisionId') != last_patrolled_revid
		&& (mw.config.get('wgDiffOldId') != last_patrolled_revid
			|| mw.config.get('wgDiffNewId') != mw.config.get('wgCurRevisionId'))
	) {
		$diffToStable.append(document.createTextNode('（'));
		$diffToStable.append(
			$('<a>')
				.attr('href', mw.util.getUrl(null, { oldid: last_patrolled_revid, diff: 'cur' }))
				.text(msg('gadget-rcp-diff2stable'))
		);
		$diffToStable.append(document.createTextNode('）'));
	}

	const $ratingsTable = $('<table>').addClass('gadget-rcp-diff-ratings').appendTo($diffHeaderItems);

	const $oldWrapper = $('<td>').addClass('gadget-rcp-diff-old');
	$oldWrapper.css({ 'text-align': 'center', 'width': '50%' });
	const $newWrapper = $('<td>').addClass('gadget-rcp-diff-new');
	$newWrapper.css({ 'text-align': 'center', 'width': '50%' });

	$ratingsTable
		.append($('<tbody>')
			.append($('<tr>')
				.append($oldWrapper)
				.append($newWrapper)
			)
		);

	const $oldMark = $('<span>').attr('id', 'gadget-rcp-diff-old-status').appendTo($oldWrapper);
	if (mw.config.get('wgDiffOldId') <= last_patrolled_revid) {
		$oldMark.addClass('gadget-rcp-diff-patrolled');
		$oldMark.text('[' + msg('gadget-rcp-hist-basic') + ']');
	} else {
		$oldMark.addClass('gadget-rcp-diff-pending');
		$oldMark.text('[' + msg('gadget-rcp-hist-pending') + ']');
	}

	const $newMark = $('<span>').attr('id', 'gadget-rcp-diff-new-status').appendTo($newWrapper);
	if (mw.config.get('wgDiffNewId') <= last_patrolled_revid) {
		$newMark.addClass('gadget-rcp-diff-patrolled');
		$newMark.text('[' + msg('gadget-rcp-hist-basic') + ']');
	} else {
		$newMark.addClass('gadget-rcp-diff-pending');
		$newMark.text('[' + msg('gadget-rcp-hist-pending') + ']');
	}

	if (hasPatrol && $('.diff-multi').length > 0) {
		const revidsToPatrol = [];
		recentchanges.forEach(recentchange => {
			if (recentchange.revid <= mw.config.get('wgDiffOldId')) {
				return;
			}
			if (recentchange.revid <= mw.config.get('wgDiffNewId') && recentchange.patrolled === undefined) {
				revidsToPatrol.push(recentchange.revid);
			}
		});

		if (revidsToPatrol.length > 0) {
			const $diffMulti = $('.diff-multi').first();
			const $mutilPatrol = $('<span>').addClass('gadget-rcp-multi-patrol').appendTo($diffMulti);
			const $mutilPatrolLink = $('<a>').attr('href', '#').text(msg('gadget-rcp-patrol-multi', revidsToPatrol.length));
			$mutilPatrolLink.on('click', function(e) {
				e.preventDefault();
				if (rcpOptions.multiPatrolConfirm
					&& !confirm(msg('gadget-rcp-patrol-multi-confirm', revidsToPatrol.length))
				) {
					return;
				}

				$('.patrollink').remove();
				$mutilPatrol.remove();

				revidsToPatrol.forEach(revid => {
					api.postWithToken('patrol', {
						action: 'patrol',
						revid: revid,
					}).done(() => {
						mw.notify(msg('gadget-rcp-patrol-notify', revid));
					});
				});
			})

			$mutilPatrol.append(document.createTextNode('['));
			$mutilPatrol.append($mutilPatrolLink);
			$mutilPatrol.append(document.createTextNode(']'));
		}
	}
}

function addPatrolLinksInRC() {
	$('.mw-changeslist-reviewstatus-unpatrolled').each(function(key, change) {
		const revid = $(change).data('mw-revid');

		const $rcPatrol = $('<span>').addClass('gadget-rcp-rc-patrol').appendTo(change);
		const $rcPatrolLink = $('<a>').attr('href', '#').text(msg('gadget-rcp-patrol'));
		$rcPatrolLink.on('click', function(e) {
			e.preventDefault();

			$rcPatrol.remove();
			$(change).find('.unpatrolled').remove();

			api.postWithToken('patrol', {
				action: 'patrol',
				revid: revid,
			}).done(() => {
				mw.notify(msg('gadget-rcp-patrol-notify', revid));
			});
		})

		$rcPatrol.append(document.createTextNode('['));
		$rcPatrol.append($rcPatrolLink);
		$rcPatrol.append(document.createTextNode(']'));
	});
}

async function main() {
	rcpOptions = { ...rcpOptions, ...window.RCPatrolOptions };

	/**
	 * 在歷史頁面標記未巡查編輯
	 */
	if (mw.config.get('wgAction') === 'history') {
		await getPatrolRecords();
		if (hasPatrol) {
			markHistByRC();
		} else {
			markHistWithoutRC();
		}
		markHistByAutopatrollers();
		markHistByPatrolLog();
	}
	if (mw.config.get('wgDiffNewId') && mw.config.get('wgDiffOldId')) {
		await getPatrolRecords();
		mw.hook('wikipage.diff').add(markDiffPatrolStatus);
	}
	if (hasPatrol
		&& ['Recentchanges', 'Recentchangeslinked', 'Watchlist'].includes(mw.config.get('wgCanonicalSpecialPageName'))
		&& rcpOptions.patrolInRC
	) {
		mw.hook('wikipage.content').add(function(item) {
			if (item.is('div')) {
				addPatrolLinksInRC();
			}
		});
	}
}

main();
