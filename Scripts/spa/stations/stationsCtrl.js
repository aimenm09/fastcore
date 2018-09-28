(function (app) {
    'use strict';

    app.controller('stationsCtrl', stationsCtrl);

    stationsCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function stationsCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Stations');

        $scope.pageClass = 'page-station';
        $scope.loadingItems = false;

        $scope.selectedSkuFilter;
        $scope.selectedDescriptionFilter;
        $scope.selectedBarcodeFilter;
        $scope.skuFilters = [];
        $scope.descriptionFilters = [];
        $scope.barcodeFilters = [];

        $scope.columnNames = [];
        $rootScope.Stations = [];
        $scope.selectedItemNumber = -100;
        $scope.SearchInfo = { Title: $scope.localTranslate("StationSearch"), SearchTerm: '', SelectedColumn: { DataId: '' } };

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {}

        $scope.pageTransPrefix = 'spa.stations.stations.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadFilters() {
            $rootScope.getStationsFilters(loadFiltersCompleted, loadFiltersFailed);

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
            $rootScope.getStationsDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.StationFields, $scope.columnNames);
                initGrids();
                $scope.loadStations();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var editMode = ''
        $scope.addNew = function () {
            editMode = 'add';
            $scope.selectedItemNumber = -100;
            $scope.editItem = {};

            for (var i = 0; i < $scope.columnNames.length; ++i)
                $scope.editItem[$scope.columnNames[i].Caption] = '';

            $rootScope.Stations.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        }

        $scope.save = function () {
            var isValid = true;

            var colDef;
            for (var i = 1; i < $scope.columnNames.length; ++i) {
                colDef = $scope.columnNames[i];
                if (!colDef.IsNullable && $scope.editItem[colDef.Caption] == '') {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                //saveItem();
                $scope.editItem = {};
                $scope.isEditing = false;
                editMode = '';
            }
            else {
                document.getElementsByClassName('input')[--i].focus();
                notificationService.displayError(colDef.Caption + ' is a required field');
            }
        }

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Stations.splice($rootScope.Stations.length - 1);
            else {
                for (var i = 0; i < $rootScope.Stations.length; ++i) {
                    var station = $rootScope.Stations[i];
                    if (station.StationId == $scope.originalItem.StationId) {
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            user[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
                        break;
                    }
                }
            }

            editMode = '';
        }

        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("Stations");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        //function saveItem() {
        //    if (editMode == 'add')
        //        $rootScope.addUser($scope.editItem, userSaveCompleted, userSaveFailed);
        //    else
        //        $rootScope.editUser($scope.editItem, userSaveCompleted, userSaveFailed);
        //
        //    function userSaveCompleted(result) {
        //        if (result.data.Success) {
        //            $scope.SearchInfo.SearchTerm = $scope.editItem.UserName;
        //            $scope.SearchInfo.ColumnName = 'UserName';
        //            $scope.loadUsers();
        //        }
        //        else
        //            notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
        //    }
        //
        //    function userSaveFailed(response) {
        //        if (response.data != null)
        //            notificationService.displayError(response.data);
        //    }
        //}

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "station")
                    $scope.loadingItems = true;
            }, 1000);
        }

        var isInit = true;
        $scope.loadStations = function (page) {
            $scope.page = page || 0;

            showSpinner("station");
            var field = 'StationName';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Stations');
            if (orderBy != null) {
                field = orderBy.Field.substring(11, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getStations("sortByColumn=" + field +
                "&SortDescending=" + isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                itemsLoadCompleted,
                itemsLoadFailed);

            function itemsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Stations = result.data.Stations;
                $scope.loadingItems = false;

                var pageCount = Math.trunc(result.data.resultCount / pageSize);
                var extraPageNeeded = (result.data.resultCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.resultCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.nextFoundRow > 0)) {
                    $scope.isSearching = true;
                    $scope.SearchInfo.NextFoundRow = result.data.nextFoundRow;
                    $scope.page = Math.trunc(result.data.nextFoundRow / pageSize);

                    var index;
                    // NextRowFound is the absolute index of the record in the entire user lst.
                    // This is to determine the page. So once the page is determined, the record index
                    // must also be determined. If the NextFoundIndex lies on a page boundary, the page
                    // offset calculation must be adjusted by one. The -1 is to convery to 0-based indexes.
                    if ((result.data.nextFoundRow % pageSize) == 0)
                        index = result.data.nextFoundRow - (($scope.page - 1) * pageSize) - 1;
                    else
                        index = result.data.nextFoundRow - ($scope.page * pageSize) - 1;

                    var selected = $rootScope.Stations[index];
                    $scope.selectedItemNumber = selected['StationId'];
                    $timeout(function () {
                        var items = document.getElementById("Stations");
                        items.children[1].children[index].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                    notificationService.displayInfo($rootScope.translate(info));
                    $scope.SearchInfo.NextFoundRow = 0;
                }

                $rootScope.resize();
                $timeout(function () {
                    if (isInit) {
                        isInit = false;
                        $rootScope.expandColumn(document.getElementById('Stations'), document.getElementById('StationsGrips'), -1);

                        var table = document.getElementById('Stations');
                        var headerRow = table.children[0].children[0];
                        var columns = headerRow.children.length - 2;

                        for (var i = 0; i < $scope.columnNames.length; ++i) {
                            var width = $rootScope.parseWidth(headerRow.cells[i].style.minWidth);;
                            $scope.columnNames[i].Width = width;
                            $scope.columnNames[i].Style = 'cursor: pointer; min-width: ' + width + 'px; max-width: ' + width + 'px; padding: 0 5px;'
                        }
                    }
                }, 100);
            }

            function itemsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingItems = false;
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
                case 'StationName':
                case 'StationId':
                case 'Location':
                case 'StationIdentifier':
                case 'Hardlink':
                case 'DeviceIdentifier':
                case 'Enabled':
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
            $scope.loadStations($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        var isOnItem = false;
        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            if (isOnItem) {
                var item = $rootScope.Stations[$scope.row];
                $scope.selectedItemNumber = item.StationId;
            }
            else
                $scope.selectedItemNumber = -100;

            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "stations":
                    switch (itemId) {
                        case "New":
                            $scope.addNew();
                            break;

                        case "Edit":
                            $scope.editItem = $rootScope.Stations[$scope.row];
                            $scope.originalItem = {};
                            for (var i = 0; i < $scope.columnNames.length; ++i)
                                $scope.originalItem[$scope.columnNames[i].DataId] = user[$scope.columnNames[i].DataId];

                            if ($scope.originalItem['StationId'] == null)
                                $scope.originalItem['StationId'] = user['StationId'];

                            $scope.isEditing = true;
                            $scope.$apply();
                            scrollIntoView();
                            break;

                        //case "Delete":
                        //    $scope.status = { isCanceled: true };
                            //    $scope.ConfirmText = "Are you sure you want to delete Item Master '" + $rootScope.Stations[$scope.row].StationId + ': ' + $rootScope.Stations[$scope.row].StationName + "'?";
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

                        case "LinkStation":
                            $scope.status = { isCanceled: true, isSuccess: true, reasonDescription: ""};
                            $scope.LinkInfo = { id: taskItemInContext.Row.cells["StationId"].innerText.trim() };
                            
                            $modal.open({
                                templateUrl: 'scripts/spa/stations/stationLink.html',
                                controller: 'stationLinkCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isSuccess)
                                        notificationService.displayError($scope.status.reasonDescription);
                                    if (!$scope.status.isCanceled && $scope.status.isSuccess) {
                                        notificationService.displaySuccess($scope.status.reasonDescription);
                                        $scope.loadStations();
                                    }
                            });
                            break;

                        case "Search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate('StationSearch'),
                                Columns: $scope.columnNames,
                                SelectedColumn: $scope.columnNames[taskItemInContext.Col],
                                NextFoundRow: 0
                            };
                            $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                                controller: 'imSearchDialogCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    $scope.loadStations($scope.page);
                            });
                            break;
                    }
                    break;
            }
        }

        function init() {
            loadFilters();
            loadDisplayedFields();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1)
                        $scope.loadStations();
                    else if (row > -1) {
                        var user = $rootScope.Stations[row];
                        $scope.selectedItemNumber = user.StationId;
                    }
                    else
                        $scope.selectedItemNumber = -100

                    $scope.$apply();
                    return true;
                });
            }, 100);
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