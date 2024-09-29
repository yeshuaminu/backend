const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    restaurant:{
        type: mongoose.Types.ObjectId,
        required: true,
        ref:"Restaurant"
    }
})

module.exports = mongoose.model("Dish", schema)