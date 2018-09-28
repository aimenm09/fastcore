(function (app) {
    'use strict';

    app.controller('shortGroupItemsCtrl', shortGroupItemsCtrl);

    shortGroupItemsCtrl.$inject = ['$scope', '$rootScope', '$modal', '$modalInstance', '$timeout', 'apiService', 'notificationService', 'settings'];

    function shortGroupItemsCtrl($scope, $rootScope, $modal, $modalInstance, $timeout, apiService, notificationService, settings) {
        $scope.selectedItem = null;

        $scope.pageTransPrefix = 'spa.group.groupmonitor.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.ok = function () {
            $scope.details['isCanceled'] = false;
            $modalInstance.dismiss();
        }

        $scope.cancel = function () {
            $scope.details['isCanceled'] = true;
            $modalInstance.dismiss();
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 10;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('Shorts');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 0)
                        itemHeight = table.rows[0].clientHeight;

                    var clientRect = table.getBoundingClientRect();
                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - clientRect.top - 125;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    $scope.TableHeight = screenHeight;

                    var padCol = document.getElementById('padColShorts');
                    if (padCol != null) {
                        if (itemHeight > screenHeight)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    $scope.fillWidth = 0;
                    var header = table.children[0].children[0];
                    for (var i = 0; i < header.cells.length - 1; ++i)
                        $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);

                    var body = table.children[1];
                    var rect = table.getBoundingClientRect();
                    var grips = document.getElementById('ShortsGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.left = '17px';
                    grips.style.top = '58px';
                    grips.style.width = rect.width - ((itemHeight > rect.height) ? 17 : 0) + 'px';
                    grips.style.height = rect.height - ((body.scrollWidth > body.clientWidth) ? 17 : 0) + "px";
                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        $rootScope.Shorts = [];
        function load() {
            for (var i = 0; i < $scope.details.ShortList.length; ++i) {
                var detail = $scope.details.ShortList[i];
                var master;
                if (detail.Sku != null) {
                    master = {
                        Index: detail.Index,
                        ItemMasterID: detail.ItemMasterID,
                        Sku: detail.Sku,
                        OrderHeaderID: detail.OrderHeaderID,
                        OrderNumber: detail.OrderNumber,
                        PONumber: detail.PONumber,
                        OrderDetailID: detail.OrderDetailID,
                        QtyRequired: detail.QtyRequired,
                        InventoryQty: detail.InventoryQty,
                        Visible: false,
                        Details: []
                    }

                    $rootScope.Shorts.push(master);
                }
                else {
                    var detail = {
                        Index: detail.Index,
                        ItemMasterID: detail.ItemMasterID,
                        Sku: detail.Sku,
                        OrderHeaderID: detail.OrderHeaderID,
                        OrderNumber: detail.OrderNumber,
                        PONumber: detail.PONumber,
                        OrderDetailID: detail.OrderDetailID,
                        QtyRequired: detail.QtyRequired,
                        InventoryQty: detail.InventoryQty
                    }

                    master.Details.push(detail);
                }
            }

            $timeout(function () {
                $scope.selectedItem = $rootScope.Shorts[0];
                var table = document.getElementById('Shorts');
                var head = table.children[0].children[0].children;
                $rootScope.initSortColumns('Shorts', head, $rootScope.Shorts);
                $rootScope.handleResize('Shorts', 'ShortsGrips',
                    function (fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    },
                    function (colId, tableId, row, mode) {
                        if (row == -1) {
                            if (colId == 'colShortsSku')
                                return false;
                            else {
                                var orderBy = $rootScope.getOrderByField('Shorts')
                                if (orderBy != null) {
                                    var pre = orderBy.IsReversed ? '-' : '';
                                    var field = pre + orderBy.Field.substring(tableId.length + 3, orderBy.Field.length);
                                    for (var i = 0; i < $rootScope.Shorts.length; ++i)
                                        $rootScope.Shorts[i].Details.sort($rootScope.dynamicSort(field));
                                    $scope.$apply();
                                }
                                return true;
                            }
                        }
                        else if (row > -1) {
                            $scope.editItem = {};
                            var offset = 0;
                            for (var i = 0; i < row - offset; ++i) {
                                var item = $rootScope.Shorts[i];
                                if (item.Visible) {
                                    if ((row - i - offset) <= item.Details.length) {
                                        $scope.selectedItem = item.Details[row - offset - i - 1];

                                        if (mode == 'dblclick') {
                                            $scope.editItem = $scope.selectedItem;
                                            $timeout(function() {
                                                var items = document.getElementsByClassName('input');
                                                items[0].focus();
                                                items[0].select();
                                            }, 100);
                                        }
                                        return;
                                    }
                                    else
                                        offset += item.Details.length;
                                }
                            }

                            $scope.selectedItem = $rootScope.Shorts[row - offset];
                            if (mode == 'dblclick')
                                $scope.selectedItem.Visible = !$scope.selectedItem.Visible;
                        }
                        else
                            $scope.selectedItem = null;

                        $scope.$apply();
                        return true;
                    })
                sizeTables();
            }, 100);
        }

        $scope.editItem = {};
        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        $scope.matchQty = function () {
            var totalQty;

            // Reset all inventory
            for (var i = 0; i < $rootScope.Shorts.length; ++i) {
                var detail = $rootScope.Shorts[i];
                totalQty = detail.InventoryQty;
                for (var j = 0; j < detail.Details.length; ++j) {
                    totalQty += detail.Details[j].InventoryQty;
                    detail.Details[j].InventoryQty = 0;
                }
                detail.InventoryQty = totalQty;
            }
                
            for (var i = 0; i < $rootScope.Shorts.length; ++i) {
                var detail = $rootScope.Shorts[i];
                totalQty = detail.InventoryQty;
                for (var j = 0; j < detail.Details.length; ++j) {
                    if (totalQty >= detail.Details[j].QtyRequired) {
                        detail.Visible = true;
                        detail.Details[j].InventoryQty = detail.Details[j].QtyRequired;
                        totalQty -= detail.Details[j].QtyRequired;
                    }
                    else
                        break;
                }
                detail.InventoryQty = totalQty;
            }
        }

        $scope.remove = function () {
            if ($scope.selectedItem != null) {
                $rootScope.releasePickGroups('op=3' + '&groupData=' + $scope.groupIds + '&orderRemovalData=' + $scope.selectedItem.OrderHeaderID,
                    function (result) {
                        if (result.data.Result != 1) {
                            $scope.Text1 = result.data.ReasonDescription;
                            //$scope.Text2 = $rootScope.translate('ConfirmCancel');
                            $scope.Image = 'Content/images/alert.png';
                            $scope.Buttons = 'OK,Cancel';
                            $scope.status = { ButtonClicked: '' };
                            $modal.open({
                                templateUrl: 'scripts/spa/confirmation/notification.html',
                                controller: 'notificationCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if ($scope.status.ButtonClicked == 'OK')
                                    $modalInstance.dismiss();
                            });
                        }
                    },
                    function (response) {
                    }
                );
            }
        }

        $scope.removeAll = function () {
            $rootScope.releasePickGroups('op=5' + '&groupData=' + $scope.groupIds,
                function (result) {
                },
                function (response) {
                }
            );
        }

        $scope.release = function () {
            $modal.open({
                templateUrl: 'scripts/spa/monitors/groups/releaseProgress.html',
                controller: 'releaseProgressCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
            });
        }

        load();
    }
})(angular.module('fastTrakWebUI'));