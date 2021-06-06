const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: Number,
    default: 0,
    enum: [
      0, //Unactivated account
      1, //Default user
      2, //Moderator
      3, //Admin
    ],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastOnline: {
    type: Date,
    default: Date.now,
    required: true
  },
  stats: {
    type: Object
  },
  friends: [
    {
      id: mongoose.Schema.Types.ObjectId,
      friendedOn: {
        type: Date,
        default: Date.now,
        required: true
      },
      friendsSince: {
        type: Date,
        required: false
      },
      status: {
        type: Number,
        enum: [
          0, //Requested
          1, //Pending acceptance
          2, //Frinds
        ]
      }
    }
  ]
}, {
  collection: "Users",
  strict: false
})

module.exports = mongoose.model('Users', userSchema)
