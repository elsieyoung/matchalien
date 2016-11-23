/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/auths              ->  index
 */

//'use strict';
//var _ = require('lodash');
//var config = require('../../config/environment');
//var Parse = require('parse/node').Parse;
//Parse.initialize(config.PARSE_APPID, config.PARSE_JSKEY);
//Parse.serverURL = 'https://parseapi.back4app.com'

'use strict';
var _ = require('lodash');
var config = require('../../config/environment');
var User = require('../user/user.model');


exports.logout = function(req, res) {
  if (req.session.user) {
    req.session.user = null;
    res.json(200);
  } else {
    res.status(400).end();
  };
};


exports.login = function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.findOne({
    username: username
  }, function(err, user) {
    if (err) return res.status(400).end();

    if (!user) {
      return res.status(400).end();
    }
    if (user.password !== password) {
      return res.status(400).end();
    }
    req.session.user = user;
    return res.json(user);
  });
};
