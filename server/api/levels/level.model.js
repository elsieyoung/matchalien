'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var LevelSchema = new Schema({
  level: Number,
  model: String,
  url: String
});

module.exports = mongoose.model('Level', LevelSchema);
