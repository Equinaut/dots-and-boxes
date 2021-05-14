const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose')
const User = require('../models/User')

mongoose.connect(process.env.MONGO_DB_URL, {
  useNewUrlParser: true, useUnifiedTopology: true
})

router.get('/', (req, res) => {
  if (req.session.loggedIn == true) return res.redirect("/profile");
  res.render('register', {error: req.session.error})
});

router.post('/', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let hashedPassword = await bcrypt.hash(req.body.password, 8);

  let userObject = {
    username: username.toLowerCase(),
    displayName: username,
    password: hashedPassword
  };

  let findUser = await User.findOne({username: username.toLowerCase()});
  if (findUser != null) {
    req.session.error = {message: "User already exists"};
    res.redirect("/register");
  } else {
    await User.create(userObject);
    res.redirect("/login");
  }
});

module.exports = router;
