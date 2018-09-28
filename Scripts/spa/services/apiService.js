(function (app) {
    'use strict';

    app.factory('apiService', apiService);

    apiService.$inject = ['$http', '$location', 'notificationService', '$rootScope'];

    function apiService($http, $location, notificationService, $rootScope) {
        var service = {
            get: get,
            post: post,
            put: put,
            delete: del
        };

        function get(url, config, success, failure) {
            return $http.get(url, config)
                .then(function (result) {
                    success(result);
                }, function (error) {
                    if (error.status == '0') {
                        $rootScope.logout();
                    }
                    else if (error.status == '401') {
                        notificationService.displayError('Authentication required.');
                        $rootScope.previousState = $location.path();
                        $location.path('/login');
                    }
                    else if (error.status == '403') {
                        notificationService.displayError('You do not have access to this resource.');
                    }
                    else if (failure != null) {
                        failure(error);
                    }
                });
        }

        function post(url, data, success, failure) {
            return $http.post(url, data)
                .then(function (result) {
                    success(result);
                }, function (error) {
                    if (error.status == '0') {
                        $rootScope.logout();
                    }
                    else if (error.status == '401') {
                        notificationService.displayError('Authentication required.');
                        $rootScope.previousState = $location.path();
                        $location.path('/login');
                    }
                    else if (error.status == '403') {
                        notificationService.displayError('You do not have access to this resource.');
                    }
                    else if (failure != null) {
                        failure(error);
                    }
                });
        }

        function put(url, data, success, failure) {
            return $http.put(url, data)
                .then(function (result) {
                    success(result);
                }, function (error) {
                    if (error.status == '0') {
                        $rootScope.logout();
                    }
                    else if (error.status == '401') {
                        notificationService.displayError('Authentication required.');
                        $rootScope.previousState = $location.path();
                        $location.path('/login');
                    }
                    else if (error.status == '403') {
                        notificationService.displayError('You do not have access to this resource.');
                    }
                    else if (failure != null) {
                        failure(error);
                    }
                });
        }

        function del(url, data, success, failure) {
            return $http.delete(url, data)
                .then(function (result) {
                    success(result);
                }, function (error) {
                    if (error.status == '0') {
                        $rootScope.logout();
                    }
                    else if (error.status == '401') {
                        notificationService.displayError('Authentication required.');
                        $rootScope.previousState = $location.path();
                        $location.path('/login');
                    }
                    else if (error.status == '403') {
                        notificationService.displayError('You do not have access to this resource.');
                    }
                    else if (failure != null) {
                        failure(error);
                    }
                });
        }

        return service;
    }

})(angular.module('common.core'));