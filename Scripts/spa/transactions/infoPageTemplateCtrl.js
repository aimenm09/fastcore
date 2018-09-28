(function (app) {
    'use strict';

    app.controller('infoPageTemplateCtrl', infoPageTemplateCtrl);

    infoPageTemplateCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService', '$location'];

    function infoPageTemplateCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService, $location) {
        $scope.okButton = okButton;
        $scope.Title = $rootScope.Baton.PageDetails.PageTitle;
        $scope.Message = $rootScope.Baton.PageDetails.DisplayText;

        
        function okButton() {
            $rootScope.location.path('/');
        }
        

    }
})(angular.module('fastTrakWebUI'));