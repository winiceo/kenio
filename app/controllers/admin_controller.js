'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var AdminController = new Controller();

AdminController.index = function() {
	var self = this;
	var next = self.next;

	var collections = ['User', 'Account', 'Admin', 'AdminGroup', 'Category', 'Status'];
	var queries = [];

	collections.forEach(function(el, i, arr) {
		queries.push(function(done) {
			self.app.db.models[el].count({}, function(err, count) {
				if (err) {
					return done(err, null);
				}

				self['count' + el] = count;
				done(null, el);
			});
		});
	});

	var asyncFinally = function(err, results) {
		if (err) {
			return next(err);
		}

		self.render();
	};

	require('async').parallel(queries, asyncFinally);
};

AdminController.find = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;
	
	req.query.q = req.query.q ? req.query.q : '';
	var regexQuery = new RegExp('^.*?' + req.query.q + '.*$', 'i');
	var outcome = {};

	var searchUsers = function(done) {
		self.app.db.models.User.find({
			search: regexQuery
		}, 'username').sort('username').limit(10).lean().exec(function(err, results) {
			if (err) {
				return done(err, null);
			}

			outcome.users = results;
			done(null, 'searchUsers');
		});
	};

	var searchAccounts = function(done) {
		self.app.db.models.Account.find({
			search: regexQuery
		}, 'name.full').sort('name.full').limit(10).lean().exec(function(err, results) {
			if (err) {
				return done(err, null);
			}

			outcome.accounts = results;
			return done(null, 'searchAccounts');
		});
	};

	var searchAdministrators = function(done) {
		self.app.db.models.Admin.find({
			search: regexQuery
		}, 'name.full').sort('name.full').limit(10).lean().exec(function(err, results) {
			if (err) {
				return done(err, null);
			}

			outcome.administrators = results;
			return done(null, 'searchAdministrators');
		});
	};

	var asyncFinally = function(err, results) {
		if (err) {
			return next(err, null);
		}

		res.send(outcome);
	};

	require('async').parallel([searchUsers, searchAccounts, searchAdministrators], asyncFinally);
};

module.exports = AdminController;