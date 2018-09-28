(function (app) {
    'use strict';

    app.controller('searchDialogCtrl', searchDialogCtrl);

    searchDialogCtrl.$inject = ['$scope', '$modalInstance', '$timeout', 'apiService', 'notificationService', 'settings'];

    function searchDialogCtrl($scope, $modalInstance, $timeout, apiService, notificationService, settings) {
        $scope.addSearchTerm = addSearchTerm;
        $scope.cancel = cancel;

        function addSearchTerm() {
            $modalInstance.dismiss();
        }

        function cancel() {
            $scope.status.isCanceled = true;
            $modalInstance.dismiss();
        }
    }
})(angular.module('fastTrakWebUI'));