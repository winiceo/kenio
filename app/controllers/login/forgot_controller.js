'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var ForgotController = new Controller();

ForgotController.index = function() {
	var self = this;
	var req = self.req;

	if (req.isAuthenticated()) {
		self.redirect(req.user.defaultReturnUrl());
	} else {
		self.render();
	}
};

ForgotController.send = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.body.email) {
			workflow.outcome.errfor.email = 'required';
			return workflow.emit('response');
		}

		workflow.emit('patchUser');
	});

	workflow.on('patchUser', function() {
		var token = require('crypto').createHash('md5').update(Math.random().toString()).digest('hex');

		self.app.db.models.User.findOneAndUpdate({
			email: req.body.email.toLowerCase()
		}, {
			resetPasswordToken: token
		}, function(err, user) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (!user) {
				workflow.outcome.errors.push('Email address not found.');
				return workflow.emit('response');
			}

			workflow.emit('sendEmail', token, user);
		});
	});

	workflow.on('sendEmail', function(token, user) {
		self.app.utility.sendmail(self, {
			from: self.app.get('smtp-from-name') + ' <' + self.app.get('smtp-from-address') + '>',
			to: user.email,
			subject: 'Reset your ' + self.app.get('project-name') + ' password',
			textPath: 'login/forgot/email-text',
			htmlPath: 'login/forgot/email-html',
			locals: {
				username: user.username,
				resetLink: 'http://' + req.headers.host + '/login/reset/' + token + '/',
				projectName: self.app.get('project-name')
			},
			success: function(message) {
				workflow.emit('response');
			},
			error: function(err) {
				workflow.outcome.errors.push('Error Sending: ' + err);
				workflow.emit('response');
			}
		});
	});

	workflow.emit('validate');
};

module.exports = ForgotController;