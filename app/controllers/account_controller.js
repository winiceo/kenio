'use strict';

var locomotive = require('locomotive'),
	Controller = locomotive.Controller;

var AccountController = new Controller();

AccountController.index = function() {
	this.render();
};

module.exports = AccountController;