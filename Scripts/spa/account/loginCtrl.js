(function (app) {
    'use strict';

    app.controller('loginCtrl', loginCtrl);

    loginCtrl.$inject = ['$scope', 'membershipService', 'notificationService', 'apiService', '$modalInstance', '$rootScope', '$location'];

    function loginCtrl($scope, membershipService, notificationService, apiService, $modalInstance, $rootScope, $location) {
        $scope.pageClass = 'page-login';
        $scope.user = {};
        $scope.needEmail = false;
        $scope.login = login;
        $scope.cancel = cancel;
        $scope.selectedStation = "";
        $scope.stations = [];

        $scope.locale = 'en';
        $scope.localeChanged = function () {
            $rootScope.getTranslations($scope.locale);
        }

        $scope.errorLevel = 2;
        $scope.pageTransPrefix = 'spa.account.login.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function login() {
            if (typeof $scope.selectedStation != 'undefined' && $scope.selectedStation.DeviceIdentifier != "") {
                if ($scope.selectedStation.DeviceIdentifier != $rootScope.deviceidentifier) {
                    $rootScope.stationData = $scope.selectedStation;
                    $rootScope.deviceidentifier = $rootScope.stationData.DeviceIdentifier
                    $rootScope.setCookie('deviceidentifier', $rootScope.deviceidentifier, 365);
                }
                membershipService.login($scope.user, loginCompleted)
            }
            else
                notificationService.displayError("You must select a station to login.");
        }

        function loginCompleted(result) {
            if (result.data.Success) {
                var user = result.data.User;
                $modalInstance.dismiss();

                if (!user.MustChange) {
                    membershipService.saveCredentials(user, result.data.Roles, $scope.locale, $scope.errorLevel, result.data.SessionId, $rootScope.stationData);
                    notificationService.displaySuccess('Hello ' + user.FirstName);
                    $rootScope.userData.displayUserInfo(user.FirstName);
                }

                if ($rootScope.previousState)
                    $location.path($rootScope.previousState);
                else {
                    if (user.MustChange)
                        $location.path('/changepassword/' + user.UserId);
                    else if (user.IsDisabled) {
                    }
                }
            }
            else
                notificationService.displayError($rootScope.translate($scope.pageTransPrefix + 'LoginFailed'));
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function getStation() {
            $rootScope.deviceidentifier = $rootScope.getCookie('deviceidentifier');

            if ($rootScope.deviceidentifier != null && $rootScope.deviceidentifier != "")
                $rootScope.getStationByDevice($rootScope.deviceidentifier, loadStationCompleted, loadStationFailed);
            else
                $scope.getStationsBySoftLink(getStationsBySoftLinkCompleted, getStationsBySoftLinkFailed);
        }
 
        function loadStationCompleted(result) {
            var station = result.data.Station;

            if (station != null) {
                $rootScope.stationData = station;
                $rootScope.deviceidentifier = $rootScope.stationData.DeviceIdentifier
                $rootScope.setCookie('deviceidentifier', $rootScope.deviceidentifier, 365);
            } 

            $scope.getStationsBySoftLink(getStationsBySoftLinkCompleted, getStationsBySoftLinkFailed);
        }

        function loadStationFailed(response) {
        }

        function getStationsBySoftLinkCompleted(result) {

            if (typeof $rootScope.stationData.DeviceIdentifier != 'undefined' && $rootScope.stationData.DeviceIdentifier != "") {
                if ($rootScope.stationData.HardLink)
                    $scope.stations.push($rootScope.stationData);
                else
                    $scope.stations = result.data.Stations;

                $scope.selectedStation = $rootScope.stationData
            }
            else {
                $scope.stations = result.data.Stations;
                if (typeof $scope.stations[0] != 'undefined')
                    $scope.selectedStation = $scope.stations[0];
            }
        }

        function getStationsBySoftLinkFailed(response) {
        }

        getStation();
    }
})(angular.module('common.core'));