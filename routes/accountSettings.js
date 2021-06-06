const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const User = require('../models/User');

router.get('/', (req, res) => {
  if (!(req.session.loggedIn)) return res.redirect("/login");
  res.render('accountSettings', {error: req.session.error})
  req.session.error = null;
});

router.post('/changePassword', async (req, res) => {
  if (!(req.session.loggedIn)) return res.redirect("/");

  let oldPassword = req.body.oldPassword;
  let newPassword = req.body.newPassword;
  let confirmNewPassword = req.body.confirmNewPassword;

  if (newPassword!=confirmNewPassword) {
    req.session.error = {message: "New password and confirm new password must match"};
    return res.redirect("/accountSettings");
  }

  let user = await User.findOne({username: req.session.user.username.toLowerCase()}, {
    username: 1,
    password: 1
  });

  const passwordCorrect = await bcrypt.compare(oldPassword, user.password); //Check password is correct

  if (!passwordCorrect) { //Old password does not match the current users password
    req.session.error = {message: "Incorrect password"};
    return res.redirect('/accountSettings')
  }

  let newPasswordHash = await bcrypt.hash(newPassword, 8); //Generate hash of new password

  req.session.error = {message: "Password changed"};
  req.session.loggedIn = false;
  req.session.user = null;

  user.password = newPasswordHash;
  await user.save(); //Save document with new password

  return res.redirect("/login");
})

module.exports = router;
