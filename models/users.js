const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    googleId: {
        type: String
    }
})

module.exports = mongoose.model("User", schema)