'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var AdminGroupsController = new Controller();

AdminGroupsController.index = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req.query.name = req.query.name ? req.query.name : '';
	req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
	req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
	req.query.sort = req.query.sort ? req.query.sort : '_id';

	var filters = {};
	if (req.query.name) {
		filters.name = new RegExp('^.*?' + req.query.name + '.*$', 'i');
	}

	self.app.db.models.AdminGroup.pagedFind({
		filters: filters,
		keys: 'name',
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
				res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				res.json(results);
			},
			'html': function() {
				self.data = {
					results: escape(JSON.stringify(results))
				};
				self.render();
			}
		});
	});
};

AdminGroupsController.create = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not create admin groups.');
			return workflow.emit('response');
		}

		if (!req.body.name) {
			workflow.outcome.errors.push('Please enter a name.');
			return workflow.emit('response');
		}

		workflow.emit('duplicateAdminGroupCheck');
	});

	workflow.on('duplicateAdminGroupCheck', function() {
		self.app.db.models.AdminGroup.findById(self.app.utility.slugify(req.body.name)).exec(function(err, adminGroup) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (adminGroup) {
				workflow.outcome.errors.push('That group already exists.');
				return workflow.emit('response');
			}

			workflow.emit('createAdminGroup');
		});
	});

	workflow.on('createAdminGroup', function() {
		var fieldsToSet = {
			_id: self.app.utility.slugify(req.body.name),
			name: req.body.name
		};

		self.app.db.models.AdminGroup.create(fieldsToSet, function(err, adminGroup) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.record = adminGroup;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AdminGroupsController.show = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	self.app.db.models.AdminGroup.findById(req.params.id).exec(function(err, adminGroup) {
		if (err) {
			return next(err);
		}

		self.respond({
			'json': function() {
				res.json(adminGroup);
			},
			'html': function() {
				self.data = {
					record: escape(JSON.stringify(adminGroup))
				};
				self.render('details');
			}
		});
	});
};

AdminGroupsController.update = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not update admin groups.');
			return workflow.emit('response');
		}

		if (!req.body.name) {
			workflow.outcome.errfor.name = 'required';
			return workflow.emit('response');
		}

		workflow.emit('patchAdminGroup');
	});

	workflow.on('patchAdminGroup', function() {
		var fieldsToSet = {
			name: req.body.name
		};

		self.app.db.models.AdminGroup.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, adminGroup) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.adminGroup = adminGroup;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AdminGroupsController.destroy = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not delete admin groups.');
			return workflow.emit('response');
		}

		workflow.emit('deleteAdminGroup');
	});

	workflow.on('deleteAdminGroup', function(err) {
		self.app.db.models.AdminGroup.findByIdAndRemove(req.params.id, function(err, adminGroup) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

AdminGroupsController.permissions = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	
	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not change the permissions of admin groups.');
			return workflow.emit('response');
		}

		if (!req.body.permissions) {
			workflow.outcome.errfor.permissions = 'required';
			return workflow.emit('response');
		}

		workflow.emit('patchAdminGroup');
	});

	workflow.on('patchAdminGroup', function() {
		var fieldsToSet = {
			permissions: req.body.permissions
		};

		self.app.db.models.AdminGroup.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, adminGroup) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.adminGroup = adminGroup;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

module.exports = AdminGroupsController;