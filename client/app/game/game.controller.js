'use strict';

angular.module('nwmApp').controller('gameController',
  function ($scope, Restangular, $stateParams, $state, $timeout, update,
            helper, database, style, bucket, history, aliens, $localStorage) {

    function apply(scope) {
      if (!scope.$$phase && !scope.$root.$$phase) {
        scope.$apply();
        console.log("Scope Apply Done !!");
      }
      else {
        console.log("Scheduling Apply after 200ms digest cycle already in progress");
        setTimeout(function() {
          apply(scope)
        }, 200);
      }
    }

    if ($stateParams.id == '11') {
      $state.go('scoreboard');
    }

    // game version where alien seeded
    $scope.playerSelectedSeed = null;
    $scope.scoreToBeat = 0;
    $scope.submittedScore = false;
    $scope.gotLeaderBoard = false;
    $scope.beatedBefore = false;
    var initAlien;
    var seed;
    $scope.type = null;

    $scope.numImagesLoaded = 0;
    $scope.loaded = false;
    $scope.maxScore = 0;
    $scope.$storage = $localStorage;
    $scope.undo_key_pointer = 0;
    var startTime = (new Date()).getTime();


    $scope.pickSeed = function (id) {
      $scope.playerSelectedSeed = id;

      $("#player-selected-seed").fadeIn();
    };

    $scope.playerSelectedFadeOut = function (id) {
      $("#player-selected-seed").fadeOut();
    };

    $scope.doneBucket = function () {
      var old = $scope.score;
      $scope.score = update.getNewScore($scope.maxModels);
      if ($scope.score > $scope.maxScore) {
        $scope.maxScore = $scope.score;
      }

      update.showSmallFeedback(old, $scope.score, 'd_d');

    };

    $scope.saveOverallOnly = function () {
      $scope.endGame();
      $("#ingame-leaderboard2").show();
      Restangular.all('/api/scores/save_overall_only').post(
        {
          score: $scope.score,
          initialScore: $scope.initialScore
        }).then(function (data) {
        $scope.submittedScore = true;
        Restangular.all('api/scores').get('in_game_scoreboard/5/' + '0').then(function (serverJson) {
          $scope.scores = serverJson.scores;
          $scope.overallScore = serverJson.overallScore;
          $scope.overallScoreRank = serverJson.rank;
          $scope.gotLeaderBoard = true;
        });
      });

    };

    $scope.currentBucket = function (curBucket) {
      // Currently we are using the FIRST highlighting algorithm. Second => 2, Third => 3.
      bucket.currentBucket(curBucket, 1);
      update.updateIllegalAlien();
      if (bucket.buckets[bucket.current_bucket].alien.length > 0) {
        $scope.checked = true;
        $('#aliens').css('width', $(window).width() - $('#section').width());
      }
      else {
        $scope.checked = false;
        $('#aliens').css('width', '97%');
      }

      $("#myDiv").height();
    };

    var feedback = function (alienId) {
      $scope.prev_score = $scope.score;
      $scope.score = update.getNewScore($scope.maxModels);

      if ($scope.score > $scope.maxScore) {
        $scope.maxScore = $scope.score;
      }

      // Avoid score update when seeding
      if (!$scope.doneSeeding) {
        return;
      }

      if ($scope.score - $scope.highest_score > 0) {
        $("#ingame-leaderboard").show();
        $scope.targetReachedGetNext();
      }

      update.showSmallFeedback($scope.prev_score, $scope.score, alienId);
      update.showBigFeedback($scope.prev_score, $scope.score, $scope.highest_score);
    };

    /* Skip current level*/
    $scope.skipLevel = function() {
      $('#skip-level').fadeIn();
    };

    $scope.skipLevelHide = function() {
      $('#skip-level').fadeOut();
    };

    $scope.getNextGalaxy = function() {
      switch($scope.cur_level) {
        case "13":
          $state.go('game', {id: 10});
          break;
        case "10":
          $state.go('game', {id: 13});
      }
    }

    /* Start a new game */
    $scope.setUpGame = function (mode) {
      $scope.bucket = bucket;
      $scope.aliens = aliens;
      $scope.history = history;

      // $scope.toggleChooseSolutionPopup();
      $scope.dragged = false;  // Disable click event when start dragging
      $scope.checked = true;
      $scope.tutorial = false;
      $scope.disableRedo = true;
      $scope.disableUndo = true;
      aliens.initAliens();
      history.initHistory();

      // Get top window's height
      $scope.topWindowHeight = window.innerWidth * 0.095 + 20;
      $scope.cur_level = $stateParams.id;

      // Request data from the server
      Restangular.all('api/levels/level/' + $scope.cur_level).getList().then((function (data) {
        $scope.maxModels, $scope.numAliens = database.parseData(data);
        database.shuffleProperties();
        $scope.restoreBestGame();
      }), function (err) {
        $('#log-in').fadeIn();
        $scope.loaded = true;
      });
    };

    $scope.createNewBucket = function () {
      $scope.newGroup(false);
    }

    var getRandAlien = function () {
      var result;
      var count = 0;
      for (var prop in $scope.aliens.alienArray)
        if (Math.random() < 1/++count)
          result = prop;
      return result;
    };

    $scope.restoreBestGame = function () {
      Restangular.all('api/scores/best_solution/' + $scope.cur_level)
        .getList().then(function (serverJson) {

        if (serverJson.length == 0) {
          return;
        }

        $scope.highest_score = serverJson[0].score;
        bucket.buckets = JSON.parse(serverJson[0].solution);

        // Restore data structures
        Object.keys(bucket.buckets).forEach(function(bid) {
          bucket.num_buckets++;
          currBucket = bucket.buckets[bid]
          for (var j = 0; j < currBucket.alien.length; j++) {
            var alien_id = currBucket.alien[j];
            aliens.alienArray[alien_id].bid = bid;
            aliens.alienArray[alien_id].illegal = 'legal';
          }
        });

        // Put homeless alien in a new bucket
        Object.keys(aliens.alienArray).forEach(function(aid) {
          if (aliens.alienArray[aid].bid == null) {
            $scope.newGroup();
            $scope.selectAlien(aid, false);
          }
        });

        $scope.score = update.getNewScore($scope.maxModels);
        if ($scope.score > $scope.maxScore) {
          $scope.maxScore = $scope.score;
        }

        $scope.doneSeeding = false;

        // Array of aliens that have already been picked as a seed
        Restangular.all('api/users/').get('seed_aliens/' + $scope.cur_level).then(function (seedAliens) {
          if (seedAliens) {
            $scope.seedAliens = seedAliens;
          }
          else {
            $scope.seedAliens = {};
          }
        });

        setTimeout(function(){ $scope.seedInitialAlien(false);
          $scope.targetReachedGetNext()}, 2000);
      });
    };

    $scope.seedInitialAlien = function(sd) {
      startTime = (new Date ()).getTime();

      if (!sd) {
        var randSeeding = Math.random();
        if (randSeeding < 0.5){
          $scope.type = 'tuple size';
          $scope.seed = $scope.seedByTupleSize();
        }
        else {
          $scope.type = 'random';
          $scope.seed = $scope.seedRandomly();
        }

        $scope.seedAliens[seed] = true;
        Restangular.all('/api/users/seed_aliens/'+ $scope.cur_level).post(
          $scope.seedAliens
        );
      }
      else {
        $scope.type = 'user input';
        $scope.seed = $scope.seedManually(sd);
      }

      $scope.showGroup($scope.seed);
      $scope.prev_score = $scope.score;
      $scope.doneSeeding = true;

      $scope.disableRedo = true;
      $scope.disableUndo = true;
    };

    $scope.$watch('doneSeeding', function (newVal, oldVal) {
      if (newVal == true && oldVal == false) {
        // Delete the garbage storage and only keep the record that saved the seed alien
        var seed_alien_buckets_state = $scope.$storage.buckets[$scope.undo_key_pointer][2];
        // Store the current key as the last possible undo checker
        $scope.last_undo_possible_index = $scope.undo_key_pointer;
        _.each(Object.keys($scope.$storage.buckets), function (key) {
          if (key != seed_alien_buckets_state && key != $scope.undo_key_pointer) {
            delete $scope.$storage.buckets[key];
          }
        });
      }
    });

    $scope.getNextSeed = function(opt) {
      if (!opt) {
        $scope.startOverHide();
      }

      $scope.seed = null;
      $scope.doneSeeding = false;

      while (bucket.buckets[bucket.current_bucket].alien.length > 0) {
        $scope.selectAlien(bucket.buckets[bucket.current_bucket].alien[0], false);
      }

      if (!opt) {
        $scope.seedInitialAlien(false);
      }
      else {
        $scope.seedInitialAlien(opt);
      }
    };

    $scope.seedManually = function(id) {
      $scope.highest_score = $scope.score;
      $scope.createNewBucket();
      apply($scope);
      $scope.selectAlien(id, false);
      apply($scope);
      $scope.initialScore = $scope.score;
      return id;
    };

    $scope.seedByTupleScore = function() {
      // Array of bucket ids sorted by similarity score
      var orderedBuckets = Object.keys(bucket.buckets);
      orderedBuckets.sort(function(a,b){
        return bucket.buckets[a].similarity - bucket.buckets[b].similarity;
      });

      $scope.highest_score = $scope.score; // highest score
      $scope.createNewBucket();
      apply($scope);

      for (var i = 0; i < orderedBuckets.length; i++) {
        var shuffledIds = helper.shuffleArray(bucket.buckets[orderedBuckets[i]].alien);
        for (var j = 0; j < shuffledIds.length; j++) {
          seed = shuffledIds[j];

          // This alien has already been picked: find another seed
          if (Object.keys($scope.seedAliens).indexOf(seed) >= 0) {
            continue;
          }

          $scope.selectAlien(seed, false);
          apply($scope);
          $scope.initialScore = $scope.score; // initial score

          var targetScore = $scope.highest_score - $scope.initialScore + 1;

          // Seeding improves the score: save solution to DB and seed again
          if (targetScore < 1) {
            $scope.saveSolutionAtSeeding();
            return $scope.seedByTupleScore();
          }

          for (var aid in aliens.alienArray) {
            // Similar alien exists: make this alien the seed
            if (aid != seed && aliens.alienArray[aid].similar == "similar" && aliens.alienArray[aid].illegal != "illegal") {
              return seed;
            }
          }

          // Similar alien not found: undo and pick another alien
          $scope.seedAliens[seed] = true;
          $scope.selectAlien(seed, false);
        }
      }

      // No possible seed found
      $scope.seedAliens = {};
      return $scope.seedByTupleScore();
    };

    $scope.seedByTupleSize = function() {
      // Array of bucket ids sorted by similarity score
      var orderedBuckets = Object.keys(bucket.buckets);
      orderedBuckets.sort(function(a,b){
        return bucket.buckets[a].similarity - bucket.buckets[b].similarity;
      });

      $scope.highest_score = $scope.score; // highest score
      $scope.createNewBucket();
      apply($scope);

      for (var i = 0; i < orderedBuckets.length; i++) {
        var shuffledIds = helper.shuffleArray(bucket.buckets[orderedBuckets[i]].alien);
        for (var j = 0; j < shuffledIds.length; j++) {
          seed = shuffledIds[j];

          // This alien has already been picked: find another seed
          if (Object.keys($scope.seedAliens).indexOf(seed) >= 0) {
            continue;
          }

          $scope.selectAlien(seed, false);
          apply($scope);
          $scope.initialScore = $scope.score; // initial score

          var targetScore = $scope.highest_score - $scope.initialScore + 1;

          // Seeding improves the score: save solution to DB and seed again
          if (targetScore < 1) {
            $scope.saveSolutionAtSeeding();
            return $scope.seedByTupleSize();
          }

          for (var aid in aliens.alienArray) {
            // Similar alien exists: make this alien the seed
            if (aid != seed && aliens.alienArray[aid].similar == "similar" && aliens.alienArray[aid].illegal != "illegal") {
              return seed;
            }
          }

          // Similar alien not found: undo and pick another alien
          $scope.seedAliens[seed] = true;
          $scope.selectAlien(seed, false);
        }
      }

      // No possible seed found
      $scope.seedAliens = {};
      return $scope.seedByTupleSize();
    };

    $scope.seedBySimilarityScore = function() {
      // Sort aliens by score
      var freeAliens = [];
      Object.keys(aliens.alienArray).forEach(function(aid) {
        if (aliens.alienArray[aid].bid == null) {
          freeAliens.push(aid);
        }
      });

      var sortedAlien = freeAliens.concat(
        Object.keys(aliens.alienArray).sort(function(a,b){
          return aliens.alienArray[a].score - aliens.alienArray[b].score;
        })
      );

      $scope.highest_score = $scope.score; // highest score
      $scope.createNewBucket();
      apply($scope);

      for (var i = 0; i < sortedAlien.length; i++) {

        seed = sortedAlien[i];

        // This alien has already been picked: find another seed
        if (Object.keys($scope.seedAliens).indexOf(seed) >= 0) {
          continue;
        }

        $scope.selectAlien(seed, false);
        apply($scope);
        $scope.initialScore = $scope.score; // initial score

        var targetScore = $scope.highest_score - $scope.initialScore + 1;

        // Seeding improves the score: save solution to DB and seed again
        if (targetScore < 1) {
          $scope.saveSolutionAtSeeding();
          return $scope.seedBySimilarityScore();
        }

        for (var aid in aliens.alienArray) {
          // Similar alien exists: make this alien the seed
          if (aid != seed && aliens.alienArray[aid].similar == "similar" && aliens.alienArray[aid].illegal != "illegal") {
            return seed;
          }
        }

        // Similar alien not found: undo and pick another alien
        $scope.seedAliens[seed] = true;
        $scope.selectAlien(seed, false);
      }

      // No possible seed found
      $scope.seedAliens = {};
      return $scope.seedBySimilarityScore();
    };

    // Seeding #4: random
    $scope.seedRandomly = function() {
      $scope.highest_score = $scope.score; // highest score
      $scope.createNewBucket();
      apply($scope);

      while(Object.keys($scope.seedAliens).length < Object.keys(aliens.alienArray).length) {
        seed = getRandAlien();

        // This alien has already been picked: find another seed
        if (Object.keys($scope.seedAliens).indexOf(seed) >= 0) {
          continue;
        }

        $scope.selectAlien(seed, false);
        apply($scope);
        $scope.initialScore = $scope.score; // initial score

        var targetScore = $scope.highest_score - $scope.initialScore + 1;

        // Seeding improves the score: save solution to DB and seed again
        if (targetScore < 1) {
          $scope.saveSolutionAtSeeding();
          return $scope.seedRandomly();
        }

        for (var aid in aliens.alienArray) {
          // Similar alien exists: make this alien the seed
          if (aid != seed && aliens.alienArray[aid].similar == "similar" && aliens.alienArray[aid].illegal != "illegal") {
            return seed;
          }
        }

        // Similar alien not found: undo and pick another alien
        $scope.seedAliens[seed] = true;
        $scope.selectAlien(seed, false);
      }

      // Visited all aliens, clear seed history
      $scope.seedAliens = {};
      return $scope.seedRandomly();
    };

    $scope.saveSolutionAtSeeding = function() {
      Restangular.all('/api/scores/').post(
        {
          user: "nwm",
          score: $scope.score,
          initialScore: $scope.highest_score,
          level: parseInt($scope.cur_level),
          solution: bucket.buckets
        }).then(
        (function (data) {
        }), function (err) {
        });
    };

    $scope.selectAlien = function (alien_id, illegal_swap) {

      // No bucket is currently selected
      // game version in which alien is seeded : comment out
      if (bucket.current_bucket == null) {
        $("#no-buck").fadeIn();
        setTimeout(function(){ $("#no-buck").fadeOut(); }, 2000);
        return;
      }

      if (alien_id == $scope.seed) {
        $("#cant-remove").fadeIn();
        setTimeout(function(){ $("#cant-remove").fadeOut(); }, 4000);
        return;
      }

      // Illegal Aliens
      if (aliens.alienArray[alien_id].illegal == 'illegal') {
        if ($scope.tutState == 4) {
          $scope.tutState = 5;
        }

        // Find the alien that conflicts with the given alien
        var currentAliens = bucket.buckets[bucket.current_bucket].alien;
        for (var i = 0; i < currentAliens.length; i++) {
          var oldId = currentAliens[i];
          if (aliens.alienArray[alien_id].model == aliens.alienArray[oldId].model) {
            aliens.newId = alien_id;
            aliens.oldId = oldId;
            break;
          }
        }
        var oldAlien = document.getElementsByClassName("alien " + oldId)[0];
        $scope.toggleIllegalAlert();
      }
      else {
        // Aliens in other buckets, can be switched to current bucket when being clicked
        if (aliens.alienArray[alien_id].bid != null && \
            bucket.current_bucket != aliens.alienArray[alien_id].bid) {

          var bucket_id = aliens.alienArray[alien_id].bid;
          bucket.buckets[bucket_id].alien.splice(bucket.buckets[bucket_id].alien.indexOf(alien_id), 1);
          bucket.buckets[bucket.current_bucket].alien.push(alien_id);

          history.historyBucketId = bucket.current_bucket;
          history.historySwappedBucketId = bucket_id;
          history.historySelectFlag = 2;

          aliens.alienArray[alien_id].bid = bucket.current_bucket;
          $scope.currentBucket(bucket.current_bucket);
          if (!illegal_swap) {
            feedback(alien_id);
          }
          bucket.updateAlienArray();
        }

        // Normal aliens
        else {
          if (!$scope.dragged) {
            history.historySelectFlag = false;

            // Alien already in bucket, Deselect aliens
            if (aliens.alienArray[alien_id].bid == bucket.current_bucket) {
              if ($scope.tutState == 6) {
                $scope.tutState = 7;
              }
              history.historySelectFlag = 1;

              // Remove the alien from the bucket
              var ind = bucket.buckets[bucket.current_bucket].alien.indexOf(alien_id);
              aliens.alienArray[alien_id].bid = null;
              bucket.buckets[bucket.current_bucket].alien.splice(ind, 1);

              if (bucket.buckets[bucket.current_bucket].alien.length == 0) {
                $scope.checked = false;
              }

              $scope.currentBucket(bucket.current_bucket);
              if (!illegal_swap) {
                feedback(alien_id);
              }
              bucket.updateAlienArray();
            }

            // Select aliens
            else {
              history.historySelectFlag = 0;
              bucket.buckets[bucket.current_bucket].alien.push(alien_id);

              history.historyBucketId = bucket.current_bucket;

              aliens.alienArray[alien_id].bid = bucket.current_bucket;
              $scope.currentBucket(bucket.current_bucket);
              if (!illegal_swap) {
                feedback(alien_id);
              }
              bucket.updateAlienArray();
            }
          }
        }
        $scope.disableUndo = false;
        $scope.disableRedo = true;
      }
    };

    $scope.selectIllegalAlien = function (opt) {
      $scope.toggleIllegalAlert();
      if (!opt) {
        return;
      }
      // Show alert if the conflicting alien is the seed
      if (aliens.oldId == $scope.seed) {
        $("#cant-remove").fadeIn();
        setTimeout(function(){ $("#cant-remove").fadeOut(); }, 2000);
        return;
      }

      $scope.selectAlien(aliens.oldId, true);
      $scope.selectAlien(aliens.newId, true);
      feedback(aliens.newId);
    };

    $scope.newGroup = function (tut) {
      $scope.checked = false;
      if (bucket.current_bucket == null || bucket.buckets[bucket.current_bucket].alien.length > 0) {
        bucket.addBucket();
        update.updateIllegalAlien();
        $scope.disableUndo = false;
        $scope.disableRedo = true;
      }
    }

    $scope.showGroup = function (alien_id) {
      if ($scope.tutState == 7) {
        $scope.tutState = 8;
      }

      // If alien not in bucket
      if (!aliens.alienArray[alien_id].bid == null) {
        return;
      }

      var bid = aliens.alienArray[alien_id].bid;
      $scope.currentBucket(bid);
      bucket.updateAlienArray();
    }

    $scope.onStart = function (event) {
      $scope.dragged = true;
    };

    /*
     * ==========================================
     * ||             UNDO / REDO              ||
     * ==========================================
     */

    // Undo structure: [NEW, OLD, OLD, OLD...]
    //                   ↑ current pointer

    // SCENARIO 1:
    // User clicks UNDO => [NEW, OLD, OLD, OLD...] and update view to current pointer
    //                            ↑ moves pointer backward
    // User clicks REDO => [NEW, OLD, OLD, OLD...] and update view to current pointer
    //                      ↑ moves pointer forward

    // SCENARIO 2:
    // User clicks UNDO  => [NEW, OLD, OLD, OLD...] and update view to current pointer
    //                             ↑ moves pointer backward
    // User makes change => [NEW', OLD, OLD, OLD...] and update view to current pointer
    //                        ↑ moves pointer forward, 'NEW' gets overwritten

    $scope.$watch(angular.bind(bucket, function (current_bucket) {
      return bucket.current_bucket;
    }), function (newVal, oldVal) {
      if (newVal == null) {
        $scope.disableUndo = true;
        $scope.disableRedo = true;
        $scope.checked = true;
      }
    });

    $scope.$watch(angular.bind(bucket, function (buckets) {
      return bucket.buckets;
    }), function (newVal, oldVal) {
      if (!newVal || !oldVal) {
        return;
      }

      if (!$scope.$storage.buckets) {
        $scope.$storage.buckets = {};
      }

      if ($scope.last_undo_possible_index != null) {
        // do a full check
        var compare_flag = true;

        var target_bkt = JSON.parse($scope.$storage.buckets[$scope.last_undo_possible_index][0]);
        _.each(newVal, function (bkt) {
          if (bkt.alien.length > 0) {
            var color_comparator = bkt.color;
            var aliens_comparator = bkt.alien;
            _.each(target_bkt, function (target) {
              if (target.color == color_comparator && !_.isEqual(target.alien, aliens_comparator)) {
                compare_flag = false;
              }
            });
          }
        });

        if (compare_flag) {
          $scope.disableUndo = true;
          $scope.disableRedo = true;
          $scope.checked = true;
        }
      }

      // Iterate over storage to see if this newVal is from an UNDO (code 1) or from user's new action (code 0)
      var identical_bucket_flag = 1;
      _.forEach($scope.$storage.buckets, function (b, t) { // Caution: value first, key second!
        if (b[0] == JSON.stringify(newVal) && Number(t) == $scope.undo_key_pointer) {
          identical_bucket_flag = 0;
          return false;
        } else if (b[0] == JSON.stringify(newVal) && Number(t) != $scope.undo_key_pointer) {
          identical_bucket_flag = 1;
        }
      });
      // If it is a new action, simply add it to the storage
      if (identical_bucket_flag == 1) {
        var newStamp = new Date().valueOf(); // current timestamp as an integer

        // First bucket
        if (_.keys($scope.$storage.buckets).length == 0) {
          $scope.$storage.buckets[newStamp] =
            [JSON.stringify(newVal), bucket.current_bucket, null, null];
        }

        // Not first bucket
        else {
          // bucket storage data structure: {timestampKey: [buckets, current_bucket, lastState, nextState]}
          // Now we want to find the key to lastState
          _.forEach($scope.$storage.buckets, function (b, t) {
            if (b[0] == JSON.stringify(oldVal) && t == $scope.undo_key_pointer) { // Note that the key pointer is still the old one
              // Set lastStep flag for current state and nextStep pointer for last state
              b[3] = newStamp;
              $scope.$storage.buckets[newStamp] =
                [JSON.stringify(newVal), bucket.current_bucket, $scope.undo_key_pointer, null];
            }
          });
        }
        // Finally update the key pointer
        $scope.undo_key_pointer = newStamp;
      }
    }, true);

    $scope.undo = function () {
      var last_key = $scope.$storage.buckets[$scope.undo_key_pointer][2];
      if (!last_key) {
        return;
      }
      var last_buckets = $scope.$storage.buckets[Number(last_key)];

      var compare_current_buckets = _.pluck(JSON.parse($scope.$storage.buckets[$scope.undo_key_pointer][0]), 'alien').join().split(",");
      var compare_last_buckets = _.pluck(JSON.parse($scope.$storage.buckets[Number(last_key)][0]), 'alien').join().split(",");
      var diff_alien = _.difference(compare_current_buckets, compare_last_buckets);

      // Update key pointer
      $scope.undo_key_pointer = last_key;

      bucket.restoreBucketsHelper(last_buckets);
      if (bucket.current_bucket != null) {
        $scope.currentBucket(bucket.current_bucket);
      }
      feedback(diff_alien);
      bucket.updateAlienArray();

      $scope.disableRedo = false;

      if (!$scope.$storage.buckets[$scope.undo_key_pointer][2]) {
        $scope.disableUndo = true;
      }
    };

    $scope.redo = function () {
      var next_key = $scope.$storage.buckets[$scope.undo_key_pointer][3];
      if (!next_key) {
        return;
      }
      var next_buckets = $scope.$storage.buckets[Number(next_key)];

      var compare_current_buckets = _.pluck(JSON.parse($scope.$storage.buckets[$scope.undo_key_pointer][0]), 'alien').join().split(",");
      var compare_next_buckets = _.pluck(JSON.parse($scope.$storage.buckets[Number(next_key)][0]), 'alien').join().split(",");
      var diff_alien = _.difference(compare_current_buckets, compare_next_buckets);

      // Update key pointer
      $scope.undo_key_pointer = next_key;
      //console.log("UNDO (buckets) =>" + next_buckets);

      if (!next_buckets) {
        alert("redo error");
      }

      bucket.restoreBucketsHelper(next_buckets);
      if (bucket.current_bucket != null) {
        $scope.currentBucket(bucket.current_bucket);
      }
      feedback(diff_alien);
      bucket.updateAlienArray();

      $scope.disableUndo = false;

      if (!$scope.$storage.buckets[$scope.undo_key_pointer][3]) {
        $scope.disableRedo = true;
      }
    };

    $scope.$on("$destroy", function () {
      delete $scope.$storage.buckets;
    });

    $scope.showHighlightAlien = function (alien_id) {
      var target = document.getElementsByClassName("an-alien " + alien_id)[0];
      window.scrollTo(0, target.offsetTop - $scope.topWindowHeight - 10);

      $(".an-alien." + alien_id).removeClass('highlight-hover');
      $(".an-alien." + alien_id).addClass('highlight-hover');
      setTimeout(function () {
        $(".an-alien." + alien_id).removeClass('highlight-hover');
      }, 2000);
    }

    $scope.logout = function () {
      Restangular.all('api/auths/logout').post(
      ).then((function (data) {
        $state.go('main');
      }), function (err) {

      });
    };

    $scope.quit = function () {
      $state.go('scoreboard');
    };

    $scope.endGame = function () {
      $("#overlay").toggle();
      $("#popup3").toggle();
    };

    $scope.toggleIllegalAlert = function () {
      $(".current-alien." + aliens.oldId).toggleClass("replaced");
      $("#clear-overlay").toggle();
      $("#replace-popup").toggle();
    };

    $scope.noBucketAlert = function(opt) {
      $scope.toggleNoBucketAlert();
      if (opt) {
        $scope.newGroup();
      }
    }

    $scope.toggleNoBucketAlert = function () {
      $("#clear-nobucket-alert-overlay").toggle();
      $("#nobucket-popup").toggle();
    };

    $scope.startOver = function () {
      $('#start-over').fadeIn();
    };

    $scope.startOverHide = function () {
      $('#start-over').fadeOut();
    }

    window.onresize = function (event) {
      $scope.topWindowHeight = window.innerWidth * 0.095 + 20;
    };

    $scope.imageLoadedIncrementCount = function () {
      $scope.numImagesLoaded ++;

      if ($scope.numImagesLoaded == $scope.numAliens) {
        $scope.loaded = true;
      }
    };

    $scope.targetReachedGetNext = function () {
      var time = (new Date ()).getTime() - startTime;
      Restangular.all('/api/scores/').post(
        {
          score: $scope.score,
          initialScore: $scope.highest_score,
          targetScore: $scope.highest_score - $scope.initialScore + 1,
          seed: $scope.seed,
          duration: time,
          level: parseInt($scope.cur_level),
          solution: bucket.buckets,
          type: $scope.type
        }).then(function (data) {
        $scope.submittedScore = true;
        Restangular.all('api/scores').get('in_game_scoreboard/5/' + '0').then(function (serverJson) {
          $scope.scores = serverJson.scores;
          $scope.overallScore = serverJson.overallScore;
          $scope.overallScoreRank = serverJson.rank;
          $scope.gotLeaderBoard = true;
        });
      });
    };

    $scope.hideLeaderBoard = function () {
      $scope.gotLeaderBoard = false;
      $scope.beatedBefore = true;
      $scope.startTime = (new Date ()).getTime();
    };

    $scope.getNextClient = function() {
      location.reload();

    };

    // Clear the undo storage
    $(document).ready(function () {
      delete $scope.$storage.buckets;
      delete $scope.$storage.aliens;
      $scope.setUpGame('best');
    });

  });
