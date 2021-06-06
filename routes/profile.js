const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');


async function findFriends(userId) { //Finds list of all friends, including pending and requested of a specific user
  let user = await User.findById(userId, {friends: 1});
  if (user==null || user.friends == null) return null;
  let friendIdsRequested = [];
  let friendIdsPending = []
  let friendIds = [];

  for (let friend of user.friends) {
    if (friend.status == 0) friendIdsRequested.push(friend.id);
    if (friend.status == 1) friendIdsPending.push(friend.id);
    if (friend.status == 2) friendIds.push(friend.id);
  }

  let finalFriendsRequested = await User.find({ '_id': { $in: friendIdsRequested } }, {_id: 0, username: 1, displayName: 1, role: 1});
  let finalFriendsPending   = await User.find({ '_id': { $in: friendIdsPending } },   {_id: 0, username: 1, displayName: 1, role: 1});
  let finalFriends          = await User.find({ '_id': { $in: friendIds } },          {_id: 0, username: 1, displayName: 1, role: 1});

  return { //Return all 3 arrays
    requested: finalFriendsRequested,
    pending: finalFriendsPending,
    friends: finalFriends
  };
}


router.get('/', async (req, res) => {
  let user = req.session.user;
  if (req.session.loggedIn!=true) {
    return res.redirect("/login");
  }

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

  let foundFriends = await findFriends(req.session.user._id);

  res.render('profile', {
    username: user.displayName,
    role: user.role,
    createdAt: new Date(user.createdAt).toDateString(),
    stats: stats,
    pending: foundFriends.pending,
    requested: foundFriends.requested,
    friends: foundFriends.friends
  });
});


router.get('/:username', async (req, res) => {
  let userData = await User.findOne({username: req.params.username.toLowerCase()}).select(
    {
      displayName: 1,
      role: 1,
      createdAt: 1,
      lastOnline: 1,
      friends: 1
    });

  if (userData==null) return res.render('otherPlayersProfile');

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

  let friendStatus = null;
  let friendsSince = null;

  if (req.session.loggedIn) {
    friendStatus = -1;
    if (userData._id.equals(req.session.user._id)) {
      friendStatus = -2;
    } else {
      for (let friend of userData.friends) {
        if (friend.id.equals(req.session.user._id)) {
          friendStatus = friend.status;
          friendsSince = new Date(friend.friendsSince).toDateString();
          break;
        }
      }
    }
  }

  let newUser = {
    username: userData.displayName,
    role: userData.role,
    createdAt: new Date(userData.createdAt).toDateString(),
    lastOnline: new Date(userData.lastOnline).toDateString(),
    friendStatus: friendStatus,
    friendsSince: friendsSince
  };

  let role = 0;
  if (req.session.loggedIn) role = req.session.user.role || 0;

  res.render('otherPlayersProfile', {
    user: newUser,
    stats: stats,
    role: role
  });
});

