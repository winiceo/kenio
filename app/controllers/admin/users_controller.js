'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var UsersController = new Controller();

UsersController.index = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req.query.username = req.query.username ? req.query.username : '';
	req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
	req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
	req.query.sort = req.query.sort ? req.query.sort : '_id';

	var filters = {};
	if (req.query.username) {
		filters.username = new RegExp('^.*?' + req.query.username + '.*$', 'i');
	}

	if (req.query.isActive) {
		filters.isActive = req.query.isActive;
	}

	if (req.query.roles && req.query.roles === 'admin') {
		filters['roles.admin'] = {
			$exists: true
		};
	}

	if (req.query.roles && req.query.roles === 'account') {
		filters['roles.account'] = {
			$exists: true
		};
	}

	self.app.db.models.User.pagedFind({
		filters: filters,
		keys: 'username email isActive',
		limit: req.query.limit,
		page: req.query.page,
		sort: req.query.sort
	}, function(err, results) {
		if (err) {
			return next(err);
		}

		results.filters = req.query;
		self.respond({
			'json': function() {
				res.header("Cache-Control", "no-cache, no-store, must-revalidate");
				res.json(results);
			},
			'html': function() {
				self.data = {
					results: JSON.stringify(results)
				};
				self.render();
			}
		});
	});
};

UsersController.create = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.username) {
			workflow.outcome.errors.push('Please enter a username.');
			return workflow.emit('response');
		}

		if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
			workflow.outcome.errors.push('only use letters, numbers, -, _');
			return workflow.emit('response');
		}

		workflow.emit('duplicateUsernameCheck');
	});

	workflow.on('duplicateUsernameCheck', function() {
		self.app.db.models.User.findOne({
			username: req.body.username
		}, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (user) {
				workflow.outcome.errors.push('That username is already taken.');
				return workflow.emit('response');
			}

			workflow.emit('createUser');
		});
	});

	workflow.on('createUser', function() {
		var fieldsToSet = {
			username: req.body.username,
			search: [
				req.body.username
			]
		};
		self.app.db.models.User.create(fieldsToSet, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.record = user;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

UsersController.show = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	self.app.db.models.User.findById(req.params.id).populate('roles.admin', 'name.full').populate('roles.account', 'name.full').exec(function(err, user) {
		if (err) {
			return next(err);
		}

		self.respond({
			'json': function() {
				res.json(user);
			},
			'html': function() {
				self.data = {
					record: escape(JSON.stringify(user))
				};
				self.render('details');
			}
		});
	});
};

UsersController.update = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.isActive) {
			req.body.isActive = 'no';
		}

		if (!req.body.username) {
			workflow.outcome.errfor.username = 'required';
		} else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
			workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
		}

		if (!req.body.email) {
			workflow.outcome.errfor.email = 'required';
		} else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
			workflow.outcome.errfor.email = 'invalid email format';
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('duplicateUsernameCheck');
	});

	workflow.on('duplicateUsernameCheck', function() {
		self.app.db.models.User.findOne({
			username: req.body.username,
			_id: {
				$ne: req.params.id
			}
		}, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (user) {
				workflow.outcome.errfor.username = 'username already taken';
				return workflow.emit('response');
			}

			workflow.emit('duplicateEmailCheck');
		});
	});

	workflow.on('duplicateEmailCheck', function() {
		self.app.db.models.User.findOne({
			email: req.body.email.toLowerCase(),
			_id: {
				$ne: req.params.id
			}
		}, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (user) {
				workflow.outcome.errfor.email = 'email already taken';
				return workflow.emit('response');
			}

			workflow.emit('patchUser');
		});
	});

	workflow.on('patchUser', function() {
		var fieldsToSet = {
			isActive: req.body.isActive,
			username: req.body.username,
			email: req.body.email,
			search: [
				req.body.username,
				req.body.email.toLowerCase()
			]
		};

		self.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('patchAdmin', user);
		});
	});

	workflow.on('patchAdmin', function(user) {
		if (user.roles.admin) {
			var fieldsToSet = {
				user: {
					id: req.params.id,
					name: user.username
				}
			};
			self.app.db.models.Admin.findByIdAndUpdate(user.roles.admin, fieldsToSet, function(err, admin) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.emit('patchAccount', user);
			});
		} else {
			workflow.emit('patchAccount', user);
		}
	});

	workflow.on('patchAccount', function(user) {
		if (user.roles.account) {
			var fieldsToSet = {
				user: {
					id: req.params.id,
					name: user.username
				}
			};
			self.app.db.models.Account.findByIdAndUpdate(user.roles.account, fieldsToSet, function(err, account) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.emit('populateRoles', user);
			});
		} else {
			workflow.emit('populateRoles', user);
		}
	});

	workflow.on('populateRoles', function(user) {
		user.populate('roles.admin roles.account', 'name.full', function(err, populatedUser) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.user = populatedUser;
			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

UsersController.destroy = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not delete users.');
			return workflow.emit('response');
		}

		if (req.user._id === req.params.id) {
			workflow.outcome.errors.push('You may not delete yourself from user.');
			return workflow.emit('response');
		}

		workflow.emit('deleteUser');
	});

	workflow.on('deleteUser', function(err) {
		self.app.db.models.User.findByIdAndRemove(req.params.id, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

UsersController.password = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.newPassword) {
			workflow.outcome.errfor.newPassword = 'required';
		}

		if (!req.body.confirm) {
			workflow.outcome.errfor.confirm = 'required';
		}

		if (req.body.newPassword !== req.body.confirm) {
			workflow.outcome.errors.push('Passwords do not match.');
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('patchUser');
	});

	workflow.on('patchUser', function() {
		var fieldsToSet = {
			password: self.app.db.models.User.encryptPassword(req.body.newPassword)
		};

		self.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			user.populate('roles.admin roles.account', 'name.full', function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.outcome.user = user;
				workflow.outcome.newPassword = '';
				workflow.outcome.confirm = '';
				workflow.emit('response');
			});
		});
	});

	workflow.emit('validate');
};

