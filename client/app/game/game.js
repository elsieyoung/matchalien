'use strict';

var game = angular.module('nwmApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('game', {
        url: '/game/:id',
        templateUrl: 'app/game/game.html',
        controller: 'gameController'
      });
  });

game.directive('ngRightClick', function($parse) {
  return function(scope, element, attrs) {
    var fn = $parse(attrs.ngRightClick);
    element.bind('contextmenu', function(event) {
      scope.$apply(function() {
        event.preventDefault();
        fn(scope, {$event:event});
      });
    });
  };
});

game.filter('toArray', function() { return function(obj) {
  if (!(obj instanceof Object)) return obj;
  return _.map(obj, function(val, key) {
    return Object.defineProperty(val, '$key', {__proto__: null, value: key});
  });
}});

/*******************************************************************
  DB functions / parsing functions
*******************************************************************/
game.service('database', function(Restangular, $state, aliens, bucket) {

  /* Set alien array given parsed data. */
  this.parseData = function(data){
    // data = "[{model: 1, id: 1, prop: [1,2,3], url: ['', '',...]}, ...]"
    var uniqueModelNums = []
    for (var i = 0; i < data.length; i++) {
      var alienData = data[i];

      var id = alienData.model + "_" + alienData.id;
      aliens.alienArray[id] = {
        id: id,
        model: alienData.model,
        alien: alienData.id,
        url: alienData.url,
        illegal: "legal-alien",
        similar: "dissimilar",
        bid: null,
        score: 0,
        similarityBar: 0,
        properties: alienData.prop
      };

      if (uniqueModelNums.indexOf(alienData.model) < 0) {
        uniqueModelNums.push(alienData.model);
        aliens.aliensByModel[alienData.model] = [id];
      }
      else{
        aliens.aliensByModel[alienData.model].push(id);
      }
    }

    var uniqueModelsSize = uniqueModelNums.length;
    for (i = 0; i < uniqueModelsSize; i++) {
      aliens.currentBacterias[i] = 0;
    }

    return uniqueModelsSize, data.length;
  };

  function getKeys(obj){
    var arr = new Array();
    for (var key in obj)
      arr.push(key);
    return arr;
  }
});


/*******************************************************************
  Manage arrays of aliens
*******************************************************************/
game.service('aliens', function() {

  this.initAliens = function() {
    this.zoominAliens = [];
    this.alienArray = {};
    this.aliensByModel = {}; // key: model, value: list of alienIDs in the model
    this.currentBacterias = {};
  }

  this.getBacteria = function(model, idx) {
    return this.alienArray[this.aliensByModel[model][idx]];
  }

});


/*******************************************************************
  Helper functions
*******************************************************************/
game.service('helper', function() {

  // Source: http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
  this.shuffleArray = function(arr) {
    var retArray = [];

    arr.forEach(function(aid) {
      retArray.push(aid);
    });

    var j, x, i;
    for (i = retArray.length; i; i--) {
      j = Math.floor(Math.random() * i);
      x = retArray[i - 1];
      retArray[i - 1] = retArray[j];
      retArray[j] = x;
    }

    return retArray;
  };

});


