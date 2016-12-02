/**
 * Created by elsieyang on 2015-11-04.
 */
'use strict';

describe('Controller: gameController', function() {

  // load the controller's module
  beforeEach(module('nwmApp'));
  // beforeEach(module('stateMock'));

  var scope;
  var gameController;
  var state;
  var $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(_$httpBackend_, $controller, $rootScope, $state) {
    $httpBackend = _$httpBackend_;
    $httpBackend.expectGET('/api/things')
      .respond(['HTML5 Boilerplate', 'AngularJS', 'Karma', 'Express']);

    scope = $rootScope.$new();
    state = $state;
    gameController = $controller('gameController', {
      $scope: scope
    });
  }));

  it('should attach a list of things to the controller', function() {
    $httpBackend.flush();
    expect(gameController.awesomeThings.length).toBe(4);
  });
});
