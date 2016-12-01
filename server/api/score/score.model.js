'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ScoreSchema = new Schema({
  createdBy: String, //username
  level: Number,
  initialScore: Number,
  targetScore: Number,
  score: Number,
  solution: {
    type: 'json'
  },
  duration: Number,
  seed: String,
  type: String,
  actions: [String],
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', ScoreSchema);
