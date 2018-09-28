(function (app) {
    'use strict';

    app.controller('orderMonitorCtrl', orderMonitorCtrl);

    orderMonitorCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function orderMonitorCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-ordermonitor';
        $scope.loadingFilters = false;
        $scope.loadingOrders = false;
        $scope.loadingSkus = false;
        $scope.OrderStatuses = [];
        $scope.OrderAges = [];
        $scope.selectedOrderStatus = [];
        $scope.selectedOrderAge = { AgeId: 0 };
        $scope.orderColumnNames = [];
        $scope.containerColumnNames = [];
        $scope.skuColumnNames = [];
        $rootScope.Orders = [];
        $rootScope.OrderDetails = [];
        $scope.selectedOrderNumber = 0;
        $scope.IsContainersVisible = true;
        $scope.IsSKUsVisible = true;
        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.SearchInfo = { Title: $scope.localTranslate('OrderSearch'), SearchTerm: '', SelectedColumn: { Caption: '' } };
        $scope.ResultViews = [
            { Name: 'Container/SKU' },
            { Name: 'SKU' }];
        $scope.selectedView = $scope.ResultViews[0];
        $scope.selectedItemNumber = -100;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;
        var lastTabId = 0;

        $scope.pageTransPrefix = 'spa.monitors.orders.ordermonitor.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.IsViewSelected = function (view) {
            return ($scope.selectedView.Name == view.Name);
        }

        $scope.toggleViewSelection = function toggleViewSelection(view) {
            $scope.selectedView = view;

            if (view == $scope.ResultViews[0]) {
                $scope.selectedViewIndex = 0;
                $scope.IsOrdersVisible = true;
                $scope.IsContainersVisible = true;
                $scope.IsSKUsVisible = true;
            
                if (($scope.selectedTab != null) && $scope.selectedTab.content.Details.OrderHeaderID > 0)
                    getOrderSkus($scope.selectedTab.content.Details.OrderHeaderID);
            }
            else {
                $scope.selectedViewIndex = 1;
                $scope.IsOrdersVisible = false;
                $scope.IsContainersVisible = false;
                $scope.IsSKUsVisible = true;
            
                if (($scope.selectedTab != null) && $scope.selectedTab.selectedContainer > 0)
                    getContainerSkus($scope.selectedTab.selectedContainer);
            }

            if ($scope.selectedTab != null) {
                scrollIntoView();
                initGrids();
                $timeout(function () {
                    initGrids();
                }, 10);
            }
        };

        $scope.toggleOrderStatusSelection = function (status) {
            var idx = -1;
            for (var i = 0; i < $scope.selectedOrderStatus.length; ++i) {
                if ($scope.selectedOrderStatus[i].Name == status.Name) {
                    idx = i;
                    break;
                }
            }

            if (idx > -1)
                $scope.selectedOrderStatus.splice(idx, 1);
            else
                $scope.selectedOrderStatus.push(status);

            $scope.loadOrders(0);
        };

        $scope.IsOrderStatusSelected = function (status) {
            for (var i = 0; i < $scope.selectedOrderStatus.length; ++i) {
                if ($scope.selectedOrderStatus[i].Status == status.Status)
                    return true;
            }
        }

        $scope.toggleOrderAgeSelection = function (age) {
            $scope.selectedOrderAge = age;
            $scope.loadOrders(0);
        };

        $scope.IsOrderAgeSelected = function (age) {
            return ($scope.selectedOrderAge.AgeId == age.AgeId);
        }

        var stop;
        var loadingData;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "Orders")
                    $scope.loadingGroups = true;
                else if (spinner == "Filters")
                    $scope.loadingFilters = true;
                else if (spinner == "Skus")
                    $scope.loadingSkus = true;
            }, 1000);
        }

        function loadOrderFilters() {
            showSpinner('Filters');
            $rootScope.getOrderStatuses(orderStatusesLoadCompleted, orderStatusesLoadFailed);

            function orderStatusesLoadCompleted(result) {
                $scope.OrderStatuses = result.data;
                $rootScope.getOrderAges(orderAgesLoadCompleted, orderAgesLoadFailed);
            }

            function orderStatusesLoadFailed(response) {
                notificationService.displayError(response.data);
            }

            function orderAgesLoadCompleted(result) {
                $timeout.cancel(stop);
                $scope.OrderAges = result.data;
                $scope.selectedOrderAge = result.data.Ages[0];
                $scope.loadingFilters = false;
                loadDisplayedFields();
            }

            function orderAgesLoadFailed(response) {
                $timeout.cancel(stop);
                notificationService.displayError(response.data);
            }
        }

        var isInit = true;
        function loadDisplayedFields() {
            $scope.getOrderDisplayedFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.OrderFields, $scope.orderColumnNames);
                $rootScope.initColumns(data.ContainerFields, $scope.containerColumnNames);
                $rootScope.initColumns(data.SkuFields, $scope.skuColumnNames);
                initGrids();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        $scope.loadOrders = function (page) {
            if ($scope.selectedOrderStatus.length == 0) {
                $rootScope.Orders = [];
                $scope.pagesCount = 0;
                $rootScope.resize();
                return;
            }

            $scope.page = page || 0;

            var statuses = '';
            var count = $scope.selectedOrderStatus.length;
            for (var i = 0; i < count; ++i) {
                statuses += $scope.selectedOrderStatus[i].Status;
                if (i < (count - 1))
                    statuses += ','
            }

            showSpinner("Orders");
            var field = 'OrderNumber';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Orders');
            if (orderBy != null) {
                field = orderBy.Field.substring(9, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getOrders('sortByColumn=' + field +
                "&sortDescending=" + isReversed +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&filterByStatus=" + statuses +
                "&filterByAge=" + $scope.selectedOrderAge.AgeId +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0),
                ordersLoadCompleted,
                ordersLoadFailed);

            function ordersLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Orders = result.data.Orders;
                $scope.loadingOrders = false;

                for (var key in $rootScope.Orders[0]) {
                    var data = $rootScope.Orders[0][key];
                    var fieldWidth = Math.max((data != null) ? data.toString().length : 0, key.length) * 12;
                    var column = getColumnByCaption(key);
                    if (column != null) {
                        if (isInit)
                            column.Width = fieldWidth;
                        column.Style = 'cursor: pointer; min-width: ' + column.Width + 'px; max-width: ' + column.Width + 'px; padding: 0 5px;'
                    }
                }
                isInit = false;

                var pageCount = Math.floor(result.data.resultCount / pageSize);
                var extraPageNeeded = (result.data.resultCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.resultCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.nextFoundRow > 0)) {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                    }
                    else
                        $scope.isSearching = true;

                    $scope.SearchInfo.NextFoundRow = result.data.nextFoundRow;
                    $scope.page = Math.trunc(result.data.nextFoundRow / pageSize);

                    var index;
                    // NextRowFound is the absolute index of the record in the entire user lst.
                    // This is to determine the page. So once the page is determined, the record index
                    // must also be determined. If the NextFoundIndex lies on a page boundary, the page
                    // offset calculation must be adjusted by one. The -1 is to convery to 0-based indexes.
                    if ((result.data.NextFoundRow % pageSize) == 0)
                        index = result.data.nextFoundRow - (($scope.page - 1) * pageSize) - 1;
                    else
                        index = result.data.nextFoundRow - ($scope.page * pageSize) - 1;

                    var selected = $rootScope.Orders[index];
                    $scope.selectedItemNumber = selected['OrderHeaderID'];
                    $timeout(function () {
                        var items = document.getElementById("Orders");
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

            function ordersLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingOrders = false;
                notificationService.displayError(response.data);
            }
        }

        function getColumnByCaption(caption) {
            for (var i = 0; i < $scope.orderColumnNames.length; ++i) {
                var column = $scope.orderColumnNames[i];
                if (column.Caption == caption)
                    return column;
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadOrders($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        $scope.selectedTab = null;
        $scope.selectTab = function (tab) {
            if ($scope.selectedTab == tab)
                return;

            angular.forEach($rootScope.OrderDetails, function (value, key) {
                value.active = false;
            });

            tab.active = true;
            $scope.selectedTab = tab;
            $scope.selection.tab = tab;

            if ($scope.selectedView == $scope.ResultViews[1])
                getOrderSkus($scope.selectedTab.content.Details.OrderHeaderID);
            else if (tab.content.Containers.length > 0)
                containerSelected($scope.selectedTab.content.Containers[0].ContainerID);

            initGrids();
        };

        $scope.closeTab = function (index) {
            $rootScope.removeOrderByField('Containers' + $rootScope.OrderDetails[index].id);
            $rootScope.removeOrderByField('Skus' + $rootScope.OrderDetails[index].id);

            $rootScope.OrderDetails.splice(index, 1);

            if ($rootScope.OrderDetails.length > 0) {
                // Reindex the group details
                for (var i = 0; i < $rootScope.OrderDetails.length; ++i)
                    $rootScope.OrderDetails[i].id = i + 1;

                lastTabId = i;
                checkVisibleCount();
                $scope.selectTab($rootScope.OrderDetails[$rootScope.OrderDetails.length - 1]);
            }

            if ($rootScope.OrderDetails.length == 0) {
                $scope.selectedTab = null;
                $scope.selectedGroupId = 0;
                lastTabId = 0;
            }
        };

        var custOrderNumber;
        $scope.getDetails = function (order) {
            custOrderNumber = order.OrderNumber;
            for (var i = 0; i < $rootScope.OrderDetails.length; ++i) {
                var tab = $rootScope.OrderDetails[i];
                if (tab.title == custOrderNumber) {
                    $scope.selectTab(tab);
                    return;
                }
            }

            step = 0;
            orderDetails = null;
            showSpinner("Details");
            $rootScope.getOrder(order.OrderHeaderID, orderLoadCompleted, orderDetailsLoadFailed);
            $rootScope.getOrderContainers(order.OrderHeaderID, containersLoadCompleted, orderDetailsLoadFailed);
            $rootScope.getOrderDetails(order.OrderHeaderID, orderDetailsLoadCompleted, orderDetailsLoadFailed);

            var orderDetails;
            var step;
            function orderLoadCompleted(result) {
                if (orderDetails == null)
                    orderDetails = createOrderDetails();

                orderDetails.title = custOrderNumber;
                orderDetails.content.Details = result.data;

                if (++step == 3)
                    initDetails(orderDetails);
            }

            function containersLoadCompleted(result) {
                if (orderDetails == null)
                    orderDetails = createOrderDetails();

                orderDetails.content.Containers = result.data.Containers;

                if (++step == 3)
                    initDetails(orderDetails);
            }

            function orderDetailsLoadCompleted(result) {
                if (orderDetails == null)
                    orderDetails = createOrderDetails();

                orderDetails.content.Skus = result.data.OrderDetails;

                if (++step == 3)
                    initDetails(orderDetails);
            }

            function orderDetailsLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
                notificationService.displayError(response.data);
            }

            function createOrderDetails() {
                var newTab =
                {
                    id: ++lastTabId,
                    title: '',
                    content: {
                        Details: {},
                        Containers: {},
                        Skus: {},
                    },
                    active: false,
                    containerSortField: 'CartonNumber',
                    containerSortReversed: false,
                    skuSortField: 'Sku',
                    skuSortReversed: false,
                    selectedContainer: null,
                    selectedDetail: null
                }
            
                return newTab;
            }

            function initDetails(orderDetails) {
                $timeout.cancel(stop);
                $scope.loadingDetails = false;
                $rootScope.OrderDetails.push(orderDetails);
                checkVisibleCount();
                $scope.selectTab(orderDetails);
            }
        }

        function containerSelected(containerId) {
            $scope.selectedTab.selectedContainer = containerId;
            getContainerSkus(containerId);
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

        function skusLoadCompleted(result) {
            $timeout.cancel(stop);
            loadingData = false;
            $scope.loadingSkus = false;
            $scope.selectedTab.content.PickGroupSkuDetails = result.data;
            sizePanels();
        }

        function skusLoadFailed(response) {
            $timeout.cancel(stop);
            loadingData = false;
            $scope.loadingSkus = false;
            notificationService.displayError(response.data);
        }

        function init() {
            loadOrderFilters();
            initGrids();
        }

        function initGrids() {
            $rootScope.initGrids(function (colId, tableId, row, mode) {
                if (row == -1) {
                    switch (tableId) {
                        case 'Orders':
                            $scope.loadOrders();
                            return true;

                        default:
                            return false;
                    }
                }
                else if (row > -1) {
                    switch (tableId.replace(/[0-9]/g, '')) {
                        case 'Orders':
                            var order = $rootScope.Orders[row];
                            $scope.selectedItemNumber = order.OrderHeaderID;

                            if (mode == 'dblclick')
                                $scope.getDetails(order)
                            break;

                        case 'Containers':
                            $scope.containerSelected($scope.selectedTab.content.Orders[row]);
                            break;
                    }

                    $scope.$apply();
                }
                else {
                    if (tableId == 'Orders') {
                        $scope.selectedItemNumber = -100;
                        $scope.$apply();
                    }
                }
            });
        }

        var isDetailsDisabled = false;
        var isSearchDisabled = false;
        var isRefreshDisabled = false;
        $scope.getOrderMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'details': return isDetailsDisabled ? 'disabled' : 'active';
                case 'search': return isSearchDisabled ? 'disabled' : 'active';
                case 'refresh': return isRefreshDisabled ? 'disabled' : 'active';
            }
        }

        $rootScope.menuHandler = function (menuName, item) {
            if (item.row > -1) {
                var id = item.Row.children[0].innerText.trim();
                switch (menuName) {
                    case 'orders':
                        $scope.selectedItemNumber = id;
                        break;

                    case 'containers':
                        $scope.containerSelected(id);
                        break;

                    case 'details':
                        $scope.selectedTab.selectedDetail = id;
                        break;
                }
            }

            isDetailsDisabled = item.Row < 0;
            isSearchDisabled = item.Row < 0;
            isRefreshDisabled = $rootScope.Orders.length == 0;;
            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "orders":
                    switch (itemId) {
                        case "details":
                                $scope.getDetails($rootScope.Orders[$scope.row]);
                            break;

                        case "search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
                                Title: $scope.localTranslate('OrderSearch'),
                                Columns: $scope.orderColumnNames,
                                SelectedColumn: $scope.orderColumnNames[taskItemInContext.Col],
                                NextFoundRow: 0
                            };
                            $modal.open({
                                templateUrl: 'scripts/spa/itemmaster/imSearchDialog.html',
                                controller: 'imSearchDialogCtrl',
                                scope: $scope
                            }).result.then(function ($scope) {
                            }, function () {
                                if (!$scope.status.isCanceled)
                                    $scope.loadOrders();
                            });
                            break;

                        case "refresh":
                            $scope.loadOrders($scope.page);
                            break;
                    }
                    break;

                case "containers":
                    switch (itemId) {
                        case "auditTrail":
                            break;

                        case "refresh":
                            $scope.getDetails($scope.selectedTab.content.GroupDetails.GroupId);
                            break;
                    }
                    break;

                case "details":
                    switch (itemId) {
                        case "refresh":
                            $scope.getDetails($scope.selectedTab.content.GroupDetails.GroupId);
                            break;
                    }
                    break;
            }
        }

        $scope.index = 0;
        var visibleCount = 0;
        $scope.left = function () {
            --$scope.index;
            $scope.selectTab($rootScope.OrderDetails[$scope.index]);
            if ($scope.index <= ($rootScope.OrderDetails.length - visibleCount))
                checkVisibleCount();
        }

        $scope.right = function () {
            $scope.selectTab($rootScope.OrderDetails[++$scope.index]);
            checkVisibleCount();
        }

        function checkVisibleCount() {
            $timeout(function () {
                angular.forEach($rootScope.OrderDetails, function (value, key) {
                    value.hidden = true;
                });

                var div = document.getElementById('dvTabMain');
                var width = div.clientWidth;
                var selectedIndex = $scope.index = $scope.selectedTab.id - 1;
                var totalWidth = $rootScope.OrderDetails[selectedIndex].title.visualLength() + 25;
                $rootScope.OrderDetails[selectedIndex].hidden = false;
                visibleCount = 1;

                // Show previous tabs up to max length
                while (--selectedIndex >= 0) {
                    var len = $rootScope.OrderDetails[selectedIndex].title.visualLength() + 25;
                    if ((totalWidth + len) < width) {
                        totalWidth += len;
                        $rootScope.OrderDetails[selectedIndex].hidden = false;
                        ++visibleCount;
                    }
                    else
                        break;
                }

                // Show next tabs up to max length
                if (totalWidth < width) {
                    selectedIndex = $scope.selectedTab.id;
                    while (selectedIndex < $rootScope.OrderDetails.length) {
                        var len = $rootScope.OrderDetails[selectedIndex].title.visualLength() + 20;
                        if ((totalWidth + len) < width) {
                            totalWidth += len;
                            $rootScope.OrderDetails[selectedIndex].hidden = false;
                            ++visibleCount;
                        }
                        else
                            break;
                        ++selectedIndex;
                    }
                }
            }, 100);
        }

        $scope.selection = { tab: null };
        $scope.hasChanged = function () {
            $timeout(function () {
                $scope.selectTab($scope.selection.tab);
                checkVisibleCount();
            }, 10);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));