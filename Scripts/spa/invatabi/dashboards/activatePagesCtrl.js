(function (app) {
    'use strict';

    app.controller('activatePagesCtrl', activatePagesCtrl);

    activatePagesCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', '$modalInstance', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function activatePagesCtrl($scope, $rootScope, $timeout, $modal, $modalInstance, settings, apiService, notificationService, membershipService) {
        membershipService.checkRole('InvataBI.Dashboard.Configure');

        $scope.pageClass = 'page-activatepages';
        $scope.reportId;
        $scope.reportName;
        $scope.loadingPages = false;
        $scope.pages = [];
        $scope.ReportConfiguration = [];
        $scope.unknownPages = [];
        $scope.selectedPages = [];
        $scope.SearchInfo = { SearchTerm: '', ColumnName: '' };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.fillWidth = 0;

        var pageSize = 25;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.orderByField = 'DisplayName';
        $scope.reverseSort = true;

        $scope.isEditing = false;
        $scope.editItem = {};

        Math.trunc = Math.trunc || function (x) {
            if (isNaN(x)) {
                return NaN;
            }
            if (x > 0) {
                return Math.floor(x);
            }
            return Math.ceil(x);
        };

        $scope.checkAccess = function () {
            //return membershipService.isUserInRole('Admin.Groups.Users.Modify') ? '' : 'disabled';

            return $scope.selectedPages.length > 0 ? '' : 'disabled';
        }

        $scope.pageTransPrefix = 'spa.invatabi.activatepages.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function sort(column) {
            if ($scope.orderByField == column)
                $scope.reverseSort = !$scope.reverseSort;
            else {
                $scope.orderByField = column;
                $scope.reverseSort = true;
            }

            if ($scope.orderByField != '')
                $scope.loadPages(0);
        };

        $scope.getSortClass = function (column) {
            if ($scope.orderByField == column)
                return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'

            return '';
        };

        $scope.toggleSelection = function toggleSelection(pages) {
            var idx = $scope.selectedPages.indexOf(pages);

            // Is currently selected
            if (idx > -1)
                $scope.selectedPages.splice(idx, 1);
            // Is newly selected
            else
                $scope.selectedPages.push({
                    "DisplayName": pages.DisplayName,
                    "Name": pages.Name,
                    "DisplayFilters": pages.DisplayFilters,
                    "DisplayNavigation": pages.DisplayNavigation,
                    "Active": pages.Active
                });
        };

        $scope.IsSelected = function (pages) {
            var idx = $scope.selectedPages.indexOf(pages);
            return idx > -1;
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "pages")
                    $scope.loadingPages = true;
            }, 1000);
        }

        $scope.search = function () {
            $scope.status = { isCanceled: true };
            $scope.SearchInfo = {
                Title: 'Page Search',
                SearchTerm: '',
                ColumnName: 'DisplayName',
                ColumnNames: ['DisplayName'],
                DataType: 'String',
                Data: '',
                NextFoundRow: 0
            };
            $modal.open({
                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                controller: 'imSearchDialogCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
                if (!$scope.status.isCanceled) {
                    loadReportPages();
                }
            });
        }

        $scope.loadPages = function (page) {
            $scope.page = page || 0;

            loadReport();
        }

        function updateReportPages() {
            console.log('Updated report pages.');
            apiService.post(webApiBaseUrl + '/api/reports/' + $scope.reportId +'/pages/admin', $scope.unknownPages,
                loadReportPages,
                pagesUpdateFailed);
        }

        function pagesUpdateFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingPages = false;
            notificationService.displayError(response.statusText);
        }

        function loadReportPages() {
            console.log('Loaded report pages.');
            apiService.get(webApiBaseUrl + '/api/reports/' + $scope.reportId + '/pages/admin?sortByColumn=' + $scope.orderByField +
                "&sortAscending=" + $scope.reverseSort +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&searchField=" + $scope.SearchInfo.ColumnName +
                "&searchFor=" + $scope.SearchInfo.SearchTerm +
                "&nextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                null,
                pagesLoadCompleted,
                pagesLoadFailed);
        }

        function pagesLoadCompleted(result) {
            $timeout.cancel(stop);
            $scope.pages = result.data.Pages;
            $scope.loadingPages = false;

            var pageCount = Math.trunc(result.data.ResultCount / pageSize);
            var extraPageNeeded = (result.data.ResultCount % pageSize) > 0;
            $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
            $scope.totalCount = result.data.ResultCount;

            if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
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

                var selected = $scope.pages[index];
                $scope.selectedItemNumber = selected['ID'];
                $timeout(function () {
                    var items = document.getElementById("tblPages");
                    items.children[1].children[index].scrollIntoView(true);
                }, 10);
            }
            else if ($scope.SearchInfo.SearchTerm != '') {
                var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                notificationService.displayInfo($rootScope.translate(info));
                $scope.SearchInfo.NextFoundRow = 0;
            }

            sizeTables();
        }

        function pagesLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingPages = false;
            notificationService.displayError(response.statusText);
        }

        function loadReport() {
            apiService.get(webApiBaseUrl + '/api/reports/' + $scope.reportId + '/config', null,
                embedReport,
                reportLoadFailed);
        }

        function embedReport(result) {
            $scope.ReportConfiguration = result.data;

            var models = window['powerbi-client'].models;
            var reportContainer = $('#embedContainer')[0];
            var accessToken = $scope.ReportConfiguration.Report[0]['EmbedToken']['token'];
            var embedUrl = $scope.ReportConfiguration.Report[0]['EmbedUrl'];

            var embedConfiguration = {
                type: 'report',
                tokenType: models.TokenType.Embed,
                accessToken: accessToken,
                embedUrl: embedUrl
            }

            var visual = powerbi.embed(reportContainer, embedConfiguration);
            console.log(new Date().toISOString());

            visual.on('loaded', function () {
                visual.getPages()
                    .then(function(pages) {
                        for (var i = 0; i < pages.length; i++) {
                            $scope.unknownPages.push({
                                "Name": pages[i].name,
                                "DisplayName": pages[i].displayName
                            });
                        }

                        updateReportPages();

                    });
            });
        }

        function reportLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingPages = false;
            notificationService.displayError(response.statusText);
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadReportPages($scope.page);
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
                var table = document.getElementById('tblPages');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 0)
                        itemHeight = table.rows[0].clientHeight;

                    var clientRect = table.getBoundingClientRect();
                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - clientRect.top - 200;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    document.getElementById("dvPages").style.height = screenHeight + 'px';
                    document.getElementById("tblPages").style.height = screenHeight + 'px';

                    var padCol = document.getElementById('padCol');
                    if (padCol != null) {
                        if (itemHeight > screenHeight)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    $scope.TableWidth = document.body.clientWidth - clientRect.left - 15;

                    $scope.fillWidth = 0;
                    var header = table.children[0].children[0];
                    var body = table.children[1].children[0];
                    for (var i = 0; i < header.cells.length - 1; ++i) {
                        body.cells[i].style.minWidth = body.cells[i].style.maxWidth = header.cells[i].style.maxWidth;
                        $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);
                    }

                    var width = document.body.clientWidth - clientRect.left - 15 - scrollWidth;
                    var scrollWidth = (itemHeight > screenHeight) ? 17 : 0;
                    var grips = document.getElementById('dvUserGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.left = '5px';
                    grips.style.top = Math.trunc(clientRect.top) - 30 + 'px';
                    grips.style.width = clientRect.right - clientRect.left - scrollWidth + 'px';
                    grips.style.height = screenHeight - 20 + 'px';
                    $scope.fillWidth = width - $scope.fillWidth;

                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        function init() {
            $scope.loadPages();

            $timeout(function () {
                $rootScope.handleResize('tblPages', 'dvUserGrips');
            }, 100);
        }

        $scope.cancelActivate = function () {
            $modalInstance.dismiss();
        }

        $scope.saveItems = function () {
            if ($scope.selectedPages.length > 0) {
                apiService.post(webApiBaseUrl + '/api/reports/' + $scope.reportId + '/pages/admin', $scope.selectedPages,
                    saveItemCompleted,
                    saveItemFailed);
            }
        }

        function saveItemCompleted(result) {
            notificationService.displaySuccess('Page(s) saved successfully');
            $modalInstance.dismiss();
        }

        function saveItemFailed(response) {
            notificationService.displayError(response.data);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));