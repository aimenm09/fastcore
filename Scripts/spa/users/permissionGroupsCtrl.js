(function (app) {
    'use strict';

    app.controller('permissionGroupsCtrl', permissionGroupsCtrl);

    permissionGroupsCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function permissionGroupsCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Groups');

        $scope.pageClass = 'page-groups';
        $scope.loadingGroups = false;
        $scope.columnNames = [];
        $rootScope.Groups = [];
        $scope.fillWidth = 0;
        $scope.selectedItemNumber = -100;

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {}

        $scope.pageTransPrefix = 'spa.users.groups.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getGroupDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.GroupFields, $scope.columnNames);
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

            $rootScope.Groups.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        }

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if ((key != 'GroupId') && ($scope.editItem[key] == '')) {
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
                notificationService.displayError($scope.localTranslate(key) + ' ' + $rootScope.translate('FieldRequired'));
            }
        }

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Groups.splice($rootScope.Groups.length - 1);
            else {
                for (var i = 0; i < $rootScope.Groups.length; ++i) {
                    var group = $rootScope.Groups[i];
                    if (group.GroupId == $scope.originalItem.GroupId) {
                        //group.GroupName = $scope.originalItem.GroupName;
                        //group.Description = $scope.originalItem.Description;
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            group[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
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
            $timeout(function () {
                var items = document.getElementById("Groups");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        function saveItem() {
            if ((editMode == 'add') && membershipService.isUserInRole('Admin.Groups.Add'))
                $rootScope.addUserGroup($scope.editItem, groupSaveCompleted, groupSaveFailed);
            else if (membershipService.isUserInRole('Admin.Groups.Edit'))
                $rootScope.editUserGroup($scope.editItem, groupSaveCompleted, groupSaveFailed);

            function groupSaveCompleted(result) {
                if (result.data.Success) {
                    $scope.SearchInfo.SearchTerm = $scope.editItem.GroupName;
                    $scope.SearchInfo.ColumnName = 'GroupName';

                    $scope.editItem = {};
                    $scope.isEditing = false;
                    editMode = '';

                    $scope.loadGroups();
                }
                else
                    notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
            }

            function groupSaveFailed(response) {
                if (response.data != null)
                    notificationService.displayError(response.data);
            }
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "groups")
                    $scope.loadingPermissions = true;
            }, 1000);
        }

        $scope.loadGroups = function (page) {
            $scope.page = page || 0;

            showSpinner('groups');
            $rootScope.getUserGroups(groupsLoadCompleted, groupsLoadFailed);

            function groupsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Groups = result.data.Groups;
                $scope.loadingGroups = false;

                if ($scope.SearchInfo.SearchTerm != '') {
                    for (var index = 0; index < $rootScope.Groups.length; ++index) {
                        var selected = $rootScope.Groups[index];
                        if (selected['GroupName'] == $scope.SearchInfo.SearchTerm) {
                            $scope.selectedItemNumber = selected['GroupId'];
                            $timeout(function () {
                                var items = document.getElementById("tblGroups");
                                items.children[1].children[index].scrollIntoView(true);
                            }, 10);
                            break;
                        }
                    }
                }

                initGrids();
            }

            function groupsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingGroups = false;
                notificationService.displayError(response.statusText);
            }
        }

        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            $scope.selectedItemNumber = isOnItem ? item.Row.children[0].innerHTML : -100;
            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "groups":
                    switch (itemId) {
                        case "New":
                            if (membershipService.isUserInRole('Admin.Groups.Add')) {
                                $timeout(function () {
                                    $scope.addNew();
                                    $rootScope.resize();
                                }, 1);
                            }
                            break;

                        case "Edit":
                            var ti = taskItemInContext.Row;
                            var id = ti.children[0].innerHTML;
                            var group = findGroupById(id);
                            if ((group != null) && (membershipService.isUserInRole('Admin.Groups.Edit'))) {
                                $scope.editItem = group;
                                $scope.originalItem = {};
                                for (var i = 0; i < $scope.columnNames.length; ++i)
                                    $scope.originalItem[$scope.columnNames[i].DataId] = group[$scope.columnNames[i].DataId];

                                if ($scope.originalItem['GroupId'] == null)
                                    $scope.originalItem['GroupId'] = group['GroupId'];

                                $scope.isEditing = true;
                                $scope.$apply();
                                scrollIntoView();
                                $rootScope.resize();
                            }
                            break;

                        case "Delete":
                            var ti = taskItemInContext.Row;
                            var id = ti.children[0].innerHTML;
                            var group = findGroupById(id);
                            if ((group != null) && (membershipService.isUserInRole('Admin.Groups.Delete'))) {
                                $scope.status = { isCanceled: true };

                                if (group.Description != null)
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + group.GroupName + ' - ' + group.Description + "'?";
                                else
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + group.GroupName + "'?";

                                $scope.deleteUrl = webApiBaseUrl + '/api/users/groups/' + id;
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/confirm.html',
                                    controller: 'confirmCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadGroups();
                                });
                            }
                            break;

                        case "AssignUsers":
                            if (membershipService.isUserInRole('Admin.Groups.Users')) {
                                var ti = taskItemInContext.Row;
                                $scope.groupId = ti.children[0].innerHTML;
                                $scope.groupName = ti.children[1].innerText.trim();
                                $scope.status = { isCanceled: true };
                                $modal.open({
                                    templateUrl: 'scripts/spa/users/addGroupUsers.html',
                                    controller: 'addGroupUsersCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadProductSkills();
                                });
                            }
                            break;

                        case "AssignPermissions":
                            if (membershipService.isUserInRole('Admin.Groups.Permissions')) {
                                var ti = taskItemInContext.Row;
                                $scope.groupId = ti.children[0].innerHTML;
                                $scope.groupName = ti.children[1].innerText.trim();
                                $scope.status = { isCanceled: true };
                                $modal.open({
                                    templateUrl: 'scripts/spa/users/addGroupPermissions.html',
                                    controller: 'addGroupPermissionsCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadProductSkills();
                                });
                            }
                            break;
                    }
                    break;
            }
        };

        function findGroupById(id) {
            var group;
            for (var i = 0; i < $rootScope.Groups.length; ++i) {
                group = $rootScope.Groups[i];
                if (group.GroupId == id)
                    return group;
            }

            return null;
        }

        var isOnItem = false;
        $scope.getGroupMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'new': return membershipService.isUserInRole('Admin.Groups.Add') ? 'active' : 'disabled';
                case 'edit': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Edit')) ? 'active' : 'disabled';
                case 'delete': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Delete')) ? 'active' : 'disabled';
                case 'users': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Users')) ? 'active' : 'disabled';
                case 'permissions': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Permissions')) ? 'active' : 'disabled';
            }
        }

        function init() {
            loadDisplayedFields();
            $scope.loadGroups();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row > -1) {
                        var group = $rootScope.Groups[row];
                        $scope.selectedItemNumber = group.GroupId;
                    }
                    else
                        $scope.selectedItemNumber = -100

                    $scope.$apply();
                    return false;
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