router.post('/:username/friend', async (req, res) => { //Adds specified user as a friend
  if (!(req.session.loggedIn)) return res.redirect("/login");

  let otherPlayer = await User.findOne({username: req.params.username.toLowerCase()}, { //Fetch player object from database of player that is being friended
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  let thisPlayer = await User.findById(req.session.user._id, { //Fetch own player object
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  if (otherPlayer == null || thisPlayer == null) return res.redirect("/profile/"+req.params.username); //If either player isn't found, then cancel action
  if (otherPlayer._id.equals(thisPlayer._id)) return res.redirect("/profile/"+req.params.username); //Stop if trying to friend yourself

  for (let friend of thisPlayer.friends) {
    if (friend.id.equals(otherPlayer._id)) return res.redirect("/profile/"+req.params.username); //If already friends then cancel
  }

  //Create objects that will be appended to friends array in database
  let friendObject1 = {
    status: 0,
    id: otherPlayer._id
  };

  let friendObject2 = {
    status: 1,
    id: thisPlayer._id
  };

  if (thisPlayer.friends == null) { thisPlayer.friends = [friendObject1]; } //Add friend object to this player
  else { thisPlayer.friends.push(friendObject1); }

  if (otherPlayer.friends == null) { otherPlayer.friends = [friendObject2]; } //Add friend object to other player
  else { otherPlayer.friends.push(friendObject2); }


  await thisPlayer.save();
  await otherPlayer.save();
  res.redirect("/profile/"+req.params.username);
});

router.post("/:username/acceptFriend", async (req, res) => {
  if (!(req.session.loggedIn)) return res.redirect("/login");

  let otherPlayer = await User.findOne({username: req.params.username.toLowerCase()}, { //Fetch player object from database of player that is being friended
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  let thisPlayer = await User.findById(req.session.user._id, { //Fetch own player object
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  if (otherPlayer == null || thisPlayer == null) {
    if (req.body.pageViewedOn=="otherProfile") return res.redirect("/profile/"+req.params.username);
    return res.redirect("/profile/"+req.params.username); //If either player isn't found, then cancel action
  }

  for (let friend of thisPlayer.friends) {
    if (friend.id.equals(otherPlayer._id)) {
      if (friend.status == 1) {
        friend.status = 2;
        friend.friendsSince = Date.now();
        for (let friend2 of otherPlayer.friends) {
          if (friend2.id.equals(thisPlayer._id)) {
            friend2.status = 2;
            friend2.friendsSince = Date.now();
            break;
          }
        }
        await thisPlayer.save();
        await otherPlayer.save();
        if (req.body.pageViewedOn=="otherProfile") return res.redirect("/profile/"+req.params.username);
        return res.redirect("/profile/");
      }
    }
  }
  if (req.body.pageViewedOn=="otherProfile") return res.redirect("/profile/"+req.params.username);
  return res.redirect("/profile/");
});

router.post('/:username/deleteFriend', async (req, res) => { //Adds specified user as a friend
  if (!(req.session.loggedIn)) return res.redirect("/login");

  let otherPlayer = await User.findOne({username: req.params.username.toLowerCase()}, { //Fetch player object from database of player that is being friended
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  let thisPlayer = await User.findById(req.session.user._id, { //Fetch own player object
    _id: 1,
    username: 1,
    displayName: 1,
    role: 1,
    friends: 1
  });

  if (otherPlayer == null || thisPlayer == null) {
    if (req.body.pageViewedOn=="otherProfile") return res.redirect("/profile/"+req.params.username);
    return res.redirect("/profile/"); //If either player isn't found, then cancel action
  }

  for (let i=0; i<otherPlayer.friends.length; i++) {
    if (otherPlayer.friends[i].id.equals(thisPlayer._id)) {
      otherPlayer.friends.splice(i, 1);
      break;
    }
  }


  for (let i=0; i<thisPlayer.friends.length; i++) {
    if (thisPlayer.friends[i].id.equals(otherPlayer._id)) {
      thisPlayer.friends.splice(i, 1);
      break;
    }
  }


  await thisPlayer.save();
  await otherPlayer.save();
  if (req.body.pageViewedOn=="otherProfile") return res.redirect("/profile/"+req.params.username);
  return res.redirect("/profile/");
});


router.post('/:username/setRole', async (req, res) => { //Backend of form on profile page, that allows admins to set peoples roles
  if (!(req.session.loggedIn == true && req.session.user.role==3)) {
    res.redirect("/profile/"+req.params.username);
    return;
  }
  let user = await User.findOne({username: req.params.username.toLowerCase()}, {username: 1, role: 1});
  if (user==null || user.role==3) { return res.redirect("/profile/"+req.params.username); }

  user.role = req.body.role || 0;
  await user.save();
  return res.redirect("/profile/"+req.params.username);
});

router.post('/:username/clearStats', async (req, res) => { //Backend of form on profile page, that allows admins to clear peoples stats
  if (!(req.session.loggedIn == true && req.session.user.role==3)) {
    res.redirect("/profile/"+req.params.username);
    return;
  }
  let user = await User.findOne({username: req.params.username.toLowerCase()}, {username: 1, stats: 1});
  if (user==null) {return res.redirect("/profile/"+req.params.username); }

  user.stats = {};
  await user.save();
  return res.redirect("/profile/"+req.params.username);
});

module.exports = router
