
var AppIo = require('./kevio');
Object.assign(AppIo, {

})
//AppIo.plug('schema', {cwd: './',verbose:true})

 var kevio=new AppIo({
	basedir: __dirname,
	name:"kevio",
	verbose: true,
	test:false,
	boot: 'mailer|forward', //frame级
	resize: true,
	core: ['mongo', 'redis', 'cache'],
	external: {
		boot: 'i18n|gitversion|extend', //app级
		model: ['genv'],
		middle: [],
		lib: [],
		route: ['client','api'],
		plug:["genv"]
	}
})



kevio.run(function(app){
	"use strict";

	console.log(app.get("name"))
});