/*******************************************************************
  Functions to update data (i.e. illegal aliens)
*******************************************************************/
game.service('update',function(helper, bucket, aliens) {

  /* Returns an array of illegal aliens. */
  this.updateIllegalAlien = function() {

    // Array of models that are already in bucket
    var models_in_bucket = [];
    for (var i = 0; i < bucket.buckets[bucket.current_bucket].alien.length; i++) {
      var model_num = aliens.alienArray[bucket.buckets[bucket.current_bucket].alien[i]].model;
      if (models_in_bucket.indexOf(model_num) == -1) {
        models_in_bucket.push(model_num);
      }
    }

    for (var id in aliens.alienArray) {
      model_num = aliens.alienArray[id].model;
      if (models_in_bucket.indexOf(model_num) != -1 && bucket.buckets[bucket.current_bucket].alien.indexOf(id) == -1) {
        aliens.alienArray[id].illegal = 'illegal';
      }
      else {
        aliens.alienArray[id].illegal = 'legal';
      }
    }
  };

  /* Return the new score and gives feedback. */
  this.getNewScore = function(maxModels) {
    // Calculate points for each bucket
    var total_score = 0;
    bucket.highestAlienScore = 0;
    for (var bid in bucket.buckers) {
      var bucket_score  = calculateScoreByBucket(bucket.buckets[bid].alien, maxModels);
      var ceil_bucket_score = Math.ceil(bucket_score);
      for (var j = 0; j < bucket.buckets[bid].alien.length; j++) {
        var curAlien = bucket.buckets[bid].alien.splice(j, 1)[0];
        var alienScore = ceil_bucket_score - Math.ceil(calculateScoreByBucket(bucket.buckets[bid].alien, maxModels))
        if (alienScore > bucket.highestAlienScore) {
          bucket.highestAlienScore = alienScore;
        }
        aliens.alienArray[curAlien].score = alienScore;
        bucket.buckets[bid].alien.splice(j, 0, curAlien);
      }
      bucket.buckets[bid].similarity = ceil_bucket_score;
      total_score += bucket_score;
      if (bucket_score > bucket.highestBucketScore) {
        bucket.highestBucketScore = ceil_bucket_score;
      }
    }
    return Math.ceil(total_score);
  };

  /* Calculate the score of the bucket that contains the
     aliens in alien_list
     alien_list: [{model, alien} ...]  */
  var calculateScoreByBucket = function (alien_list, maxModels) {
    var num_dup  = {};   // a map from j -> number of properties that appear in j aliens in the bucket
    var prop_list = [];  // a list of unique properties in the bucket
    for (var i = 0; i < alien_list.length; i++) {
      // a list of properties of the current alien
      var cur_properties = aliens.alienArray[alien_list[i]].properties;
      for (var k = 0; k < cur_properties.length; k++) {
        if (prop_list.indexOf(cur_properties[k]) == -1) {
          // the property is not in prop_list yet
          var compare_result = compare(cur_properties[k], alien_list);
          if (compare_result >= 2) {
            // the property appears in more than one alien in the bucket
            if (num_dup[compare_result] == null) {
              // value of 'j' is not in num_dup yet
              num_dup[compare_result] = 1;
            } else {
              num_dup[compare_result]++;
            }
          }
          prop_list.push(cur_properties[k]);
        }
      }
    }

    var score = 0;
    for (var j in num_dup) {
      score += j * j * num_dup[j] / (maxModels * maxModels * prop_list.length) * 10000;
    }
    return score;
  };



  /* Returns the number of aliens in the given bucket
     that have the given attribute. */
  var compare = function(prop_id, alien_list) {
    var num_occurrence = 0;
    for (var i = 0; i < alien_list.length; i++) {
      var cur_properties = aliens.alienArray[alien_list[i]].properties;
      if (cur_properties.indexOf(prop_id) != -1) {
        num_occurrence++;
      }
    }
    return num_occurrence;
  };

  this.showSmallFeedback = function(oldScore, newScore, alien_id) {

    var coord_x = Math.floor(window.innerWidth/2) - 300;
    var coord_y = Math.floor(window.innerHeight/2) - 100;

    $("#feedback").css({'font-family': 'Lovelo Black',
      'text-shadow': 'none',
      'position': 'fixed',
      'left': coord_x + 170,
      'top': coord_y + 60,
      'font-size': '100px',
      'z-index': '99'});

    // Small feedback
    if (oldScore < newScore) {
      var diff = newScore - oldScore;
      $("#feedback").html(diff);
      $("#small_feedback").removeClass('glyphicon glyphicon-arrow-down');
      $("#small_feedback").addClass('glyphicon glyphicon-arrow-up animated rubberBand');
      $("#small_feedback").css({'color': '#77dd77',
                                'position': 'fixed',
                                'left': coord_x,
                                'top': coord_y,
                                'font-size': '100px',
                                'z-index': '99'});
      $("#feedback").css({'color': '#77dd77'});
      $("#feedback").show().delay(500).fadeOut();
      $("#small_feedback").show().delay(500).fadeOut();
    }
    else if (oldScore > newScore) {
      var diff = oldScore - newScore;
      $("#feedback").html(diff);
      $("#small_feedback").removeClass('glyphicon glyphicon-arrow-up');
      $("#small_feedback").addClass('glyphicon glyphicon-arrow-down animated rubberBand');
      $("#small_feedback").css({'color': '#f63c3a',
                                'position': 'fixed',
                                'left': coord_x,
                                'top': coord_y,
                                'font-size': '100px',
                                'z-index': '99'});
      $("#feedback").css({'color': '#f63c3a'});
      $("#feedback").show().delay(500).fadeOut();
      $("#small_feedback").show().delay(500).fadeOut();
    }
  };

  this.showBigFeedback = function(oldScore, newScore, highestScore) {
    if (oldScore < newScore) {
      if (newScore >= highestScore * 5 / 5) {
        this.feedback = "Best!";
        $("#feedback").show().delay(500).fadeOut();
      }
      else if (newScore >= highestScore * 4 / 5) {
        this.feedback = "Amazing!";
        $("#feedback").show().delay(500).fadeOut();
      }
      else if (newScore >= highestScore * 3 / 5) {
        this.feedback = "Wow!";
        $("#feedback").show().delay(500).fadeOut();
      }
      else if (newScore >= highestScore * 2 / 5) {
        this.feedback = "Good!";
        $("#feedback").show().delay(500).fadeOut();
      }
    }
  };
});

