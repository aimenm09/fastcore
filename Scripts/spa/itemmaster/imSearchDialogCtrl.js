(function (app) {
    'use strict';

    app.controller('imSearchDialogCtrl', imSearchDialogCtrl);

    imSearchDialogCtrl.$inject = ['$scope', '$modalInstance'];

    function imSearchDialogCtrl($scope, $modalInstance) {
        $scope.addSearchTerm = addSearchTerm;
        $scope.cancel = cancel;

        function addSearchTerm() {
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function init() {
            if ($scope.SearchInfo.SelectedColumn.Caption == null)
                $scope.SearchInfo.SelectedColumn = $scope.SearchInfo.ColumnNames[0];
        }

        init();
    }
})(angular.module('fastTrakWebUI'));