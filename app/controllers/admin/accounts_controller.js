'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var AccountsController = new Controller();

AccountsController.index = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	var outcome = {};

	var getStatusOptions = function(callback) {
		self.app.db.models.Status.find({
			pivot: 'Account'
		}, 'name').sort('name').exec(function(err, statuses) {
			if (err) {
				return callback(err, null);
			}

			outcome.statuses = statuses;
			return callback(null, 'done');
		});
	};

	var getResults = function(callback) {
		req.query.search = req.query.search ? req.query.search : '';
		req.query.status = req.query.status ? req.query.status : '';
		req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
		req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
		req.query.sort = req.query.sort ? req.query.sort : '_id';

		var filters = {};
		if (req.query.search) {
			filters.search = new RegExp('^.*?' + req.query.search + '.*$', 'i');
		}

		if (req.query.status) {
			filters['status.id'] = req.query.status;
		}

		self.app.db.models.Account.pagedFind({
			filters: filters,
			keys: 'name company phone zip userCreated status',
			limit: req.query.limit,
			page: req.query.page,
			sort: req.query.sort
		}, function(err, results) {
			if (err) {
				return callback(err, null);
			}

			outcome.results = results;
			return callback(null, 'done');
		});
	};

	var asyncFinally = function(err, results) {
		if (err) {
			return next(err);
		}

		outcome.results.filters = req.query;
		self.respond({
			'json': function() {
				res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				res.json(outcome.results);
			},
			'html': function() {
				self.data = {
					results: escape(JSON.stringify(outcome.results)),
					statuses: outcome.statuses
				};
				self.render();
			}
		});
	};

	require('async').parallel([getStatusOptions, getResults], asyncFinally);
};

