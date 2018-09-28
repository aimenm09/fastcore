(function () {
    'use strict';

    angular.module('fastTrakWebUI', ['common.core', 'common.ui', 'ui.router'])
        .config(config)
        .run(run);

    config.$inject = ['$routeProvider', '$stateProvider'];
    function config($routeProvider, $stateProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "scripts/spa/main/tabMain.html",
                controller: "tabMainCtrl"
            })
            .when("/login/:role", {
                templateUrl: "scripts/spa/main/tabMain.html",
                controller: "tabMainCtrl"
            })
            .when("/changepassword", {
                templateUrl: "scripts/spa/account/changePassword.html",
                controller: "passwordChangeCtrl"
            })
            .when("/whereIs", {
                templateUrl: "scripts/spa/inventory/whereIs/whereIsTransaction.html",
                controller: "whereIsTransactionCtrl"
            })
            .when("/check", {
                templateUrl: "scripts/spa/inventory/check/checkTransaction.html",
                controller: "checkTransactionCtrl"
            })
            .when("/groups", {
                templateUrl: "scripts/spa/monitors/groups/groupMonitor.html",
                controller: "groupMonitorCtrl"
            })
            .when("/groupOrders", {
                templateUrl: "scripts/spa/monitors/groups/groupOrders.html",
                controller: "groupOrdersCtrl"
            })
            .when("/groupRelease", {
                templateUrl: "scripts/spa/monitors/groups/groupRelease.html",
                controller: "groupReleaseCtrl"
            })
            .when("/orders", {
                templateUrl: "scripts/spa/monitors/orders/orderMonitor.html",
                controller: "orderMonitorCtrl"
            })
            .when("/replenishment", {
                templateUrl: "scripts/spa/monitors/replenishment/replenishmentMonitor.html",
                controller: "replenishmentMonitorCtrl"
            })
            .when("/replenishmentTrans", {
                templateUrl: "scripts/spa/transactions/replenishment/replenishmentTrans.html",
                controller: "replenishmentTransCtrl"
            })
            .when("/routing", {
                templateUrl: "scripts/spa/routing/routeManager.html",
                controller: "routeManagerCtrl"
            })
            .when("/itemmaster", {
                templateUrl: "scripts/spa/itemmaster/itemMaster.html",
                controller: "itemMasterCtrl"
            })
            .when("/unitofmeasure", {
                templateUrl: "scripts/spa/unitofmeasure/unitOfMeasures.html",
                controller: "unitOfMeasuresCtrl"
            })
            .when("/locations", {
                templateUrl: "scripts/spa/locations/locationMonitor.html",
                controller: "locationMonitorCtrl"
            })
            .when("/stations", {
                templateUrl: "scripts/spa/stations/stations.html",
                controller: "stationsCtrl"
            })
            .when("/users", {
                templateUrl: "scripts/spa/users/users.html",
                controller: "usersCtrl"
            })
            .when("/permissions", {
                templateUrl: "scripts/spa/users/permissions.html",
                controller: "permissionsCtrl"
            })
            .when("/permissiongroups", {
                templateUrl: "scripts/spa/users/permissionGroups.html",
                controller: "permissionGroupsCtrl"
            })
            .when("/dashboards", {
                templateUrl: "scripts/spa/invatabi/dashboards.html",
                controller: "dashboardsCtrl"
            })
            .when("/dashboards/configure", {
                templateUrl: "scripts/spa/invatabi/dashboards/configure.html",
                controller: "configureCtrl"
            })
            .when("/help", {
                templateUrl: "scripts/spa/help/help.html"
            })
            .when("/InfoPageTemplate", {
                templateUrl: "scripts/spa/transactions/infoPageTemplate.html",
                controller: "infoPageTemplateCtrl"
            })
            .otherwise({ redirectTo: "/" });
    }

    run.$inject = ['$rootScope', '$location', '$cookieStore', '$http', 'membershipService', 'notificationService'];

    function run($rootScope, $location, $cookieStore, $http, membershipService, notificationService) {
        // handle page refreshes
        $rootScope.repository = $cookieStore.get('repository') || {};
        if ($rootScope.repository.loggedUser)
            $http.defaults.headers.common['Authorization'] = $rootScope.repository.loggedUser.authdata;
        else {
            var userInfo = $cookieStore.get('UserInfo');
            if (userInfo != null)
                membershipService.loginAD(userInfo, function (result) {
                    if (result.data.Success) {
                        var user = result.data.User;

                        membershipService.saveCredentials(user, result.data.Roles, 'en', 0, result.data.SessionId);
                        notificationService.displaySuccess('Hello ' + user.FirstName);
                        $rootScope.userData.displayUserInfo(user.FirstName);
                    }
                    else
                        notificationService.displayError($rootScope.translate($scope.pageTransPrefix + 'LoginFailed'));
                }
            );
        }

        $rootScope.$on('$routeChangeStart', function (event, current) {
            $rootScope.pageTitle = current.$$route.title;
            if (($rootScope.repository.loggedUser == null) && (current.$$route.originalPath != '/') && (current.$$route.originalPath != '/changepassword/:id')) {
                if ($location.$$url != '/login/')
                    $location.path('/');
            }
        });

        $(document).ready(function () {
            $(".fancybox").fancybox({
                openEffect: 'none',
                closeEffect: 'none'
            });

            $('.fancybox-media').fancybox({
                openEffect: 'none',
                closeEffect: 'none',
                helpers: {
                    media: {}
                }
            });

            $('[data-toggle=offcanvas]').click(function () {
                $('.row-offcanvas').toggleClass('active');
            });
        });
    }

    isAuthenticated.$inject = ['membershipService', '$rootScope', '$location'];

    function isAuthenticated(membershipService, $rootScope, $location) {
        if (!membershipService.isUserLoggedIn()) {
            $rootScope.previousState = $location.path();
            $location.path('/login');
        }
    }
})();