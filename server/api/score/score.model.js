'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ScoreSchema = new Schema({
  createdBy: {
    model: 'User',
    required: true
  },
  score: Number,
  solution: {
    type: 'json'
  },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', ScoreSchema);
