(function (app) {
    'use strict';

    app.controller('confirmResetCtrl', confirmResetCtrl);

    confirmResetCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', 'notificationService', 'apiService', '$location'];

    function confirmResetCtrl($scope, $rootScope, $modalInstance, notificationService, apiService, $location) {
        $scope.pageClass = 'resetPassword';
        $scope.resetPassword = resetPassword;
        $scope.cancelReset = cancelReset;

        function resetPassword() {
            $rootScope.resetPassword($scope.user, resetPasswordCompleted, resetPasswordFailed);
        }

        function resetPasswordCompleted(response) {
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
            notificationService.displaySuccess('Your password has been reset successfully');
            $location.path('/changepassword/' + response.data);
        }

        function resetPasswordFailed(response) {
            notificationService.displayError(response.data);
        }

        function cancelReset() {
            $modalInstance.dismiss();
        }
    }
})(angular.module('fastTrakWebUI'));