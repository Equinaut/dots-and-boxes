const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

router.get('/', async (req, res) => {
  let user = req.session.user;
  if (req.session.loggedIn!=true) {
    res.redirect("/login");
    return;
  }
  let date = new Date(user.createdAt);
  let dateStringOld = date.toLocaleDateString().split("/");
  let dateString = dateStringOld[1]+"/"+dateStringOld[0]+"/"+dateStringOld[2]; //Get date in UK format

  let stats = await User.findOne({username: req.session.user.username.toLowerCase()}).select("stats");
  stats = stats.stats;

  if (stats==null) {
    stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      boxes: 0
    }
  }
  stats.gamesPlayed = Number.parseInt(stats.wins || 0) + Number.parseInt(stats.losses || 0) + Number.parseInt(stats.draws || 0);
  stats.winPercentage = Math.round(100*((stats.wins / stats.gamesPlayed) || 0));

  res.render('profile', {
    username: user.displayName,
    role: user.role,
    createdAt: dateString,
    stats: stats
  });
});

router.get('/:username', async (req, res) => {
  let userData = await User.findOne({username: req.params.username.toLowerCase()}).select(
    {
      displayName: 1,
      role: 1,
      createdAt: 1,
      lastOnline: 1
    });

  if (userData==null) return res.render('otherPlayersProfile');

  let date = new Date(userData.createdAt);
  let dateStringOld = date.toLocaleDateString().split("/");
  let dateString = dateStringOld[1]+"/"+dateStringOld[0]+"/"+dateStringOld[2]; //Get date in UK format

  let date2 = new Date(userData.lastOnline);
  let dateStringOld2 = date2.toLocaleDateString().split("/");
  let dateString2 = dateStringOld2[1]+"/"+dateStringOld2[0]+"/"+dateStringOld2[2]; //Get date in UK format

  let stats = await User.findOne({username: req.params.username.toLowerCase()}).select("stats");
  stats = stats.stats;

  if (stats==null) {
    stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      boxes: 0
    }
  }
  stats.gamesPlayed = Number.parseInt(stats.wins || 0) + Number.parseInt(stats.losses || 0) + Number.parseInt(stats.draws || 0);
  stats.winPercentage = Math.round(100*((stats.wins / stats.gamesPlayed) || 0));

  let newUser = {
    username: userData.displayName,
    role: userData.role,
    createdAt: dateString,
    lastOnline: dateString2
  };
  let role = 0;
  if (req.session.loggedIn) role = req.session.user.role || 0;

  res.render('otherPlayersProfile', {
    user: newUser,
    stats: stats,
    role: role
  });
});

router.post('/:username/setRole', async (req, res) => { //Backend of form on profile page, that allows admins to set peoples roles
  if (!(req.session.loggedIn == true && req.session.user.role==3)) {
    res.redirect("/profile/"+req.params.username);
    return;
  }
  let user = await User.findOne({username: req.params.username.toLowerCase()});
  if (user==null) {
    res.redirect("/profile/"+req.params.username);
    return;
  }
  await User.updateOne({username: req.params.username.toLowerCase()}, {role: req.body.role || 0});
  res.redirect("/profile/"+req.params.username);
  return
});

module.exports = router
