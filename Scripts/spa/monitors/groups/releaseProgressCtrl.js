(function (app) {
    'use strict';

    app.controller('releaseProgressCtrl', releaseProgressCtrl);

    releaseProgressCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$timeout', 'settings'];

    function releaseProgressCtrl($scope, $rootScope, $modalInstance, $timeout, settings) {
        $scope.messages = [];

        function init() {
            $timeout(function () {
                var messageTable = document.getElementById('messageTable');
                var body = document.getElementById('body');
                body.style.minWidth = messageTable.clientWidth + 'px';
            }, 100);

            var idx = settings.webApiBaseUrl.indexOf('/');
            var api = settings.webApiBaseUrl.substring(idx);

            var count = $scope.selectedOrders.length;
            var websocket = new WebSocket('ws:' + api + '/api/pickgroups/releasegroups?op=2&groupData=' + $scope.groupIds);
            while (websocket == null) { }

            if (websocket != null) {
                websocket.onopen = function () {
                }

                websocket.onmessage = function (message) {
                    $scope.messages.push({ 'Data': message.data });
                    $scope.$apply();
                }

                websocket.onerror = function (error) {
                    $scope.messages.push({ 'Data': 'Error: ' + error.data });
                    $scope.$apply();
                }

                websocket.onclose = function () {
                    $scope.messages.push({ 'Data': 'Release complete' });
                    $scope.$apply();
                }
            }
        }

        $scope.close = function () {
            $modalInstance.dismiss();
        }

        init();
    }
})(angular.module('fastTrakWebUI'));