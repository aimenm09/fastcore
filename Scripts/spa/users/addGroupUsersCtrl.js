(function (app) {
    'use strict';

    app.controller('addGroupUsersCtrl', addGroupUsersCtrl);

    addGroupUsersCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', '$modalInstance', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function addGroupUsersCtrl($scope, $rootScope, $timeout, $modal, $modalInstance, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Groups.Users');

        $scope.pageClass = 'page-groupusers';
        $scope.loadingUsers = false;
        $rootScope.Users = [];
        $scope.selectedUsers = [];
        $scope.SearchInfo = { SearchTerm: '', SelectedColumn: { Caption: '' } };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 25;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};

        $scope.checkAccess = function () {
            return membershipService.isUserInRole('Admin.Groups.Users.Modify') ? '' : 'disabled';
        }

        $scope.pageTransPrefix = 'spa.users.users.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.toggleSelection = function toggleSelection(user) {
            var idx = $scope.selectedUsers.indexOf(user.UserId);
            if (idx > -1)
                $scope.selectedUsers.splice(idx, 1);
            else
                $scope.selectedUsers.push(user.UserId);
        };

        $scope.IsSelected = function (user) {
            var idx = $scope.selectedUsers.indexOf(user.UserId);
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
                Title: $scope.localTranslate('UserSearch'),
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
                    $scope.loadUsers();
                    $scope.isSearching = true;
                }
            });
        }

        $scope.loadUsers = function (page) {
            $scope.page = page || 0;

            var field = 'UserName';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Users');
            if (orderBy != null) {
                field = orderBy.Field.substring(8, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getUserGroupUsers($scope.groupId, 'sortByColumn=' + field +
                "&sortAscending=" + !isReversed +
                "&SearchField=" + $scope.SearchInfo.ColumnName +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize,
                usersLoadCompleted,
                usersLoadFailed);
        }

        function usersLoadCompleted(result) {
            $timeout.cancel(stop);
            $rootScope.Users = result.data.Users;
            $scope.loadingUsers = false;

            var pageCount = Math.trunc(result.data.TotalCount / pageSize);
            var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
            $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
            $scope.totalCount = result.data.TotalCount;

            for (var i = 0; i < $rootScope.Users.length; ++i) {
                var user = $rootScope.Users[i];
                if (user.GroupId > 0) {
                    if ($scope.selectedUsers.indexOf(user.UserId) == -1)
                        $scope.selectedUsers.push(user.UserId);
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

                var selected = $rootScope.Users[index];
                $scope.selectedItemNumber = selected['UserId'];
                $timeout(function () {
                    var items = document.getElementById("tblUsers");
                    items.children[1].children[index].scrollIntoView(true);
                }, 10);
            }
            else if ($scope.SearchInfo.SearchTerm != '') {
                var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                notificationService.displayInfo($rootScope.translate(info));
                $scope.SearchInfo.NextFoundRow = 0;
            }

            sizeTables();
            var orderBy = $rootScope.getOrderByField('Users');
            if (orderBy == null) {
                var table = document.getElementById('Users');
                var head = table.children[0].children[0].children;
                $rootScope.initSortColumns('Users', head, $rootScope.Users.Users);
            }
        }

        function usersLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingUsers = false;
            notificationService.displayError(response.statusText);
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadUsers($scope.page);
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
                var table = document.getElementById('Users');
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

                    var padCol = document.getElementById('padColUsers');
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
                    var grips = document.getElementById('UsersGrips');
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

                    $rootScope.expandColumn(table, grips, 5);
                }

                sizeTimer = null;
            }, delay);
        };

        function init() {
            $scope.loadUsers();

            $timeout(function () {
                $rootScope.handleResize('Users', 'UsersGrips',
                    function (fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    },
                    function (colId, tableId, row) {
                        if (row == -1)
                            $scope.loadUsers();
                        else if (row > -1) {
                            var user = $rootScope.Users[row];
                            $scope.selectedItemNumber = user.UserId;
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

            $scope.loadUsers();
        }

        $scope.cancelAddGroupUsers = function () {
            $scope.status.isCanceled = true;
            $modalInstance.dismiss();
        }

        $scope.addGroupUsers = function () {
            if (membershipService.isUserInRole('Admin.Groups.Users.Modify'))
                $rootScope.addUserGroupUsers($scope.groupId, $scope.selectedUsers, addGroupUsersCompleted, addGroupUsersFailed);
        }

        function addGroupUsersCompleted(result) {
            $scope.status.isCanceled = false;
            $modalInstance.dismiss();
        }

        function addGroupUsersFailed(response) {
            notificationService.displayError(response.data);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));