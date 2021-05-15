const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const User = require('../models/User')

mongoose.connect(process.env.MONGO_DB_URL, {
  useNewUrlParser: true, useUnifiedTopology: true
})

router.get('/', async (req, res) => {
  if (!(req.session.loggedIn == true && req.session.user.role==3)) return res.redirect("/profile");
  else {
    let notActivatedUsers = await User.find({role: 0}).sort({ createdAt: 'desc' });
    let users = [];
    for (let user of notActivatedUsers) {
      let date = new Date(user.createdAt);
      let dateStringOld = date.toLocaleDateString().split("/");
      let dateString = dateStringOld[1]+"/"+dateStringOld[0]+"/"+dateStringOld[2]; //Get date in UK format
      let hours = date.getHours().toString();
      while (hours.length<2) hours = "0"+hours;
      let minutes = date.getMinutes().toString();
      while (minutes.length<2) minutes = "0"+minutes;
      users.push({
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdOn: dateString,
        createdAt: hours+":"+minutes
      });
    }

    res.render('activateAccounts', {users: users});
  }
});

router.post('/:username', async (req, res) => {
  if (!(req.session.loggedIn == true && req.session.user.role==3)) return res.redirect("/profile");
  else {
    let user = await User.findOne({username: req.params.username});
    if (user==null) return res.redirect("/activate");
    if (user.role!=0) return res.redirect("/activate");
    await User.updateOne({username: req.params.username}, {role: 1});
    return res.redirect("/activate");
  }
});

module.exports = router;
