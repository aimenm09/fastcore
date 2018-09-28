(function (app) {
    'use strict';

    app.controller('groupCommentCtrl', groupCommentCtrl);

    groupCommentCtrl.$inject = ['$scope', '$rootScope', '$modalInstance', '$timeout', 'apiService', 'notificationService', 'settings'];

    function groupCommentCtrl($scope, $rootScope, $modalInstance, $timeout, apiService, notificationService, settings) {
        $scope.cancel = cancel;
        $scope.addComment = addComment;
        $scope.getComment = getComment;

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.pageTransPrefix = 'spa.group.groupmonitor.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function addComment() {
            var id = $scope.GroupComment.GroupId;

            if (id > 0) {
                var comment = $scope.GroupComment.Comment;

                var url;
                if ($scope.GroupComment.CommentType == 'Comment')
                    $rootScope.addPickGroupComment(id, comment, addCommentCompleted, addCommentFailed);
                else
                    $rootScope.addPickGroupInstructions(id, comment, addCommentCompleted, addCommentFailed);
            }
            else
                $modalInstance.dismiss();

            function addCommentCompleted(response) {
                if ($scope.GroupComment.CommentType == 'Comment')
                    notificationService.displaySuccess('Comment has been added');
                else
                    notificationService.displaySuccess('Instruction has been added');
                $modalInstance.dismiss();
            }

            function addCommentFailed(response) {
                if ($scope.GroupComment.CommentType == 'Comment')
                    notificationService.displayError("Failed to add comment");
                else
                    notificationService.displayError("Failed to add instruction");
            }
        }

        function cancel() {
            $modalInstance.dismiss();
        }

        function getComment() {
            var id = $scope.GroupComment.GroupId;

            if (id > 0) {
                var url;
                if ($scope.GroupComment.CommentType == 'Comment')
                    $rootScope.getPickgroupComment(id, getCommentCompleted, getCommentFailed);
                else
                    $rootScope.getPickGroupInstructions(id, getCommentCompleted, getCommentFailed);
            }

            function getCommentCompleted(response) {
                if ($scope.GroupComment.CommentType == 'Comment')
                    $scope.GroupComment.Comment = response.data.Comment;
                else
                    $scope.GroupComment.Comment = response.data.Instructions
            }

            function getCommentFailed(response) {
                if ($scope.GroupComment.CommentType == 'Comment')
                    notificationService.displayError("Error getting comment.");
                else
                    notificationService.displayError("Error getting instruction.");
            }
        }

        $scope.getComment();
    }
})(angular.module('fastTrakWebUI'));