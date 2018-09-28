(function (app) {
    'use strict';

    app.directive('topBar', topBar);

    function topBar($location) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'scripts/spa/layout/topBar.html',
            link: function (scope, elem, attrs) {
                scope.isOn = false;

                scope.navBarToggle = function () {
                    scope.isOn = !scope.isOn;
                };

                scope.toggle = function (region, list) {
                    var trigger = $(region);
                    var list = $(list);
                   
                    trigger.toggleClass('active');
                    list.slideToggle(200);
                };
                scope.getClass = function (paths) {
                    for (var i = 0; i < paths.length; i++) {
                        var path = paths[i];
                        if ($location.path().substr(0, path.length) === path) {
                            return 'active';
                        }
                    }
                    return '';
                }
                scope.closeToggle = function () {
                    if (scope.isOn) {
                        $('.navbar-toggle').click();
                        scope.isOn = false;
                    }
                };

                $(window).resize(checkClose);
                function checkClose() {
                    var navButton = document.getElementById("navButton");
                    if ((navButton != null) && (navButton.clientWidth == 0) && scope.isOn) {
                        scope.closeToggle();
                        scope.isOn = false;
                    }
                };
            }
        }
    }
    topBar.$inject = ['$location'];
})(angular.module('common.ui'));