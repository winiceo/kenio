'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var VerificationController = new Controller();

VerificationController.index = function() {
	var self = this;
	var req = self.req;

	if (req.user.roles.account.isVerified === 'yes') {
		self.redirect(req.user.defaultReturnUrl());
	}

	var renderPage = function() {
		self.app.db.models.User.findById(req.user.id, 'email').exec(function(err, user) {
			if (err) {
				return self.next(err);
			}

			self.data = {
				user: JSON.stringify(user)
			};
			self.render();
		});
	};

	if (req.user.roles.account.verificationToken === '') {
		var fieldsToSet = {
			verificationToken: require('crypto').createHash('md5').update(Math.random().toString()).digest('hex')
		};

		self.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, function(err, account) {
			if (err) {
				return self.next(err);
			}

			sendVerificationEmail(self, {
				email: req.user.email,
				verificationToken: account.verificationToken,
				onSuccess: function() {
					return renderPage();
				},
				onError: function(err) {
					return self.next(err);
				}
			});
		});
	} else {
		renderPage();
	}
};

VerificationController.resendVerification = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	if (req.user.roles.account.isVerified === 'yes') {
		return self.redirect(req.user.defaultReturnUrl());
	}

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.email) {
			workflow.outcome.errfor.email = 'required';
		} else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
			workflow.outcome.errfor.email = 'invalid email format';
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('duplicateEmailCheck');
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
			email: req.body.email.toLowerCase()
		};

		self.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.user = user;
			workflow.emit('patchAccount');
		});
	});

	workflow.on('patchAccount', function() {
		var fieldsToSet = {
			verificationToken: require('crypto').createHash('md5').update(Math.random().toString()).digest('hex')
		};

		self.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, function(err, account) {
			if (err) {
				return workflow.emit('exception', err);
			}

			sendVerificationEmail(self, {
				email: workflow.user.email,
				verificationToken: account.verificationToken,
				onSuccess: function() {
					workflow.emit('response');
				},
				onError: function(err) {
					workflow.outcome.errors.push('Error Sending: ' + err);
					workflow.emit('response');
				}
			});
		});
	});

	workflow.emit('validate');
};

VerificationController.verify = function() {
	var self = this;
	var req = self.req;

	var conditions = {
		_id: req.user.roles.account.id,
		verificationToken: req.params.token
	};

	var fieldsToSet = {
		isVerified: 'yes',
		verificationToken: ''
	};

	self.app.db.models.Account.findOneAndUpdate(conditions, fieldsToSet, function(err, account) {
		if (err) {
			return self.next(err);
		}

		return self.redirect(req.user.defaultReturnUrl());
	});
};

var sendVerificationEmail = function(ctrl, options) {
	var req = ctrl.req;

	ctrl.app.utility.sendmail(ctrl, {
		from: ctrl.app.get('smtp-from-name') + ' <' + ctrl.app.get('smtp-from-address') + '>',
		to: options.email,
		subject: 'Verify Your ' + ctrl.app.get('project-name') + ' Account',
		textPath: 'account/verification/email-text',
		htmlPath: 'account/verification/email-html',
		locals: {
			verifyURL: 'http://' + req.headers.host + '/account/verification/' + options.verificationToken + '/',
			projectName: ctrl.app.get('project-name')
		},
		success: function() {
			options.onSuccess();
		},
		error: function(err) {
			options.onError(err);
		}
	});
};

module.exports = VerificationController;