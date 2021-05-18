const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose')
const User = require('../models/User')

mongoose.connect(process.env.MONGO_DB_URL, {
  useNewUrlParser: true, useUnifiedTopology: true
})

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

  let user = User.findOne({username: req.session.user.username.toLowerCase()})
  let userData = await user.select(
    {
      username: 1,
      password: 1
    });
  console.log(user);
  const passwordCorrect = await bcrypt.compare(oldPassword, userData.password); //Check password is correct
  if (!passwordCorrect) {
    req.session.error = {message: "Incorrect password"};
    return res.redirect('/accountSettings')
  }

  let newPasswordHash = await bcrypt.hash(newPassword, 8);
  console.log(newPasswordHash);
  req.session.error = {message: "Password changed"};
  req.session.loggedIn = false;
  req.session.user = null;

  await User.findByIdAndUpdate(userData._id, {password: newPasswordHash});
  return res.redirect("/login");
})

module.exports = router;
