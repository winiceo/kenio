'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var OauthController = new Controller();

OauthController.signupTwitter = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req._passport.instance.authenticate('twitter', function(err, user, info) {
		if (!info || !info.profile) {
			return self.redirect('/signup');
		}

		self.app.db.models.User.findOne({
			'twitter.id': info.profile.id
		}, function(err, user) {
			if (err) {
				return next(err);
			}

			if (!user) {
				req.session.socialProfile = info.profile;
				self.email = '';
				self.render('signup/social');
			} else {
				self.oauthMessage = 'We found a user linked to your Twitter account.';
				self.oauthTwitter = !! self.app.get('twitter-oauth-key');
				self.oauthGitHub = !! self.app.get('github-oauth-key');
				self.oauthFacebook = !! self.app.get('facebook-oauth-key');
				self.render('signup/index');
			}
		});
	})(req, res, next);
};

OauthController.signupGitHub = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req._passport.instance.authenticate('github', function(err, user, info) {
		if (!info || !info.profile) {
			return self.redirect('/signup');
		}

		self.app.db.models.User.findOne({
			'github.id': info.profile.id
		}, function(err, user) {
			if (err) {
				return next(err);
			}

			if (!user) {
				req.session.socialProfile = info.profile;
				self.email = info.profile.emails[0].value || '';
				res.render('signup/social');
			} else {
				self.oauthMessage = 'We found a user linked to your GitHub account.';
				self.oauthTwitter = !! self.app.get('twitter-oauth-key');
				self.oauthGitHub = !! self.app.get('github-oauth-key');
				self.oauthFacebook = !! self.app.get('facebook-oauth-key');
				self.render('signup/index');
			}
		});
	})(req, res, next);
};

OauthController.signupFacebook = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req._passport.instance.authenticate('facebook', {
		callbackURL: '/signup/facebook/callback/'
	}, function(err, user, info) {
		if (!info || !info.profile) {
			return self.redirect('/signup');
		}

		self.app.db.models.User.findOne({
			'facebook.id': info.profile.id
		}, function(err, user) {
			if (err) {
				return next(err);
			}
			console.log(info.profile);
			if (!user) {
				req.session.socialProfile = info.profile;
				self.email = '';
				res.render('signup/social');
			} else {
				self.oauthMessage = 'We found a user linked to your Facebook account.';
				self.oauthTwitter = !! self.app.get('twitter-oauth-key');
				self.oauthGitHub = !! self.app.get('github-oauth-key');
				self.oauthFacebook = !! self.app.get('facebook-oauth-key');
				self.render('signup/index');
			}
		});
	})(req, res, next);
};

module.exports = OauthController;