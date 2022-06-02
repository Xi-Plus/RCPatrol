(function() {
	var api = new mw.Api();

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
			var recentchanges = data.query.recentchanges;
			var found_patrolled = false;
			for (var i = 0; i < recentchanges.length; i++) {
				if (recentchanges[i].autopatrolled !== undefined) {
					$('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').addClass('gadget-rcp-autopatrolled');
					found_patrolled = true;
				} else if (recentchanges[i].patrolled !== undefined) {
					$('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').addClass('gadget-rcp-patrolled');
					found_patrolled = true;
				} else {
					$('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').addClass('gadget-rcp-unpatrolled');
					if (!found_patrolled) {
						$('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').addClass('gadget-rcp-recently-unpatrolled');
					}
				}
			}
		});
	}
})();
