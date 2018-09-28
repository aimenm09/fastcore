(function (app) {
    'use strict';

    app.directive('customPager', customPager);

    function customPager() {
        return {
            scope: {
                page: '@',
                pagesCount: '@',
                totalCount: '@',
                searchFunc: '&',
                customPath: '@'
            },
            replace: true,
            restrict: 'E',
            templateUrl: 'scripts/spa/layout/pager.html',
            controller: ['$scope', '$rootScope', function ($scope, $rootScope) {
                $scope.localTranslate = function (key) {
                    return $rootScope.translate(key);
                }

                $scope.search = function (i) {
                    if ((i < 0) || (i > $scope.pagesCount - 1))
                        return;

                    if ($scope.searchFunc)
                        $scope.searchFunc({ page: i });
                };

                $scope.getPage = function () {
                    return $scope.selectedPage.toString();
                };

                $scope.selectedPage = 1;

                $scope.loadPage = function () {
                    if ($scope.searchFunc)
                        $scope.searchFunc({ page: parseInt($scope.selectedPage - 1) });
                };

                $scope.pages = function () {
                    var ret = [];
                    for (var i = 0; i < $scope.pagesCount; ++i)
                        ret.push(i);

                    return ret;
                };

                $scope.range = function () {
                    if (!$scope.pagesCount) { return []; }
                    var step = 2;
                    var doubleStep = step * 2;
                    var start = Math.max(0, $scope.page - step);
                    var end = start + 1 + doubleStep;
                    if (end > $scope.pagesCount) { end = $scope.pagesCount; }

                    var ret = [];
                    for (var i = start; i != end; ++i)
                        ret.push(i);

                    return ret;
                };

                $scope.pagePlus = function (count) {
                    return +$scope.page + count;
                }
            }]
        }
    }
})(angular.module('common.ui'));