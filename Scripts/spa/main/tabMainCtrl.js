(function (app) {
    'use strict';

    app.controller('tabMainCtrl', tabMainCtrl);

    tabMainCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', '$routeParams', 'settings'];

    function tabMainCtrl($scope, $rootScope, $timeout, $modal, $routeParams, settings) {
        $scope.pageClass = 'page-tabmain';
        var useAD = settings.useAD;

        function showLogin() {
            var role = $routeParams.role;
            if (!$scope.userData.isUserLoggedIn || (role != undefined)) {
                $modal.open({
                    templateUrl: 'scripts/spa/account/login.html',
                    controller: 'loginCtrl',
                    windowClass: "loginModal",
                    scope: $scope
                }).result.then(function ($scope) {
                });
            }
        };

        if (!useAD)
            showLogin();
    }
})(angular.module('fastTrakWebUI'));