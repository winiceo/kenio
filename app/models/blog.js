var Blog = require('mongoose').model('Blog');
var async = require('async');

module.exports = {
    create: function(blog, callback) {
        Blog.create(blog, callback);
    },
    get: function(callback) {
        Blog.find({}).select('title').lean(true).exec(callback);
    },
    getDetails: function(id, callback) {
        Blog.findOne({
                _id: id
            })
            .lean(true)
            .exec(callback);
    },
    seedBlogs: function(callback) {
        Blog.find({}).exec(function(err, collection) {
            if (err) {
                console.log('Cannot find initiatives: ' + err);
                return;
            }

            if (collection.length === 0) {
                async.parallel([
                    function(callback) {
                        Blog.create({
                            title: "Software Academy"
                        }, callback);
                    },
                    function(callback) {
                        Blog.create({
                            title: "Algo Academy"
                        }, callback);
                    }

                ], function(err, results) {
                    if (err) {
                        return callback(err);
                    }

                    console.log("Initiatives added to the database.");
                    callback(null, results);
                });
            } else {
                callback();
            }
        });
    }
};
