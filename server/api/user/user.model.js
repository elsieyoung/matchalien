'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: String,
  email: { type: String, lowercase: true },
  password: String,
  overallScore: Number,
  seenTut: Boolean,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
