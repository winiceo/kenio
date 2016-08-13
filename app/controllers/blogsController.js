var Blog = require('../models/blog');
 
var Controller = require('locomotive').Controller;
var blogsController = new Controller();

var isAuthenticated = require('../utilities/auth').isAuthenticated;

var async = require('async');
var moment = require('moment');
var _ = require('underscore');

blogsController.index = function() {
    var self = this;
    Blog.get(function (err, blogs) {
        if (err) {
            return self.render('pages/error');
        }
        console.log(blogs)

        self.blogs = blogs;
        self.render();
    });
};


blogsController.getCreateEvent = function() {
    this.render();
};
//
// blogsController.before('new', function(next) {
//     isAuthenticated(this.req, this.res, next);
// });
//
// blogsController.before('new', function(next) {
//     var self = this;
//     async.parallel([function(callback) {
//         initiativesData.get(function(err, initiatives) {
//             if (err) {
//                 return callback(err);
//             }
//
//             self.initiatives = _.map(initiatives, function(initiative) {
//                 return initiative.name;
//             });
//
//             callback();
//         });
//     }, function(callback) {
//         categoriesData.get(function(err, categories) {
//             if (err) {
//                 return callback(err);
//             }
//
//             self.categories = _.map(categories, function(category) {
//                 return category.name;
//             });
//
//             callback();
//         });
//     }, function(callback) {
//         seasonsData.get(function(err, seasons) {
//             if (err) {
//                 return callback(err);
//             }
//
//             self.seasons = _.map(seasons, function(season) {
//                 return season.name;
//             });
//
//             callback();
//         });
//     }], function(err) {
//         if (err) {
//             return next(err);
//         }
//
//         next();
//     });
// });
//
// blogsController.new = function() {
//     this.render();
// };
//
// blogsController.before('create', function(next) {
//     var self = this;
//     categoriesData.getByName(this.param('category'), function(err, category) {
//         if (err) {
//             console.log(err);
//         }
//
//         console.log(category);
//
//         self.category = category;
//         next();
//     });
// });

blogsController.create = function() {
    var self=this;
   // var username = this.req.user.username;
    var data = {};
    data.title = this.param('title');
    data.content = this.param('content');
    console.log(data)
    Blog.create(data,   function (err ) {
        if (err) {
            console.log('Error when creating '+err);
            self.render('pages/error');
            return;
        }

        self.redirect(self.blogsPath());
    });
};

// blogsController.before('show', function(next) {
//     isAuthenticated(this.req, this.res, next);
// });

blogsController.show = function() {
    var id = this.param('id');
    var self = this;

    Blog.getDetails(id, function(err, blog) {
        if (err) {
            console.log('Failed to get event: ' + err);
            return;
        }

        self.blog = {};
        self.blog.title = blog.title;
        self.blog.content = blog.content;

        console.log('self event', JSON.stringify(self.blog));
        self.render();
    });
};

blogsController.after('*', function(err, req, res, next) {
    if (err) {
        this.render('pages/error');
    }
});

module.exports = blogsController;
