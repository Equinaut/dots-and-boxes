const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

router.get('/', (req, res) => {
  let user = req.session.user;
  if (req.session.loggedIn!=true) {
    res.redirect("/login");
    return;
  }
  let date = new Date(user.createdAt);
  let dateStringOld = date.toLocaleDateString().split("/");
  let dateString = dateStringOld[1]+"/"+dateStringOld[0]+"/"+dateStringOld[2]; //Get date in UK format
  res.render('profile', {
    username: user.displayName,
    role: user.role,
    createdAt: dateString
  });
});

router.get('/:username', async (req, res) => {
  let userData = await User.findOne({username: req.params.username.toLowerCase()}).select(
    {
      displayName: 1,
      role: 1,
      createdAt: 1
    });

  if (userData==null) return res.render('otherPlayersProfile');

  let date = new Date(userData.createdAt);
  let dateStringOld = date.toLocaleDateString().split("/");
  let dateString = dateStringOld[1]+"/"+dateStringOld[0]+"/"+dateStringOld[2]; //Get date in UK format

  let stats = await User.findOne({username: req.params.username.toLowerCase()}).select("stats");
  stats = stats.stats;

  if (stats==null) {
    stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      boxes: 0
    }
  }
  stats.wlr = stats.wins / (stats.losses || 1);
  
  let newUser = {
    username: userData.displayName,
    role: userData.role,
    createdAt: dateString
  };
  res.render('otherPlayersProfile', {
    user: newUser,
    stats: stats
  });
});

module.exports = router
