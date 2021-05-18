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
  res.render('login', {error: req.session.error})
});

router.post('/', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let user = await User.findOne({username: username.toLowerCase()}).select(
    {
      username: 1,
      displayName: 1,
      password: 1,
      role: 1,
      createdAt: 1
    });

  if (user==null) { //Find if user exists
    req.session.error = {message: "User doesn't exist"};
    res.redirect('/login')
    return;
  }
  const passwordCorrect = await bcrypt.compare(password, user.password); //Check password is correct
  if (!passwordCorrect) {
    req.session.error = {message: "Incorrect password"};
    res.redirect('/login')
    return;
  }

  let userObject = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt
  };

  req.session.user = userObject;
  req.session.loggedIn = true;
  res.redirect('/profile');
});

module.exports = router
