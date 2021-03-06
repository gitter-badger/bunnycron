"use strict";
var app = angular.module('bunny', []);
var $modal = $('.modal-logs');

function formatLog (data) {
  for (var id in data) {
    var item = data[id];
    if (item.logs) {
      for (var i = item.logs.length - 1; i >= 0; i--) {
        var log = item.logs[i];
        data[id].logs[i] = JSON.parse(log)
      };
    }
  }
}

app.controller("JobsCtrl", function($scope, $http, $rootScope,$sce){
  function getJobs () {
    $http.get('stats').success(function (data) {
      if (Object.keys(data).length == 0) {
        data = null;
      }
      formatLog(data);
      $scope.jobs = data;

    });
  };
  getJobs()
  setInterval(getJobs, 2000);

  $scope.logs = [];
    
  $scope.updateLog = function (id) {
    $scope.logs = $scope.jobs[id].logs
  }

  $scope.showModal = function (logs) {
    if(logs) $modal.modal();
  }


});

app.controller("LogCtrl", function($scope){

  $scope.getLogClass = function(status) {
    switch(status){
      case 'failed':
        return 'panel-danger'
        break;
      case 'timeout':
        return 'panel-warning'
        break;
      case 'completed':
        return 'panel-success'
        break;
      default:
        return 'panel-info'
    };
  }

});

app.filter('toUTCDate', function(){
  return function(time) {
    time = JSON.parse(time); //invalid date if time is string
    return moment(time).utc().format('MMM DD HH:mm UTC')
  };
});



app.filter('to_trusted', function($sce){
  return function(text) {
    text = text.replace(/\n/g,'<br>');
    return $sce.trustAsHtml(text);
  };
});

app.filter('getlog', function() {
  return function(input) {
    return input.replace('\n','<br>')
  }})

$('div.logs, .modal-logs').on('click',function(){
  var isShow = $modal.data('modal').isShown
  if (isShow) {
    $modal.modal('hide')
    $('.modal-logs').animate({ scrollTop: 0},0 );
    
  }
});

$('body').tooltip({
    selector: '[data-toggle="tooltip"]'
});
