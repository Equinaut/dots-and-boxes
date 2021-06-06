const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose')
const User = require('../models/User')

router.get('/', (req, res) => {
  if (req.session.loggedIn == true) {
    return res.redirect("/profile");
  }
  res.render('login', {error: req.session.error})
  req.session.error = null;
});

router.post('/', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let user = await User.findOne(
    {
      username: username.toLowerCase()
    }, {
      username: 1,
      displayName: 1,
      password: 1,
      role: 1,
      createdAt: 1
    });

  if (user==null) { //Find if user exists
    req.session.error = {message: "User doesn't exist"};
    return res.redirect('/login')
  }

  const passwordCorrect = await bcrypt.compare(password, user.password); //Check password is correct
  if (!passwordCorrect) {
    req.session.error = {message: "Incorrect password"};
    return res.redirect('/login');
  }

  let userObject = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
      _id: user._id
  };

  user.lastOnline = Date.now() || 0; //Update lastOnline field
  await user.save();

  req.session.user = userObject;
  req.session.loggedIn = true;
  res.redirect('/profile');
});

module.exports = router
