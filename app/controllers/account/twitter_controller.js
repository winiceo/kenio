'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var TwitterController = new Controller();

TwitterController.connectTwitter = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req._passport.instance.authenticate('twitter', function(err, user, info) {
		if (!info || !info.profile) {
			return self.redirect('/account/settings');
		}

		self.app.db.models.User.findOne({
			'twitter.id': info.profile.id,
			_id: {
				$ne: req.user.id
			}
		}, function(err, user) {
			if (err) {
				return next(err);
			}

			if (user) {
				this.app.helpers.renderSettings(self, 'Another user has already connected with that Twitter account.');
			} else {
				self.app.db.models.User.findByIdAndUpdate(req.user.id, {
					twitter: info.profile._json
				}, function(err, user) {
					if (err) {
						return next(err);
					}

					self.redirect('/account/settings');
				});
			}
		});
	})(req, res, next);
};

TwitterController.disconnectTwitter = function() {
	var self = this;
	var req = self.req;
	var next = self.next;

	self.app.db.models.User.findByIdAndUpdate(req.user.id, {
		twitter: {
			id: undefined
		}
	}, function(err, user) {
		if (err) {
			return next(err);
		}

		self.redirect('/account/settings');
	});
};

module.exports = TwitterController;