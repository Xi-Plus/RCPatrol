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
			for (var i = 0; i < recentchanges.length; i++) {
				console.log(recentchanges[i]);
				if (recentchanges[i].patrolled !== undefined) {
					break;
				}
				console.log($('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').length);
				$('.mw-contributions-list li[data-mw-revid=' + recentchanges[i].revid + ']').addClass('gadget-rcp-not-patrolled');
			}
		});
	}
})();
