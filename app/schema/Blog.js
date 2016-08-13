var mongoose = require("mongoose");

module.exports.init = function () {
    var blogSchema = mongoose.Schema({
      title: {
        type: String,
        required: "{PATH} is required",
        unique: true
      },
      content: { type: String, default: '' },
    });

    mongoose.model("Blog", blogSchema);
};
