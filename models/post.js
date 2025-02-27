const mongoose = require("mongoose");
const user = require("./user");
const contact = require("./contact");

mongoose.connect("mongodb://localhost:27017/Rapid-Media")

const postSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    title: String,
    visibility: String,
    description: String,
    
},{ timestamps: true });

module.exports = mongoose.model("post",postSchema);

