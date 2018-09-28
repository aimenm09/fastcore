(function (app) {
    'use strict';

    app.controller('permissionsCtrl', permissionsCtrl);

    permissionsCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function permissionsCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Permissions');

        $scope.pageClass = 'page-permissions';
        $scope.loadingPermissions = false;
        $scope.columnNames = [];
        $rootScope.Permissions = [];
        $scope.selectedItemNumber = -100;
        $scope.SearchInfo = { Title: $scope.localTranslate("PermissionSearch"), SearchTerm: '', SelectedColumn: { DataId: '' } };

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {};

        $scope.pageTransPrefix = 'spa.users.permissions.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getPermissionDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.PermissionFields, $scope.columnNames);
                initGrids();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var editMode = ''
        $scope.addNew = function () {
            editMode = 'add';
            $scope.editItem = {};

            for (var i = 0; i < $scope.columnNames.length; ++i)
                $scope.editItem[$scope.columnNames[i].Caption] = '';

            $rootScope.Permissions.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        }

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if ((key != 'PermissionId') && (key != 'Description') && ($scope.editItem[key] == '')) {
                    isValid = false;
                    break;
                }
                ++i;
            }

            if (isValid)
                saveItem();
            else {
                var items = document.getElementsByClassName('input');
                items[Math.min(i, items.length - 1)].focus();
                notificationService.displayError($scope.localTranslate(key) + $rootScope.translate('FieldRequired'));
            }
        }

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Permissions.splice($rootScope.Permissions.length - 1);
            else {
                for (var i = 0; i < $rootScope.Permissions.length; ++i) {
                    var permission = $rootScope.Permissions[i];
                    if (permission.PermissionId == $scope.originalItem.PermissionId) {
                        //permission.Name = $scope.originalItem.Name;
                        //permission.Description = $scope.originalItem.Description;
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            permission[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
                        break;
                    }
                }
            }

            editMode = '';
            $rootScope.resize();
        }

        $scope.getTemplate = function (item) {
            return (item == $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("Permissions");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        function saveItem() {
            if (editMode == 'add')
                $rootScope.addUserPermission($scope.editItem, permissionSaveCompleted, permissionSaveFailed);
            else
                $rootScope.editUserPermission($scope.editItem, permissionSaveCompleted, permissionSaveFailed);

            function permissionSaveCompleted(result) {
                if (result.data.Success) {
                    $scope.SearchInfo.SearchTerm = $scope.editItem.Name;
                    $scope.SearchInfo.ColumnName = 'Name';
                    $scope.loadPermissions();
                }
                else
                    notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
            }

            function permissionSaveFailed(response) {
                if (response.data != null)
                    notificationService.displayError(response.data);
            }
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "permissions")
                    $scope.loadingPermissions = true;
            }, 1000);
        }

        $scope.loadPermissions = function (page) {
            $scope.page = page || 0;

            showSpinner('permissions');
            var field = 'Name';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Permissions');
            if (orderBy != null) {
                field = orderBy.Field.substring(14, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getUserPermissions('sortByColumn=' + field +
                "&sortAscending=" + !isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize,
                permissionsLoadCompleted,
                permissionsLoadFailed);

            function permissionsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Permissions = result.data.Permissions;
                $scope.loadingPermissions = false;

                var pageCount = Math.trunc(result.data.TotalCount / pageSize);
                var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.TotalCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                    }
                    else
                        $scope.isSearching = true;

                    $scope.SearchInfo.NextFoundRow = result.data.NextFoundRow;
                    $scope.page = Math.trunc(result.data.NextFoundRow / pageSize);

                    var index;
                    // NextRowFound is the absolute index of the record in the entire permission lst.
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
                        var items = document.getElementById("Permissions");
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

            function permissionsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingPermissions = false;
                notificationService.displayError(response.statusText);
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadPermissions($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        function init() {
            loadDisplayedFields();
            $scope.loadPermissions();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1)
                        $scope.loadPermissions();
                    else if (row > -1) {
                        var permission = $rootScope.Permissions[row];
                        $scope.selectedItemNumber = permission.PermissionId;
                        $scope.$apply();
                    }
                    else
                        $scope.selectedItemNumber = -100;

                    $scope.$apply();
                    return true;
                });
            }, 100);
        }

        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            if (isOnItem) {
                var permission = $rootScope.Permissions[$scope.row];
                $scope.selectedItemNumber = permission.PermissionId;
            }
            else
                $scope.selectedItemNumber = -100;

            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "permissions":
                    switch (itemId) {
                        case "New":
                            if (membershipService.isUserInRole('Admin.Permissions.Add')) {
                                $timeout(function () {
                                    $scope.addNew();
                                    $rootScope.resize();
                                }, 1);
                            }
                            break;

                        case "Edit":
                            if (membershipService.isUserInRole('Admin.Permissions.Edit')) {
                                var permission = $rootScope.Permissions[$scope.row];
                                $scope.editItem = permission;
                                $scope.originalItem = {};
                                for (var i = 0; i < $scope.columnNames.length; ++i)
                                    $scope.originalItem[$scope.columnNames[i].DataId] = permission[$scope.columnNames[i].DataId];

                                if ($scope.originalItem['PermissionId'] == null)
                                    $scope.originalItem['PermissionId'] = permission['PermissionId'];

                                $scope.isEditing = true;
                                $scope.$apply();
                                scrollIntoView();
                                $rootScope.resize();
                            }
                            break;

                        case "Delete":
                            if (membershipService.isUserInRole('Admin.Permissions.Delete')) {
                                var permission = $rootScope.Permissions[$scope.row];
                                var id = permission.PermissionId;
                                $scope.status = { isCanceled: true };
                                var desc = ((permission.Description != null) &&
                                    (permission.Description != '')) ? ' - ' + permission.Description : "";
                                $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + "'" + permission.Name + desc + "'?";
                                $scope.deleteUrl = webApiBaseUrl + '/api/users/permissions/' + id;
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/confirm.html',
                                    controller: 'confirmCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadPermissions();
                                });
                            }
                            break;

                        case "Search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate("PermissionSearch"),
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
                                    $scope.loadPermissions();
                            });
                            break;
                    }
                    break;
            }
        };

        var isOnItem = false;
        $scope.getGroupMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'new': return membershipService.isUserInRole('Admin.Permissions.Add') ? 'active' : 'disabled';
                case 'edit': return (isOnItem && membershipService.isUserInRole('Admin.Permissions.Edit')) ? 'active' : 'disabled';
                case 'delete': return (isOnItem && membershipService.isUserInRole('Admin.Permissions.Delete')) ? 'active' : 'disabled';
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