'use strict';

module.exports = function(done) {
	this.utility = {};
	this.utility.sendmail = require('../../app/utilities/sendmail');
	this.utility.slugify = require('../../app/utilities/slugify');
	this.utility.workflow = require('../../app/utilities/workflow');

	done();
};