UsersController.linkAdmin = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not link users to admins.');
			return workflow.emit('response');
		}

		if (!req.body.newAdminId) {
			workflow.outcome.errfor.newAdminId = 'required';
			return workflow.emit('response');
		}

		workflow.emit('verifyAdmin');
	});

	workflow.on('verifyAdmin', function(callback) {
		self.app.db.models.Admin.findById(req.body.newAdminId).exec(function(err, admin) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!admin) {
				workflow.outcome.errors.push('Admin not found.');
				return workflow.emit('response');
			}

			if (admin.user.id && admin.user.id !== req.params.id) {
				workflow.outcome.errors.push('Admin is already linked to a different user.');
				return workflow.emit('response');
			}

			workflow.admin = admin;
			workflow.emit('duplicateLinkCheck');
		});
	});

	workflow.on('duplicateLinkCheck', function(callback) {
		self.app.db.models.User.findOne({
			'roles.admin': req.body.newAdminId,
			_id: {
				$ne: req.params.id
			}
		}).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (user) {
				workflow.outcome.errors.push('Another user is already linked to that admin.');
				return workflow.emit('response');
			}

			workflow.emit('patchUser');
		});
	});

	workflow.on('patchUser', function(callback) {
		self.app.db.models.User.findById(req.params.id).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			user.roles.admin = req.body.newAdminId;
			user.save(function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				user.populate('roles.admin roles.account', 'name.full', function(err, user) {
					if (err) {
						return workflow.emit('exception', err);
					}

					workflow.outcome.user = user;
					workflow.emit('patchAdmin');
				});
			});
		});
	});

	workflow.on('patchAdmin', function() {
		workflow.admin.user = {
			id: req.params.id,
			name: workflow.outcome.user.username
		};
		workflow.admin.save(function(err, admin) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

UsersController.unlinkAdmin = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not unlink users from admins.');
			return workflow.emit('response');
		}

		if (req.user._id === req.params.id) {
			workflow.outcome.errors.push('You may not unlink yourself from admin.');
			return workflow.emit('response');
		}

		workflow.emit('patchUser');
	});

	workflow.on('patchUser', function() {
		self.app.db.models.User.findById(req.params.id).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('User was not found.');
				return workflow.emit('response');
			}

			var adminId = user.roles.admin;
			user.roles.admin = null;
			user.save(function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				user.populate('roles.admin roles.account', 'name.full', function(err, user) {
					if (err) {
						return workflow.emit('exception', err);
					}

					workflow.outcome.user = user;
					workflow.emit('patchAdmin', adminId);
				});
			});
		});
	});

	workflow.on('patchAdmin', function(id) {
		self.app.db.models.Admin.findById(id).exec(function(err, admin) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!admin) {
				workflow.outcome.errors.push('Admin was not found.');
				return workflow.emit('response');
			}

			admin.user = undefined;
			admin.save(function(err, admin) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.emit('response');
			});
		});
	});

	workflow.emit('validate');
};

