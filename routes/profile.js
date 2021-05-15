const express = require('express');
const router = express.Router();

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

module.exports = router
