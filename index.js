/**
 * Created by leven on 16/8/13.
 */

var kevio  = require('./kevio/kevio');

const app =new kevio({
    basedir: __dirname,
    verbose: false,
    test:true,
    boot: 'mailer|forward',
    resize: true,
    cores:1,
    port:3001,
    env:['development'],
    core: ['mongo', 'redis', 'cache'],
    external: {
        api:[],
        boot: 'i18n|gitversion',
        model: [],
        middle: [],
        lib: [],
        route: []
    }
}).run()

