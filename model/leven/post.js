/**
 * Created by leven on 16/8/7.
 */
module.exports = function(app) {
    var _query    = app.lib.query;
    var _mongoose = app.core.mongo.mongoose;
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    // schema
    var Schema = {
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        t  : {type: String, required: true, alias: 'title'},
        b  : {type: String, required: true, alias: 'body'},
        ca : {type: Date, default: Date.now, alias: 'created_at'}
    };

    // settings
    Schema.u.settings  = {label: 'User', display: 'email'};
    Schema.t.settings  = {label: 'Title'};
    Schema.b.settings  = {label: 'Body'};

    // load schema
    var PostSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Leven_Post',
        Options: {
            singular : 'Test Post',
            plural   : 'Test Posts',
            columns  : ['users', 'title', 'body'],
            main     : 'title',
            perpage  : 25
        }
    });

    // plugins
    PostSchema.plugin(_query);

    return _mongoose.model('Leven_Post', PostSchema);
};