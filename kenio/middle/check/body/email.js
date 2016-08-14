function CheckBodyEmail(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _email  = req.body.email;
    var _middle = 'middle.check.body.email';
    
    if( ! _email || _email == '' ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['email not found']
        }));
    }

    req.body.email = _email.toLowerCase();

    next();

}

module.exports = function(app) {
    return CheckBodyEmail;
};