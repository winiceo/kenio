/**
 * Created by leven on 16/8/14.
 */

  var app = require('./app');
 // new app.Controller()


 var express = require('express')
    , load = require('express-load');

  var app = express();
// load('ccc')
//         .then('./app')
//
//
//     .into(app,1,2);
//
// app.listen(3000)

load('config', {verbose: true}).into(app)

console.log(app.config)
for (var config in app.config[2]) {

 console.log(config)
 console.log(app.config[2][config])
 app.set(config, app.config[2][config]);
}


app.listen(app.get('port'));