(function (app) {
    'use strict';

    app.controller('replenishmentMonitorCtrl', replenishmentMonitorCtrl);

    replenishmentMonitorCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function replenishmentMonitorCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-replenishmentmonitor';
        $scope.loadingLocations = false;
        $scope.loadingDetails = false;
        $scope.loadingProcLPN = false;
        $scope.loadingPendLPN = false;
        $scope.locationColumnNames = [];
        $scope.workstationColumnNames = [];
        $scope.pendingUnitsColumnNames = [];
        $scope.stagedPalletsColumnNames = [];
        $rootScope.Stations = [];
        $scope.selectedStations = [];
        $rootScope.Locations = [];
        $scope.selectedWorkstations = [];
        $rootScope.locationDetails = null;
        $scope.Details = [];
        //$scope.SearchInfo = { Title: "Location Search", SearchTerm: '', ColumnName: '' };
        $scope.selectedItemNumber = -100;

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;

        $scope.orderByField = 'DropoffLocationID';
        $scope.reverseSort = true;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.pageTransPrefix = 'spa.monitors.replenishment.replenishmentmonitor.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.toggleStationSelection = function (station) {
            var idx = $scope.selectedStations.indexOf(station.LocationId);

            // Is currently selected
            if (idx > -1)
                $scope.selectedStations.splice(idx, 1);
            // Is newly selected
            else
                $scope.selectedStations.push(station.LocationId);

            locations = [];
            if ($scope.selectedStations.length > 0) {
                curStation = 0;
                $scope.loadReplenStations();
            }
            else
                $rootScope.Locations = [];
        };

        $scope.IsStationSelected = function (station) {
            var idx = $scope.selectedStations.indexOf(station.LocationId);
            return idx > -1;
        }

        $scope.toggleWorkstationSelection = function (workstation) {
            var idx = $scope.selectedWorkstations.indexOf(workstation.LocationId);

            if (idx > -1)
                $scope.selectedWorkstations.splice(idx, 1);
            else 
                $scope.selectedWorkstations.push(workstation.LocationId);

            locations = [];
            if ($scope.selectedWorkstations.length > 0) {
                curStation = 0;
                $scope.loadWorkstationDetails();
            }
            else
                $rootScope.locationDetails = null;
        };

        $scope.IsWorkstationSelected = function (selectedWorkstation) {
            var idx = $scope.selectedWorkstations.indexOf(selectedWorkstation.LocationId);
            return idx > -1;
        }

        function loadDisplayedFields() {
            $rootScope.getReplenishmentDisplayedFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.LocationFields, $scope.locationColumnNames);
                $rootScope.initColumns(data.WorkstationFields, $scope.workstationColumnNames);
                $rootScope.initColumns(data.PendingUnitsFields, $scope.pendingUnitsColumnNames);
                $rootScope.initColumns(data.StagedPalletsFields, $scope.stagedPalletsColumnNames);
                initGrids();
                $scope.loadLocations();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "Locations")
                    $scope.loadingLocations = true;
                else if (spinner == "Workstations")
                    $scope.loadingWorkstations = true;
                else if (spinner == "Details")
                    $scope.loadingDetails = true;
            }, 1000);
        }

        $scope.loadLocations = function (page) {
            $scope.page = page || 0;

            showSpinner("Locations");
            $rootScope.getReplenishmentInductLocations('SortByColumn=LocationName' +
                "&SortDescending=false" +
                "&PageNumber=1" +
                "&PageSize=" + pageSize,
                locationsLoadCompleted,
                locationsLoadFailed);

            function locationsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Stations = result.data.ReplenishmentInductLocations;
                $scope.loadingLocations = false;

                for (var i = 0; i < $rootScope.Stations.length; ++i)
                    $rootScope.Stations[i]['ReplenTime'] = 0.5 * $rootScope.Stations[i]['EstCases'];

                $rootScope.resize();
            }

            function locationsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingLocations = false;
                notificationService.displayError(response.data);
            }
        }

        var curStation = 0;
        var locations = [];
        $scope.loadReplenStations = function () {
            showSpinner("Workstations");
            $rootScope.getReplenishmentWorkstations('InductLocationIDs=' + $scope.selectedStations +
                "&SortByColumn=LocationName" +
                "&SortDescending=false" +
                "&PageNumber=1" +
                "&PageSize=" + pageSize,
                workstationsLoadCompleted,
                workstationsLoadFailed);

            function workstationsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Locations = result.data.ReplenishmentWorkstations;
                $scope.loadingLocations = false;

                for (var i = 0; i < $rootScope.Locations.length; ++i)
                    $rootScope.Locations[i]['ReplenTime'] = 0.5 * $rootScope.Locations[i]['EstCases'];

                initGrids();
                $rootScope.resize();
            }

            function workstationsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingLocations = false;
                notificationService.displayError(response.data);
            }
        }

        $scope.loadWorkstationDetails = function () {
            showSpinner("Details");

            var details =
            {
                EstReplenTime: 0,
                ProcessingUnits: 0,
                EstCases: 0,
                EstTotes: 0
            }

            for (var i = 0; i < $scope.selectedWorkstations.length; ++i) {
                var location = FindLocationById($scope.selectedWorkstations[i]);
                if (location != null) {
                    details.StationName = location.StationName;
                    details.EstReplenTime += location.ReplenTime;
                    details.ProcessingUnits += location.ProcessingUnits;
                    details.EstCases += location.EstCases;
                    details.EstTotes += location.EstTotes;
                }
            }

            var locationDetails = {
                Details: details,
                PendingUnits: [],
                StagedPallets: [],
                selectedPendingUnitsLocationId: 0,
                selectedStagedPalletsLocationId: 0
            }

            function FindLocationById(locationId) {
                var location = null;

                for (var i = 0; i < $rootScope.Locations.length; ++i) {
                    location = $rootScope.Locations[i];
                    if (location.LocationId == locationId)
                        break;
                }

                return location;
            }

            var step = 0;
            $rootScope.getReplenishmentPeningUnits($scope.selectedWorkstations.toString(), pendingUnitsCompleted, pendingUnitsLoadFailed);
            $rootScope.getReplenishmentStagedPallets($scope.selectedWorkstations.toString(), stagedPalletsCompleted, stagedPalletsFailed);

            function pendingUnitsCompleted(result) {
                locationDetails.PendingUnits = result.data.PendingUnits;
                if (++step == 2)
                    initDetails(locationDetails);
            }

            function pendingUnitsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
                notificationService.displayError(response.data);
            }

            function stagedPalletsCompleted(result) {
                locationDetails.StagedPallets = result.data.StagedPallets;
                if (++step == 2)
                    initDetails(locationDetails);
            }

            function stagedPalletsFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
                notificationService.displayError(response.data);
            }
        }

        function initDetails(locationDetails) {
            $timeout.cancel(stop);
            $scope.loadingDetails = false;
            $rootScope.locationDetails = locationDetails;
            initGrids();

            // Since Workstations can be selected after initial sort, apply the sort again
            $rootScope.applySort('PendingUnits');
            $rootScope.applySort('StagedPallets');
        }

        var isDetailsDisabled = false;
        var isReleaseDisabled = false;
        var isCancelDisabled = false;
        $scope.getLocationMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'details': return isDetailsDisabled ? 'disabled' : 'active';
                case 'releaseGroup': return isReleaseDisabled ? 'disabled' : 'active';
                case 'cancelGroup': return isCancelDisabled ? 'disabled' : 'active';
            }
        }

        function Init() {
            loadDisplayedFields();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId) {
                    return false;
                });
            }, 100);
        }

        var menuItem;
        $rootScope.menuHandler = function (menuName, item) {
            menuItem = item;
            if (item != null) {
                $scope.focusPanel = menuName;
                if ((menuName == "procLPN") && (item.Col != -1)) {
                    var row = item.Row.children[0].innerText.trim();
                    $scope.selectedTab.selectedProcPalletLpn = row;
                }
                else if ((menuName == "pendLPN") && (item.Col != -1)) {
                    var row = item.Row.children[0].innerText.trim();
                    $scope.selectedTab.selectedPendPalletLpn = row;
                }
                else if (menuName == 'locations') {
                    if (item.Col >= 0) {
                        $scope.selectedItemNumber = item.Row.children[0].innerHTML;
                        isDetailsDisabled = false;
                        isReleaseDisabled = false;
                        isCancelDisabled = false;
                    }
                    else {
                        $scope.selectedItemNumber = -100;
                        isDetailsDisabled = true;
                        isReleaseDisabled = true;
                        isCancelDisabled = true;
                    }
                }

                $scope.$apply();
            }
        }

        $rootScope.menuClickHandler = function (menuName, item, taskItemInContext) {
            switch (menuName) {
                case "locations":
                    switch (item) {
                        case "details":
                            if (!isDetailsDisabled) {
                                var id = getLocationIdFromLocation(taskItemInContext.Row.children[1].innerText.trim());
                                $scope.getDetails(id);
                            }
                            break;

                        case "search":
                            //var columnNames = [
                            //    'Location',
                            //    'PendingUnits',
                            //    'CurrentUnits',
                            //    'EstimatedReplenishmentTime',
                            //    'ProcessingLpns',
                            //    'PendingLpns'
                            //];

                            //var colName = columnNames[menuItem.Col - 1]; // Subtract one for hidden LocationID column
                            //$scope.status = { isCanceled: true };
                            //$scope.SearchInfo = {
                            //    Title: "Location Search",
                            //    ColumnName: colName,
                            //    ColumnNames: columnNames,
                            //    DataType: 'String',
                            //    SearchTerm: $scope.Locations[$scope.row][colName]
                            //};
                            //$modal.open({
                            //    templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                            //    controller: 'imSearchDialogCtrl',
                            //    scope: $scope
                            //}).result.then(function ($scope) {
                            //}, function () {
                            //    if (!$scope.status.isCanceled)
                            //        $scope.loadStations();
                            //});
                            break;

                        case "refresh":
                            $scope.loadStations($scope.page);
                            break;
                    }
                    break;

                case "containers":
                    switch (item) {
                        case "auditTrail":
                            break;

                        case "refresh":
                            $scope.getDetails($scope.selectedTab.content.GroupDetails.GroupId);
                            break;
                    }
                    break;

                case "skus":
                    switch (item) {
                        case "refresh":
                            $scope.getDetails($scope.selectedTab.content.GroupDetails.GroupId);
                            break;
                    }
                    break;
            }
        }

        function getLocationIdFromLocation(location) {
            for (var i = 0; i < $rootScope.Locations.length; ++i) {
                var loc = $rootScope.Locations[i];
                if (loc.StationName == location)
                    return loc.LocationId;
            }
        }

        $rootScope.clickHandler = function (el) {
            if (el.id.includes('Locations'))
                $scope.selectedItemNumber = -100;
            else if (el.id.includes('ProcLPN'))
                $scope.selectedTab.selectedProcPalletLpn = -100;
            else if (el.id.includes('PendLPN'))
                $scope.selectedTab.selectedPendPalletLpn = -100;
            $scope.$apply();
        }

        Init();
    }
})(angular.module('fastTrakWebUI'));