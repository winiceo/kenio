'use strict';

var express = require('express'),
  poweredBy = require('connect-powered-by'),
  passport = require('passport'),
 // mongoStore = require('connect-mongo')(express),
  util = require('util');


var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var busboy = require('connect-busboy');
 var logger = require('morgan');
var favicon = require('serve-favicon');
//var errorHandler = require('errorhandler');
var methodOverride = require('method-override');


var config = require('../config');

module.exports = function() {
  // Warn of version mismatch between global "lcm" binary and local installation
  // of Locomotive.
  // if (this.version !== require('locomotive').version) {
  //   console.warn(util.format('version mismatch between local (%s) and global (%s) Locomotive module', require('locomotive').version, this.version));
  // }

  // Configure application settings.  Consult the Express API Reference for a
  // list of the available [settings](http://expressjs.com/api.html#app-settings).
  // this.set('views', __dirname + '/../../app/views');
  // this.set('view engine', 'jade');
  this.set('project-name', config.projectName);
  this.set('company-name', config.companyName);
  this.set('system-email', config.systemEmail);
  this.set('crypto-key', config.cryptoKey);
  this.set('require-account-verification', config.requireAccountVerification);

  //smtp settings
  this.set('smtp-from-name', config.smtp.from.name);
  this.set('smtp-from-address', config.smtp.from.address);
  this.set('smtp-credentials', config.smtp.credentials);

  //twitter settings
  this.set('twitter-oauth-key', config.oauth.twitter.key);
  this.set('twitter-oauth-secret', config.oauth.twitter.secret);

  //github settings
  this.set('github-oauth-key', config.oauth.github.key);
  this.set('github-oauth-secret', config.oauth.github.secret);

  //facebook settings
  this.set('facebook-oauth-key', config.oauth.facebook.key);
  this.set('facebook-oauth-secret', config.oauth.facebook.secret);

  // Register JADE as a template engine.
  //this.engine('jade', require('jade').__express);

  this.datastore(require('locomotive-mongoose'));
  // this.sessionStore = new mongoStore({
  //   url: config.mongodb.uri
  // });

  // Override default template extension.  By default, Locomotive finds
  // templates using the `name.format.engine` convention, for example
  // `index.html.ejs`  For some template engines, such as Jade, that find
  // layouts using a `layout.engine` notation, this results in mixed conventions
  // that can cuase confusion.  If this occurs, you can map an explicit
  // extension to a format.
  // this.format('html', {
  //   extension: '.jade'
  // });

  // Register formats for content negotiation.  Using content negotiation,
  // different formats can be served as needed by different clients.  For
  // example, a browser is sent an HTML response, while an API client is sent a
  // JSON or XML response.
  /* this.format('xml', { engine: 'xmlb' }); */

  // Use middleware.  Standard [Connect](http://www.senchalabs.org/connect/)
  // middleware is built-in, with additional [third-party](https://github.com/senchalabs/connect/wiki)
  // middleware available as separate modules.
  this.use(poweredBy('Locomotive'));
  //this.use(express.logger());
  this.use(favicon(__dirname + '/../../public/favicon.ico'));

 // this.use(express.favicon(__dirname + '/../../public/favicon.ico'));
  this.use(express.static(__dirname + '/../../public'));


  this.use(cookieParser());
  this.use(bodyParser.json());
  this.use(bodyParser.urlencoded({
    extended: true
  }));
  this.use(busboy({
    immediate: false
  }));

  this.use(session({
    secret: 'magic unicorns',
    resave: true,
    saveUninitialized: true,

    store: this.sessionStore
  }));
  this.use(passport.initialize());
  this.use(passport.session());
  this.use(methodOverride('X-HTTP-Method-Override'));

  //this.use(express.methodOverride());


  this.use(passport.initialize());
  this.use(passport.session());








  //global locals
  this.locals.projectName = this.get('project-name');
  this.locals.copyrightYear = new Date().getFullYear();
  this.locals.copyrightName = this.get('company-name');
  this.locals.cacheBreaker = 'br34k-01';

  //Store config object as well
  this.locals.config = config;

  //error handler
  this.use(function(err, req, res, next) {
    res.status(500);
    if (req.xhr) {
      res.send({
        error: 'Something went wrong.'
      });
    } else {
      res.render('http/500');
    }
    console.log(err.stack);
  });

  this.use(function(req, res, next) {
    if (req.session.error) {
      var msg = req.session.error;
      req.session.error = undefined;
      self.locals.errorMessage = msg;
    } else {
      self.locals.errorMessage = undefined;
    }

    next();
  });
  this.use(function(req, res, next) {
    // maybe use res.locals instead in order not to have the variable overriden
    if (req.user) {
      self.locals.currentUser = req.user;
    } else {
      self.locals.currentUser = undefined;
    }

    next();
  });




  var self = this;
  if (this.version !== require('locomotive').version) {
    console.warn(util.format('version mismatch between local (%s) and global (%s) Locomotive module', require('locomotive').version, this.version));
  }


 // this.use(this.router);


  if ('development' === this.env) {
    this.use(logger('dev'));
   // this.use(errorHandler());
  }
};