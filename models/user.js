const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/Rapid-Media")

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    permission: String,
    password: String,
    phone: String,
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
});

module.exports = mongoose.model("user",userSchema);

