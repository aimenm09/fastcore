(function (app) {
    'use strict';

    app.controller('stationHardlinkRequestCtrl', stationHardlinkRequestCtrl);

    stationHardlinkRequestCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$timeout', 'apiService', 'notificationService', 'settings', 'membershipService'];

    function stationHardlinkRequestCtrl($scope, $rootScope, $modalInstance, $timeout, apiService, notificationService, settings, membershipService) {
        $scope.cancel = cancel;
        $scope.setHardLink = setHardLink;

        function getStationByDeviceCompleted(result) {
            notificationService.displaySuccess("Station soft linked to this device.");
            $rootScope.stationData = result.data.Station;
            $rootScope.deviceidentifier = $rootScope.stationData.DeviceIdentifier;
            $rootScope.setCookie('deviceidentifier', $rootScope.deviceidentifier, 365);
            $location.path('/');
        }

        function getStationByDeviceFailed(response) {
            notificationService.displayError("Failed to soft link the station to this device. Try again or contact the administrator.");
        }

        function setHardLink() {

            if (typeof $scope.deviceidentifier != 'undefined' && $scope.deviceidentifier != "") {
                $scope.getStationByDevice($scope.deviceidentifier, getStationByDeviceCompleted, getStationByDeviceFailed);
            } else {
                notificationService.displayError("Error occurred attempting to link the device.");
            }
        }

        function getStationByDeviceCompleted(result) {
            var station = result.data.Station;

            if (station != null) {
                $rootScope.stationData = $rootScope.repository.loggedUser.station = station;
                $rootScope.deviceidentifier = $rootScope.stationData.DeviceIdentifier
                $rootScope.setCookie('deviceidentifier', $rootScope.deviceidentifier, 365);
                membershipService.saveCurrentLoggedUserCredentials();
                notificationService.displaySuccess("Station linked successfully.");

            } else {
                notificationService.displayError("Failed to link the station. Try again or contact the administrator.");
            }

            $modalInstance.dismiss();
        }

        function getStationByDeviceFailed(response) {
            notificationService.displayError("Failed to switch the station. Try again or contact the administrator.");
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function postStationRequestLinkCompleted(result) {
            $scope.linkCode = result.data.StationLinkCode;
            $scope.deviceidentifier = result.data.DeviceIdentifier;
            
        }

        function postStationRequestLinkFailed(response) {
            notificationService.displayError("Failed to obtain a link code. Try again or contact the administrator.");
        }

        function init() {
            $scope.postStationRequestLink('webbrowser', postStationRequestLinkCompleted, postStationRequestLinkFailed);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));