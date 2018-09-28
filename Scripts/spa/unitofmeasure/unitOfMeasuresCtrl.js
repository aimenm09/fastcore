(function (app) {
    'use strict';

    app.controller('unitOfMeasuresCtrl', unitOfMeasuresCtrl);

    unitOfMeasuresCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];
  
    function unitOfMeasuresCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-uoms';
        $scope.loadingUnits = false;
        $scope.columnNames = [];
        $rootScope.Units = [];
        $scope.unitTypes = [];
        $scope.selectedItemNumber = -100;
        $scope.SearchInfo = { Title: $scope.localTranslate("UnitOfMeasureSearch"), SearchTerm: '', SelectedColumn: { DataId: '' } };

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        $scope.loadUnits = loadUnits;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {};

        $scope.pageTransPrefix = 'spa.unitofmeasure.unitofmeasures.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getUnitOfMeasureDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.UnitOfMeasureFields, $scope.columnNames);
                loadItemMasters();
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

            $rootScope.Units.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        }

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if ((key != 'UnitOfMeasureID') && ($scope.editItem[key] == '')) {
                    isValid = false;
                    break;
                }
                ++i;
            }

            if (isValid)
                saveItem();
            else {
                var items = document.getElementsByClassName('input');
                items[i].focus();
                notificationService.displayError(key + ' is a required field');
            }
        }

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Units.splice($rootScope.Units.length - 1);
            else {
                for (var i = 0; i < $rootScope.Units.length; ++i) {
                    var unit = $rootScope.Units[i];
                    if (unit.UnitOfMeasureID == $scope.originalItem.UnitOfMeasureID) {
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            unit[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
                        unit.SelectedType = getUnitTypeById(unit.UnitOfMeasureTypeID);
                        break;
                    }
                }
            }

            editMode = '';
            $rootScope.resize();
        }

        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $scope.$apply();
            $timeout(function () {
                var items = document.getElementById("Units");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        function saveItem() {
            if (editMode == 'add') {
                $rootScope.addUnitOfMeaseure('ItemMasterID=' + $scope.status.ItemMasterId +
                    '&UnitOfMeasureTypeID=' + $scope.editItem.SelectedType.UnitOfMeasureTypeID +
                    '&Qty=' + $scope.editItem.Qty +
                    '&Length=' + $scope.editItem.Length +
                    '&Width=' + $scope.editItem.Width +
                    '&Height=' + $scope.editItem.Height +
                    '&Weight=' + $scope.editItem.Weight,
                    unitSaveCompleted,
                    unitSaveFailed);
            }
            else {
                $rootScope.editUnitOfMeasure('ItemMasterID=' + $scope.status.ItemMasterId +
                    '&UnitOfMeasureTypeID=' + $scope.editItem.SelectedType.UnitOfMeasureTypeID +
                    '&Qty=' + $scope.editItem.Qty +
                    '&Length=' + $scope.editItem.Length +
                    '&Width=' + $scope.editItem.Width +
                    '&Height=' + $scope.editItem.Height +
                    '&Weight=' + $scope.editItem.Weight,
                    unitSaveCompleted,
                    unitSaveFailed);
            }

            function unitSaveCompleted(result) {
                $scope.editItem = {};
                $scope.isEditing = false;
                editMode = '';
                loadUnits();
            }

            function unitSaveFailed(response) {
                notificationService.displayError(response.statusText);
            }
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function() {
                $timeout.cancel(stop);

                if (spinner == "units")
                    $scope.loadingUnits = true;
            }, 1000);
        }

        function loadUnits(page) {
            $scope.page = page || 0;

            showSpinner('units');
            var field = 'ItemMasterID';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Units');
            if (orderBy != null) {
                field = orderBy.Field.substring(8, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getAllUnitsOfMeasure('sortByColumn=' +field +
                "&SortDescending=" + isReversed +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                unitsLoadCompleted,
                unitsLoadFailed);

            function unitsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Units = result.data.units;
                $scope.loadingUnits = false;

                for (var i = 0; i < $rootScope.Units.length; ++i)
                    $rootScope.Units[i].SelectedType = getUnitTypeById($rootScope.Units[i].UnitOfMeasureTypeID);

                var pageCount = Math.trunc(result.data.resultCount / pageSize);
                var extraPageNeeded = (result.data.resultCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.resultCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.nextFoundRow > 0)) {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                    }
                    else
                        $scope.isSearching = true;

                    $scope.SearchInfo.NextFoundRow = result.data.nextFoundRow;
                    $scope.page = Math.trunc(result.data.nextFoundRow / pageSize);

                    var index;
                    // NextRowFound is the absolute index of the record in the entire user lst.
                    // This is to determine the page. So once the page is determined, the record index
                    // must also be determined. If the NextFoundIndex lies on a page boundary, the page
                    // offset calculation must be adjusted by one. The -1 is to convery to 0-based indexes.
                    if ((result.data.NextFoundRow % pageSize) == 0)
                        index = result.data.nextFoundRow - (($scope.page - 1) * pageSize) - 1;
                    else
                        index = result.data.nextFoundRow - ($scope.page * pageSize) - 1;

                    var selected = $rootScope.Units[index];
                    $scope.selectedItemNumber = selected['UnitOfMeasureID'];
                    $timeout(function () {
                        var items = document.getElementById("Units");
                        items.children[1].children[index].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                    notificationService.displayInfo($rootScope.translate(info));
                    $scope.SearchInfo.NextFoundRow = 0;
                }

                initGrids();
            }

            function unitsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingUnits = false;
                notificationService.displayError(response);
            }
        }

        function loadUnitTypes() {
            showSpinner("units");
            $rootScope.getUnitOfMeasureTypes('SortByColumn=Name&SortDescending=false&PageNumber=1&PageSize=100',
                unitTypesLoadCompleted, unitTypesLoadFailed);

            function unitTypesLoadCompleted(result) {
                $timeout.cancel(stop);
                $scope.loadingUnits = false;
                $scope.unitTypes = result.data.units;
                loadUnits();
            }

            function unitTypesLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingUnits = false;
                notificationService.displayError(response);
            }
        }

        function getUnitTypeById(id) {
            for (var i = 0; i < $scope.unitTypes.length; ++i) {
                if ($scope.unitTypes[i].UnitOfMeasureTypeID == id)
                    return $scope.unitTypes[i];
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadUnits($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        function init() {
            keydownListener();
            loadDisplayedFields();
            loadUnitTypes();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1)
                        $scope.loadUnits();
                    else if (row > -1) {
                        var unit = $rootScope.Units[row];
                        $scope.selectedItemNumber = unit.UnitOfMeasureID;
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
                var unit = $rootScope.Units[$scope.row];
                $scope.selectedItemNumber = unit.UnitOfMeasureID;
            }
            else
                $scope.selectedItemNumber = -100;

            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "units":
                    switch (itemId) {
                        case "New":
                            $scope.addNew();
                            $rootScope.resize();
                            break;

                        case "Edit":
                            $scope.editItem = $rootScope.Units[$scope.row];
                            $scope.originalItem = {};
                            for (var i = 0; i < $scope.columnNames.length; ++i)
                                $scope.originalItem[$scope.columnNames[i].DataId] = $scope.editItem[$scope.columnNames[i].DataId];

                            if ($scope.originalItem['UnitOfMeasureID'] == null)
                                $scope.originalItem['UnitOfMeasureID'] = $scope.editItem['UnitOfMeasureID'];

                            $scope.isEditing = true;
                            $scope.$apply();
                            scrollIntoView();
                            $rootScope.resize();
                            break;

                        case "Delete":
                            var id = $rootScope.Units[$scope.row].UnitOfMeasureID;
                            $scope.status = { isCanceled: false };
                            $scope.ConfirmText = "Are you sure you want to delete Unit of Measure '" + id + "'?";
                            $scope.deleteUrl = webApiBaseUrl + '/api/unitsofmeasure/' + id;
                            $modal.open({
                                templateUrl: 'scripts/spa/confirmation/confirm.html',
                                controller: 'confirmCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    loadUnits();
                            });
                            break;

                        case "Search":
                            $scope.status = { isCanceled: false };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate("UnitOfMeasureSearch"),
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
                                    $scope.loadUnits();
                            });
                            break;
                    }
                    break;
            }
        }

        $scope.getGroupMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'edit': return isOnItem ? 'active' : 'disabled';
                case 'delete': return isOnItem ? 'active' : 'disabled';
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

        function keydownListener() {
            window.onkeydown = function (e) {
                if ((e.keyCode == 38) || (e.keyCode == 40)) {
                    if (loadingData)
                        return false;

                    var items = document.getElementsByClassName(focusPanel);
                    var item;
                   
                    for (var i = 0; i < items.length; ++i) {
                        var curContainer = items[i].children[0].innerText.trim();
                        if (curContainer == item) {
                            var index = -1;
                            if ((e.keyCode == 38) && (i > 0))
                                index = i - 1;
                            else if ((e.keyCode == 40) && (i < items.length - 1))
                                index = i + 1;

                            if (index > -1) {

                                items[index].scrollIntoView(false);
                                return false;
                            }
                        }
                    }
                }
            }
        }

        init();
    }
})(angular.module('fastTrakWebUI'));