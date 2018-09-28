(function (app) {
    'use strict';

    app.controller('configureCtrl', configureCtrl);

    configureCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function configureCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('InvataBI.Dashboard.Configure');

        $scope.pageClass = 'page-configure';
        $scope.loadingReports = false;
        $scope.reports = [];
        $scope.selectedReports = [];
        $scope.SearchInfo = { Title: "Dashboard Search", SearchTerm: '', ColumnName: '' };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 10;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.orderByField = 'Name';
        $scope.reverseSort = true;

        $scope.originalItem = {}

        $scope.pageTransPrefix = 'spa.invatabi.configure.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function sort(column) {
            if ($scope.orderByField == column)
                $scope.reverseSort = !$scope.reverseSort;
            else {
                $scope.orderByField = column;
                $scope.reverseSort = true;
            }

            if ($scope.orderByField != '')
                $scope.loadReports(0);
        };

        $scope.getSortClass = function (column) {
            if (editMode == 'add')
                return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            if ($scope.orderByField == column)
                return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            return '';
        };

        Math.trunc = Math.trunc || function (x) {
            if (isNaN(x)) {
                return NaN;
            }
            if (x > 0) {
                return Math.floor(x);
            }
            return Math.ceil(x);
        };

        var editMode = ''
        $scope.save = function () {
            saveItem();
        }

        $scope.cancel = function () {
            $scope.selectedReports = [];
            $scope.loadReports();
            notificationService.displayInfo('Changes have been undone')
        }

        $scope.toggleSelection = function toggleSelection(report) {
            var idx = $scope.selectedReports.indexOf(report.ReportID);

            // Is currently selected
            if (idx > -1)
                $scope.selectedReports.splice(idx, 1);
            // Is newly selected
            else
                $scope.selectedReports.push(report);
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("reports");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        function saveItem() {
            apiService.post(webApiBaseUrl + '/api/reports/admin',
                $scope.selectedReports,
                reportsSaveCompleted,
                reportsSaveFailed);
        }

        function reportsSaveCompleted(result) {
            if (result.data.Success) {
                notificationService.displaySuccess('Dashboard(s) saved successfully');
                $scope.selectedReports = [];
                $scope.loadReports();
            }
            else
                notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
        }

        function reportsSaveFailed(response) {
            if (response.data != null)
                notificationService.displayError(response.data);
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "reports")
                    $scope.loadingReports = true;
            }, 1000);
        }

        $scope.loadReports = function (page) {
            $scope.page = page || 0;

            apiService.get(webApiBaseUrl + '/api/reports/admin?sortByColumn=' + $scope.orderByField +
                "&sortAscending=" + $scope.reverseSort +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&usageMetrics=" + false +
                "&searchField=" + $scope.SearchInfo.ColumnName +
                "&searchFor=" + $scope.SearchInfo.SearchTerm +
                "&nextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                null,
                reportsLoadCompleted,
                reportsLoadFailed);
        }

        function reportsLoadCompleted(result) {
            $timeout.cancel(stop);
            $scope.reports = result.data.Reports;
            $scope.loadingReports = false;

            var pageCount = Math.trunc(result.data.ResultCount / pageSize);
            var extraPageNeeded = (result.data.ResultCount % pageSize) > 0;
            $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
            $scope.totalCount = result.data.ResultCount;

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

                var selected = $scope.reports[index];
                $scope.selectedItemNumber = selected['ID'];
                $timeout(function () {
                    var items = document.getElementById("tblReports");
                    items.children[1].children[index].scrollIntoView(true);
                }, 10);

                // Clear the damn search term so the UI doesn't continue to search.
                $scope.SearchInfo.SearchTerm = '';
                $scope.SearchInfo.NextFoundRow = 0;
            }
            else if ($scope.SearchInfo.SearchTerm != '') {
                var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                notificationService.displayInfo($rootScope.translate(info));
                $scope.SearchInfo.NextFoundRow = 0;
            }

            sizeTables();
        }

        function reportsLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingReports = false;
            notificationService.displayError(response.statusText);
        }

        $scope.isEditing = function () {
            if ($scope.selectedReports.length > 0) {
                return false;
            }
            else {
                return true;
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadReports($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            sizeTables();
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 10;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('tblReports');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 0)
                        itemHeight = table.rows[0].clientHeight;

                    var rect = table.getBoundingClientRect();
                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - rect.top - 125;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    var padCol = document.getElementById('padCol');
                    if (padCol != null) {
                        if (itemHeight > screenHeight)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    var body = table.children[1];
                    body.style.minHeight = body.style.maxHeight = screenHeight + 'px';

                    var dv = document.getElementById('dvReports');
                    dv.style.width = dv.style.maxWidth = document.body.clientWidth - rect.left - 15 + 'px';

                    var scrollHeight = (itemHeight > screenHeight) ? 17 : 0;
                    rect = table.getBoundingClientRect();
                    var grips = document.getElementById('dvGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.left = rect.left + 'px';
                    grips.style.top = rect.top - 61 + 'px';
                    grips.style.width = rect.width - scrollHeight + 'px';
                    grips.style.height = rect.height - ((table.scrollWidth > table.clientWidth) ? 17 : 0) + "px";

                    $scope.fillWidth = 0;
                    var header = table.children[0].children[0];
                    var body = table.children[1].children[0];
                    for (var i = 0; i < header.cells.length - 1; ++i) {
                        body.cells[i].style.minWidth = body.cells[i].style.maxWidth = header.cells[i].style.maxWidth;
                        $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);
                    }
                    $scope.fillWidth = rect.width - $scope.fillWidth;

                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        $scope.menuSelection = function (item) {
            toggleMenuOff();

            switch (menuName) {
                case "reports":
                    switch (item) {
                        case "ActivatePages":
                            var ti = taskItemInContext;
                            $scope.reportName = ti.children[0].innerText.trim();
                            $scope.reportId = ti.children[1].innerText.trim();
                            $modal.open({
                                templateUrl: 'scripts/spa/invatabi/dashboards/activatePages.html',
                                controller: 'activatePagesCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                                }, function () {
                                    $scope.loadReports();
                            });
                            break;

                        case "Search":
                            var data = (row < $scope.reports.length) ? $scope.reports[row][column] : '';
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: 'Dashboard Search',
                                SearchTerm: data,
                                ColumnName: column,
                                ColumnNames: ['Name', 'ReportID'],
                                DataType: 'String',
                                Data: data,
                                NextFoundRow: 0
                            };
                            $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                                controller: 'imSearchDialogCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    $scope.loadReports($scope.page);
                            });
                            break;
                    }
                    break;
            }
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
                            row = Math.floor(offset / itemHeight);
                        }

                        var table = body.parentNode;
                        var header = table.children[0].children[0];
                        // index is the row, now find the cell
                        var left = -body.scrollLeft;
                        for (var i = 0; i < header.cells.length; ++i) {
                            column = header.cells[i].id;
                            left += $rootScope.parseWidth(header.cells[i].style.minWidth);
                            if (left > mouseX - rect.left)
                                break;
                        }

                        if (row > -1) {
                            if (row < body.children.length)
                                return body.children[row];
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

            if (!e) var e = window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            } else if (e.clientX || e.clientY) {
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
                case 'new': return membershipService.isUserInRole('Admin.Users.Add') ? 'active' : 'disabled';
                case 'edit': return (isOnItem && membershipService.isUserInRole('Admin.Users.Edit')) ? 'active' : 'disabled';
                case 'delete': return (isOnItem && membershipService.isUserInRole('Admin.Users.Delete')) ? 'active' : 'disabled';
            }
        }

        var contextMenuClassName = "context-menu";
        var contextMenuItemClassName = "context-menu__item";
        var contextMenuLinkClassName = "context-menu__link";
        var contextMenuActive = "context-menu--active";

        var taskItemClassNames = ["reports"];
        var taskItemInContext;

        var clickCoords;
        var clickCoordsX;
        var clickCoordsY;

        var row;
        var column;
        var menu = document.querySelector("#context-menu");
        var menuItems = menu.querySelectorAll(".context-menu__item");
        var menuState = 0;
        var menuWidth;
        var menuHeight;
        var menuPosition;
        var menuPositionX;
        var menuPositionY;

        var windowWidth;
        var windowHeight;

        function init() {
            $rootScope.registerEventHandler("contextmenu", contextListener);
            $rootScope.registerEventHandler("click", clickListener);
            keyupListener();
            keydownListener();
            resizeListener();
            $scope.loadReports();

            $timeout(function () {
                $rootScope.handleResize('tblReports', 'dvGrips',
                    function () {
                        var table = document.getElementById('tblReports');
                        if (table != null) {
                            $scope.fillWidth = 0;
                            var header = table.children[0].children[0];
                            var body = table.children[1].children[0];
                            for (var i = 0; i < header.cells.length - 1; ++i)
                                $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);

                            var itemHeight = 0;
                            if (table.rows.length > 0)
                                itemHeight = table.rows[0].clientHeight;

                            itemHeight = itemHeight * table.rows.length;

                            var clientRect = table.getBoundingClientRect();
                            var screenHeight = document.body.clientHeight - clientRect.top - 125;

                            var scrollWidth = 0;
                            if (itemHeight > screenHeight)
                                scrollWidth = 17;

                            var width = document.body.clientWidth - clientRect.left - 15 - scrollWidth;
                            $scope.fillWidth = width - $scope.fillWidth;
                            $scope.$apply();
                        }
                    });
            }, 100);
        }

        function contextListener(e) {
            taskItemInContext = clickInsideElement(e);
            if (taskItemInContext != null) {
                e.preventDefault();
                toggleMenuOff();
                toggleMenuOn();
                positionMenu(e);

                isOnItem = (taskItemInContext.nodeName == 'TBODY') ? false : true;
                if (isOnItem) {
                    var report = $scope.reports[row];
                    $scope.selectedItemNumber = report.ID;
                }
                else
                    $scope.selectedItemNumber = -100;

                $scope.$apply();
            }
            else
                toggleMenuOff();
        }

        var focusPanel;
        function clickListener(e) {
            $scope.selectedItemNumber = -100;
            $scope.$apply();

            var clickElIsLink = clickInsideElement(e);
            if ((clickElIsLink != null) && clickElIsLink.classList.contains(contextMenuLinkClassName)) {
                e.preventDefault();
                menuItemListener(clickElIsLink);
            }
            else {
                var button = e.which || e.button;
                if (button === 1) {
                    toggleMenuOff();

                    if ((column != null) && !$scope.loadingReports && (e.clientY <= 157))
                        sort(column);
                }

                focusPanel = null;
            }
        }

        function keyupListener() {
            window.onkeyup = function (e) {
                if (e.keyCode === 27) {
                    toggleMenuOff();
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
                        menu.classList.add(contextMenuActive);
                        break;
                    }
                }
            }
        }

        function toggleMenuOff() {
            if (menuState !== 0) {
                menuState = 0;
                menu.classList.remove(contextMenuActive);
                $scope.selectedItemNumber = -100;
            }
        }

        function positionMenu(e) {
            clickCoords = getPosition(e);
            clickCoordsX = clickCoords.x;
            clickCoordsY = clickCoords.y;

            menuWidth = menu.offsetWidth + 4;
            menuHeight = menu.offsetHeight + 4;

            windowWidth = window.innerWidth;
            windowHeight = window.innerHeight;

            if ((windowWidth - clickCoordsX) < menuWidth)
                menu.style.left = windowWidth - menuWidth + "px";
            else
                menu.style.left = clickCoordsX + "px";

            if ((windowHeight - clickCoordsY) < 168)
                menu.style.top = clickCoordsY - menuHeight + "px";
            else
                menu.style.top = clickCoordsY - 60 + "px";
        }

        function menuItemListener(link) {
            toggleMenuOff();
        }

        init();
    }
})(angular.module('fastTrakWebUI'));