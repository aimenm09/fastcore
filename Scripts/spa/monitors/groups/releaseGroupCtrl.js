(function (app) {
    'use strict';

    app.controller('releaseGroupCtrl', releaseGroupCtrl);

    releaseGroupCtrl.$inject = ['$scope', '$routeParams', '$modalInstance', 'apiService', 'notificationService'];

    function releaseGroupCtrl($scope, $routeParams, $modalInstance, apiService, notificationService) {
        $scope.pageClass = 'page-groupusers';
        $scope.loadingUsers = true;
        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.Users = [];
        $scope.selectedUsers = [];

        $scope.search = search;
        $scope.clearSearch = clearSearch;
        //$scope.openEditDialog = openEditDialog;
        $scope.addGroupUsers = addGroupUsers;
        $scope.cancelAddGroupUsers = cancelAddGroupUsers;
        $scope.toggleSelection = function toggleSelection(user) {
            var idx = $scope.selectedUsers.indexOf(user.UserId);

            // Is currently selected
            if (idx > -1) {
                $scope.selectedUsers.splice(idx, 1);
            }

            // Is newly selected
            else {
                $scope.selectedUsers.push(user.UserId);
            }
        };

        $scope.IsSelected = function (user) {
            var idx = $scope.selectedUsers.indexOf(user.UserId);
            return idx > -1;
        }

        function search(page) {
            page = page || 0;

            $scope.loadingUsers = true;

            var config = {
                params: {
                    page: page,
                    pageSize: 10,
                    filter: $scope.filterUsers
                }
            };

            apiService.get('/api/users/search/', config,
                usersLoadCompleted,
                usersLoadFailed);
        }

        //function openEditDialog(user) {
        //    $scope.EditedUser = user;
        //    $scope.GroupId = $routeParams.id;
        //    $modal.open({
        //        templateUrl: 'scripts/spa/users/editUser.html',
        //        controller: 'usersEditCtrl',
        //        scope: $scope
        //    }).result.then(function ($scope) {
        //        clearSearch();
        //    }, function () {
        //    });
        //}

        function usersLoadCompleted(result) {
            $scope.Users = result.data.Items;

            $scope.selectedUsers = [];
            for (var i = 0; i < $scope.GroupUsers.length; ++i) {
                var userId = $scope.GroupUsers[i].UserId;
                $scope.selectedUsers.push(userId);
            }

            $scope.page = result.data.Page;
            $scope.pagesCount = result.data.TotalPages;
            $scope.totalCount = result.data.TotalCount;
            $scope.loadingUsers = false;

            if ($scope.filterUsers && $scope.filterUsers.length) {
                notificationService.displayInfo(result.data.Items.length + ' users found');
            }
        }

        function usersLoadFailed(response) {
            notificationService.displayError(response.data);
        }

        function clearSearch() {
            $scope.filterUsers = '';
            search();
        }

        function addGroupUsers() {
            apiService.post('/api/groups/addusers/' + $routeParams.id, $scope.selectedUsers,
                addUsersCompleted,
                addUsersFailed);
        }

        function addUsersCompleted(result) {
            $modalInstance.dismiss();
        }

        function addUsersFailed(response) {
            notificationService.displayError(response.data);
        }

        function cancelAddGroupUsers() {
            $scope.status.isCanceled = true;
            $modalInstance.dismiss();
        }

        $scope.search();
    }
})(angular.module('invataSkills'));