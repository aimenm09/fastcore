(function (app) {
    'use strict';

    app.controller('addGroupPermissionsCtrl', addGroupPermissionsCtrl);

    addGroupPermissionsCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', '$modalInstance', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function addGroupPermissionsCtrl($scope, $rootScope, $timeout, $modal, $modalInstance, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Groups.Permissions');

        $scope.pageClass = 'page-grouppermissions';
        $scope.loadingPermissions = false;
        $rootScope.Permissions = [];
        $scope.selectedPermissions = [];
        $scope.SearchInfo = { SearchTerm: '', SelectedColumn: { Caption: '' } };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};

        $scope.checkAccess = function () {
            return membershipService.isUserInRole('Admin.Groups.Permissions.Modify') ? '' : 'disabled';
        }

        $scope.pageTransPrefix = 'spa.users.permissions.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.toggleSelection = function toggleSelection(permission) {
            var idx = $scope.selectedPermissions.indexOf(permission.PermissionId);
            if (idx > -1)
                $scope.selectedPermissions.splice(idx, 1);
            else
                $scope.selectedPermissions.push(permission.PermissionId);
        };

        $scope.IsSelected = function (permission) {
            var idx = $scope.selectedPermissions.indexOf(permission.PermissionId);
            return idx > -1;
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "users")
                    $scope.loadingUsers = true;
            }, 1000);
        }

        $scope.search = function () {
            $scope.status = { isCanceled: true };
            $scope.SearchInfo = {
                Title: $rootScope.translate("PermissionSearch"),
                Columns: $scope.orderColumnNames,
                SelectedColumn: $scope.orderColumnNames[taskItemInContext.Col],
                NextFoundRow: 0
            };
            $modal.open({
                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                controller: 'imSearchDialogCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
                if (!$scope.status.isCanceled) {
                    $scope.loadPermissions();
                    $scope.isSearching = true;
                }
            });
        }

        $scope.loadPermissions = function (page) {
            $scope.page = page || 0;

            var field = 'Name';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Permissions');
            if (orderBy != null) {
                field = orderBy.Field.substring(14, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getUserGroupPermissions($scope.groupId, 'sortByColumn=' + field +
                "&sortAscending=" + isReversed +
                "&SearchField=" + $scope.SearchInfo.ColumnName +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize,
                permissionsLoadCompleted,
                permissionsLoadFailed);
        }

        function permissionsLoadCompleted(result) {
            $timeout.cancel(stop);
            $rootScope.Permissions = result.data.Permissions;
            $scope.loadingPermissions = false;

            var pageCount = Math.trunc(result.data.TotalCount / pageSize);
            var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
            $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
            $scope.totalCount = result.data.TotalCount;

            for (var i = 0; i < $rootScope.Permissions.length; ++i) {
                var permission = $rootScope.Permissions[i];
                if (permission.GroupId > 0) {
                    if ($scope.selectedPermissions.indexOf(permission.PermissionId) == -1)
                        $scope.selectedPermissions.push(permission.PermissionId);
                }
            }

            if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
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

                var selected = $rootScope.Permissions[index];
                $scope.selectedItemNumber = selected['PermissionId'];
                $timeout(function () {
                    var items = document.getElementById("tblPermissions");
                    items.children[1].children[index].scrollIntoView(true);
                }, 10);
            }
            else if ($scope.SearchInfo.SearchTerm != '') {
                var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                notificationService.displayInfo($rootScope.translate(info));
                $scope.SearchInfo.NextFoundRow = 0;
            }

            sizeTables();
            var orderBy = $rootScope.getOrderByField('Permissions');
            if (orderBy == null) {
                var table = document.getElementById('Permissions');
                var head = table.children[0].children[0].children;
                $rootScope.initSortColumns('Permissions', head, $rootScope.Permissions);
            }
        }

        function permissionsLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingUsers = false;
            notificationService.displayError(response.statusText);
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadPermissions($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            sizeTables();
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 250;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('Permissions');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 1)
                        itemHeight = table.rows[1].clientHeight;

                    var rect = table.getBoundingClientRect();
                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - rect.top - 200;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    var padCol = document.getElementById('padColPermissions');
                    if (padCol != null) {
                        if (itemHeight > screenHeight)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    var body = table.children[1];
                    body.style.minHeight = body.style.maxHeight = screenHeight + 'px';

                    var scrollHeight = (itemHeight > screenHeight) ? 17 : 0;
                    rect = table.getBoundingClientRect();
                    var grips = document.getElementById('PermissionsGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.left = '7px';
                    grips.style.top = '58px';
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

        function init() {
            $scope.loadPermissions();

            $timeout(function () {
                $rootScope.handleResize('Permissions', 'PermissionsGrips',
                    function (fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    },
                    function (colId, tableId, row) {
                        if (row == -1)
                            $scope.loadPermissions();
                        else if (row > -1) {
                            var permission = $rootScope.Permissions[row];
                            $scope.selectedItemNumber = permission.PermissionId;
                        }
                        else
                            $scope.selectedItemNumber = -100

                        $scope.$apply();
                        return true;
                    })
            }, 100);
        }

        $rootScope.sortHandler = function (colId) {
            if ($scope.orderByField == colId) {
                $scope.reverseSort = !$scope.reverseSort;
            }
            else {
                $scope.reverseSort = true;
                $scope.orderByField = colId;
            }

            $scope.loadPermissions();
        }

        $scope.cancelAddGroupPermissions = function () {
            $scope.status.isCanceled = true;
            $modalInstance.dismiss();
        }

        $scope.addGroupPermissions = function () {
            if (membershipService.isUserInRole('Admin.Groups.Permissions.Modify')) {
                $rootScope.addUserGroupPermissions($scope.groupId, $scope.selectedPermissions,
                    addGroupPermissionsCompleted, addGroupPermissionsFailed);
            }
        }

        function addGroupPermissionsCompleted(result) {
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
        }

        function addGroupPermissionsFailed(response) {
            notificationService.displayError(response.data);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));