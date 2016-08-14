/**
 * Created by leven on 16/8/14.
 */
exports.index = function(req, res, next) {
    console.log(req.app)

    res.send('Hello world!');
};