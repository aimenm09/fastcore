(function (app) {
    'use strict';

    app.controller('notificationCtrl', notificationCtrl);

    notificationCtrl.$inject = ['$scope', '$modalInstance'];

    function notificationCtrl($scope, $modalInstance) {
        $scope.ok = ok;
        $scope.cancel = cancel;
        $scope.showOk = showOk;
        $scope.showCancel = showCancel;

        function ok() {
            $scope.status.ButtonClicked = 'OK';
            $modalInstance.dismiss();
        }

        function cancel() {
            $scope.status.ButtonClicked = 'Cancel';
            $modalInstance.dismiss();
        }

        function showOk() {
            return $scope.Buttons.includes('OK');
        }

        function showCancel() {
            return $scope.Buttons.includes('Cancel');
        }
    }
})(angular.module('fastTrakWebUI'));