'use strict';

module.exports = function() {
	// Any files in this directory will be `require()`'ed when the application
	// starts, and the exported function will be invoked with a `this` context of
	// the application itself.  Initializers are used to connect to databases and
	// message queues, and configure sub-systems such as authentication.

	// Async initializers are declared by exporting `function(done) { /*...*/ }`.
	// `done` is a callback which must be invoked when the initializer is
	// finished.  Initializers are invoked sequentially, ensuring that the
	// previous one has completed before the next one executes.

	this.helpers = {};
	
	this.helpers.renderSettings = function(ctrl, oauthMessage) {
		var req = ctrl.req;
		var next = ctrl.next;

		var outcome = {};

		var getAccountData = function(callback) {
			ctrl.app.db.models.Account.findById(req.user.roles.account.id, 'name company phone zip').exec(function(err, account) {
				if (err) {
					return callback(err, null);
				}

				outcome.account = account;
				callback(null, 'done');
			});
		};

		var getUserData = function(callback) {
			ctrl.app.db.models.User.findById(req.user.id, 'username email twitter.id github.id facebook.id').exec(function(err, user) {
				if (err) {
					callback(err, null);
				}

				outcome.user = user;
				return callback(null, 'done');
			});
		};

		var asyncFinally = function(err, results) {
			if (err) {
				return next(err);
			}

			ctrl.data = {
				account: escape(JSON.stringify(outcome.account)),
				user: escape(JSON.stringify(outcome.user))
			};
			ctrl.oauthMessage = oauthMessage;
			ctrl.oauthTwitter = !! ctrl.app.get('twitter-oauth-key');
			ctrl.oauthTwitterActive = outcome.user.twitter ? !! outcome.user.twitter.id : false;
			ctrl.oauthGitHub = !! ctrl.app.get('github-oauth-key');
			ctrl.oauthGitHubActive = outcome.user.github ? !! outcome.user.github.id : false;
			ctrl.oauthFacebook = !! ctrl.app.get('facebook-oauth-key');
			ctrl.oauthFacebookActive = outcome.user.facebook ? !! outcome.user.facebook.id : false;
			ctrl.render('account/settings/index');
		};

		require('async').parallel([getAccountData, getUserData], asyncFinally);
	};
};