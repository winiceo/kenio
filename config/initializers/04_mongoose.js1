'use strict';

var mongoose = require('mongoose');

module.exports = function(done) {
  //setup mongoose
  this.db = mongoose.createConnection(this.locals.config.mongodb.uri);
  this.db.on('error', console.error.bind(console, 'mongoose connection error: '));
  this.db.once('open', function() {
    //and... we have a data store
  });

  //embeddable docs first
  require('../../app/schema/Note')(this, mongoose);
  require('../../app/schema/Status')(this, mongoose);
  require('../../app/schema/StatusLog')(this, mongoose);
  require('../../app/schema/Category')(this, mongoose);

  //then regular docs
  require('../../app/schema/User')(this, mongoose);
  require('../../app/schema/Admin')(this, mongoose);
  require('../../app/schema/AdminGroup')(this, mongoose);
  require('../../app/schema/Account')(this, mongoose);

  done();
};