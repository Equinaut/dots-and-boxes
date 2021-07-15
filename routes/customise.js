const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const User = require('../models/User')

router.get('/', (req, res) => {
  if (req.session.loggedIn == true) {
    res.render('customise', {pattern: req.session.user.pattern});
  } else {
    res.redirect("/login");
  }
});

router.post('/', async (req, res) => {
  if (!(req.session.loggedIn == true)) {
    return res.redirect("/login");
  } else {
    let user = await User.findById(req.session.user._id);

    if (user==null) { return res.redirect("/customise"); }

    let pattern = {
      pattern: req.body.pattern || 1
    }

    if (pattern.pattern == 1) pattern.colour = req.body.colour[0] || "#FF0000";
    if (pattern.pattern == 2) pattern.colour = [req.body.colour[1] || "#00FFFF", req.body.colour[2] || "#00FF00"]

    user.pattern = pattern;
    req.session.user.pattern = pattern;

    await user.save();
    return res.redirect("/profile");
  }
});

module.exports = router;
