(function (app) {
    'use strict';

    app.controller('groupMonitorCtrl', groupMonitorCtrl);

    groupMonitorCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function groupMonitorCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-groupmonitor';
        $scope.loadingFilters = false;
        $scope.loadingGroups = false;
        $scope.loadingDetails = false;
        $scope.loadingContainers = false;
        $scope.loadingSkus = false;
        $scope.groupColumnNames = [];
        $scope.orderColumnNames = [];
        $scope.containerColumnNames = [];
        $scope.skuColumnNames = [];
        $rootScope.Groups = [];
        $scope.PickGroupStatuses = [];
        $scope.PickGroupAges = [];
        $scope.selectedPickGroupStatus = [];
        $scope.selectedPickGroupAge = { AgeId: 0 };
        $scope.apiServer = {};
        $scope.groupInfo = {};
        $scope.groupOrders = [];
        $rootScope.GroupDetails = [];
        $scope.selectedViewIndex = 0;
        $scope.DetailName = 'Details';
        $scope.IsOrdersVisible = true;
        $scope.IsContainersVisible = true;
        $scope.IsSKUsVisible = true;
        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.selectedGroupId = 0;
        $scope.ResultViews = [
            { Name: 'Order/Container/SKU' },
            { Name: 'Order/SKU' },
            { Name: 'SKU' }];
        $scope.selectedView = $scope.ResultViews[0];

        $scope.loadFilters = loadFilters;
        $scope.loadGroups = loadGroups;
        $scope.getDetails = getDetails;
        $scope.addReleaseInstructions = addReleaseInstructions;
        $scope.addComment = addComment;
        $scope.selectedItemNumber = -100;
        $scope.SearchInfo = { Title: $scope.localTranslate("OrderSearch"), SearchTerm: '', SelectedColumn: { DataId: '' } };

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;
        var lastTabId = 0;

        $scope.pageTransPrefix = 'spa.group.groupmonitor.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.IsViewSelected = function (view) {
            return ($scope.selectedView.Name == view.Name);
        }

        $scope.orderSelected = function (order) {
            $scope.focusPanel = "Orders";
            $scope.selectedTab.selectedOrderNumber = order.OrderNumber;

            if ($scope.selectedView == $scope.ResultViews[0])
                getContainers(order.OrderHeaderID);
            else if ($scope.selectedView == $scope.ResultViews[1])
                getOrderSkus(order.OrderHeaderID);
        };

        var loadingData;
        function getContainers(orderHeaderId) {
            if (loadingData)
                return false;

            loadingData = true;
            showSpinner("Containers");
            $rootScope.getPickgroupContainers(orderHeaderId, containersLoadCompleted, containersLoadFailed);

            function containersLoadCompleted(result) {
                $timeout.cancel(stop);
                loadingData = false;
                $scope.loadingContainers = false;
                $scope.selectedTab.content.Containers = result.data;

                if ($scope.selectedView == $scope.ResultViews[0]) {
                    if ($scope.selectedTab.content.Containers.length > 0)
                        $scope.containerSelected($scope.selectedTab.content.Containers[0]);
                    $scope.focusPanel = "Orders";
                }

                initGrids();
            }

            function containersLoadFailed(response) {
                $timeout.cancel(stop);
                loadingData = false;
                $scope.loadingContainers = false;
                notificationService.displayError(response.data);
            }
        }

        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "Containers")
                    $scope.loadingContainers = true;
                else if (spinner == "Skus")
                    $scope.loadingSkus = true;
                else if (spinner == "Groups")
                    $scope.loadingGroups = true;
                else if (spinner == "Details")
                    $scope.loadingDetails = true;
                else if (spinner == "Filters")
                    $scope.loadingFilters = true;

                var loadingDivs = document.getElementsByClassName("loading");
                if (loadingDivs.length > 0) {
                    var count = 1;
                    if ($scope.selectedView = $scope.ResultViews[0])
                        count = 3;
                    else if ($scope.selectedView = $scope.ResultViews[1])
                        count = 2;

                    var groupRect = getGroupInfoBoundingRect();
                    var ht = ((document.body.clientHeight - groupRect.top) / count) - 20;

                    for (var div = 0; div < loadingDivs.length; ++div) {
                        var ldiv = loadingDivs[div];
                        ldiv.style.height = ldiv.style.maxHeight = ht + "px";
                        ldiv.style.width = ldiv.style.maxWidth = document.body.clientWidth - 1087 + "px";
                    }
                }
            }, 1000);
        }

        function getGroupInfoBoundingRect() {
            var groupRect;
            var info = document.getElementsByClassName("groupInfo");
            if (info.length > 0) {
                var groupRect;
                var index = 0;
                if (info.length > 1) {
                    for (var index = 0; index < info.length; ++index) {
                        groupRect = info[index].getBoundingClientRect();
                        if (groupRect.right > 0)
                            break;
                    }
                }
                else
                    groupRect = info[index].getBoundingClientRect();
            }
            return groupRect;
        }

        $scope.containerSelected = function (container) {
            $scope.focusPanel = "Containers";
            $scope.selectedTab.selectedCartonNumber = container.CartonNumber;
            getContainerSkus(container.ContainerID);
        };

        function getContainerSkus(containerId) {
            if (loadingData)
                return false;

            loadingData = true;
            showSpinner("Skus");
            $rootScope.getContainerSkus(containerId, skusLoadCompleted, skusLoadFailed);
        }

        function getOrderSkus(orderHeaderId) {
            if (loadingData)
                return false;

            loadingData = true;
            showSpinner("Skus");
            $rootScope.getOrderSkus(orderHeaderId, skusLoadCompleted, skusLoadFailed);
        }

        function getPickGroupSkus(groupId) {
            if (loadingData)
                return false;

            loadingData = true;
            showSpinner("Skus");
            $rootScope.getPickgroupSkus(groupId, skusLoadCompleted, skusLoadFailed);
        }

        function skusLoadCompleted(result) {
            $timeout.cancel(stop);
            loadingData = false;
            $scope.loadingSkus = false;
            $scope.selectedTab.content.Skus = result.data;
            initGrids();
        }

        function skusLoadFailed(response) {
            $timeout.cancel(stop);
            loadingData = false;
            $scope.loadingSkus = false;
            notificationService.displayError(response.data);
        }

        $scope.selectedTab = null;
        $scope.selectTab = function (tab) {
            angular.forEach($rootScope.GroupDetails, function (value, key) {
                value.active = false;
            });

            $scope.selectedGroupId = tab.content.Details.PickGroupNumber;
            tab.active = true;

            $scope.selectedTab = tab;
            $scope.selection.tab = tab;

            initGrids();
        };

        $scope.closeTab = function (index) {
            var id = $rootScope.GroupDetails[index].id;
            $rootScope.removeOrderByField('Orders' + id);
            $rootScope.removeOrderByField('Containers' + id);
            $rootScope.removeOrderByField('Skus' + id);

            $rootScope.GroupDetails.splice(index, 1);

            if ($rootScope.GroupDetails.length > 0) {
                // Reindex the group details
                for (var i = 0; i < $rootScope.GroupDetails.length; ++i)
                    $rootScope.GroupDetails[i].id = i + 1;

                lastTabId = i;
                checkVisibleCount();
                $scope.selectTab($rootScope.GroupDetails[$rootScope.GroupDetails.length - 1]);
            }
            else {
                $scope.selectedTab = null;
                $scope.selectedGroupId = 0;
                lastTabId = 0;
            }
        };

        $scope.togglePickGroupStatusSelection = function togglePickGroupStatusSelection(status) {
            var idx = -1;
            for (var i = 0; i < $scope.selectedPickGroupStatus.length; ++i) {
                if ($scope.selectedPickGroupStatus[i].Name == status.Name) {
                    idx = i;
                    break;
                }
            }

            if (idx > -1)
                $scope.selectedPickGroupStatus.splice(idx, 1);
            else
                $scope.selectedPickGroupStatus.push(status);

            $scope.loadGroups(0);
        };

        $scope.IsPickGroupStatusSelected = function (status) {
            for (var i = 0; i < $scope.selectedPickGroupStatus.length; ++i) {
                if ($scope.selectedPickGroupStatus[i].Status == status.Status)
                    return true;
            }
        }

        $scope.togglePickGroupAgeSelection = function togglePickGroupAgeSelection(age) {
            $scope.selectedPickGroupAge = age;
            $scope.loadGroups(0);
        };

        $scope.IsPickGroupAgeSelected = function (age) {
            return ($scope.selectedPickGroupAge.AgeId == age.AgeId);
        }

        $scope.toggleViewSelection = function toggleViewSelection(view) {
            $scope.selectedView = view;

            if (view == $scope.ResultViews[0]) {
                $scope.selectedViewIndex = 0;
                $scope.IsOrdersVisible = true;
                $scope.IsContainersVisible = true;
                $scope.IsSKUsVisible = true;

                if ($scope.selectedGroupId > 0)
                    getContainerSkus(getContainerIdByCartonNumber($scope.selectedTab.selectedCartonNumber));
            }
            else if (view == $scope.ResultViews[1]) {
                $scope.selectedViewIndex = 1;
                $scope.IsOrdersVisible = true;
                $scope.IsContainersVisible = false;
                $scope.IsSKUsVisible = true;

                if ($scope.selectedGroupId > 0)
                    getOrderSkus(getOrderHeaderIdByOrderNumber($scope.selectedTab.selectedOrderNumber));
            }
            else {
                $scope.selectedViewIndex = 2;
                $scope.IsOrdersVisible = false;
                $scope.IsContainersVisible = false;
                $scope.IsSKUsVisible = true;

                if ($scope.selectedGroupId > 0)
                    getPickGroupSkus($scope.selectedGroupId);
            }

            if ($scope.selectedTab != null) {
                scrollIntoView();
                initGrids();
                $timeout(function () {
                    initGrids();
                }, 10);
            }
        };

        function scrollIntoView() {
            $timeout(function () {
                if ($scope.selectedView != $scope.ResultViews[2]) {
                    var item = item = $scope.selectedTab.selectedOrderNumber;
                    var items = document.getElementsByClassName("orders");
                    for (var i = 0; i < items.length; ++i) {
                        var curContainer = items[i].children[0].innerText.trim();
                        if (curContainer == item) {
                            items[i].scrollIntoView(true);
                            break;
                        }
                    }
                }
            }, 100);
        }

        function getContainerIdByCartonNumber(cartonNumber) {
            var containers = $scope.selectedTab.content.Containers;
            for (var i = 0; i < containers.length; ++i) {
                var container = containers[i];
                if (container.CartonNumber == cartonNumber)
                    return container.ContainerID;
            }
        }

        function getOrderHeaderIdByOrderNumber(orderNumber) {
            var orders = $scope.selectedTab.content.Orders;
            for (var i = 0; i < orders.length; ++i) {
                var order = orders[i];
                if (order.OrderNumber == orderNumber)
                    return order.OrderHeaderID;
            }
        }

        function loadDisplayedFields() {
            $rootScope.getPickGroupDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            var isInit = true;
            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.PickGroupFields, $scope.groupColumnNames);
                $rootScope.initColumns(data.OrderFields, $scope.orderColumnNames);
                $rootScope.initColumns(data.ContainerFields, $scope.containerColumnNames);
                $rootScope.initColumns(data.SkuFields, $scope.skuColumnNames);
                initGrids();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        function loadFilters() {
            $rootScope.getPickgroupFilters(pickgroupStatusesLoadCompleted, pickgroupStatusesLoadFailed);

            function pickgroupStatusesLoadCompleted(result) {
                $scope.PickGroupStatuses = result.data;
                $rootScope.getPickgroupAges(pickgroupAgesLoadCompleted, pickgroupAgesLoadFailed);
            }

            function pickgroupStatusesLoadFailed(response) {
                notificationService.displayError(response.data);
            }

            function pickgroupAgesLoadCompleted(result) {
                $timeout.cancel(stop);
                $scope.PickGroupAges = result.data;
                $scope.selectedPickGroupAge = result.data.Ages[0];
                $scope.loadingGroups = false;
            }

            function pickgroupAgesLoadFailed(response) {
                notificationService.displayError(response.data);
            }
        }

        function loadGroups(page) {
            if ($scope.selectedPickGroupStatus.length == 0) {
                $rootScope.Groups = [];
                $scope.pagesCount = 0;
                $rootScope.resize();
                return;
            }

            $scope.page = page || 0;

            var statuses = '';
            var count = $scope.selectedPickGroupStatus.length;
            for (var i = 0; i < count; ++i) {
                statuses += $scope.selectedPickGroupStatus[i].Status;
                if (i < (count - 1))
                    statuses += ','
            }

            showSpinner("Groups");
            var field = 'PickGroupID';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Groups');
            if (orderBy != null) {
                field = orderBy.Field.substring(9, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getPickgroups('filterByStatus=' + statuses +
                "&filterByAge=" + $scope.selectedPickGroupAge.AgeId +
                "&sortByColumn=" + field +
                "&sortAscending=" + isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize,
                groupsLoadCompleted,
                groupsLoadFailed);

            function groupsLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Groups = result.data.Groups;
                $scope.loadingGroups = false;

                var pageCount = Math.floor(result.data.TotalCount / pageSize);
                var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.TotalCount;

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

                    var selected = $rootScope.Groups[index];
                    $scope.selectedItemNumber = selected['PickGroupID'];
                    $timeout(function () {
                        var items = document.getElementById("Groups");
                        items.children[1].children[index].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                    notificationService.displayInfo($rootScope.translate(info));
                    $scope.SearchInfo.NextFoundRow = 0;
                }

                initGrids();
            }

            function groupsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingGroups = false;
                notificationService.displayError(response.data);
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadGroups($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        function startDetailsTimer() {
            stop = $timeout(function () {
                $timeout.cancel(stop);
                $scope.loadingDetails = true;
            }, 500);
        }

        function getDetails(groupId) {
            for (var i = 0; i < $rootScope.GroupDetails.length; ++i) {
                var group = $rootScope.GroupDetails[i];
                if (group.content.Details.PickGroupNumber == groupId) {
                    $scope.selectTab(group);
                    checkVisibleCount();
                    return;
                }
            }

            var groupDetails;
            startDetailsTimer();
            if (groupId != 0)
                $rootScope.getPickgroup(groupId, groupInfoLoadCompleted, groupInfoLoadFailed);
            else {
                groupDetails = createGroupDetails();
                groupDetails.title = 'Ungrouped';
            }

            $rootScope.getPickgroupOrders(groupId, ordersLoadCompleted, ordersLoadFailed);

            function groupInfoLoadCompleted(result) {
                var newlyCreated = false;
                if (groupDetails == null) {
                    groupDetails = createGroupDetails();
                    newlyCreated = true;
                }
                else {
                    $timeout.cancel(stop);
                    $scope.loadingDetails = false;
                }

                groupDetails.title = result.data.PickGroupName;
                groupDetails.content.Details = result.data;

                if (!newlyCreated) {
                    $rootScope.GroupDetails.push(groupDetails);
                    checkVisibleCount();
                    $scope.selectTab(groupDetails);
                    groupDetails = null;
                    selectFirstOrder($scope.selectedTab.content.Orders);
                }
            }

            function groupInfoLoadFailed(response) {
                $scope.loadingDetails = false;
                notificationService.displayError(response.data);
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
            }

            function ordersLoadCompleted(result) {
                var newlyCreated = false;
                if (groupDetails == null) {
                    groupDetails = createGroupDetails();
                    newlyCreated = true;
                }
                else {
                    $timeout.cancel(stop);
                    $scope.loadingDetails = false;
                }

                groupDetails.content.Orders = result.data;

                if (!newlyCreated) {
                    $rootScope.GroupDetails.push(groupDetails);
                    checkVisibleCount();
                    $scope.selectTab(groupDetails);
                    groupDetails = null;
                    selectFirstOrder($scope.selectedTab.content.Orders);
                }
            }

            function ordersLoadFailed(response) {
                $scope.loadingDetails = false;
                notificationService.displayError(response.data);
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
            }

            function selectFirstOrder(details) {
                if ($scope.selectedView == $scope.ResultViews[2])
                    getPickGroupSkus($scope.selectedGroupId);
                else if (details.length > 0) {
                    var sel = details[0];
                    $scope.orderSelected(sel);
                }
            }
        }

        function createGroupDetails() {
            var newTab =
            {
                id: ++lastTabId,
                title: '',
                content: {
                    Details: {},
                    Orders: {},
                    Containers: {},
                    Skus: {},
                },
                hidden: false,
                active: false,
                selectedOrderNumber: null,
                selectedContainerNumber: null
            }

            return newTab;
        }

        function addReleaseInstructions(groupInfo) {
            $scope.GroupComment = {
                GroupId: groupInfo.PickGroupNumber,
                CommentType: 'Release Instructions',
                DisplayName: $scope.localTranslate('ReleaseInstructions'),
                Comment: ''
            };
            $modal.open({
                templateUrl: 'scripts/spa/monitors/groups/groupComment.html',
                controller: 'groupCommentCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
            });
        };

        function addComment(groupInfo) {
            $scope.GroupComment = {
                GroupId: groupInfo.PickGroupNumber,
                CommentType: 'Comment',
                DisplayName: $scope.localTranslate('Comment'),
                Comment: ''
            };
            $modal.open({
                templateUrl: 'scripts/spa/monitors/groups/groupComment.html',
                controller: 'groupCommentCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
            });
        };

        function findOrderByOrderNumber(orderNumber) {
            for (var i = 0; i < $scope.selectedTab.content.Orders.length; ++i) {
                var curContainer = $scope.selectedTab.content.Orders[i];
                if (curContainer.OrderNumber == orderNumber)
                    return curContainer;
            }
        }

        function findContainerByCartonNumber(cartonNumber) {
            for (var i = 0; i < $scope.selectedTab.content.Containers.length; ++i) {
                var curContainer = $scope.selectedTab.content.Containers[i];
                if (curContainer.CartonNumber == cartonNumber)
                    return curContainer;
            }
        }

        function init() {
            keydownListener();
            $scope.loadFilters();
            loadDisplayedFields();
        }

        function initGrids() {
            $rootScope.initGrids(function (colId, tableId, row, mode) {
                if (row == -1) {
                    switch (tableId) {
                        case 'Groups':
                            loadGroups();
                            return true;

                        default:
                            return false;
                    }
                }
                else if (row > -1) {
                    switch (tableId.replace(/[0-9]/g, '')) {
                        case 'Groups':
                            var group = $rootScope.Groups[row];
                            $scope.selectedItemNumber = group.PickGroupID;

                            if (mode == 'dblclick')
                                getDetails(group.PickGroupID)
                            break;

                        case 'Orders':
                            $scope.orderSelected($scope.selectedTab.content.Orders[row]);
                            break;

                        case 'Containers':
                            $scope.containerSelected($scope.selectedTab.content.Containers[row]);
                            break;
                    }

                    $scope.$apply();
                }
                else {
                    if (tableId == 'Groups') {
                        $scope.selectedItemNumber = -100;
                        $scope.$apply();
                    }
                }
            });
        }

        var isDetailsDisabled = false;
        var isReleaseDisabled = false;
        var isCancelDisabled = false;
        var isSearchDisabled = false;
        var isRefreshDisabled = false;
        $scope.getGroupMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'details': return isDetailsDisabled ? 'disabled' : 'active';
                case 'releaseGroup': return isReleaseDisabled ? 'disabled' : 'active';
                case 'cancelGroup': return isCancelDisabled ? 'disabled' : 'active';
                case 'search': return isSearchDisabled ? 'disabled' : 'active';
                case 'refresh': return isRefreshDisabled ? 'disabled' : 'active';
            }
        }

        $rootScope.menuHandler = function (menuName, item) {
            if (item != null) {
                $scope.focusPanel = menuName;
                if ((menuName == "orders") && (item.Col != -1)) {
                    var details = $scope.selectedTab.content.Orders;
                    if (details.length > 0) {
                        var row = item.Row.children[0].innerText.trim();
                        for (var i = 0; i < details.length; ++i) {
                            if (details[i].OrderNumber == row) {
                                $scope.orderSelected(details[i]);
                                break;
                            }
                        }
                    }
                }
                else if ((menuName == "containers") && (item.Col != -1)) {
                    var row = item.Row.children[0].innerText.trim();
                    $scope.containerSelected(findContainerByCartonNumber(row));
                }
                else if (menuName == 'groups') {
                    if ((item.Row != -1) && (item.Col >= 0)) {
                        isDetailsDisabled = false;
                        isReleaseDisabled = false;
                        isCancelDisabled = false;
                        isSearchDisabled = false;
                        isRefreshDisabled = false;
                        $scope.selectedItemNumber = item.Row.children[0].innerText.trim();

                        if (item.Row.children[3].innerText.trim().toUpperCase() != 'GROUPED')
                            isReleaseDisabled = true;
                    }
                    else {
                        isDetailsDisabled = true;
                        isReleaseDisabled = true;
                        isCancelDisabled = true;
                        isSearchDisabled = (item.Row != -1) ? false : true;
                        isRefreshDisabled = (item.Row != -1) ? false : true;
                        $scope.selectedItemNumber = -100;
                    }

                    $scope.$apply();
                }
            }
        }

        $rootScope.menuClickHandler = function (menuName, menuItem, taskItemInContext) {
            switch (menuName) {
                case "groups":
                    switch (menuItem) {
                        case "details":
                            if (!isDetailsDisabled) {
                                var id = taskItemInContext.Row.cells[0].innerText.trim();
                                $scope.getDetails(id);
                            }
                            break;

                        case "releaseGroup":
                            if (isReleaseDisabled)
                                break;

                            var id = taskItemInContext.Row.cells[0].innerText.trim();
                            $scope.status = { isCanceled: true };
                            $scope.ConfirmText = "Are you sure you want to release group '" + taskItemInContext.children[1].innerText.trim() + "'?";
                            $scope.deleteUrl = webApiBaseUrl + '/api/pickgroups/' + id + '?userId=' + 12345;
                            $modal.open({
                                templateUrl: 'scripts/spa/confirmation/confirm.html',
                                controller: 'confirmCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled) {
                                }
                            });
                            break;

                        case "cancelGroup":
                            if (isCancelDisabled)
                                break;

                            if (taskItemInContext.Row.children[3].innerText.trim().toUpperCase() != 'GROUPED') {
                                $scope.Text1 = $scope.localTranslate('CannotCancelGroup');
                                $scope.Image = 'Content/images/error.png';
                                $scope.Buttons = 'OK';
                                $scope.status = { ButtonClicked: '' };
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/notification.html',
                                    controller: 'notificationCtrl',
                                    scope: $scope
                                });
                            }
                            else {
                                var id = taskItemInContext.Row.cells[0].innerText.trim();
                                $scope.status = { isCanceled: true };
                                $scope.ConfirmText = $scope.localTranslate('ConfirmCancelGroup') + taskItemInContext.children[1].innerText.trim() + "'?";
                                $scope.deleteUrl = webApiBaseUrl + '/api/pickgroups/' + id + '?userId=' + 12345;
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

                        case "search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate('GroupSearch'),
                                Columns: $scope.groupColumnNames,
                                SelectedColumn: $scope.groupColumnNames[taskItemInContext.Col],
                                NextFoundRow: 0
                            };
                            $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                                controller: 'imSearchDialogCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    $scope.loadGroups();
                            });
                            break;

                        case "refresh":
                            $scope.loadGroups($scope.page);
                            break;
                    }
                    break;

                case "orders":
                    switch (menuItem) {
                        case "auditTrail":
                            break;

                        case "removeOrder":
                            break;

                        case "refresh":
                            $scope.getDetails(taskItemInContext.Row.children[0].innerText.trim());
                            break;
                    }
                    break;

                case "containers":
                    switch (menuItem) {
                        case "auditTrail":
                            break;

                        case "refresh":
                            $scope.getDetails(taskItemInContext.Row.children[0].innerText.trim());
                            break;
                    }
                    break;

                case "skus":
                    switch (menuItem) {
                        case "refresh":
                            $scope.getDetails(taskItemInContext.Row.children[0].innerText.trim());
                            break;
                    }
                    break;
            }
        }

        function keydownListener() {
            window.onkeydown = function (e) {
                if ((e.keyCode == 38) || (e.keyCode == 40)) {
                    if (loadingData)
                        return false;

                    var grid = document.getElementById($scope.focusPanel + $scope.selectedTab.id);
                    if (grid != null) {
                        var item;
                        if ($scope.focusPanel == "Orders")
                            item = $scope.selectedTab.selectedOrderNumber;
                        else
                            item = $scope.selectedTab.selectedCartonNumber;

                        var body = grid.children[1].children;
                        for (var i = 0; i < body.length; ++i) {
                            var curContainer = body[i].children[0].innerText.trim();
                            if (curContainer == item) {
                                var index = -1;
                                if ((e.keyCode == 38) && (i > 0))
                                    index = i - 1;
                                else if ((e.keyCode == 40) && (i < body.length - 1))
                                    index = i + 1;

                                if (index > -1) {
                                    var selection;
                                    if ($scope.focusPanel == "Orders") {
                                        selection = findOrderByOrderNumber(body[index].children[0].innerText.trim());
                                        if (selection != null)
                                            $scope.orderSelected(selection);
                                    }
                                    else {
                                        selection = findContainerByCartonNumber(body[index].children[0].innerText.trim());
                                        if (selection != null)
                                            $scope.containerSelected(selection);
                                    }

                                    body[index].children[0].scrollIntoView(false);
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }

        $scope.focusPanel = "Orders";

        $scope.index = 0;
        var visibleCount = 0;
        $scope.left = function () {
            --$scope.index;
            $scope.selectTab($rootScope.GroupDetails[$scope.index]);
            if ($scope.index <= ($rootScope.GroupDetails.length - visibleCount))
                checkVisibleCount();
        }

        $scope.right = function () {
            $scope.selectTab($rootScope.GroupDetails[++$scope.index]);
            checkVisibleCount();
        }

        function checkVisibleCount() {
            $timeout(function () {
                angular.forEach($rootScope.GroupDetails, function (value, key) {
                    value.hidden = true;
                });

                var div = document.getElementById('dvTabMain');
                var width = div.clientWidth;
                var selectedIndex = $scope.index = $scope.selectedTab.id - 1;
                var totalWidth = $rootScope.GroupDetails[selectedIndex].title.visualLength() + 25;
                $rootScope.GroupDetails[selectedIndex].hidden = false;
                visibleCount = 1;

                // Show previous tabs up to max length
                while (--selectedIndex >= 0) {
                    var len = $rootScope.GroupDetails[selectedIndex].title.visualLength() + 25;
                    if ((totalWidth + len) < width) {
                        totalWidth += len;
                        $rootScope.GroupDetails[selectedIndex].hidden = false;
                        ++visibleCount;
                    }
                    else
                        break;
                }

                // Show next tabs up to max length
                if (totalWidth < width) {
                    selectedIndex = $scope.selectedTab.id;
                    while (selectedIndex < $rootScope.GroupDetails.length) {
                        var len = $rootScope.GroupDetails[selectedIndex].title.visualLength() + 20;
                        if ((totalWidth + len) < width) {
                            totalWidth += len;
                            $rootScope.GroupDetails[selectedIndex].hidden = false;
                            ++visibleCount;
                        }
                        else
                            break;
                        ++selectedIndex;
                    }
                }
            }, 100);
        }

        $scope.selection = { tab: null};
        $scope.hasChanged = function () {
            $timeout(function () {
                $scope.selectTab($scope.selection.tab);
                checkVisibleCount();
            }, 10);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));