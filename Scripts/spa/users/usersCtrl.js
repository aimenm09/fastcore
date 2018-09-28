(function (app) {
    'use strict';

    app.controller('usersCtrl', usersCtrl);

    usersCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function usersCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('Admin.Users');

        $scope.pageClass = 'page-users';
        $scope.loadingUsers = false;
        $scope.columnNames = [];
        $rootScope.Users = [];
        $scope.SearchInfo = { Title: $scope.localTranslate('UserSearch'), SearchTerm: '', SelectedColumn: { Caption: '' } };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {};

        $scope.pageTransPrefix = 'spa.users.users.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key);
        };

        function loadDisplayedFields() {
            $rootScope.getUserDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.UserFields, $scope.columnNames);
                initGrids();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var editMode = '';
        $scope.addNew = function () {
            editMode = 'add';
            $scope.selectedItemNumber = -100;
            $scope.editItem = {};

            for (var i = 0; i < $scope.columnNames.length; ++i)
                $scope.editItem[$scope.columnNames[i].Caption] = '';

            $rootScope.Users.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        };

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if (((key == 'UserName') || (key == 'FirstName') || (key == 'LastName') || (key == 'Email')) && ($scope.editItem[key] == '')) {
                    isValid = false;
                    break;
                }
                ++i;
            }

            if (isValid) {
                var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                isValid = re.test($scope.editItem.Email.toLowerCase());
                i = 4;
            }

            if (isValid)
                saveItem();
            else {
                var items = document.getElementsByClassName('input');
                items[Math.min(i, items.length - 1)].focus();

                if (i == 4)
                    notificationService.displayError($scope.localTranslate('BadEmailFormat'));
                else
                    notificationService.displayError($scope.localTranslate(key) + ' ' + $rootScope.translate('FieldRequired'));
            }
        };

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Users.splice($rootScope.Users.length - 1);
            else {
                for (var i = 0; i < $rootScope.Users.length; ++i) {
                    var user = $rootScope.Users[i];
                    if (user.UserId == $scope.originalItem.UserId) {
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            user[$scope.columnNames[i].DataId] = $scope.originalItem[$scope.columnNames[i].DataId];
                        break;
                    }
                }
            }

            editMode = '';
            $scope.$apply();
        };

        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("Users");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
                }, 100);
        }

        function saveItem() {
            if (editMode == 'add')
                $rootScope.addUser($scope.editItem, userSaveCompleted, userSaveFailed);
            else
                $rootScope.editUser($scope.editItem, userSaveCompleted, userSaveFailed);

            function userSaveCompleted(result) {
                if (result.data.Success) {
                    SelectedColumn: $scope.columnNames[1],
                    $scope.SearchInfo.SelectedColumn.DataId = 'UserName';
                    $scope.SearchInfo.SearchTerm = $scope.editItem.UserName;
                    $scope.loadUsers();
                }
                else
                    notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
            }

            function userSaveFailed(response) {
                if (response.data != null)
                    notificationService.displayError(response.data);
            }
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

        $scope.loadUsers = function (page) {
            $scope.page = page || 0;

            showSpinner('users');
            var field = 'UserName';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Users');
            if (orderBy != null) {
                field = orderBy.Field.substring(8, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getUsers('sortByColumn=' + field +
                "&sortAscending=" + !isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize,
                usersLoadCompleted,
                usersLoadFailed);

            function usersLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Users = result.data.Users;
                $scope.loadingUsers = false;

                var pageCount = Math.trunc(result.data.TotalCount / pageSize);
                var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.TotalCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                        $scope.SearchInfo.SelectedColumn.DataId = '';
                        $scope.SearchInfo.SearchTerm = '';
                    }
                    else
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

                    var selected = $rootScope.Users[index];
                    $scope.selectedItemNumber = selected['UserId'];
                    $timeout(function () {
                        var items = document.getElementById("Users");
                        items.children[1].children[index].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                        $scope.SearchInfo.SelectedColumn.DataId = '';
                        $scope.SearchInfo.SearchTerm = '';
                    }
                    else {
                        var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                        notificationService.displayInfo($rootScope.translate(info));
                        $scope.SearchInfo.NextFoundRow = 0;
                    }
                }

                initGrids();
            }

            function usersLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingUsers = false;
                notificationService.displayError(response.statusText);
            }
        };

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadUsers($scope.page);
        };

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        };

        function init() {
            loadDisplayedFields();
            $scope.loadUsers();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
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
                });
            }, 100);
        }

        var isOnItem = false;
        $scope.getUserMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'new': return membershipService.isUserInRole('Admin.Users.Add') ? 'active' : 'disabled';
                case 'edit': return (isOnItem && membershipService.isUserInRole('Admin.Users.Edit')) ? 'active' : 'disabled';
                case 'delete': return (isOnItem && membershipService.isUserInRole('Admin.Users.Delete')) ? 'active' : 'disabled';
            }
        };

        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            if (isOnItem) {
                var user = $rootScope.Users[$scope.row];
                $scope.selectedItemNumber = user.UserId;
            }
            else
                $scope.selectedItemNumber = -100;

            $scope.$apply();
        };

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "users":
                    var user;

                    switch (itemId) {
                        case "New":
                            if (membershipService.isUserInRole('Admin.Users.Add')) {
                                $timeout(function () {
                                    $scope.addNew();
                                    $rootScope.resize();
                                }, 1);
                            }
                            break;

                        case "Edit":
                            if (membershipService.isUserInRole('Admin.Users.Edit')) {
                                user = $rootScope.Users[$scope.row];
                                $scope.editItem = user;
                                $scope.originalItem = {};
                                for (var i = 0; i < $scope.columnNames.length; ++i)
                                    $scope.originalItem[$scope.columnNames[i].DataId] = user[$scope.columnNames[i].DataId];

                                if ($scope.originalItem['UserId'] == null)
                                    $scope.originalItem['UserId'] = user['UserId'];

                                $scope.isEditing = true;
                                $scope.$apply();
                                scrollIntoView();
                                $rootScope.resize();
                            }
                            break;

                        case "Delete":
                            if (membershipService.isUserInRole('Admin.Users.Delete')) {
                                user = $rootScope.Users[$scope.row];
                                var id = user.UserId;
                                $scope.status = { isCanceled: true };
                                $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + user.FirstName + ' ' + user.LastName + "'?";
                                $scope.deleteUrl = webApiBaseUrl + '/api/users/' + id;
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/confirm.html',
                                    controller: 'confirmCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadUsers();
                                });
                            }
                            break;

                        case "Search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate('UserSearch'),
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
                                    $scope.loadUsers($scope.page);
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
        };

        init();
    }
})(angular.module('fastTrakWebUI'));