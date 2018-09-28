(function (app) {
    'use strict';

    app.controller('stationSwitchPromptCtrl', stationSwitchPromptCtrl);

    stationSwitchPromptCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$modal', 'notificationService', 'membershipService'];

    function stationSwitchPromptCtrl($scope, $rootScope, $modalInstance, $modal, notificationService, membershipService) {
        $scope.setSwitchStation = setSwitchStation;
        $scope.cancel = cancel;
        $scope.hardlink = hardlink;
        $scope.selectedStation = "";

        function setSwitchStation() {
            if (typeof $scope.selectedStation.DeviceIdentifier != 'undefined' && $scope.selectedStation.DeviceIdentifier != "") {
                
                $scope.getStationByDevice($scope.selectedStation.DeviceIdentifier, getStationByDeviceCompleted, getStationByDeviceFailed);
                
            } else {
                notificationService.displayInfo("First select a station to switch to.");
            }
        }

        function getStationByDeviceCompleted(result) {
            var station = result.data.Station;

            if (station != null) {
                $rootScope.stationData = $rootScope.repository.loggedUser.station = station;
                $rootScope.deviceidentifier = $rootScope.stationData.DeviceIdentifier
                $rootScope.setCookie('deviceidentifier', $rootScope.deviceidentifier, 365);
                membershipService.saveCurrentLoggedUserCredentials();
                notificationService.displaySuccess("Station switched successfully.");
                
            } else {
                notificationService.displayError("Failed to switch the station. Try again or contact the administrator.");
            }
            
            $modalInstance.dismiss();
        }

        function getStationByDeviceFailed(response) {
            notificationService.displayError("Failed to switch the station. Try again or contact the administrator.");
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function hardlink() {
            $modalInstance.dismiss();
            $modal.open({
                templateUrl: 'scripts/spa/stations/stationHardlinkRequest.html',
                controller: 'stationHardlinkRequestCtrl',
                scope: $rootScope
            });
        }

        function getStationsBySoftLinkCompleted(result) {
            $scope.stations = result.data.Stations;

        }

        function getStationsBySoftLinkFailed(response) {

        }

        function init() {
            $scope.getStationsBySoftLink(getStationsBySoftLinkCompleted, getStationsBySoftLinkFailed);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));