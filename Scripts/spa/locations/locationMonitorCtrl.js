(function (app) {
    'use strict';

    app.controller('locationMonitorCtrl', locationMonitorCtrl);

    locationMonitorCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function locationMonitorCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.tabs = [];
        $scope.index = 0;
        $scope.visibleCount;
        $scope.selectedTab;

        $scope.left = function () {
            if ($scope.index > 0) {
                --$scope.index;
                for (var i = $scope.index; i < $scope.tabs.length; ++i)
                    $scope.tabs[i].Hidden = false;
            }
        }

        $scope.right = function () {
            if (($scope.index + $scope.visibleCount) < $scope.tabs.length) {
                ++$scope.index;
                for (var i = 0; i < $scope.index; ++i)
                    $scope.tabs[i].Hidden = true;
            }
        }

        $scope.messages = [];

        function init2() {
            var i = 0;
            while (++i < 10) {
                $timeout(function () {
                    $scope.messages.push({ 'Data': 'Testing...' });
                }, 1000);
            }
        }

        function init() {
            for (var i = 0; i < 10; ++i) {
                var tab = { Name: 'Tab ' + (i + 1), Hidden: false };
                $scope.tabs.push(tab);
            }

            $scope.selectedTab = $scope.tabs[0];

            var div = document.getElementById('dvMain');
            var width = div.clientWidth;

            $timeout(function () {
                $scope.visibleCount = 0;
            
                var totalWidth = 0;
                for (var i = 0; i < div.children.length; ++i) {
                    var child = div.children[i];
                    if (child.nodeName == 'DIV') {
                        totalWidth += child.clientWidth;
                        if (totalWidth > width)
                            break;
                        ++$scope.visibleCount;
                    }
                }
            }, 100);

            //var websocket = new WebSocket('ws://localhost:7822/api/orders/releaseorders');
            //while (websocket == null) { }

            //if (websocket != null) {
            //    websocket.onopen = function () {
            //    }
            //
            //    websocket.onmessage = function (message) {
            //        $scope.messages.push({ 'Data': message.data });
            //        $scope.$apply();
            //    }
            //
            //    websocket.onerror = function (error) {
            //        var i = 0;
            //    }
            //
            //    websocket.onclose = function () {
            //    }
            //}
        }

        $scope.data = { RuleName: '', Description: '' };

        $scope.ok = function () {
            var i = 1;
        }

        $scope.cancel = function () {
            var i = 1;
        }

        init();
    }
})(angular.module('fastTrakWebUI'));