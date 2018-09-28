(function (app) {
    'use strict';

    app.controller('whereIsTransactionCtrl', whereIsTransactionCtrl);

    whereIsTransactionCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function whereIsTransactionCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        $rootScope.Details = [];

        $scope.pageClass = 'page-whereistransaction';
        $scope.selectedItemNumber = -100;

        $scope.Scanned = { Sku: '', Search: '' };

        $scope.columnNames = [];
        $scope.inventoryFields = [];
        $scope.allocatedFields = [];
        $scope.statusFields = [];
        $scope.fillWidth = 0;

        $scope.Sku;
        $scope.Inventory = [];
        $scope.Allocated = [];
        $scope.Status = [];

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.pageTransPrefix = 'spa.inventory.whereistransaction.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getWhereIsDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);
        
            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.DetailsFields, $scope.columnNames);
                $rootScope.initColumns(data.InventoryFields, $scope.inventoryFields);
                $rootScope.initColumns(data.AllocatedFields, $scope.allocatedFields);
                $rootScope.initColumns(data.StatusFields, $scope.statusFields);
                initGrids();
            }
        
            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "details")
                    $scope.loadingDetails = true;
            }, 1000);
        }

        $scope.loadInventoryLocations = function () {
            //showSpinner('details');

            $rootScope.getInventoryLocations($scope.Scanned.Sku,
                inventoryLoadCompleted,
                inventoryLoadFailed);

            function inventoryLoadCompleted(result) {
                //$timeout.cancel(stop);
                //$scope.loadingDetails = false;
                if (result.data.ReturnCode == 1) {
                    $rootScope.Details = result.data.Details;
                    $rootScope.Details.Details = [];
                    $scope.Inventory = result.data.Inventory;
                    $scope.Allocated = result.data.Allocated;
                    $scope.Status = result.data.Status;
                    $scope.Sku = result.data.Sku;

                    for (var i = 0; i < $rootScope.Details.length; ++i)
                        $rootScope.Details['visible'] = false;

                    initGrids();
                }
                else
                    notificationService.displayError(result.data.ReasonDescription);
            }

            function inventoryLoadFailed(response) {
                //$timeout.cancel(stop);
                //$scope.loadingUsers = false;
                notificationService.displayError(response.statusText);
            }
        }

        function init() {
            loadDisplayedFields();
            document.getElementById('Sku').focus();
        }

        $scope.getDetails = function (item) {
            if (item.Details == null) {
                $rootScope.getInventoryLocationDetails($scope.Scanned.Sku, item.LocationID,
                    detailsLoadCompleted,
                    detailsLoadFailed);
            }
            else
                item.visible = !item.visible;

            function detailsLoadCompleted(result) {
                //$timeout.cancel(stop);
                item.visible = true;
                item.Details = result.data.Items;

                for (var i = 0; i < item.Details.length; ++i)
                    item.Details[i].Index = item.LocationID + '-' + i;
                //$scope.loadingDetails = false;
            }

            function detailsLoadFailed(response) {
                //$timeout.cancel(stop);
                //$scope.loadingUsers = false;
                notificationService.displayError(response.statusText);
            }
        }

        init();

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row, mode) {
                    if (row == -1) {
                        if (colId == 'colDetailsLocation')
                            return false;
                        else {
                            var orderBy = $rootScope.getOrderByField('Details')
                            if (orderBy != null) {
                                var pre = orderBy.IsReversed ? '-' : '';
                                var field = pre + orderBy.Field.substring(tableId.length + 3, orderBy.Field.length);
                                for (var i = 0; i < $rootScope.Details.length; ++i)
                                    $rootScope.Details[i].Details.sort($rootScope.dynamicSort(field));
                                $scope.$apply();
                            }
                            return true;
                        }
                    }
                    else if (row > -1) {
                        var offset = 0;
                        for (var i = 0; i < row - offset; ++i) {
                            var item = $rootScope.Details[i];
                            if (item.visible) {
                                if ((row - i - offset) <= item.Details.length) {
                                    $scope.selectedItemNumber = item.Details[row - offset - i - 1].Index;
                                    $scope.$apply();
                                    return;
                                }
                                else
                                    offset += item.Details.length;
                            }
                        }

                        $scope.selectedItem = $rootScope.Details[row - offset];
                        $scope.selectedItemNumber = $scope.selectedItem.LocationID;
                        if (mode == 'dblclick') {
                            if ($scope.selectedItem.visible)
                                $scope.selectedItem.visible = !$scope.selectedItem.visible;
                            else
                                $scope.getDetails($scope.selectedItem);
                        }
                    }
                    else
                        $scope.selectedItem = null;

                    $scope.$apply();
                    return true;
                });
            }, 100);
        }

        window.onkeydown = function (e) {
            if (e.keyCode === 13) {
                var el = document.activeElement;
                if ((el.nodeName == 'INPUT') && (el.value != ''))
                    $scope.loadInventoryLocations();
                return false;
            }
        }

        var nextSearchPos = 0;
        var wasFound = false;
        $scope.search = function () {
            for (var i = nextSearchPos; i < $rootScope.Details.length; ++i) {
                if ($rootScope.Details[i].Location.indexOf($scope.Scanned.Search) != -1) {
                    $scope.selectedItemNumber = $rootScope.Details[i].LocationID;
                    nextSearchPos = ++i;
                    wasFound = true;
                    return;
                }
            }

            nextSearchPos = 0;
            notificationService.displayInfo(wasFound ? 'No more occurences found for ' + $scope.Scanned.Search : $scope.Scanned.Search + ' not found');
            wasFound = false;
        }

        $scope.process = function () {
            $scope.loadInventoryLocations();
        }

        $scope.reset = function () {
            $scope.Sku;
            $scope.Scanned = { Sku: '' };
            $rootScope.Details = [];
            $scope.Inventory = [];
            $scope.Allocated = [];
            $scope.Status = [];

            $timeout(function () {
                document.getElementById('Sku').focus();
            }, 10);
        }
    }
})(angular.module('fastTrakWebUI'));