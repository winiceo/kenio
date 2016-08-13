'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var LoginController = new Controller();

LoginController.index = function() {
	var self = this;
	var req = self.req;

	if (req.isAuthenticated()) {
		self.redirect(req.user.defaultReturnUrl());
	} else {
		self.returnUrl = req.query.returnUrl || '/';
		self.oauthMessage = '';
		self.oauthTwitter = !! self.app.get('twitter-oauth-key');
		self.oauthGitHub = !! self.app.get('github-oauth-key');
		self.oauthFacebook = !! self.app.get('facebook-oauth-key');
		self.render();
	}
};

LoginController.login = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.username) {
			workflow.outcome.errfor.username = 'required';
		}

		if (!req.body.password) {
			workflow.outcome.errfor.password = 'required';
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('attemptLogin');
	});

	workflow.on('attemptLogin', function() {
		req._passport.instance.authenticate('local', function(err, user, info) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('Username and password combination not found or your account is inactive.');
				return workflow.emit('response');
			} else {
				req.login(user, function(err) {
					if (err) {
						return workflow.emit('exception', err);
					}

					workflow.outcome.defaultReturnUrl = user.defaultReturnUrl();
					workflow.emit('response');
				});
			}
		})(req, res);
	});

	workflow.emit('validate');
};

module.exports = LoginController;