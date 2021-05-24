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
    required: true
  },
  createdAt: {
    type: Number,
    default: Date.now,
    required: true
  },
  lastOnline: {
    type: Number,
    default: Date.now,
    required: true
  },
  stats: {
    type: Object,
    required: false
  }
}, {
  collection: "Users"
})

module.exports = mongoose.model('Users', userSchema)
