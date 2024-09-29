require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const restaurants = require("./models/restaurants")
const dishes = require("./models/dishes")
const orders = require("./models/orders")

const { MONGO_URI, STRIPE_KEY } = process.env

const stripe = require("stripe")(
    STRIPE_KEY
);

const app = express()
app.use(cors())
app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Hello World!")
})

app.get("/api/restaurants", async (req, res) => {
    const allRestaurants = await restaurants.find()
    res.json(allRestaurants)
})

app.get("/api/restaurants/:restaurantId/dishes", async (req, res) => {
    const { restaurantId } = req.params
    const allDishes = await dishes.find({
        restaurant: restaurantId
    })
    res.json(allDishes)
})

app.post("/api/orders", async (req, res) => {
    console.log(req.body)
    const {amount, token, ...orderData} = req.body
    const stripeAmount = amount * 100;
    console.log(token)
    const charge = await stripe.charges.create({
        // Transform cents to dollars.
        amount: stripeAmount,
        currency: "usd",
        // description: `Order ${new Date()} by ${ctx.state.user._id}`,
        description: `Order ${new Date()}`,
        source: token
      });
  const newOrder = await orders.create({
    ...orderData,
    amount:stripeAmount,
    charge:charge.id
  })
  res.json(newOrder)
})

app.listen(8080, () => {
    console.info("listening on port 8080")
})
mongoose.connect(MONGO_URI)
    .then(() => {
        console.info("connected to database")
    })
