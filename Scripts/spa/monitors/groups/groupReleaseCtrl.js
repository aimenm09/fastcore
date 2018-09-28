(function (app) {
    'use strict';

    app.controller('groupReleaseCtrl', groupReleaseCtrl);

    groupReleaseCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function groupReleaseCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-releaseorders';
        $scope.loadingOrders = false;
        $scope.orderColumnNames = [];
        $rootScope.Orders = [];
        $scope.selectedOrders = [];
        $scope.selectedItemNumber = -100;

        $scope.selected = 0;
        $scope.orders = 0;
        $scope.lines = 0;
        $scope.units = 0;
        $scope.containers = 0;
        $scope.skus = 0;
        $scope.sporders = 0;
        $scope.fte = 0;
        $scope.fillWidth = 0;

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.pageTransPrefix = 'spa.group.releaseorders.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getGroupReleaseDisplayedFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            var isInit = true;
            function loadDisplayedFieldsCompleted(result) {
                var data = result.data.OrderFields;
                $rootScope.initColumns(data, $scope.orderColumnNames);
                initGrids();
                $scope.loadGroupedOrders();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == 'orders')
                    $scope.loadingOrders = true;
            }, 1000);
        }

        $scope.loadGroupedOrders = function () {
            $rootScope.getGroupedOrders(ordersLoadCompleted, ordersLoadFailed);

            function ordersLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Orders = result.data.Orders;
                $scope.loadingOrders = false;
                $rootScope.resize();
                $scope.$apply();
            }

            function ordersLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingOrders = false;
                notificationService.displayError(response.statusText);
            }
        }

        $scope.toggleSelection = function (order) {
            var idx = -1;
            for (var i = 0; i < $scope.selectedOrders.length; ++i) {
                if ($scope.selectedOrders[i].PickGroupID == order.PickGroupID) {
                    idx = i;
                    break;
                }
            }
        
            if (idx > -1) {
                $scope.selectedOrders.splice(idx, 1);
                --$scope.selected;
                $scope.orders -= order.Orders;
                $scope.lines -= order.Lines;
                $scope.units -= order.Units;
                $scope.containers -= order.Containers;
                $scope.skus -= order.Skus;
                $scope.sporders -= order.SinglePieceOrders;
                $scope.fte -= order.FTE;
            }
            else {
                $scope.selectedOrders.push(order);
                ++$scope.selected;
                $scope.orders += order.Orders;
                $scope.lines += order.Lines;
                $scope.units += order.Units;
                $scope.containers += order.Containers;
                $scope.skus += order.Skus;
                $scope.sporders += order.SinglePieceOrders;
                $scope.fte += order.FTE;
            }
        };

        $scope.IsSelected = function (order) {
            for (var i = 0; i < $scope.selectedOrders.length; ++i) {
                if ($scope.selectedOrders[i].PickGroupID == order.PickGroupID)
                    return true;
            }
        }

        $scope.addReleaseInstructions = function () {
            $scope.GroupComment = {
                GroupId: $rootScope.Orders[$scope.selectedGroupIndex].PickGroupID,
                CommentType: 'Release Instructions',
                DisplayName: $scope.localTranslate('ReleaseInstructions'),
                Comment: ''
            };
            $modal.open({
                templateUrl: 'scripts/spa/monitors/groups/groupComment.html',
                controller: 'groupCommentCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
            });
        };

        function init() {
            loadDisplayedFields();
        }

        $scope.selectedGroupIndex = -1;
        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1) {
                        switch (tableId) {
                            case 'Orders':
                                return false;
                        }
                    }
                    else if (row > -1) {
                        switch (tableId.replace(/[0-9]/g, '')) {
                            case 'Orders':
                                $scope.selectedGroupIndex = row;
                                var order = $rootScope.Orders[row];
                                $scope.selectedItemNumber = order['PickGroupID'];
                                break;
                        }

                        $scope.$apply();
                    }
                    else {
                        switch (tableId.replace(/[0-9]/g, '')) {
                            case 'Orders':
                                $scope.selectedGroupIndex = -1;
                                $scope.selectedItemNumber = -100;
                                break;
                        }

                        $scope.$apply();
                    }
                }, 100);
            });
        }

        $scope.releaseOrders = function (op) {
            op = op || 1;
            $scope.groupIds = '';
            for (var i = 0; i < $scope.selectedOrders.length; ++i)
                $scope.groupIds += $scope.selectedOrders[i].PickGroupID + ',';
            $rootScope.releasePickGroups('op=' + op + '&groupData=' + $scope.groupIds,
                function (result) {
                    $scope.details = result.data;
                    $rootScope.ShortList = { Shorts: result.data.ShortList };
                    if ($scope.details.Result != 1) {
                        $scope.Text1 = $scope.details.ReasonDescription;
                        $scope.Image = 'Content/images/Alert.png';
                        $scope.Buttons = 'OK';
                        $scope.status = { ButtonClicked: '' };
                        $modal.open({
                            templateUrl: 'scripts/spa/confirmation/notification.html',
                            controller: 'notificationCtrl',
                            scope: $scope
                        });
                    }
                    else {
                        if ($scope.ShortList.Shorts.length > 0) {
                            $scope.details.shorts = $modal.open({
                                templateUrl: 'scripts/spa/monitors/groups/shortGroupItems.html',
                                controller: 'shortGroupItemsCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.details['isCanceled'])
                                    $scope.groupOrder(2);
                            });
                        }
                    }
                },
                function (response) {
                }
            );
        }

        init();
    }
})(angular.module('fastTrakWebUI'));