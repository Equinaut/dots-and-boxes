const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose')
const User = require('../models/User')

router.get('/', (req, res) => {
  if (req.session.loggedIn == true) {
    res.redirect("/profile");
    return;
  }
  res.render('register', {error: req.session.error})
  req.session.error = null;
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
