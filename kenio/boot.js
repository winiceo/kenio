/**
 * Created by leven on 16/8/13.
 */



import path from 'path';

//rewrite promise, bluebird is more faster
global.Promise = require('bluebird');


import './core/kenio';

export default class  {
    constructor(options) {
        kenio.extend(kenio, this.getPath(), options);
        console.log(kenio)
    }

    init() {

    }

    run() {


    }
    getPath(){
        let filepath = process.argv[1];
        let RESOURCE_PATH = path.dirname(filepath);
        let ROOT_PATH = path.dirname(RESOURCE_PATH);
        let APP_PATH = `${ROOT_PATH}${kenio.sep}app`;
        let RUNTIME_PATH = ROOT_PATH + kenio.sep
        return {
            APP_PATH,
            RESOURCE_PATH,
            ROOT_PATH,
            RUNTIME_PATH
        };
    }

}

module.exports = exports.default;