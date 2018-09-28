(function (app) {
    'use strict';

    app.factory('membershipService', membershipService);

    membershipService.$inject = ['apiService', 'notificationService', 'settings', '$http', '$base64', '$cookieStore', '$rootScope', '$location', '$modal'];

    function membershipService(apiService, notificationService, settings, $http, $base64, $cookieStore, $rootScope, $location, $modal) {
        var webApiBaseUrl = settings.webApiBaseUrl;

        var service = {
            login: login,
            loginAD: loginAD,
            register: register,
            saveCredentials: saveCredentials,
            saveCurrentLoggedUserCredentials: saveCurrentLoggedUserCredentials,
            removeCredentials: removeCredentials,
            resetPassword: resetPassword,
            isUserLoggedIn: isUserLoggedIn,
            isUserInRole: isUserInRole,
            checkRole: checkRole,
            username: username,
            userId: userId,
            language: language,
            errorLevel: errorLevel,
            station: station
        }

        function login(user, completed) {
            $rootScope.login('userName=' + user.userName +
                "&password=" + encodeURIComponent(user.password) +
                "&LoginType=1",
                completed,
                loginFailed);
        }

        function loginAD(userInfo, completed) {
            $rootScope.loginAD(userInfo.DisplayableId +
                "&firstName=" + userInfo.GivenName +
                "&lastName=" + userInfo.FamilyName +
                "&uniqueId=" + userInfo.UniqueId +
                "&LoginType=1",
                completed,
                loginFailed);
        }

        function register(user, completed) {
            $rootScope.registerUser(user, completed, registrationFailed);
        }

        function saveCredentials(u, roles, locale, errorLevel, sessionId, station) {
            var membershipData = $base64.encode(sessionId);

            $rootScope.repository = {
                loggedUser: {
                    userid: u.UserId,
                    username: u.UserName,
                    userroles: roles,
                    authdata: membershipData,
                    language: locale,
                    errorLevel: errorLevel,
                    station: station,
                    sessionId: sessionId
                }
            };

            $http.defaults.headers.common['Authorization'] = 'Basic ' + membershipData;
            $cookieStore.put('repository', $rootScope.repository);
        }

        function saveCurrentLoggedUserCredentials() {
            var membershipData = $base64.encode($rootScope.repository.loggedUser.sessionId);
            
            $http.defaults.headers.common['Authorization'] = 'Basic ' + membershipData;
            $cookieStore.put('repository', $rootScope.repository);
        }

        function removeCredentials() {
            $rootScope.repository = {};
            $cookieStore.remove('UserInfo');
            $cookieStore.remove('repository');
            $http.defaults.headers.common.Authorization = '';
        };

        function loginFailed(response) {
            notificationService.displayError(response.data);
        }

        function registrationFailed(response) {
            notificationService.displayError('Registration failed. Try again.');
        }

        function resetPassword(user, completed, failed) {
            $rootScope.resetPassword(user, completed, failed);
        }

        function isUserLoggedIn() {
            return $rootScope.repository.loggedUser != null;
        }

        function isUserInRole(role) {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.userroles.indexOf(role) > -1;
        
            return false;
        }

        function checkRole(role) {
            var isValid = false;
            if (isUserLoggedIn())
                isValid = $rootScope.repository.loggedUser.userroles.indexOf(role) > -1;

            if (!isValid) {
                //$rootScope.previousState = $location.path();
                //$location.path('/login/' + role);
                $rootScope.Text1 = 'You do not have permission to access ' + $location.path();
                $rootScope.Image = 'Content/images/error.png';
                $rootScope.Buttons = 'OK';
                $rootScope.status = { ButtonClicked: '' };
                $modal.open({
                    templateUrl: 'scripts/spa/confirmation/notification.html',
                    controller: 'notificationCtrl',
                    scope: $rootScope
                });

                $location.path('/');
            }
        }

        function userId() {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.userid;
            else
                return 0;
        }

        function username() {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.username;
        }

        function language() {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.language;
        }

        function errorLevel() {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.errorLevel;
        }

        function station() {
            if (isUserLoggedIn())
                return $rootScope.repository.loggedUser.station;
        }

        return service;
    }
})(angular.module('common.core'));