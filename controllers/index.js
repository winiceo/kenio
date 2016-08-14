'use strict';

var IndexModel = require('../models/index');


module.exports = function (router) {

    var model = new IndexModel();
    console.log(this)
    router.get('/', function (req, res) {
        
        
        res.render('index', model);
        
        
    });

};
