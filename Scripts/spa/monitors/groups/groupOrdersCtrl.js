(function (app) {
    'use strict';

    app.controller('groupOrdersCtrl', groupOrdersCtrl);

    groupOrdersCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function groupOrdersCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-grouporders';
        $scope.loadingOrders = false;
        $scope.loadingRules = false;
        $scope.loadingSelectedOrders = false;
        $scope.orderColumnNames = [];
        $scope.orderFilterNames = [];
        $scope.ruleColumnNames = [];
        $rootScope.Orders = [];
        $rootScope.Rules = [];
        $rootScope.SelectedOrders = [];
        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;
        $scope.selectedItemNumber = -100;
        $scope.selectedRuleItemNumber = -100;
        $scope.SearchInfo = { Title: $scope.localTranslate("OrderSearch"), SearchTerm: '', SelectedColumn: { DataId: '' } };

        $scope.unselected = 0;
        $scope.Lines = 0;
        $scope.Units = 0;
        $scope.Containers = 0;
        $scope.SKUs = 0;
        $scope.SPOrders = 0;
        $scope.FTE = 0;
        $scope.selectedOrder = -100;
        $scope.displayRules = false;
        $scope.isRuleEditing = false;
        $scope.isEditing = false;
        $scope.fillWidth = 0;

        $scope.rules = [];
        $scope.editCriteriaItem = {};
        $scope.comparisonTypes = [
            { Id: 0, Description: '= Equals' },
            { Id: 1, Description: '<> Not Equals' },
            { Id: 2, Description: '*  Contains' },
            { Id: 3, Description: '!* Not Contains' },
            { Id: 4, Description: '=* Starts With' },
            { Id: 5, Description: 'x* Does Not Start With' },
            { Id: 6, Description: '*= Ends With' },
            { Id: 7, Description: '*x Does Not End With' },
            { Id: 8, Description: '>  Greater' },
            { Id: 9, Description: '>= Greater or Equal' },
            { Id: 10, Description: '<  Smaller' },
            { Id: 11, Description: '<= Smaller or Equal' },
        ];

        $scope.conditions = [
            { Id: 0, Name: 'AND' },
            { Id: 1, Name: 'OR' },
        ];

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;
        var lastTabId = 0;

        $scope.pageTransPrefix = 'spa.group.grouporders.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        var editMode = ''
        $scope.addNew = function () {
            $scope.rules = [];
            $scope.editCriteriaItem = { RuleName: '', Description: '', Status: 1 };
            $scope.displayRules = true;
            $scope.isRuleEditing = true;
        }

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if ((key == 'RuleName') && (key == 'Description') && ($scope.editItem[key] == '')) {
                    isValid = false;
                    break;
                }
                ++i;
            }

            if (isValid)
                saveItem();
            else {
                var items = document.getElementsByClassName('input');
                items[i].focus();
                notificationService.displayError($scope.localTranslate(key) + ' ' + $rootScope.translate('FieldRequired'));
            }
        }

        $scope.cancel = function () {
            $scope.editItem = {};
            $scope.isEditing = false;

            if (editMode == 'add')
                $rootScope.Rules.splice($rootScope.Rules.length - 1);
            else {
                for (var i = 0; i < $rootScope.Rules.length; ++i) {
                    var rule = $rootScope.Rules[i];
                    if (rule.RuleID == $scope.originalItem.RuleID) {
                        for (var i = 0; i < $scope.ruleColumnNames.length; ++i)
                            rule[$scope.ruleColumnNames[i].Caption] = $scope.originalItem[$scope.ruleColumnNames[i].Caption];
                        break;
                    }
                }
            }

            editMode = '';
            $rootScope.resize();
        }

        $scope.getTemplate = function (item) {
            return (item == $scope.editItem) ? 'edit' : 'display';
        };

        function scrollIntoView() {
            $timeout(function () {
                var items = document.getElementById("Rules");
                items.children[items.children.length - 1].scrollIntoView(true);

                items = document.getElementsByClassName('input');
                items[0].focus();
            }, 100);
        }

        function saveItem() {
            if (editMode == 'add')
                $rootScope.addOrderRule($scope.editItem, ruleSaveCompleted, ruleSaveFailed);
            else
                $rootScope.editOrderRule($scope.editItem, ruleSaveCompleted, ruleSaveFailed);

            function ruleSaveCompleted(result) {
                if (result.data.Success) {
                    $scope.editItem = {};
                    $scope.isEditing = false;
                    editMode = '';

                    loadRules();
                }
                else
                    notificationService.displayError($scope.localTranslate('Error ' + result.data.ReasonCode + ' ' + result.data.Reason));
            }

            function ruleSaveFailed(response) {
                if (response.data != null)
                    notificationService.displayError(response.data);
            }
        }

        function loadDisplayedFields() {
            $rootScope.getGroupOrderDisplayedFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            var isInit = true;
            function loadDisplayedFieldsCompleted(result) {
                var data = result.data.OrderFields;

                for (var key in data) {
                    var col = data[key];
                    if (col.Filterable)
                        $scope.orderFilterNames.push({ Caption: col.DisplayName, FilterAlias: col.FilterAlias, DataType: col.DataType, Status: 0 });
                }

                $rootScope.initColumns(data, $scope.orderColumnNames);
                initGrids();
                $scope.loadUngroupedOrders();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        function loadRuleDisplayedFields() {
            if ($scope.ruleColumnNames.length == 0)
                $rootScope.getRuleDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);
            else {
                $scope.displayRules = true;
                initGrids();
            }

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.RuleFields, $scope.ruleColumnNames);
                $scope.displayRules = true;
                initGrids();
                loadRules();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading rule displayed fields:' + response);
            }
        }

        function loadRules() {
            showSpinner('rules');
            $rootScope.getOrderRules(rulesLoadCompleted, rulesLoadFailed);

            function rulesLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Rules = result.data.Rules;
                $scope.loadingRules = false;
                initGrids();
            }

            function rulesLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingRules = false;
                notificationService.displayError(response.statusText);
            }
        }

        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == 'orders')
                    $scope.loadingOrders = true;
                else if (spinner == 'rules')
                    $scope.loadingRules = true;
                else if (spinner == 'selected')
                    $scope.loadingSelectedOrders = true;
            }, 1000);
        }

        $scope.loadUngroupedOrders = function (page) {
            $scope.page = page || 0;

            showSpinner('orders');
            var field = 'OrderHeaderID';
            var isReversed = false;

            var orderBy = $rootScope.getOrderByField('Orders');
            if (orderBy != null) {
                field = orderBy.Field.substring(9, orderBy.Field.length);
                isReversed = orderBy.IsReversed;
            }

            $rootScope.getUngroupedOrders('sortByColumn=' + field +
                "&sortAscending=" + !isReversed +
                "&SearchField=" + $scope.SearchInfo.SelectedColumn.DataId +
                "&SearchFor=" + $scope.SearchInfo.SearchTerm +
                "&NextFoundRow=" + ($scope.SearchInfo.NextFoundRow || 0) +
                "&pageNumber=" + ($scope.page + 1) +
                "&pageSize=" + pageSize +
                "&filter=" + reverseRuleText,
                ordersLoadCompleted,
                ordersLoadFailed);

            function ordersLoadCompleted(result) {
                $timeout.cancel(stop);
                $rootScope.Orders = result.data.Orders;
                $scope.loadingOrders = false;

                if ($rootScope.Orders.length > 0) {
                    selectedOrderIndex = 0;
                    $scope.selectedItemNumber = $rootScope.Orders[0].OrderHeaderID;
                }

                var pageCount = Math.trunc(result.data.TotalCount / pageSize);
                var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
                $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
                $scope.totalCount = result.data.TotalCount;
                $scope.unselected = $scope.totalCount;

                if (($scope.SearchInfo.SearchTerm != '') && (result.data.NextFoundRow > 0)) {
                    if ($scope.isEditing) {
                        $scope.editItem = {};
                        $scope.isEditing = false;
                        editMode = '';
                    }
                    else
                        $scope.isSearching = true;

                    $scope.SearchInfo.NextFoundRow = result.data.NextFoundRow;
                    $scope.page = Math.trunc(result.data.NextFoundRow / pageSize);

                    // NextRowFound is the absolute index of the record in the entire user lst.
                    // This is to determine the page. So once the page is determined, the record index
                    // must also be determined. If the NextFoundIndex lies on a page boundary, the page
                    // offset calculation must be adjusted by one. The -1 is to convery to 0-based indexes.
                    if ((result.data.NextFoundRow % pageSize) == 0)
                        selectedOrderIndex = result.data.NextFoundRow - (($scope.page - 1) * pageSize) - 1;
                    else
                        selectedOrderIndex = result.data.NextFoundRow - ($scope.page * pageSize) - 1;

                    var selected = $rootScope.Orders[selectedOrderIndex];
                    $scope.selectedItemNumber = selected['OrderHeaderID'];

                    $timeout(function () {
                        var items = document.getElementById("Orders");
                        items.children[1].children[selectedOrderIndex].scrollIntoView(true);
                    }, 10);
                }
                else if ($scope.SearchInfo.SearchTerm != '') {
                    var info = ($scope.SearchInfo.NextFoundRow == 0) ? 'SearchNotFound' : 'SearchAgainNotFound';
                    notificationService.displayInfo($rootScope.translate(info));
                    $scope.SearchInfo.NextFoundRow = 0;
                }

                initGrids();
                $rootScope.resize();
            }

            function ordersLoadFailed(response) {
                $timeout.cancel(stop);
                $scope.loadingOrders = false;
                notificationService.displayError(response.statusText);
            }
        }

        $scope.isSearching = false;
        $scope.searchAgain = function () {
            $scope.loadUngroupedOrders($scope.page);
        }

        $scope.closeSearch = function () {
            $scope.isSearching = false;
            $scope.SearchInfo.SearchTerm = '';
            $scope.SearchInfo.ColumnName = '';
            $rootScope.resize();
        }

        $scope.toggleRuleSelection = function togglePickGroupStatusSelection(column) {
            var idx = -1;
            for (var i = 0; i < $scope.rules.length; ++i) {
                if ($scope.rules[i].Title == column.Caption) {
                    if ($scope.rules[i].Status == 2) {
                        $scope.rules[i].Status = 0;
                        return;
                    }

                    idx = i;
                    break;
                }
            }

            if (idx > -1) {
                if ($scope.rules[idx].Status == 1)
                    $scope.rules.splice(idx, 1);
                else
                    $scope.rules[idx].Status = 2;
            }
            else {
                var value = '';
                if (column.DataType == 'Boolean')
                    value = false;
                var criteria = { ComparisonType: $scope.comparisonTypes[0], Value: value, Status: 1, Operator: -1 };
                var rule = { Title: column.Caption, Criteria: [], Status: 1, DataType: column.DataType, Alias: column.FilterAlias }

                rule.Criteria.push(criteria);
                $scope.rules.push(rule);
            }
        };

        $scope.IsRuleSelected = function (caption) {
            for (var i = 0; i < $scope.rules.length; ++i) {
                if (($scope.rules[i].Title == caption) && ($scope.rules[i].Status < 2))
                    return true;
            }
        }

        $scope.applyRules = function () {
            loadRuleDisplayedFields();
        }

        $scope.addCriteria = function (rule) {
            var criteria = { ComparisonType: $scope.comparisonTypes[0], Value: '', Status: 1, Operator: $scope.conditions[0] };
            rule.Criteria.push(criteria);
            if (rule.Criteria.length > 1)
                rule.Criteria[rule.Criteria.length - 2].Operator = $scope.conditions[0];
        }

        $scope.removeCriteria = function (rule, index) {
            if (rule.Criteria[index].Status == 1)
                rule.Criteria.splice(index, 1);
            else
                rule.Criteria[index].Status = 2;
        }

        $scope.saveRule = function () {
            var rule = {
                'RuleID': $scope.editCriteriaItem.RuleID,
                'RuleName': $scope.editCriteriaItem.RuleName,
                'Description': $scope.editCriteriaItem.Description,
                'RuleType': 'GroupOrders',
                'Status': $scope.editCriteriaItem.Status,
                'Criteria': []
            };

            for (var i = 0; i < $scope.rules.length; ++i) {
                var r = $scope.rules[i];
                for (var j = 0; j < r.Criteria.length; ++j) {
                    var c = r.Criteria[j];
                    var criteria = {
                        'RuleCriteriaID': c.RuleCriteriaID,
                        'ColumnName': r.Title,
                        'ComparisonType': c.ComparisonType.Id,
                        'Value': c.Value,
                        'Operator': (j < r.Criteria.length - 1) ? c.Operator.Id : -1,
                        'Status': (r.Status != 2) ? c.Status : 2
                    };

                    rule.Criteria.push(criteria);
                }
            }

            if (rule.RuleID == undefined)
                $rootScope.addOrderRule(rule, ruleAddCompleted, ruleAddFailed);
            else
                $rootScope.editOrderRuleCriteria(rule, ruleAddCompleted, ruleAddFailed);

            function ruleAddCompleted(result) {
                $scope.closeCriteria();
                loadRules();
            }

            function ruleAddFailed(response) {
                notificationService.displayError(response.statusText);
            }
        }

        $scope.closeDialog = function () {
            $scope.displayRules = false;
            $scope.$apply();
        }

        $scope.closeCriteria = function () {
            $scope.isAppliedRules = false;
            $scope.isRuleEditing = false;
            $scope.$apply();
        }

        $scope.addOrder = function () {
            var order = $rootScope.Orders[selectedOrderIndex];
            $rootScope.Orders.splice(selectedOrderIndex, 1);
            selectedSelOrderIndex = $rootScope.SelectedOrders.length;
            $rootScope.SelectedOrders.push(order);
            --$scope.unselected;

            $scope.Lines += order.Lines;
            $scope.Units += order.Units;
            $scope.Containers += order.Containers;
            $scope.SKUs += order.Skus;
            $scope.SPOrders += order.SinglePieceOrder;
            $scope.FTE += order.FTE;

            $timeout(function () {
                if (selectedSelOrderIndex < $rootScope.Orders.length - 1)
                    $scope.selectedItemNumber = $rootScope.Orders[selectedOrderIndex].OrderHeaderID;
                else
                    $scope.selectedItemNumber = -100;
                $scope.selectedOrder = order.OrderHeaderID;
            }, 5);

            $rootScope.resize();
        }

        $scope.removeOrder = function () {
            var order = $rootScope.SelectedOrders[selectedSelOrderIndex];
            $rootScope.SelectedOrders.splice(selectedSelOrderIndex, 1);
            $rootScope.Orders.push(order);
            ++$scope.unselected;

            $scope.Lines -= order.Lines;
            $scope.Units -= order.Units;
            $scope.Containers -= order.Containers;
            $scope.SKUs -= order.Skus;
            $scope.SPOrders -= order.SinglePieceOrder;
            $scope.FTE -= order.FTE;

            $rootScope.applySort('Orders');

            if ($rootScope.SelectedOrders.length == 0)
                appliedRules = '';

            $timeout(function () {
                if (selectedSelOrderIndex > 0)
                    $scope.selectedOrder = $rootScope.SelectedOrders[selectedSelOrderIndex--].OrderHeaderID;
                else if ($rootScope.SelectedOrders.length > 0)
                    $scope.selectedOrder = $rootScope.SelectedOrders[0].OrderHeaderID;
                else
                    $scope.selectedOrder
            }, 5);

            $rootScope.resize();
        }

        $scope.removeAll = function () {
            $rootScope.SelectedOrders = [];

            appliedRuleText = '';
            reverseRuleText = '';

            $scope.Lines = 0;
            $scope.Units = 0;
            $scope.Containers = 0;
            $scope.SKUs = 0;
            $scope.SPOrders = 0;
            $scope.FTE = 0;
            $scope.selectedOrder = -100;

            $scope.loadUngroupedOrders();
        }

        $scope.addReleaseInstructions = function () {
            $scope.GroupComment = {
                GroupId: 0,
                CommentType: 'Release Instructions',
                DisplayName: $scope.localTranslate('spa.group.groupmonitor.ReleaseInstructions', true),
                Comment: $scope.groupInfo.ReleaseInstructions
            };
            $modal.open({
                templateUrl: 'scripts/spa/monitors/groups/groupComment.html',
                controller: 'groupCommentCtrl',
                scope: $scope
            }).result.then(function ($scope) {
            }, function () {
                $scope.groupInfo.ReleaseInstructions = $scope.GroupComment.Comment;
            });
        };

        $scope.applyRule = function () {
            var rule = $rootScope.Rules[selectedRuleIndex];
            if (rule != null) {
                getOrderRuleCriteria(rule, function (rules) {
                    processRules(rules);
                });
            }
        }

        $scope.applyRuleDirect = function () {
            processRules($scope.rules);
        }

        $scope.isAppliedRules = false;
        $scope.showAppliedRules = function () {
            $scope.rules = $scope.appliedRules;
            $scope.isAppliedRules = true;
            $scope.isRuleEditing = true;
            $scope.$apply();
            $rootScope.resize();
        }

        var appliedRuleText = '';
        var reverseRuleText = '';
        $scope.appliedRules = [];
        function processRules(rules) {
            if (rules != null) {
                for (var i = 0; i < rules.length; ++i) {
                    var rule = rules[i];
                    mergeRules(rule);
                }
            }

            appliedRuleText = '';
            reverseRuleText = '';
            for (var i = 0; i < $scope.appliedRules.length; ++i) {
                var rule = $scope.appliedRules[i];
                for (var j = 0; j < rule.Criteria.length; ++j) {
                    var criteria = rule.Criteria[j];
                    var column = getColumnByCaption(rule.Title);
                    getOperation(rule.Title, criteria.ComparisonType.Id, criteria.Value, column.DataType, column.FilterAlias);
                    appliedRuleText += ((j < rule.Criteria.length - 1) && (criteria.Operator != null)) ? ((criteria.Operator.Id == 0) ? 'AND ' : 'OR ') : '';
                    reverseRuleText += ((j < rule.Criteria.length - 1) && (criteria.Operator != null)) ? ((criteria.Operator.Id == 0) ? 'OR ' : 'AND ') : '';
                }
                appliedRuleText += (i < $scope.appliedRules.length - 1) ? 'AND ' : '';
                reverseRuleText += (i < $scope.appliedRules.length - 1) ? 'OR ' : '';
            }

            if (appliedRuleText.length > 0) {
                $scope.closeCriteria();
                $scope.closeDialog();
                //var stopSpinner = $timeout(function () {
                //    $scope.loadingSelectedOrders = true;
                //}, 500);
                $rootScope.applyRule(appliedRuleText,
                    function (result) {
                        //$timeout.cancel(stopSpinner);
                        //$scope.loadingSelectedOrders = false;
                        $rootScope.SelectedOrders = result.data.Orders;
                        if ($rootScope.SelectedOrders.length > 0) {
                            for (var i = 0; i < $rootScope.SelectedOrders.length; ++i) {
                                var selectedOrder = $rootScope.SelectedOrders[i];
                                $scope.Lines += selectedOrder.Lines;
                                $scope.Units += selectedOrder.Units;
                                $scope.Containers += selectedOrder.Containers;
                                $scope.SKUs += selectedOrder.Skus;
                                $scope.SPOrders += selectedOrder.SinglePieceOrder;
                                $scope.FTE += selectedOrder.FTE;
                            }

                            initGrids();
                            $timeout(function () {
                                $rootScope.applySort('SelectedOrders');
                                selectedSelOrderIndex = 0;
                                $scope.selectedOrder = $rootScope.SelectedOrders[0].OrderHeaderID;
                            }, 200);

                            $scope.loadUngroupedOrders();
                        }
                    },
                    function (response) {
                        $timeout.cancel(stop);
                        $scope.loadingSelectedOrders = false;
                    }
                );
            }
            else {
                $scope.closeCriteria();
                $scope.closeDialog();
                $scope.removeAll();
            }
        }

        function getOperation(col, id, value, dataType, alias) {
            if (dataType == 'DateTime')
                value = value.getFullYear() + '/' + value.getMonth() + 1 + '/' + value.getDate();
            else if (dataType == 'Boolean')
                value = value ? 1 : 0;

            if (alias != undefined)
                col = alias;

            switch (id) {
                case 0:
                    appliedRuleText += col + ' = \'' + value + '\' ';    // = Equals
                    reverseRuleText += col + ' <> \'' + value + '\' ';   // <> Not Equals
                    break;
                case 1:
                    appliedRuleText += col + ' <> \'' + value + '\' ';   // <> Not Equals
                    reverseRuleText += col + ' = \'' + value + '\' ';    // = Equals
                    break;
                case 2:
                    appliedRuleText += col + ' LIKE \'%' + value + '%\' ';    // * Contains
                    reverseRuleText += col + ' NOT LIKE \'%' + value + '%\' '; // !* Does Not Contain
                    break;
                case 3:
                    appliedRuleText += col + ' NOT LIKE \'%' + value + '%\' '; // !* Does Not Contain
                    reverseRuleText += col + ' LIKE \'%' + value + '%\' ';    // * Contains
                    break;
                case 4:
                    appliedRuleText += col + ' LIKE \'' + value + '%\' ';     // =* Starts With
                    reverseRuleText += col + ' NOT LIKE \'' + value + '%\' ';  // x* Does Not Start With
                    break;
                case 5:
                    appliedRuleText += col + ' NOT LIKE \'' + value + '%\' ';  // x* Does Not Start With
                    reverseRuleText += col + ' LIKE \'' + value + '%\' ';     // =* Starts With
                    break;
                case 6:
                    appliedRuleText += col + ' LIKE %\'' + value + '\' ';     // *= Ends With
                    reverseRuleText += col + ' NOT LIKE %\'' + value + '\' ';  // *x Does Not End With
                    break;
                case 7:
                    appliedRuleText += col + ' NOT LIKE \'%' + value + '\' ';  // *x Does Not End With
                    reverseRuleText += col + ' LIKE \'%' + value + '\' ';     // *= Ends With
                    break;
                case 8:
                    appliedRuleText += col + ' ' + ' > \'' + value + '\' ';    // > Greater
                    reverseRuleText += col + ' ' + ' <+ \'' + value + '\' ';    // < Smaller or Equal
                    break;
                case 9:
                    appliedRuleText += col + ' ' + ' >= \'' + value + '\' ';   // >= Greater or Equal
                    reverseRuleText += col + ' ' + ' < \'' + value + '\' ';   // > Smaller or Equal
                    break;
                case 10:
                    appliedRuleText += col + ' < \'' + value + '\' ';         // < Smaller
                    reverseRuleText += col + ' >= \'' + value + '\' ';         // > Greater or Equal
                    break;
                case 11:
                    appliedRuleText += col + ' <= \'' + value + '\' ';        // <= Smaller or Equal
                    reverseRuleText += col + ' > \'' + value + '\' ';        // >= Greater
                    break;
            }
        }

        function mergeRules(rule) {
            var isNew = false;
            var isFound = false;
            if ($scope.appliedRules.length > 0) {
                for (var i = 0; i < $scope.appliedRules.length; ++i) {
                    var appliedRule = $scope.appliedRules[i];
                    if (appliedRule.Title == rule.Title) {
                        isFound = true;
                        if (rule.Status == 2) {
                            $scope.appliedRules.splice(i--, 1);
                            isNew = true;
                        }
                        else {
                            for (var j = 0; j < rule.Criteria.length; ++j) {
                                var isFound = false;
                                for (var k = 0; k < appliedRule.Criteria.length; ++k) {
                                    if ((appliedRule.Criteria[k].ComparisonType.Id == rule.Criteria[j].ComparisonType.Id) &&
                                        (appliedRule.Criteria[k].Value == rule.Criteria[j].Value))
                                        isFound = true;
                                    break;
                                }

                                if (!isFound) {
                                    appliedRule.Criteria.push(rule.Criteria[j]);
                                    isNew = true;
                                }
                            }
                        }
                    }
                }
            }

            if (!isFound) {
                $scope.appliedRules.push(rule);
                isNew = true;
            }

            return isNew;
        }

        var selectedOrderIndex = -1;
        var selectedSelOrderIndex = -1;
        var selectedRuleIndex = -1;
        function init() {
            loadDisplayedFields();
        }

        function initGrids() {
            $timeout(function () {
                $rootScope.initGrids(function (colId, tableId, row) {
                    if (row == -1) {
                        switch (tableId) {
                            case 'Orders':
                                $scope.loadUngroupedOrders();
                                return true;

                            default:
                                return false;
                        }
                    }
                    else if (row > -1) {
                        switch (tableId.replace(/[0-9]/g, '')) {
                            case 'Orders':
                                selectedOrderIndex = row;
                                var order = $rootScope.Orders[row];
                                $scope.selectedItemNumber = order['OrderHeaderID'];
                                break;

                            case 'SelectedOrders':
                                selectedSelOrderIndex = row;
                                var order = $rootScope.SelectedOrders[row];
                                $scope.selectedOrder = order['OrderHeaderID'];
                                break;

                            case 'Rules':
                                selectedRuleIndex = row;
                                var rule = $rootScope.Rules[row];
                                $scope.selectedRuleItemNumber = rule.RuleID;
                                break;
                        }

                        $scope.$apply();
                    }
                    else {
                        switch (tableId.replace(/[0-9]/g, '')) {
                            case 'Orders':
                                $scope.selectedItemNumber = -100;
                                break;

                            case 'Rules':
                                selectedRuleIndex = -1;
                                $scope.selectedRuleItemNumber = -100;
                                break;
                        }

                        $scope.$apply();
                    }
                }, 100);
            });
        }

        var isOnItem = false;
        var isOnRuleItem = false;

        $scope.getRuleMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'edit': return isOnRuleItem ? 'active' : 'disabled';
                case 'delete': return isOnRuleItem ? 'active' : 'disabled';
                case 'criteria': return isOnRuleItem ? 'active' : 'disabled';
                default: return 'active';
            }
        }

        $rootScope.menuHandler = function (menuName, item) {
            if (item != null) {
                $scope.focusPanel = menuName;
                if ((menuName == "orders") && (item.Col != -1)) {
                    isOnItem = (item.Col < 0) ? false : true;
                    if (isOnItem) {
                        var order = $rootScope.Orders[$scope.row];
                        $scope.selectedItemNumber = order.OrderHeaderID;
                    }
                    else
                        $scope.selectedItemNumber = -100;
                }
                else if (menuName == 'rules')
                    isOnRuleItem = (item.Col >= 0);

                $scope.$apply();
            }
        }

        $rootScope.menuClickHandler = function (menuName, menuItem, taskItemInContext) {
            switch (menuName) {
                case "orders":
                    switch (menuItem) {
                        case "search":
                            $scope.status = { isCanceled: true };
                            $scope.SearchInfo = {
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
                                    $scope.loadUngroupedOrders();
                            });
                            break;

                        case "refresh":
                            $scope.loadUngroupedOrders($scope.page);
                            break;
                    }
                    break;

                case "rules":
                    switch (menuItem) {
                        case "New":
                            $timeout(function () {
                                $scope.addNew();
                                $rootScope.resize();
                            }, 1);
                            break;

                        case "Edit":
                            var rule = $rootScope.Rules[$scope.row];
                            if (rule != null) {
                                $scope.editItem = rule;
                                $scope.originalItem = {};
                                for (var i = 0; i < $scope.ruleColumnNames.length; ++i)
                                    $scope.originalItem[$scope.ruleColumnNames[i].DataId] = rule[$scope.ruleColumnNames[i].DataId];

                                if ($scope.originalItem['RuleID'] == null)
                                    $scope.originalItem['RuleID'] = rule['RuleID'];

                                $scope.isEditing = true;
                                $scope.$apply();
                                scrollIntoView();
                                $rootScope.resize();
                            }
                            break;

                        case "Delete":
                            var rule = $rootScope.Rules[$scope.row];
                            if (rule != null) {
                                $scope.status = { isCanceled: true };

                                if (rule.Description != null)
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + rule.RuleName + ' - ' + rule.Description + "'?";
                                else
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + rule.RuleName + "'?";

                                $scope.deleteUrl = webApiBaseUrl + '/api/rules/' + rule.RuleID;
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/confirm.html',
                                    controller: 'confirmCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        loadRules();
                                });
                            }
                            break;

                        case "Criteria":
                            var rule = $rootScope.Rules[$scope.row];
                            if (rule != null) {
                                if (rule.Criteria.length == 0)
                                    getOrderRuleCriteria(rule, function (rules) {
                                        $scope.rules = rules;
                                    });

                                $scope.editCriteriaItem = rule;
                                $scope.isRuleEditing = true;
                                $scope.$apply();
                                $rootScope.resize();
                            }
                            break;
                    }
                    break;
            }
        }

        function findRuleById(id) {
            var rule;
            for (var i = 0; i < $rootScope.Rules.length; ++i) {
                rule = $rootScope.Rules[i];
                if (rule.RuleID == id)
                    return rule;
            }

            return null;
        }

        function getOrderRuleCriteria(rule, onComplete) {
            $rootScope.getOrderRuleCriteria(rule.RuleID,
                function (result) {
                    var rules = [];
                    var criteriaList = result.data.RuleCriteria;
                    for (var i = 0; i < criteriaList.length; ++i) {
                        var criteria = criteriaList[i];
                        var idx = -1;
                        for (var j = 0; j < rules.length; ++j) {
                            if (rules[j].Title == criteria.ColumnName) {
                                idx = j;
                                break;
                            }
                        }

                        if (idx == -1) {
                            var column = getColumnByCaption(criteria.ColumnName);
                            rules.push({ Title: criteria.ColumnName, Criteria: [], Status: 0, DataType: column.DataType, Alias: column.FilterAlias });
                        }

                        rules[j].Criteria.push({ RuleCriteriaID: criteria.RuleCriteriaID, ComparisonType: $scope.comparisonTypes[criteria.ComparisonType], Value: criteria.Value, Status: 0, Operator: $scope.conditions[criteria.Operator] });
                    }

                    if (onComplete != null)
                        onComplete(rules);
                },
                function (response) {
                    notificationService.displayError('Error loading rule criteria:' + response);

                    if (onComplete != null)
                        onComplete(null);
                }
            );
        }

        function getColumnByCaption(caption) {
            for (var i = 0; i < $scope.orderFilterNames.length; ++i) {
                var col = $scope.orderFilterNames[i];
                if (col.Caption == caption)
                    return col;
            }
        }

        $scope.focusPanel = "Orders";

        $rootScope.keyHandler = function (e) {
            if (e.keyCode == 27) {
                if ($scope.isEditing)
                    $scope.cancel();
                else if ($scope.isRuleEditing)
                    $scope.closeCriteria();
                else if ($scope.displayRules)
                    $scope.closeDialog();
            }
        }

        $scope.groupInfo = { ReleaseInstructions: '', GroupName: '' };
        $scope.groupOrder = function (op) {
            op = op || 1;
            var orderIds = '';
            for (var i = 0; i < $rootScope.SelectedOrders.length; ++i)
                orderIds += $rootScope.SelectedOrders[i].OrderHeaderID + ',';
            $rootScope.groupOrders('op=' + op +'&orderList=' + orderIds +
                '&groupName=' + $scope.groupInfo.GroupName +
                '&releaseInstructions=' + $scope.groupInfo.ReleaseInstructions,
                function (result) {
                    if (op == 1) {
                        $scope.details = result.data;
                        $rootScope.ShortList = { Shorts: result.data.ShortList };
                        if ($scope.details.Result != 1) {
                            $scope.Text1 = $scope.details.ReasonDescription;
                            $scope.Image = 'Content/images/warning.png';
                            $scope.Buttons = 'OK';
                            $modal.open({
                                templateUrl: 'scripts/spa/confirmation/notification.html',
                                controller: 'notificationCtrl',
                                scope: $scope
                            });
                        }
                        else {
                            if ($scope.details.ShortOrders > 0) {
                                $scope.details.shorts = $modal.open({
                                    templateUrl: 'scripts/spa/monitors/groups/shortItems.html',
                                    controller: 'shortItemsCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.details['isCanceled'])
                                        $scope.groupOrder(2);
                                });
                            }
                        }
                    }
                    else {
                        $scope.loadUngroupedOrders();
                        $rootScope.SelectedOrders = [];
                    }
                },
                function (response) {
                }
            );
        }

        init();
    }
})(angular.module('fastTrakWebUI'));