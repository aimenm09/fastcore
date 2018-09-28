(function (app) {
    'use strict';

    app.controller('stationLinkCtrl', stationLinkCtrl);

    stationLinkCtrl.$inject = ['$scope', '$modalInstance'];

    function stationLinkCtrl($scope, $modalInstance) {
        $scope.linkStation = linkStation;
        $scope.cancel = cancel;

        function linkStation() {
            var linkcode = document.getElementById("linkCode").value;
            $scope.putStationsLink($scope.LinkInfo.id, linkcode, putStationLinkCompleted, putStationLinkFailed);
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function putStationLinkCompleted(result) {
            $scope.status.isSuccess = true;
            $scope.status.reasonDescription = "Station successfully linked";
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
        }

        function putStationLinkFailed(response) {
            
            $scope.status.isSuccess = false;
            $scope.status.reasonDescription = response.data;
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
        }
    }
})(angular.module('fastTrakWebUI'));