require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const session = require('express-session')
const google = require("googleapis")
const crypto = require("crypto")
const restaurants = require("./models/restaurants")
const dishes = require("./models/dishes")
const orders = require("./models/orders")
const users = require("./models/users")
const { web } = require("./client_secret.json")
const tickets = require("./models/tickets")
const oauth2Client = new google.Auth.OAuth2Client(
    web.client_id,
    web.client_secret,
    web.redirect_uris[process.env.NODE_ENV === "production" ? 0 : 1]
);

const { MONGO_URI, STRIPE_KEY, PORT = 8080 } = process.env

const stripe = require("stripe")(
    STRIPE_KEY
);

const app = express()
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
    secret: "restauranteur - restaurant connossieur",
    saveUninitialized: true,
    resave: true
}))

app.get("/", (req, res) => {
    res.send(req.session.userId)
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
    if (!req.session.userId) {
        res.status(403).json({
            message: "Log In to Complete Order"
        })
        return
    }
    const { amount, token, ...orderData } = req.body
    const stripeAmount = amount * 100;

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
        amount: stripeAmount,
        charge: charge.id,
        customer: req.session.userId
    })
    res.json(newOrder)
})

app.post("/api/users/register", async (req, res) => {
    const { email, ...userData } = req.body
    const existingUser = await users.findOne({ email: email })
    if (existingUser) {
        res.status(400).json({
            message: "Email already registered"
        })
        return;
    }
    const newUser = await users.create({
        ...userData,
        email: email
    })
    res.sendStatus(201)
})

app.get("/api/users/me", attemptOAuth2Session, async (req, res) => {
    console.log(req.session)
    if (!req.session.userId) {
        res.status(403).json({ message: "Unauthorized" })
        return
    }

    const foundUser = await users.findById(req.session.userId)
    if (!foundUser) {
        res.status(403).json({ message: "Unauthorized" })
        return
    }

    res.json({
        name: foundUser.name
    })
})

app.get("/api/users/logout", async (req, res) => {
    req.session.userId = undefined
    res.sendStatus(200)
})

app.post("/api/users/login", async (req, res) => {
    console.log(req.body)
    const { email, password } = req.body
    const existingUser = await users.findOne({ email: email })
    if (!existingUser) {
        res.status(400).json({
            message: "User Not Found"
        })
        return;
    }
    if (existingUser.password !== password) {
        res.status(400).json({
            message: "Password Invalid"
        })
        return;
    }
    req.session.userId = existingUser._id
    res.sendStatus(200)
})

app.get("/api/users/oauth2/start", async (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/userinfo.profile"],
        include_granted_scopes: true,
        state: state,
    });
    res.json({
        authorizationUrl
    })
})

async function attemptOAuth2Session(req, res, next) {
    const { code } = req.query
    if (!code) {
        next()
        return
    }
    try {
        const { tokens } = await oauth2Client.getToken(code)
        const userClient = new google.Auth.OAuth2Client(
            web.client_id,
            web.client_secret,
            web.redirect_uris[process.env.NODE_ENV === "production" ? 1 : 0]
        );
        userClient.setCredentials(tokens)

        const oauth2 = new google.oauth2_v2.Oauth2({
            auth: userClient
        })
        const userinfo = await oauth2.userinfo.get()
        console.log(userinfo.data)
        const { id, name } = userinfo.data
        const existingUser = await users.findOne({ googleId: id })
        if (existingUser) {
            req.session.userId = existingUser._id
        } else {
            const newUser = await users.create({
                name: name,
                googleId: id
            })
            req.session.userId = newUser._id
        }
    } catch (error) { }
    next()
}

app.post("/api/tickets", async (req, res) => {
    const newTicket = await tickets.create(req.body)
    res.json(newTicket)
})

app.listen(PORT, () => {
    console.info("listening on port " + PORT)
})
mongoose.connect(MONGO_URI)
    .then(() => {
        console.info("connected to database")
    })
