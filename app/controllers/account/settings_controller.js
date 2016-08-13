'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var SettingsController = new Controller();

SettingsController.settings = function() {
	this.app.helpers.renderSettings(this, '');
};

SettingsController.update = function() {
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

		self.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.account = account;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

SettingsController.identity = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
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
				$ne: req.user.id
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
				$ne: req.user.id
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
			username: req.body.username,
			email: req.body.email.toLowerCase(),
			search: [
				req.body.username,
				req.body.email
			]
		};

		self.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, function(err, user) {
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
					id: req.user.id,
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
					id: req.user.id,
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

SettingsController.password = function() {
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

		self.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, function(err, user) {
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

module.exports = SettingsController;