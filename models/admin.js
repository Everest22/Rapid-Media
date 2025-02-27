const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/Rapid-Media")

const adminSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phone: String,
});

module.exports = mongoose.model("admin",adminSchema);

