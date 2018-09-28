(function (app) {
    'use strict';

    app.controller('shortItemsCtrl', shortItemsCtrl);

    shortItemsCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$timeout', 'apiService', 'notificationService', 'settings'];

    function shortItemsCtrl($scope, $rootScope, $modalInstance, $timeout, apiService, notificationService, settings) {
        $scope.selectedItemNumber = -100;

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
                    grips.style.top = '108px';
                    grips.style.width = rect.width - ((itemHeight > rect.height) ? 17 : 0) + 'px';
                    grips.style.height = rect.height - ((body.scrollWidth > body.clientWidth) ? 17 : 0) + "px";
                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        $rootScope.Shorts = [];
        function load() {
            $scope.details['isCanceled'] = true;

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
                    function (colId, tableId, row) {
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
                            var offset = 0;
                            for (var i = 0; i < row - offset; ++i) {
                                var item = $rootScope.Shorts[i];
                                if (item.Visible) {
                                    if ((row - i - offset) <= item.Details.length) {
                                        $scope.selectedItem = item.Details[row - offset - i - 1];
                                        return;
                                    }
                                    else
                                        offset += item.Details.length;
                                }
                            }

                            $scope.selectedItem = $rootScope.Shorts[row - offset];
                        }
                        else
                            $scope.selectedItem = null;

                        $scope.$apply();
                        return true;
                    })
                sizeTables();
            }, 100);
        }

        load();
    }
})(angular.module('fastTrakWebUI'));