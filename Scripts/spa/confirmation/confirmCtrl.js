(function (app) {
    'use strict';

    app.controller('confirmCtrl', confirmCtrl);

    confirmCtrl.$inject = ['$scope', '$modalInstance', 'apiService', 'notificationService'];

    function confirmCtrl($scope, $modalInstance, apiService, notificationService) {
        $scope.deleteObject = deleteObject;
        $scope.cancelDelete = cancelDelete;

        function deleteObject() {
            $scope.deleteItem = deleteItem;
            $scope.itemDeleteCompleted = itemDeleteCompleted;
            $scope.itemDeleteFailed = itemDeleteFailed;

            function deleteItem() {
                apiService.delete($scope.deleteUrl, null,
                    itemDeleteCompleted,
                    itemDeleteFailed);
            }

            function itemDeleteCompleted(result) {
                $scope.status.isCanceled = false;
                $modalInstance.dismiss();
            }

            function itemDeleteFailed(response) {
                notificationService.displayError(response.statusText);
            }

            deleteItem();
        }

        function cancelDelete() {
            $scope.status.isCanceled = true;
            $modalInstance.dismiss();
        }
    }
})(angular.module('fastTrakWebUI'));