'use strict';

angular.module('nwmApp').controller('gameController',
  function ($scope, Restangular, $stateParams, $state, $timeout, update,
            helper, database, bucket, history, aliens, $localStorage) {

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
      bucket.current_bucket = curBucket;
      bucket.updateHighlight();
      update.updateIllegalAlien();
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
      $scope.tutorial = false;
      $scope.disableRedo = true;
      $scope.disableUndo = true;
      aliens.initAliens();
      history.initHistory();

      // Get top window's height
      $scope.topWindowHeight = window.innerWidth * 0.095 + 20;
      $scope.cur_level = $stateParams.id;

      // Request data from the server
      Restangular.all('/api/levels/').get($scope.cur_level).then(function (aliens) {
        $scope.maxModels, $scope.numAliens = database.parseData(aliens);
        Restangular.all('api/scores/best_solution/')
          .get($scope.cur_level).then(function (data) {

          if (!data) {
            return;
          }

          var sol = {"_3ck4fmuge":["0_21","1_22","2_31","3_18","4_17","6_30","7_22"],"_0uzqqco9o":["0_10","1_12","2_16","4_8","6_17","7_12"],"_vr20g9sil":["0_22","1_23","2_32","3_19","4_18","5_14","6_31","7_23"],"_8o10gz9hr":["0_24","2_34","3_22","4_21","5_16","6_33","7_25"],"_mf6hj2m03":["0_7","1_5","2_9","4_4","6_8","7_7"],"_l7aqhq5hv":["0_11","1_13","2_17","3_9","4_9","5_7","6_18"],"_vgbmttmha":["1_8","2_12","3_6","6_12","7_8"],"_m9masdrgb":["0_19","1_20","2_28","3_16","4_15","6_27","7_20"],"_0jnemqk8d":["1_14","2_18","3_10","4_10","6_19","7_14"],"_hlrdyu4yw":["2_3","4_1","5_1","6_3","7_3"],"_6t2s3haro":["0_9","4_7","5_4","6_16","7_11"],"_rv7ju2mbn":["1_7","2_11","3_5","6_11"],"_2e7rx65gb":["0_0","2_0","3_1","4_0","5_0","6_0","7_0"],"_1rooxj496":["0_23","1_24","2_33","3_20","4_19","5_15","6_32","7_24"],"_tpy8tyfgf":["0_13","1_16","3_11","4_11","6_21","7_15"],"_0jrxr7gyi":["0_16","1_19","2_26","3_15","4_2","5_13","6_25","7_19"],"_l2m2tccko":["0_15","1_0","2_24","4_13","5_12","7_17"],"_sis7f2ta9":["0_20","1_3","2_29","6_28","7_21"],"_d7xzky6uz":["1_17","3_13","6_23","7_13"],"_8fkovh705":["1_18","2_25","3_14","6_24","7_18"],"_fi6qvog4o":["0_14","1_27","2_36","5_17","6_34","7_26"],"_oq6ohlzow":["0_25","2_22","3_12","5_9","6_22","7_16"],"_x4gmx6aow":["0_1","1_1","6_1","7_1"],"_3op0qmib9":["0_5","6_6","7_5"],"_uke55og0z":["1_28","2_37","3_24","5_10","6_35"],"_zyzg5vmew":["1_2","6_2"],"_nmypdk5vf":["0_12","2_5","3_4","4_20","5_3"],"_ipq1xff6o":["0_18","2_27","6_26"],"_5byjuof5z":["1_21","2_30","6_29"],"_e6ocf5drc":["1_6","2_10","6_9"],"_lv56rk42v":["1_25","2_19","6_20"],"_zqvko59yw":["1_11","3_7"],"_zc85bzz91":["0_6","2_15","3_3","6_7","7_6"],"_4s8c4kxx7":["1_10","2_14","6_14","7_9"],"_zzeh3c12n":["2_13","6_13"],"_uub1yt4cq":["0_3","2_8","3_2","4_3","5_5"],"_t3ie74he1":["0_8","3_0","4_14","5_8","6_10"],"_qmfj1cc3b":["0_4","1_9","2_6","6_5","7_4"],"_yqmpkp5vr":["1_4","5_2"],"_lnrjxezwc":["0_17","2_35","6_15","7_10"],"_61h5dhuhe":["0_2","2_2","7_2"],"_s9qyio2by":["3_23","4_5","5_11"],"_60exi0pp1":["1_26","2_20","3_21"],"_w88onn7gc":["2_7","5_6"],"_8o8lb92h3":["2_4","6_4"],"_6pn0qnlhw":["2_1","3_8"],"_nvbfg1gf8":["3_17","4_16"],"_977k3iwjq":["4_12"],"_2piq1u2z1":["4_6"],"_28a3amxn2":["1_15"],"_c1vxl0qf0":["2_21"],"_tuko8qji6":["2_23"]}
  ;

          //$scope.highest_score = data.score;
          bucket.buckets = sol;

          // Restore data structures
          for (var bid in bucket.buckets) {
            bucket.num_buckets++;
            var aliens = bucket.buckets[bid];
            for (var j = 0; j < aliens.length; j++) {
              var alien_id = aliens[j];
              aliens.alienArray[alien_id].bid = bid;
              aliens.alienArray[alien_id].illegal = 'legal';
            }
          }

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
        apply($scope);
      }, function (err) {
        $('#log-in').fadeIn();
        $scope.loaded = true;
      });
    };

    $scope.getNext = function(model, incr) {
      var curBacteriaIdx = aliens.currentBacterias[model];
      var numAliens = aliens.aliensByModel[model].length;
      if (incr > 0) {
        if (curBacteriaIdx == numAliens - 1) {
          // go back to the first bacteria
          aliens.currentBacterias[model] = 0;
        }
        else {
          aliens.currentBacterias[model]++;
        }
      }
      else if (incr < 0) {
        if (curBacteriaIdx == 0) {
          // go to the last bacteria
          aliens.currentBacterias[model] = numAliens - 1;
        }
        else {
          aliens.currentBacterias[model]--;
        }
      }
    }

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

    $scope.starFromScratch = function() {
      $scope.newGroup(false);
    }

    $scope.restoreBestGame = function () {
      Restangular.all('api/scores/best_solution/')
        .get($scope.cur_level).then(function (data) {

        if (!data) {
          return;
        }

        var sol = {"_3ck4fmuge":["0_21","1_22","2_31","3_18","4_17","6_30","7_22"],"_0uzqqco9o":["0_10","1_12","2_16","4_8","6_17","7_12"],"_vr20g9sil":["0_22","1_23","2_32","3_19","4_18","5_14","6_31","7_23"],"_8o10gz9hr":["0_24","2_34","3_22","4_21","5_16","6_33","7_25"],"_mf6hj2m03":["0_7","1_5","2_9","4_4","6_8","7_7"],"_l7aqhq5hv":["0_11","1_13","2_17","3_9","4_9","5_7","6_18"],"_vgbmttmha":["1_8","2_12","3_6","6_12","7_8"],"_m9masdrgb":["0_19","1_20","2_28","3_16","4_15","6_27","7_20"],"_0jnemqk8d":["1_14","2_18","3_10","4_10","6_19","7_14"],"_hlrdyu4yw":["2_3","4_1","5_1","6_3","7_3"],"_6t2s3haro":["0_9","4_7","5_4","6_16","7_11"],"_rv7ju2mbn":["1_7","2_11","3_5","6_11"],"_2e7rx65gb":["0_0","2_0","3_1","4_0","5_0","6_0","7_0"],"_1rooxj496":["0_23","1_24","2_33","3_20","4_19","5_15","6_32","7_24"],"_tpy8tyfgf":["0_13","1_16","3_11","4_11","6_21","7_15"],"_0jrxr7gyi":["0_16","1_19","2_26","3_15","4_2","5_13","6_25","7_19"],"_l2m2tccko":["0_15","1_0","2_24","4_13","5_12","7_17"],"_sis7f2ta9":["0_20","1_3","2_29","6_28","7_21"],"_d7xzky6uz":["1_17","3_13","6_23","7_13"],"_8fkovh705":["1_18","2_25","3_14","6_24","7_18"],"_fi6qvog4o":["0_14","1_27","2_36","5_17","6_34","7_26"],"_oq6ohlzow":["0_25","2_22","3_12","5_9","6_22","7_16"],"_x4gmx6aow":["0_1","1_1","6_1","7_1"],"_3op0qmib9":["0_5","6_6","7_5"],"_uke55og0z":["1_28","2_37","3_24","5_10","6_35"],"_zyzg5vmew":["1_2","6_2"],"_nmypdk5vf":["0_12","2_5","3_4","4_20","5_3"],"_ipq1xff6o":["0_18","2_27","6_26"],"_5byjuof5z":["1_21","2_30","6_29"],"_e6ocf5drc":["1_6","2_10","6_9"],"_lv56rk42v":["1_25","2_19","6_20"],"_zqvko59yw":["1_11","3_7"],"_zc85bzz91":["0_6","2_15","3_3","6_7","7_6"],"_4s8c4kxx7":["1_10","2_14","6_14","7_9"],"_zzeh3c12n":["2_13","6_13"],"_uub1yt4cq":["0_3","2_8","3_2","4_3","5_5"],"_t3ie74he1":["0_8","3_0","4_14","5_8","6_10"],"_qmfj1cc3b":["0_4","1_9","2_6","6_5","7_4"],"_yqmpkp5vr":["1_4","5_2"],"_lnrjxezwc":["0_17","2_35","6_15","7_10"],"_61h5dhuhe":["0_2","2_2","7_2"],"_s9qyio2by":["3_23","4_5","5_11"],"_60exi0pp1":["1_26","2_20","3_21"],"_w88onn7gc":["2_7","5_6"],"_8o8lb92h3":["2_4","6_4"],"_6pn0qnlhw":["2_1","3_8"],"_nvbfg1gf8":["3_17","4_16"],"_977k3iwjq":["4_12"],"_2piq1u2z1":["4_6"],"_28a3amxn2":["1_15"],"_c1vxl0qf0":["2_21"],"_tuko8qji6":["2_23"]}
;

        //$scope.highest_score = data.score;
        bucket.buckets = sol;

        // Restore data structures
        for (var bid in bucket.buckets) {
          bucket.num_buckets++;
          var aliens = bucket.buckets[bid];
          for (var j = 0; j < aliens.length; j++) {
            var alien_id = aliens[j];
            aliens.alienArray[alien_id].bid = bid;
            aliens.alienArray[alien_id].illegal = 'legal';
          }
        }

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
      // if (bucket.current_bucket == null) {
      //   $("#no-buck").fadeIn();
      //   setTimeout(function(){ $("#no-buck").fadeOut(); }, 2000);
      //   return;
      // }

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
        var curModel = aliens.aliensArray[alien_id].model;
        var oldAlien = aliens.aliensByModel[curModel][aliens.currentBacterias[curModel]];
        $scope.selectAlien(oldAlien, true);
        $scope.selectAlien(alien, true);
      }
      else {
        // Aliens in other buckets, can be switched to current bucket when being clicked
        if (aliens.alienArray[alien_id].bid != null &&
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

              $scope.currentBucket(bucket.current_bucket);
              if (!illegal_swap) {
                feedback(alien_id);
              }
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
            }
          }
        }
        $scope.disableUndo = false;
        $scope.disableRedo = true;
      }
    };

    $scope.newGroup = function (tut) {
      if (bucket.current_bucket == null || bucket.buckets[bucket.current_bucket].alien.length > 0) {
        bucket.addBucket();
        bucket.updateHighlight();
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

      var alien = aliens.alienArray[alien_id];
      var pos = aliens.aliensByModel[alien.model].indexOf(alien_id);
      aliens.currentBacterias[alien.model] = pos;
      $scope.currentBucket(alien.bid);
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