AccountsController.create = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body['name.full']) {
			workflow.outcome.errors.push('Please enter a name.');
			return workflow.emit('response');
		}

		workflow.emit('createAccount');
	});

	workflow.on('createAccount', function() {
		var nameParts = req.body['name.full'].trim().split(/\s/);
		var fieldsToSet = {
			name: {
				first: nameParts.shift(),
				middle: (nameParts.length > 1 ? nameParts.shift() : ''),
				last: (nameParts.length === 0 ? '' : nameParts.join(' ')),
			},
			userCreated: {
				id: req.user._id,
				name: req.user.username,
				time: new Date().toISOString()
			}
		};
		fieldsToSet.name.full = fieldsToSet.name.first + (fieldsToSet.name.last ? ' ' + fieldsToSet.name.last : '');
		fieldsToSet.search = [
			fieldsToSet.name.first,
			fieldsToSet.name.middle,
			fieldsToSet.name.last
		];

		self.app.db.models.Account.create(fieldsToSet, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.record = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AccountsController.show = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	var outcome = {};

	var getStatusOptions = function(callback) {
		self.app.db.models.Status.find({
			pivot: 'Account'
		}, 'name').sort('name').exec(function(err, statuses) {
			if (err) {
				return callback(err, null);
			}

			outcome.statuses = statuses;
			return callback(null, 'done');
		});
	};

	var getRecord = function(callback) {
		self.app.db.models.Account.findById(req.params.id).exec(function(err, record) {
			if (err) {
				return callback(err, null);
			}

			outcome.record = record;
			return callback(null, 'done');
		});
	};

	var asyncFinally = function(err, results) {
		if (err) {
			return next(err);
		}

		self.respond({
			'json': function() {
				res.json(outcome.record);
			},
			'html': function() {
				self.data = {
					record: escape(JSON.stringify(outcome.record)),
					statuses: outcome.statuses
				};
				self.render('details');
			}
		});
	};

	require('async').parallel([getStatusOptions, getRecord], asyncFinally);
};

AccountsController.update = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.first) {
			workflow.outcome.errfor.first = 'required';
		}

		if (!req.body.last) {
			workflow.outcome.errfor.last = 'required';
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('patchAccount');
	});

	workflow.on('patchAccount', function() {
		var fieldsToSet = {
			name: {
				first: req.body.first,
				middle: req.body.middle,
				last: req.body.last,
				full: req.body.first + ' ' + req.body.last
			},
			company: req.body.company,
			phone: req.body.phone,
			zip: req.body.zip,
			search: [
				req.body.first,
				req.body.middle,
				req.body.last,
				req.body.company,
				req.body.phone,
				req.body.zip
			]
		};

		self.app.db.models.Account.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AccountsController.destroy = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not delete accounts.');
			return workflow.emit('response');
		}

		workflow.emit('deleteAccount');
	});

	workflow.on('deleteAccount', function(err) {
		self.app.db.models.Account.findByIdAndRemove(req.params.id, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AccountsController.linkUser = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not link accounts to users.');
			return workflow.emit('response');
		}

		if (!req.body.newUsername) {
			workflow.outcome.errfor.newUsername = 'required';
			return workflow.emit('response');
		}

		workflow.emit('verifyUser');
	});

	workflow.on('verifyUser', function(callback) {
		self.app.db.models.User.findOne({
			username: req.body.newUsername
		}).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('User not found.');
				return workflow.emit('response');
			} else if (user.roles && user.roles.account && user.roles.account !== req.params.id) {
				workflow.outcome.errors.push('User is already linked to a different account.');
				return workflow.emit('response');
			}

			workflow.user = user;
			workflow.emit('duplicateLinkCheck');
		});
	});

	workflow.on('duplicateLinkCheck', function(callback) {
		self.app.db.models.Account.findOne({
			'user.id': workflow.user._id,
			_id: {
				$ne: req.params.id
			}
		}).exec(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (account) {
				workflow.outcome.errors.push('Another account is already linked to that user.');
				return workflow.emit('response');
			}

			workflow.emit('patchUser');
		});
	});

	workflow.on('patchUser', function() {
		self.app.db.models.User.findByIdAndUpdate(workflow.user._id, {
			'roles.account': req.params.id
		}).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('patchAccount');
		});
	});

	workflow.on('patchAccount', function(callback) {
		self.app.db.models.Account.findByIdAndUpdate(req.params.id, {
			user: {
				id: workflow.user._id,
				name: workflow.user.username
			}
		}).exec(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AccountsController.unlinkUser = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not unlink users from accounts.');
			return workflow.emit('response');
		}

		workflow.emit('patchAccount');
	});

	workflow.on('patchAccount', function() {
		self.app.db.models.Account.findById(req.params.id).exec(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!account) {
				workflow.outcome.errors.push('Account was not found.');
				return workflow.emit('response');
			}

			var userId = account.user.id;
			account.user = {
				id: undefined,
				name: ''
			};
			account.save(function(err, account) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.outcome.account = account;
				workflow.emit('patchUser', userId);
			});
		});
	});

	workflow.on('patchUser', function(id) {
		self.app.db.models.User.findById(id).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('User was not found.');
				return workflow.emit('response');
			}

			user.roles.account = undefined;
			user.save(function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.emit('response');
			});
		});
	});

	workflow.emit('validate');
};

AccountsController.newNote = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.data) {
			workflow.outcome.errors.push('Data is required.');
			return workflow.emit('response');
		}

		workflow.emit('addNote');
	});

	workflow.on('addNote', function() {
		var noteToAdd = {
			data: req.body.data,
			userCreated: {
				id: req.user._id,
				name: req.user.username,
				time: new Date().toISOString()
			}
		};

		self.app.db.models.Account.findByIdAndUpdate(req.params.id, {
			$push: {
				notes: noteToAdd
			}
		}, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AccountsController.newStatus = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.id) {
			workflow.outcome.errors.push('Please choose a status.');
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('addStatus');
	});

	workflow.on('addStatus', function() {
		var statusToAdd = {
			id: req.body.id,
			name: req.body.name,
			userCreated: {
				id: req.user._id,
				name: req.user.username,
				time: new Date().toISOString()
			}
		};

		self.app.db.models.Account.findByIdAndUpdate(req.params.id, {
			status: statusToAdd,
			$push: {
				statusLog: statusToAdd
			}
		}, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

module.exports = AccountsController;