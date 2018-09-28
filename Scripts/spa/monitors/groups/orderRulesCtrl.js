(function (app) {
    'use strict';

    app.controller('orderRulesCtrl', orderRulesCtrl);

    orderRulesCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', '$modalInstance', 'settings', 'apiService', 'notificationService', 'membershipService'];

    function orderRulesCtrl($scope, $rootScope, $timeout, $modal, $modalInstance, settings, apiService, notificationService, membershipService) {
        $scope.pageClass = 'page-orderrules';
        $scope.loadingRules = false;
        $scope.columnNames = [];
        $rootScope.Rules = [];
        $scope.selectedRules = [];
        $scope.selectedItemNumber = -100;
        $scope.selectedRuleItemNumber = -100;
        $scope.fillWidth = 0;

        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.isEditing = false;
        $scope.editItem = {};
        $scope.originalItem = {}

        $scope.pageTransPrefix = 'spa.monitors.groups.rules.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        function loadDisplayedFields() {
            $rootScope.getRuleDisplayFields(loadDisplayedFieldsCompleted, loadDisplayedFieldsFailed);

            function loadDisplayedFieldsCompleted(result) {
                var data = result.data;
                $rootScope.initColumns(data.RuleFields, $scope.columnNames);
                sizeTables();
            }

            function loadDisplayedFieldsFailed(response) {
                notificationService.displayError('Error loading displayed fields:' + response);
            }
        }

        var editMode = ''
        $scope.addNew = function () {
            editMode = 'add';
            $scope.editItem = {};

            for (var i = 0; i < $scope.columnNames.length; ++i)
                $scope.editItem[$scope.columnNames[i].Caption] = '';

            $rootScope.Rules.push($scope.editItem);
            $scope.isEditing = true;
            scrollIntoView();
        }

        $scope.save = function () {
            var isValid = true;

            var i = -1;
            var key;
            for (key in $scope.editItem) {
                if ((key != 'RuleID') && ($scope.editItem[key] == '')) {
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
                $rootScope.Rules.splice($rootScope.Groups.length - 1);
            else {
                for (var i = 0; i < $rootScope.Rules.length; ++i) {
                    var rule = $rootScope.Rules[i];
                    if (rule.RuleID == $scope.originalItem.RuleID) {
                        //rule.RuleName = $scope.originalItem.RuleName;
                        //rule.Description = $scope.originalItem.Description;
                        for (var i = 0; i < $scope.columnNames.length; ++i)
                            rule[$scope.columnNames[i].Caption] = $scope.originalItem[$scope.columnNames[i].Caption];
                        break;
                    }
                }
            }

            editMode = '';
            $rootScope.resize();
        }

        $scope.getTemplate = function (item) {
            return (item === $scope.editItem) ? 'edit' : 'display';
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
                $rootScope.editOrderRule($scope.editItem, groupSaveCompleted, groupSaveFailed);

            function ruleSaveCompleted(result) {
                if (result.data.Success) {
                    $scope.editItem = {};
                    $scope.isEditing = false;
                    editMode = '';

                    $scope.loadRules();
                }
                else
                    notificationService.displayError($scope.localTranslate('Error' + result.data.ReasonCode));
            }

            function ruleSaveFailed(response) {
                if (response.data != null)
                    notificationService.displayError(response.data);
            }
        }

        var loadingData;
        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function () {
                $timeout.cancel(stop);

                if (spinner == "rules")
                    $scope.loadingRules = true;
            }, 1000);
        }

        $scope.loadRules = function () {
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

        $rootScope.menuHandler = function (menuName, item) {
            isOnItem = (item.Col < 0) ? false : true;
            $scope.selectedItemNumber = isOnItem ? item.Row.children[0].innerHTML : -100;
            $scope.$apply();
        }

        $rootScope.menuClickHandler = function (menuName, itemId, taskItemInContext) {
            switch (menuName) {
                case "rules":
                    switch (itemId) {
                        case "New":
                            $timeout(function () {
                                $scope.addNew();
                                sizeTables();
                            }, 1);
                            break;

                        case "Edit":
                            var ti = taskItemInContext.Row;
                            var id = ti.children[0].innerHTML;
                            var rule = findRuleById(id);
                            if (rule != null) {
                                $scope.editItem = rule;
                                $scope.originalItem = {};
                                for (var i = 0; i < $scope.columnNames.length; ++i)
                                    $scope.originalItem[$scope.columnNames[i].DataId] = rule[$scope.columnNames[i].DataId];

                                if ($scope.originalItem['RuleID'] == null)
                                    $scope.originalItem['RuleID'] = rule['RuleID'];

                                $scope.isEditing = true;
                                $scope.$apply();
                                sizeTables();
                            }
                            break;

                        case "Delete":
                            var ti = taskItemInContext.Row;
                            var id = ti.children[0].innerHTML;
                            var rule = findRuleById(id);
                            if (rule != null) {
                                $scope.status = { isCanceled: true };

                                if (rule.Description != null)
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + rule.RuleName + ' - ' + rule.Description + "'?";
                                else
                                    $scope.ConfirmText = $rootScope.translate("DeleteConfirmation") + rule.RuleName + "'?";

                                $scope.deleteUrl = webApiBaseUrl + '/api/orders/rules/' + id;
                                $modal.open({
                                    templateUrl: 'scripts/spa/confirmation/confirm.html',
                                    controller: 'confirmCtrl',
                                    scope: $scope
                                }).result.then(function ($scope) {
                                }, function () {
                                    if (!$scope.status.isCanceled)
                                        $scope.loadRules();
                                });
                            }
                            break;
                    }
                    break;
            }
        };

        function findRuleById(id) {
            var rule;
            for (var i = 0; i < $rootScope.Rules.length; ++i) {
                rule = $rootScope.Rules[i];
                if (rule.RuleId == id)
                    return rule;
            }

            return null;
        }

        var isOnItem = false;
        $scope.getRuleMenuClass = function (menuItem) {
            switch (menuItem) {
                case 'new': return membershipService.isUserInRole('Admin.Groups.Add') ? 'active' : 'disabled';
                case 'edit': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Edit')) ? 'active' : 'disabled';
                case 'delete': return (isOnItem && membershipService.isUserInRole('Admin.Groups.Delete')) ? 'active' : 'disabled';
            }
        }

        function init() {
            loadDisplayedFields();
            $scope.loadRules();

            $timeout(function () {
                $rootScope.handleResize('Rules', 'RulesGrips',
                    function (tbl, fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    });
            }, 100);
        }

        $rootScope.keyHandler = function (e) {
            if (e.keyCode == 27) {
                if ($scope.isEditing) {
                    $scope.cancel();
                    $scope.$apply();
                }
            }
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 250;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('Rules');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 1)
                        itemHeight = table.rows[1].clientHeight;

                    var rect = table.getBoundingClientRect();
                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - rect.top - 200;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    var padCol = document.getElementById('padColRules');
                    if (padCol != null) {
                        if (itemHeight > screenHeight)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    var body = table.children[1];
                    body.style.minHeight = body.style.maxHeight = screenHeight + 'px';

                    var scrollHeight = (itemHeight > screenHeight) ? 17 : 0;
                    rect = table.getBoundingClientRect();
                    var grips = document.getElementById('RulesGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.top = '50px';
                    grips.style.width = rect.width - scrollHeight + 'px';
                    grips.style.height = rect.height - ((table.scrollWidth > table.clientWidth) ? 17 : 0) + "px";

                    //$scope.fillWidth = 0;
                    //var header = table.children[0].children[0];
                    //var body = table.children[1].children[0];
                    //for (var i = 0; i < header.cells.length - 1; ++i) {
                    //    body.cells[i].style.minWidth = body.cells[i].style.maxWidth = header.cells[i].style.maxWidth;
                    //    $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);
                    //}
                    //$scope.fillWidth = rect.width - $scope.fillWidth;

                    //$rootScope.expandColumn(table, grips, 5);
                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        init();
    }
})(angular.module('fastTrakWebUI'));