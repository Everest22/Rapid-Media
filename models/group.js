const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/Rapid-Media")

const groupSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    permission: String,
});

module.exports = mongoose.model("group",groupSchema);

