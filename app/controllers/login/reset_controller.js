'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var ResetController = new Controller();

ResetController.index = function() {
	var self = this;
	var req = self.req;

	if (req.isAuthenticated()) {
		self.redirect(req.user.defaultReturnUrl());
	} else {
		self.render();
	}
};

ResetController.set = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.password) {
			workflow.outcome.errfor.password = 'required';
		}

		if (!req.body.confirm) {
			workflow.outcome.errfor.confirm = 'required';
		}

		if (req.body.password !== req.body.confirm) {
			workflow.outcome.errors.push('Passwords do not match.');
		}

		if (workflow.hasErrors()) {
			return workflow.emit('response');
		}

		workflow.emit('patchUser');
	});

	workflow.on('patchUser', function() {
		var encryptedPassword = self.app.db.models.User.encryptPassword(req.body.password);

		self.app.db.models.User.findOneAndUpdate({
				resetPasswordToken: req.params.token
			}, {
				password: encryptedPassword,
				resetPasswordToken: ''
			},
			function(err, user) {
				if (err) {
					return workflow.emit('exception', err);
				}

				if (!user) {
					workflow.outcome.errors.push('Invalid reset token.');
					return workflow.emit('response');
				}

				workflow.emit('response');
			}
		);
	});

	workflow.emit('validate');
};

module.exports = ResetController;