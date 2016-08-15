
const rest = require('feathers-rest');

module.exports = function(app) {

    var _log = app.system.logger;



    try {

        app.configure(rest());

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