UsersController.linkAccount = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not link users to accounts.');
			return workflow.emit('response');
		}

		if (!req.body.newAccountId) {
			workflow.outcome.errfor.newAccountId = 'required';
			return workflow.emit('response');
		}

		workflow.emit('verifyAccount');
	});

	workflow.on('verifyAccount', function(callback) {
		self.app.db.models.Account.findById(req.body.newAccountId).exec(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!account) {
				workflow.outcome.errors.push('Account not found.');
				return workflow.emit('response');
			}

			if (account.user.id && account.user.id !== req.params.id) {
				workflow.outcome.errors.push('Account is already linked to a different user.');
				return workflow.emit('response');
			}

			workflow.account = account;
			workflow.emit('duplicateLinkCheck');
		});
	});

	workflow.on('duplicateLinkCheck', function(callback) {
		self.app.db.models.User.findOne({
			'roles.account': req.body.newAccountId,
			_id: {
				$ne: req.params.id
			}
		}).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (user) {
				workflow.outcome.errors.push('Another user is already linked to that account.');
				return workflow.emit('response');
			}

			workflow.emit('patchUser');
		});
	});

	workflow.on('patchUser', function(callback) {
		self.app.db.models.User.findById(req.params.id).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			user.roles.account = req.body.newAccountId;
			user.save(function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				user.populate('roles.admin roles.account', 'name.full', function(err, user) {
					if (err) {
						return workflow.emit('exception', err);
					}

					workflow.outcome.user = user;
					workflow.emit('patchAccount');
				});
			});
		});
	});

	workflow.on('patchAccount', function() {
		workflow.account.user = {
			id: req.params.id,
			name: workflow.outcome.user.username
		};
		workflow.account.save(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

UsersController.unlinkAccount = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not unlink users from accounts.');
			return workflow.emit('response');
		}

		workflow.emit('patchUser');
	});

	workflow.on('patchUser', function() {
		self.app.db.models.User.findById(req.params.id).exec(function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('User was not found.');
				return workflow.emit('response');
			}

			var accountId = user.roles.account;
			user.roles.account = null;
			user.save(function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				user.populate('roles.admin roles.account', 'name.full', function(err, user) {
					if (err) {
						return workflow.emit('exception', err);
					}

					workflow.outcome.user = user;
					workflow.emit('patchAccount', accountId);
				});
			});
		});
	});

	workflow.on('patchAccount', function(id) {
		self.app.db.models.Account.findById(id).exec(function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!account) {
				workflow.outcome.errors.push('Account was not found.');
				return workflow.emit('response');
			}

			account.user = undefined;
			account.save(function(err, account) {
				if (err) {
					return workflow.emit('exception', err);
				}

				workflow.emit('response');
			});
		});
	});

	workflow.emit('validate');
};

module.exports = UsersController;