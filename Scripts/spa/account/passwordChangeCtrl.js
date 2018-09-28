(function (app) {
    'use strict';

    app.controller('passwordChangeCtrl', passwordChangeCtrl);

    passwordChangeCtrl.$inject = ['$scope', '$rootScope', '$routeParams', '$location', 'settings', 'membershipService', 'apiService', 'notificationService'];

    function passwordChangeCtrl($scope, $rootScope, $routeParams, $location, settings, membershipService, apiService, notificationService) {
        $scope.password;
        $scope.confirmPassword;
        $scope.updatePassword = updatePassword;
        $scope.isValid = true;
        $scope.resetIsValid = resetIsValid;

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.pageTransPrefix = 'spa.account.login.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function resetIsValid() {
            $scope.isValid = true;
        }

        function updatePassword() {
            $scope.isValid = ($scope.password != null) && ($scope.confirmPassword != null) && ($scope.password == $scope.confirmPassword);
            if ($scope.isValid)
                $rootScope.changePassword(membershipService.userId(), $scope.password, passwordChangeCompleted, passwordChangeFailed);
        }

        function passwordChangeCompleted(response) {
            membershipService.removeCredentials();
            notificationService.displaySuccess('Your passwod has been changed');
            $location.path('/login');
        }

        function passwordChangeFailed(response) {
            notificationService.displayError(response.data);
        }
    }
})(angular.module('fastTrakWebUI'));