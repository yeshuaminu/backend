const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dishes: [{
        quantity: {
            type: Number,
            required: true
        },
        item: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: "Dish"
        }
    }],
    amount: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zipCode: {
        type: String,
        required: true
    },

    charge: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("Order", schema)