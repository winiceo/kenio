'use strict';

var locomotive = require('../../kevio/kevio'),
	Controller = locomotive.Controller;

var PagesController = new Controller();

var eventsData = require('../data/events');
var moment = require('moment');

PagesController.error = function() {
	this.render();
};

PagesController.before('home', function(next) {
	var self = this;

	eventsData.getPassedevents(function(err, events) {
		if (err) {
			return next(err);
		}

		self.moment = moment;
		self.events = events;
		next();
	});
});

PagesController.home = function() {
	this.render();
};

PagesController.index = function() {
	this.render();
};

PagesController.about = function() {
	this.render();
};

PagesController.notFound = function() {
	var self = this;
	var req = self.req;
	var res = self.res;

	res.status(404);
	self.respond({
		'json': function() {
			res.json({
				error: 'Resource not found.'
			});
		},
		'html': function() {
			self.render('http/' + (req.url.indexOf('/admin') === 0 ? 'admin404' : '404'));
		}
	});
};

PagesController.logout = function() {
	var self = this;
	var req = self.req;

	req.logout();
	self.redirect('/');
};

module.exports = PagesController;