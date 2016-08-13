'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var StatusesController = new Controller();

StatusesController.index = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	req.query.pivot = req.query.pivot ? req.query.pivot : '';
	req.query.name = req.query.name ? req.query.name : '';
	req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
	req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
	req.query.sort = req.query.sort ? req.query.sort : '_id';

	var filters = {};
	if (req.query.pivot) {
		filters.pivot = new RegExp('^.*?' + req.query.pivot + '.*$', 'i');
	}

	if (req.query.name) {
		filters.name = new RegExp('^.*?' + req.query.name + '.*$', 'i');
	}

	self.app.db.models.Status.pagedFind({
		filters: filters,
		keys: 'pivot name',
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

StatusesController.create = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not create statuses.');
			return workflow.emit('response');
		}

		if (!req.body.pivot) {
			workflow.outcome.errors.push('A name is required.');
			return workflow.emit('response');
		}

		if (!req.body.name) {
			workflow.outcome.errors.push('A name is required.');
			return workflow.emit('response');
		}

		workflow.emit('duplicateStatusCheck');
	});

	workflow.on('duplicateStatusCheck', function() {
		self.app.db.models.Status.findById(self.app.utility.slugify(req.body.pivot + ' ' + req.body.name)).exec(function(err, status) {
			if (err) {
				return workflow.emit('exception', err);
			}

			if (status) {
				workflow.outcome.errors.push('That status+pivot is already taken.');
				return workflow.emit('response');
			}

			workflow.emit('createStatus');
		});
	});

	workflow.on('createStatus', function() {
		var fieldsToSet = {
			_id: self.app.utility.slugify(req.body.pivot + ' ' + req.body.name),
			pivot: req.body.pivot,
			name: req.body.name
		};

		self.app.db.models.Status.create(fieldsToSet, function(err, status) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.record = status;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

StatusesController.show = function() {
	var self = this;
	var req = self.req;
	var res = self.res;
	var next = self.next;

	self.app.db.models.Status.findById(req.params.id).exec(function(err, status) {
		if (err) {
			return next(err);
		}

		self.respond({
			'json': function() {
				res.json(status);
			},
			'html': function() {
				self.data = {
					record: escape(JSON.stringify(status))
				};
				self.render('details');
			}
		});
	});
};

StatusesController.update = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not update statuses.');
			return workflow.emit('response');
		}

		if (!req.body.pivot) {
			workflow.outcome.errfor.pivot = 'pivot';
			return workflow.emit('response');
		}

		if (!req.body.name) {
			workflow.outcome.errfor.name = 'required';
			return workflow.emit('response');
		}

		workflow.emit('patchStatus');
	});

	workflow.on('patchStatus', function() {
		var fieldsToSet = {
			pivot: req.body.pivot,
			name: req.body.name
		};

		self.app.db.models.Status.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, status) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.outcome.status = status;
			return workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

StatusesController.destroy = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	var workflow = self.app.utility.workflow(req, res);

	workflow.on('validate', function() {
		if (!req.user.roles.admin.isMemberOf('root')) {
			workflow.outcome.errors.push('You may not delete statuses.');
			return workflow.emit('response');
		}

		workflow.emit('deleteStatus');
	});

	workflow.on('deleteStatus', function(err) {
		self.app.db.models.Status.findByIdAndRemove(req.params.id, function(err, status) {
			if (err) {
				return workflow.emit('exception', err);
			}

			workflow.emit('response');
		});
	});

	workflow.emit('validate');
};

module.exports = StatusesController;