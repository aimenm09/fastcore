(function (app) {
    'use strict';

    app.controller('dashboardsCtrl', dashboardsCtrl);

    dashboardsCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function dashboardsCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('InvataBI.Dashboard');

        $scope.pageClass = 'page-dashboards';
        $scope.ReportList = [];
        $scope.ConfigurationList = [];
        $scope.EmbedConfiguration = [];
        $scope.PageDetails = [];
        $scope.selectedReport = '';
        $scope.currentReportId = '';
        $scope.selectedPage = '';
        $scope.selectedTab = '';
        $scope.safeMode = false;
        $scope.loadReports = loadReports;
        $scope.displayFilters = false;
        $scope.displayNavigation = false;
        $scope.apiServer = {};
        $scope.pageTransPrefix = 'spa.invatabi.dashboards.';

        var webApiBaseUrl = settings.webApiBaseUrl;
        var selectedPage = '';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.togglePageSelection = function togglePageSelection(reportId, page, displayFilters, displayNavigation) {
            if ($scope.selectedPage === '') {
                $scope.displayFilters = displayFilters;
                $scope.displayNavigation = displayNavigation;

                if (SafeModeDetection())
                    prepareDetails(reportId, page);
                else
                    getDetails(reportId, page);
            }
            else {
                return;
            }
        }

        $scope.selectTab = function (tab) {
            angular.forEach($scope.PageDetails, function (value, key) {
                value.active = false;
            });

            tab.active = true;
            $scope.selectedTab = tab;
        };

        $scope.closeTab = function (index) {
            $scope.PageDetails.splice(index, 1);
            if ($scope.PageDetails.length > 0)
                $scope.PageDetails[$scope.PageDetails.length - 1].active = true;

            if ($scope.PageDetails.length == 0)
                $scope.selectedPage = '';
        };

        $scope.createPageDetails = function () {
            var newTab =
                {
                    id: $scope.PageDetails.length + 1,
                    title: '',
                    active: false
                }

            return newTab;
        }

        function BrowserDetection() {
            var iblb = invataBiLimitedBrowsers.split(',');
            var limitedBrowser = false;
       
            for (var i = 0; i < iblb.length; i++) {
                if (bowser.name === iblb[i]) {
                    limitedBrowser = true;
                }
            }
            return limitedBrowser;
        }

        function SafeModeDetection() {
            if (BrowserDetection() &&
                invataBiTabCount === '1') {
                return true;
            }
            else {
                return false;
            }
        }

        function loadVisual(id, page) {
            $scope.selectedPage = page;

            apiService.get(webApiBaseUrl + '/api/reports/' + id + '/config', null,
                embedConfiguration,
                visualLoadFailed);
        }

        function prepareDetails(reportId, pageSelected) {
            // Determine if we're in safe mode.
            if (SafeModeDetection()) {
                // If current report doesn't match, or report doesn't exist on page, create a new page.
                // Otherwise, find the page that was selected.
                if ($scope.currentReportId !== reportId || $scope.currentReportId === '') {
                    $scope.currentReportId = reportId;

                    if ($scope.PageDetails !== []) 
                        $scope.PageDetails = [];

                    getDetails(reportId, pageSelected);
                }
                else {
                    var reportContainer = $('#Pages' + $scope.selectedTab.id)[0];
                    var report = powerbi.get(reportContainer);
                    $scope.selectedPage = pageSelected;
                    $scope.selectedTab.title = pageSelected;
                    getPage(report);
                }
            }
        }

        var pageDetails;
        function getDetails(reportId, pageSelected) {
            // Locate current tab.
            for (var i = 0; i < $scope.PageDetails.length; ++i) {
                var pages = $scope.PageDetails[i];
                if (pages.title == pageSelected) {
                    $scope.selectTab(pages);
                    return;
                }
            }

            // Determine if we are not in safe mode, but still are required to uphold tab count limit.
            // If so, check to see if new page detail puts us over the threshold. If so, notify user.
            if (BrowserDetection() &&
                ($scope.PageDetails.length + 1) > invataBiTabCount &&
                invataBiTabCount > '1') {
                notificationService.displayError('Tab count has reached maximum limit (' + invataBiTabCount + ') for client browser. Please close at least one tab to continue.');
                return;
            } else {
                // Create new page details?
                var newlyCreated = false;
                if (pageDetails == null) {
                    pageDetails = $scope.createPageDetails();
                    newlyCreated = true;
                }
                else {
                    $timeout.cancel(stop);
                }

                // Page details and tab information.
                pageDetails.title = pageSelected;
                $scope.selectedTab = pageDetails;

                // Push details to array if new.
                if (newlyCreated) {
                    $scope.PageDetails.push(pageDetails);
                    $scope.selectTab(pageDetails);
                    pageDetails = null;
                }

                // Finally, load the visual.
                loadVisual(reportId, pageSelected);
            }
        }

        function visualLoadFailed(response) {
            notificationService.displayError(response.data);
        }

        function embedConfiguration(result) {
            $scope.EmbedConfiguration = result.data;
            $scope.selectedReport = $scope.EmbedConfiguration.Report['Name'];

            var models = window['powerbi-client'].models;
            var reportContainer = $('#Pages' + $scope.selectedTab.id);
            var accessToken = $scope.EmbedConfiguration.Report[0]['EmbedToken']['token'];
            var id = $scope.EmbedConfiguration.Report[0]['ReportID'];
            var embedUrl = $scope.EmbedConfiguration.Report[0]['EmbedUrl'];

            var embedConfiguration = {
                type: 'report',
                tokenType: models.TokenType.Embed,
                accessToken: accessToken,
                id: id,
                embedUrl: embedUrl,
                settings: {
                    filterPaneEnabled: $scope.displayFilters,
                    navContentPaneEnabled: $scope.displayNavigation
                }
            }

            var visual = powerbi.embed(reportContainer.get(0), embedConfiguration);

            console.log($scope.selectedPage);

            visual.on('loaded', function() {
                getPage(visual);
            });
        }

        function getPage(visual) {
            visual.getPages()
                .then(function (pages) {
                    var pageExists = false;

                    for (var i = 0; i < pages.length; i++) {
                        if (pages[i].displayName === $scope.selectedPage) {
                            pages[i].setActive();

                            toggleDisplay('Error' + $scope.selectedTab.id, false);
                            toggleDisplay('Pages' + $scope.selectedTab.id, true);
                            toggleDisplay('Menu' + $scope.selectedTab.id, true);

                            pageExists = true;
                            break;
                        }
                    }

                    if (pageExists === false) {

                        toggleDisplay('Error' + $scope.selectedTab.id, true);
                        toggleDisplay('Pages' + $scope.selectedTab.id, false);
                        toggleDisplay('Menu' + $scope.selectedTab.id, false);

                        document.getElementById('Error' + $scope.selectedTab.id).innerHTML = 'Could not embed report successfully. It is likely the selected page does not exist for the configured report. Check or update configuration.';
                    }

                    $scope.selectedPage = '';
                });
        }

        function toggleDisplay(id, display) {
            var x = document.getElementById(id);

            if (display === true) {
                x.style.display = 'block';
            } else {
                x.style.display = 'none';
            }
        }

        function loadReports() {
            apiService.get(webApiBaseUrl + '/api/reports/', null,
                reportListLoadCompleted,
                reportListLoadFailed);
        }

        function reportListLoadCompleted(result) {
            var list = result.data;

            // Determine what report pages to display here.
            for (var i = list.Reports.length; i > 0; i--) {
                var report = list.Reports[(i - 1)]['Name'];

                for (var n = list.Reports[(i - 1)]['Pages'].length; n > 0; n--) {
                    var page = list.Reports[(i - 1)]['Pages'][(n - 1)]['DisplayName'].split(' ').join('');

                    if (!membershipService.isUserInRole('InvataBI.Dashboard.' + report + '.Page.' + page)) {
                        list.Reports[(i - 1)]['Pages'].splice((n - 1), 1);
                    }
                }

                if (list.Reports[(i - 1)]['Pages'].length < 1) {
                    list.Reports.splice((i - 1), 1);
                }
            }

            $scope.ReportList = list;

            // Load first page in report list.
            if ($scope.ReportList.Reports.length > 0) {
                $scope.togglePageSelection($scope.ReportList.Reports[0]['ReportID'],
                    $scope.ReportList.Reports[0]['Pages'][0]['DisplayName'],
                    $scope.ReportList.Reports[0]['Pages'][0]['DisplayFilters'],
                    $scope.ReportList.Reports[0]['Pages'][0]['DisplayNavigation']
                );
            }
        }

        function reportListLoadFailed(response) {
            notificationService.displayError(response.data);
        }

        function toggleFullscreen(visual) {
            visual.fullscreen();
        }

        function toggleReload(visual, tab) {
            $scope.selectedPage = tab.title;
            visual.reload()
                .then(function (result) {
                    notificationService.displaySuccess("Dashboard reloaded successfully");
                })
                .catch(function (errors) {
                    notificationService.dipsplayError(errors);
                });
        }

        function toggleRefresh(visual) {
            visual.refresh()
                .then(function (result) {
                    notificationService.displaySuccess("Dashboard dataset(s) refreshed successfully");
                })
                .catch(function (errors) {
                    notificationService.displayError(errors.message);
                });
        }

        function togglePrint(visual) {
            visual.print()
                .catch(function (errors) {
                    notificationService.displayError(errors.message);
                });
        }

        function toggleBookmark(visual) {
            const newSettings = {
                bookmarksPaneEnabled: true
            };

            visual.updateSettings(newSettings)
                .catch(function (error) {
                    notificationService.displayError(errors.message);
                });
        }

        $scope.menuSelection = function (item, tab) {
            var embedContainer = $('#Pages' + $scope.selectedTab.id)[0];
            var visual = powerbi.get(embedContainer);

                switch (item) {
                    case "Fullscreen":
                        toggleFullscreen(visual);
                        break;

                    case "Reload":
                        toggleReload(visual, tab);
                        break;

                    case "Refresh":
                        toggleRefresh(visual);
                        break;

                    case "Print":
                        togglePrint(visual);
                        break;

                    case "Bookmark":
                        toggleBookmark(visual);
                        break;
                }
        }

        $scope.loadReports();
    }
})(angular.module('fastTrakWebUI'));