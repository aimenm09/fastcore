(function (app) {
    'use strict';

    app.controller('unitsOfMeasureCtrl', unitsOfMeasureCtrl);

    unitsOfMeasureCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$modal', '$timeout', 'apiService', 'notificationService', 'settings'];

    function unitsOfMeasureCtrl($scope, $rootScope, $modalInstance, $modal, $timeout, apiService, notificationService, settings) {
        $scope.pageClass = 'page-uoms';
        $scope.loadingUnits = false;
        $scope.units = [];
        $scope.unitTypes = [];

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        $scope.loadUnits = loadUnits;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.orderByField = 'UnitOfMeasureTypeID';
        $scope.reverseSort = true;

        $scope.isEditing = false;
        $scope.editItem = {};

        $scope.pageTransPrefix = 'spa.unitofmeasure.unitofmeasures.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function uomSort (column) {
            if ($scope.orderByField == column)
                $scope.reverseSort = !$scope.reverseSort;
            else {
                $scope.orderByField = column;
                $scope.reverseSort = true;
            }

            $scope.$apply();
        };

        $scope.getSortClass = function (column) {
            if (editMode == 'add')
                return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            if ($scope.orderByField == column)
                return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            return '';
        };

        var editMode = ''
        $scope.addNew = function () {
            editMode = 'add';
            $scope.orderByField = '';
            $scope.editItem = {
                "UnitOfMeasureID": '99999999999999999999',
                "ItemMasterID": $scope.status.ItemMasterId,
                "UnitOfMeasureTypeID": '',
                "Qty": '',
                "Length": '',
                "Width": '',
                "Height": '',
                "Weight": '',
                "SelectedType": $scope.unitTypes[0]
            };

            $scope.units.push($scope.editItem);
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
                $scope.units.splice($scope.units.length - 1);

            editMode = '';
        }

        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("units");
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
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "units")
                    $scope.loadingUnits = true;
            }, 1000);
        }

        function loadUnits(page) {
            $scope.page = page || 0;
            $rootScope.getUnitsOfMeasure($scope.status.ItemMasterId + '/unitsofmeasure', unitsLoadCompleted, unitsLoadFailed);
        }

        function unitsLoadCompleted(result) {
            $timeout.cancel(stop);
            $scope.units = result.data.Units;

            for (var i = 0; i < $scope.units.length; ++i)
                $scope.units[i].SelectedType = getUnitTypeById($scope.units[i].UnitOfMeasureTypeID);

            $scope.loadingUnits = false;
            sizeTables();
        }

        function unitsLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingUnits = false;
            notificationService.displayError(response);
        }

        function loadUnitTypes(page) {
            $scope.page = page || 0;
            showSpinner("units");
            $rootScope.getUnitOfMeasureTypes('SortByColumn=Name&SortDescending=false&PageNumber=1&PageSize=100',
                unitTypesLoadCompleted, unitTypesLoadFailed);
        }

        function unitTypesLoadCompleted(result) {
            $scope.unitTypes = result.data.units;
            loadUnits();
        }

        function unitTypesLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingUnits = false;
            notificationService.displayError(response);
        }

        function getUnitTypeById(id) {
            for (var i = 0; i < $scope.unitTypes.length; ++i) {
                if ($scope.unitTypes[i].UnitOfMeasureTypeID == id)
                    return $scope.unitTypes[i];
            }
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 10;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('tblUnits2');
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

                    var padCol = document.getElementById('padCol');
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

                    var grips = document.getElementById('dvGrips2');
                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        var menuName;
        function clickInsideElement(e) {
            column = null;

            for (var i = 0; i < taskItemClassNames.length; ++i) {
                var className = taskItemClassNames[i];
                var mouseX = e.clientX;
                var mouseY = e.clientY;

                var el = e.srcElement || e.target;
                var elOrig = el;
                if (el.classList && el.classList.contains(className)) {
                    menuName = className;
                    var body = document.getElementById(className);
                    var rect = body.getBoundingClientRect();

                    // Check if in bounds
                    if ((rect.left < mouseX) && (rect.right > mouseX)) {
                        // Get item height
                        if ((body.children != null) && (body.children.length > 0)) {
                            var itemHeight = body.children[0].clientHeight;
                            var offset = mouseY - rect.top + body.scrollTop;
                            $scope.row = Math.floor(offset / itemHeight);
                        }

                        var table = body.parentNode;
                        var header = table.children[0].children[0];
                        // index is the row, now find the cell
                        var left = -body.scrollLeft;
                        for (var i = 0; i < header.cells.length; ++i) {
                            column = header.cells[i];
                            left += $rootScope.parseWidth(header.cells[i].style.minWidth);
                            if (left > mouseX - rect.left)
                                break;
                        }

                        if ($scope.row > -1) {
                            if ($scope.row < body.children.length)
                                return body.children[$scope.row];
                            else
                                return body;
                        }
                    }
                }
            }

            return null;
        }

        function getPosition(e) {
            var posx = 0;
            var posy = 0;

            if (!e)
                var e = window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            return {
                x: posx,
                y: posy
            }
        }

        var isOnItem = false;
        $scope.getGroupMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'edit': return isOnItem ? 'active' : 'disabled';
                case 'delete': return isOnItem ? 'active' : 'disabled';
            }
        }

        var taskItemClassNames = ["units"];
        var taskItemInContext;

        $scope.row;
        var column;
        var menu = document.querySelector("#context-menu");
        var menuItems = menu.querySelectorAll(".context-menu__item");
        var menuState = 0;

        $scope.menuSelection = function (item) {
            toggleMenuOff();

            switch (menuName) {
                case "units":
                    switch (item) {
                        case "New":
                            $scope.addNew();
                            break;

                        case "Edit":
                            $scope.editItem = $scope.units[$scope.row];
                            $scope.isEditing = true;
                            $scope.$apply();
                            break;

                        case "Delete":
                            var id = $scope.units[$scope.row].UnitOfMeasureID;
                            $scope.status = { isCanceled: true };
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
                    }
                    break;
            }
        };

        function Init() {
            $rootScope.registerEventHandler("contextmenu", contextListener);
            $rootScope.registerEventHandler("click", clickListener);
            keyupListener();
            keydownListener();
            resizeListener();
            loadUnitTypes();

            $timeout(function () {
                $rootScope.handleResize('tblUnits2', 'dvGrips2',
                    function (fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    });
            }, 100);
        }

        function contextListener(e) {
            taskItemInContext = clickInsideElement(e);

            if (taskItemInContext != null) {
                isOnItem = (taskItemInContext.nodeName == 'TBODY') ? false : true;
                e.preventDefault();
                toggleMenuOff();
                toggleMenuOn();
                positionMenu(e);
                $scope.$apply();
            }
            else
                toggleMenuOff();
        }

        var focusPanel;
        function clickListener(e) {
            var clickElIsLink = clickInsideElement(e);

            if ((clickElIsLink != null) && clickElIsLink.classList.contains("context-menu__link")) {
                e.preventDefault();
                menuItemListener(clickElIsLink);
            }
            else {
                var button = e.which || e.button;
                if (button === 1) {
                    toggleMenuOff();

                    if ((column != null) && !$scope.loadingUnits && (e.clientY <= 118))
                        uomSort(column.id);
                }

                focusPanel = null;
            }
        }

        function keyupListener() {
            window.onkeyup = function (e) {
                if (e.keyCode === 27) {
                    toggleMenuOff();
                    if ($scope.isEditing)
                        $scope.cancel();
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

        function resizeListener() {
            window.onresize = function (e) {
                toggleMenuOff();
                sizeTables();
            };
        }

        function toggleMenuOn() {
            if (menuState !== 1) {
                menuState = 1;

                var menus = document.getElementsByClassName("context-menu");
                for (var i = 0; i < menus.length; ++i) {
                    menu = menus[i];
                    if (menu.classList.contains(menuName)) {
                        menu.classList.add("context-menu--active");
                        break;
                    }
                }
            }
        }

        function toggleMenuOff() {
            if (menuState !== 0) {
                menuState = 0;
                menu.classList.remove("context-menu--active");
            }
        }

        function positionMenu(e) {
            var clickCoords = getPosition(e);
            var clickCoordsX = clickCoords.x;
            var clickCoordsY = clickCoords.y;

            var menuWidth = menu.offsetWidth + 4;
            var menuHeight = menu.offsetHeight + 4;

            var el = document.getElementById('dvGrips2');
            var rect = el.getBoundingClientRect();
            var top = rect.top;
            var left = rect.left;

            menu.style.left = clickCoordsX + 7 - left + "px";
            menu.style.top = clickCoordsY - 32 + "px";
        }

        function menuItemListener(link) {
            toggleMenuOff();
        }

        $scope.ok = function () {
            if ($scope.isEditing)
                $scope.save();
            $modalInstance.dismiss();
        }

        $scope.cancel = function () {
            if ($scope.isEditing) {
                $scope.Text1 = $rootScope.translate('YouAreCurrently') + ((editMode == 'add') ? $rootScope.translate('Adding') : $rootScope.translate('Editing')) + ' ' + $rootScope.translate('AnItem') + '.';
                $scope.Text2 = $rootScope.translate('ConfirmCancel');
                $scope.Image = 'Content/images/alert.png';
                $scope.Buttons = 'OK,Cancel';
                $scope.status.ButtonClicked = {};
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
            else
                $modalInstance.dismiss();
        }

        Init();
    }
})(angular.module('fastTrakWebUI'));