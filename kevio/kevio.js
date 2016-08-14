import Application from './application'
import Controller from './controller'
import bootable from 'bootable'
import load  from 'express-load'

// Boot the application.  The phases registered above will be executed
// sequentially, resulting in a fully initialized server that is listening
// for requests.


class Kevio {
    constructor(options) {

        options = options || {};
        this._opts = options;

        this._boot = {}
        this._app = new Application(options || {});

        this._boot.controllers = require('./boot/controllers');
        this._boot.views = require('./boot/views');
        this._boot.routes = require('./boot/routes');
        this._boot.httpServer = require('./boot/httpserver');
        this._boot.httpServerCluster = require('./boot/httpservercluster');
        this._boot.di = {};
        this._boot.di.routes = require('./boot/di/routes');
        this.init();
    }

    init() {
        this.phas();
    }

    phas() {

        this._app.phase(this._boot.controllers(this._opts.basedir + '/app/controllers'));
        this._app.phase(this._boot.views());

// Add phases to configure environments, run initializers, draw routes, and
// start an HTTP server.  Additional phases can be inserted as needed, which
// is particularly useful if your application handles upgrades from HTTP to
// other protocols such as WebSocket.
        this._app.phase(require('bootable-environment')(this._opts.basedir + '/config/environments'));
        this._app.phase(bootable.initializers(this._opts.basedir + '/config/initializers'));
        this._app.phase(this._boot.routes(this._opts.basedir + '/config/routes'));
        this._app.phase(this._boot.httpServer(3002, '0.0.0.0'));

    }

    run() {
        this._app.boot(function (err) {
            if (err) {
                console.error(err.message);
                console.error(err.stack);
                return process.exit(-1);
            }
        });

    }
}
export default function createApplication(...args) {
    return new Kevio(... args);
}

// Expose all express methods (like express.engine())
Object.assign(createApplication, {
    Controller: Controller
});