/*******************************************************************
  Handles buckets, colour array, predefined colours
*******************************************************************/
game.service('bucket', function($timeout, aliens, history) {

  this.convertSolution = function(data) {
    this.buckets = {};
    for (var i=0; i < data.length; i++) {
      var bid = getUniqueId();
      this.buckets[bid] = data[i].alien;
    }
  }

  this.restoreBucketsHelper= function (data) {
    this.num_buckets = 0;
    this.current_bucket = data[1];
    this.buckets = JSON.parse(data[0]);

    // Restore data structures
    for (var bid in this.buckets) {
      this.num_buckets++;

      for (var j = 0; j < this.buckets[bid].alien.length; j++) {
        var alien_id = this.buckets[bid].alien[j];
        aliens.alienArray[alien_id].bid = bid;
      }
    }
  }

  /* Update the array of colours and returns. */
  this.addBucket = function() {
    var newBid = getUniqueId();
    this.buckets[newBid] = [];
    this.num_buckets++;
    this.current_bucket = newBid;
  };

  // Source: https://gist.github.com/gordonbrander/2230317
  var getUniqueId = function() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
  };

  this.removeBucket = function(bid) {
    delete this.buckets[bid];
    this.num_buckets--;
  }

  this.getAlienScore = function(alienId) {
    if (aliens.alienArray[alienId].bid == null) {
      return -1;
    }
    if (aliens.alienArray[alienId].score < 0) {
      return 0;
    }
    return aliens.alienArray[alienId].score/this.highestAlienScore * 100;
  };

  this.getBucketScore = function(alienId) {
    if (aliens.alienArray[alienId].bid == null) {
      return 0;
    }
    var bucketId = aliens.alienArray[alienId].bid;
    if (alienId != this.buckets[bucketId].alien[0]) {
      return 0;
    }
    return this.buckets[bucketId].similarity/this.highestBucketScore * 100;
  };

  this.updateHighlight = function() {
    $(".bacterium").removeClass("common");
    $(".bacteria").removeClass("selected-bacteria");

    this.buckets[this.current_bucket].alien.forEach(function(curAid) {
      aliens.alienArray[curAid].properties.forEach(function(pid) {
        $(".bacterium." + pid).addClass("common");
      });
      $(".bacteria." + curAid).addClass("selected-bacteria");
    });
  }
});

game.service('history', function(aliens) {

  this.initHistory = function() {
    this.historyBuckets = [];
    this.historyAliensInBucket = [];
    this.historyAlienId = '';
    this.historyBucketId = '';
    this.historySelectFlag = 0; // 0 means previously selected, 1 means previously unselected, 2 means previously swapped
    this.historySwappedBucketId = '';
    // 0:'add-alien'
    // 1:'illegal-alien'
    // 2:'create-group'
    // 3:'switch-aliens'
    // 4:'removing alien'
    // 5:'highlight'
  }
});
