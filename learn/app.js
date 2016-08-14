/**
 * Created by leven on 16/8/14.
 */

module.exports = function(app) {


    var site = app.ccc.site;

    app.get('/',
        site.index
    );

};