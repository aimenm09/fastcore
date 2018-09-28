(function (app) {
    'use strict';

    app.controller('itemMasterCtrl', itemMasterCtrl);

    itemMasterCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];
    function itemMasterCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('ItemMasters');

        $scope.pageClass = 'page-itemMaster';
        $scope.loadingItemMasters = false;
        $scope.sortByField = 'ItemMasterID';
        $scope.reverseItemMasterSort = true;
        $scope.selectedSkuFilter;
        $scope.selectedDescriptionFilter;
        $scope.selectedBarcodeFilter;
        $scope.skuFilters = [];
        $scope.descriptionFilters = [];
        $scope.barcodeFilters = [];
        $scope.columnNames = [];
        $rootScope.ItemMasters = [];
        $scope.SearchInfo = { Title: "Item Master Search", SearchTerm: '', SelectedColumn: { DataId: '' } };
        $scope.selectedItemNumber = -100;

        $scope.pageTransPrefix = 'spa.itemmaster.itemmaster.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;

        $scope.loadItemMasters = loadItemMasters;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {};

        var editMode = ''
        $scope.addNew = function () {
            editMode = 'add';
            $scope.selectedItemNumber = -100;
            $scope.editItem = {};

            for (var i = 0; i < $scope.columnNames.length; ++i)
                $scope.editItem[$scope.columnNames[i].Caption] = '';

            $rootScope.ItemMasters.push($scope.editItem);
            $scope.isEditing = true;
            $scope.$apply();
            $rootScope.resize();
            scrollIntoView();
        }

        $scope.save = function() {
            var isValid = true;

            var colDef;
            var i = 1;
            for (; i < $scope.columnNames.length; ++i) {
                colDef = $scope.columnNames[i];
                if (!colDef.IsNullable && $scope.editItem[colDef.Caption] == '') {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                // saveItem();
                $scope.editItem = {};
                $scope.isEditing = false;
                editMode = '';
            }
            else {
                document.getElementsByClassName('input')[--i].focus();
                notificationService.displayError(colDef.Caption + ' is a required field');
            }
        }

        $scope.cancel = function() {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.ItemMasters.splice($rootScope.ItemMasters.length - 1);
            else {
                for (var i = 0; i < $rootScope.ItemMasters.length; ++i) {
                    var itemMaster = $rootScope.ItemMasters[i];
                    if (itemMaster.ItemMasterID == $scope.originalItem.ItemMasterID) {
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            itemMaster[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
                        break;
                    }
                }
            }

            editMode = '';
            $rootScope.resize();
        }

        $scope.getTemplate = function(item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function() {
                var items = document.getElementById("ItemMasters");
                items.children[items.children.length - 1].scrollIntoView(true);
                document.getElementsByClassName('input')[0].focus();
            }, 100);    
        }

        $scope.getSortClass = function(column) {
            if ($scope.sortByField == column)
                return $scope.reverseItemMasterSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            return '';
        }

        var loadingData;

        function loadFilters() {
            $rootScope.getItemMasterFilters(loadFiltersCompleted, loadFiltersFailed);

            function loadFiltersCompleted(result) {
                var data = result.data;

                $scope.skuFilters = data.Sku.split(',');
                $scope.descriptionFilters = data.Description.split(',');
                $scope.barcodeFilters = data.Barcode.split(',');

                $scope.selectedSkuFilter = $scope.skuFilters[0];
                $scope.selectedDescriptionFilter = $scope.descriptionFilters[0];
                $scope.selectedBarcodeFilter = $scope.barcodeFilters[0];
            }

            function loadFiltersFailed(response) {
                notificationService.displayError('Error loading filters:' + response);
            }
        }

        function loadDisplayedFields() {
            $rootScope.getItemMasterDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.ItemMasterFields, $scope.columnNames);
                loadItemMasters();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var isInit = true;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function() {
                $timeout.cancel(stop);

                if (spinner == "itemmaster")
                    $scope.loadingItemMasters = true;
            }, 1000);
        }

        function loadItemMasters(page) {
            $scope.page = page || 0;

            showSpinner("itemmaster");
            var field = 'SKU';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('ItemMasters');
            if (orderBy != null) {
                field = orderBy.Field.substring(14, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getItemMasters('filterBySku=' + $scope.selectedSkuFilter +
                "&filterByDescription=" + $scope.selectedDescriptionFilter +
                "&filterByBarcode=" + $scope.selectedBarcodeFilter +
                "&sortByColumn=" + field +
                "&sortAscending=" + !isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                itemMastersLoadCompleted,
                itemMastersLoadFailed);

            function itemMastersLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.ItemMasters = result.data.itemMasters;
                $scope.loadingItemMasters = false;

                for (var key in $rootScope.ItemMasters[0]) {
                    var data = $rootScope.ItemMasters[0][key];
                    var fieldWidth = Math.max((data != null) ? data.toString().length : 0, key.length) * 10;
                    var column = getColumnByCaption(key);
                    if (column != null) {
                        if (isInit)
                            column.Width = fieldWidth;
                        column.Style = 'cursor: pointer; min-width: ' + column.Width + 'px; max-width: ' + column.Width + 'px; padding: 0 5px;'
                    }
                }
                isInit = false;

                var pageCount = Math.trunc(result.data.TotalCount / pageSize);
                var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.TotalCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
                    $scope.isSearching = true;
                    $scope.SearchInfo.NextFoundRow = result.data.NextFoundRow;
                    $scope.page = Math.trunc(result.data.NextFoundRow / pageSize);

                    var index;
                    // NextRowFound is the absolute index of the record in the entire user lst.
                    // This is to determine the page. So once the page is determined, the record index
                    // must also be determined. If the NextFoundIndex lies on a page boundary, the page
                    // offset calculation must be adjusted by one. The -1 is to convery to 0-based indexes.
                    if ((result.data.NextFoundRow % pageSize) == 0)
                        index = result.data.NextFoundRow - (($scope.page - 1) * pageSize) - 1;
                    else
                        index = result.data.NextFoundRow - ($scope.page * pageSize) - 1;

                    var selected = $rootScope.ItemMasters[index];
                    $scope.selectedItemNumber = selected['ItemMasterID'];
                    $timeout(function () {
                        var items = document.getElementById("ItemMasters");
                        items.children[1].children[index].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                    notificationService.displayInfo($rootScope.translate(info));
                    $scope.SearchInfo.NextFoundRow = 0;
                }

                //$rootScope.resize();
                initGrids();
            }

            function itemMastersLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingItemMasters = false;
                notificationService.displayError(response.statusText);
            }
        }

        function getColumnByCaption(caption) {
            for (var i = 0; i < $scope.columnNames.length; ++i) {
                var column = $scope.columnNames[i];
                if (column.Caption == caption)
                    return column;
            }
        }

        $scope.TableHeight = 500;
        $scope.TableWidth = 0;

        function isNullableColumn(columnName) {
            switch (columnName) {
                case 'Sku':
                case 'FastTrakItem':
                case 'Style':
                case 'Color':
                case 'Size':
                case 'Barcode1':
                case 'Conveyable':
                case 'Divertable':
                case 'Machinable':
                case 'Sortable':
                case 'UnitSortable':
                case 'AutoPolybag':
                case 'Intermingle':
                case 'Merchandisable':
                case 'Hazardous':
                case 'Fragile':
                case 'Secure':
                case 'TemperatureControlled':
                case 'AllowUpdate':
                case 'CreateTime':
                    return false;

                default:
                    return true;
            }
        }

        $scope.offset = 0;
        $scope.left = 0;
        var initialSizing = true;

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadItemMasters($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        function init() {
            loadFilters();
            loadDisplayedFields();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1)
                        $scope.loadItemMasters(0);
                    else if (row > -1) {
                        var itemMaster = $rootScope.ItemMasters[row];
                        $scope.selectedItemNumber = itemMaster.ItemMasterID;
                    }
                    else
                        $scope.selectedItemNumber = -100;

                    $scope.$apply();
                    return true;
                });
            }, 100);
        }

        var isOnItem = false;
        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            if (isOnItem) {
                var itemMaster = $rootScope.ItemMasters[$scope.row];
                $scope.selectedItemNumber = itemMaster.ItemMasterID;
            }
            else
                $scope.selectedItemNumber = -100;

            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "itemmasters":
                    switch (itemId) {
                        case "New":
                            $scope.addNew();
                            break;

                        case "Edit":
                            $scope.editItem = $rootScope.ItemMasters[$scope.row];
                            $scope.originalItem = {};
                            for (var i = 0; i < $scope.columnNames.length; ++i)
                                $scope.originalItem[$scope.columnNames[i].DataId] = $scope.editItem[$scope.columnNames[i].DataId];

                            if ($scope.originalItem['ItemMasterID'] == null)
                                $scope.originalItem['ItemMasterID'] = $scope.editItem['ItemMasterID'];

                            $scope.isEditing = true;
                            $scope.$apply();
                            scrollIntoView();
                            break;

                        //case "Delete":
                        //    $scope.status = { isCanceled: true };
                            //    $scope.ConfirmText = "Are you sure you want to delete Item Master '" + $rootScope.ItemMasters[$scope.row].ItemMasterID + ': ' + $rootScope.ItemMasters[$scope.row].Description + "'?";
                        //    //$scope.deleteUrl = webApiBaseUrl + '/api/pickgroups/' + id + '?userId=' + 12345;
                        //    $modal.open({
                        //        templateUrl: 'scripts/spa/confirmation/confirm.html',
                        //        controller: 'confirmCtrl',
                        //        scope: $scope
                        //    }).result.then(function($scope) {
                        //    }, function() {
                        //        if (!$scope.status.isCanceled) {
                        //        }
                        //    });
                        //    break;

                        case "OpenUofM":
                            $scope.status = { ItemMasterId: $rootScope.ItemMasters[$scope.row].ItemMasterID, isCanceled: true };
                            $scope.status.mi = $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/unitsOfMeasure.html',
                                controller: 'unitsOfMeasureCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled) {
                                }
                            });
                            break;

                        case "Search":
                            var columnNames = [];
                            for (var i = 0; i < $scope.columnNames.length; ++i)
                                columnNames.push($scope.columnNames[i].Caption);

                            var columnName = columnNames[taskItemInContext.Col];
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: "Item Master Search",
                                Columns: $scope.columnNames,
                                SelectedColumn: $scope.columnNames[taskItemInContext.Col],
                                NextFoundRow: 0
                            };
                            $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                                controller: 'imSearchDialogCtrl',
                                scope: $scope
                            }).result.then(function($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    $scope.loadItemMasters();
                            });
                            break;
                    }
                    break;
            }
        }

        $rootScope.keyHandler = function (e) {
            if (e.keyCode == 27) {
                if ($scope.isEditing) {
                    $scope.cancel();
                    $scope.$apply();
                }
            }
        }

        init();
    }
})(angular.module('fastTrakWebUI'));