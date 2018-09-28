    (function (app) {
    'use strict';

    app.controller('replenishmentTransCtrl', replenishmentTransCtrl);

    replenishmentTransCtrl.$inject = ['$scope', '$rootScope', '$routeParams', '$location', '$modal', '$timeout', 'settings', 'membershipService', 'apiService', 'notificationService'];

    function replenishmentTransCtrl($scope, $rootScope, $routeParams, $location, $modal, $timeout, settings, membershipService, apiService, notificationService) {
        var webApiBaseUrl = settings.webApiBaseUrl;
        $scope.selectedSKU = -100;

        $scope.pageTransPrefix = 'spa.transaction.replenishment.replenishmentTrans.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.toteVisible = false;
        $scope.gridVisible = false;
        var isInit = true;
        $scope.process = function () {
            $rootScope.Baton.PageDetails.DisplayTemplateSettings = JSON.stringify($scope.toteInfo);
            apiService.put(settings.webApiBaseUrl + '/api/workflows/execute?workflowname=' + $rootScope.Baton.WorkflowName, $rootScope.Baton,
                execWorkflowCompleted,
                execWorkflowFailed);

            function execWorkflowCompleted(result) {
                $rootScope.Baton = result.data;
                $scope.toteInfo = JSON.parse($rootScope.Baton.PageDetails.DisplayTemplateSettings);
                $scope.selectedSKU = $rootScope.Baton.Picks.CurrentPick.InputSku;

                if ($rootScope.Baton.PageDetails.ValidationMsg != '') {
                    $rootScope.Baton.Picks.CurrentPick[$rootScope.Baton.Picks.CurrentPick.PickInputName] = '';
                    notificationService.displayError($rootScope.Baton.PageDetails.ValidationMsg);
                }

                var attr = $scope.toteInfo['ToteLPNAttributes'];
                processFieldAttributes('ToteLPN', attr);

                attr = $scope.toteInfo['ToteTypeAttributes'];
                processFieldAttributes('ToteType', attr);
                if ((attr & 0x1) == 1)
                    $scope.toteVisible = true;

                attr = $scope.toteInfo['PalletLPNAttributes'];
                processFieldAttributes('PalletLPN', attr);

                attr = $scope.toteInfo['SkuAttributes'];
                processFieldAttributes('Sku', attr);
                if ((attr & 0x1) == 1)
                    $scope.gridVisible = true;

                attr = $scope.toteInfo['ScannedAttributes'];
                processFieldAttributes('Scanned', attr);

                attr = $scope.toteInfo['QuantityAttributes'];
                processFieldAttributes('Quantity', attr);

                attr = $scope.toteInfo['WeightAttributes'];
                processFieldAttributes('Weight', attr);

                attr = $scope.toteInfo['ConfirmToteAttributes'];
                processFieldAttributes('ConfirmTote', attr);

                sizeTables(100);
            }

            function execWorkflowFailed(response) {
            }
        }

        $scope.reset = function () {
            $rootScope.Baton.Picks.CurrentPick.DestinationContainerLpn = '';
            $rootScope.Baton.Picks.CurrentPick.SourceContainerLpn = '';
            $rootScope.Baton.Picks.CurrentPick.SourceContainerLpn = '';
            $rootScope.Baton.Picks.CurrentPick.InputSku = '';
            $scope.process();
        }

        $scope.back = function () {
            if ($scope.toteInfo == null)
                return;

            var attr = $scope.toteInfo['PalletLPNAttributes'];
            if ((attr & 0x2) == 2) {
                $rootScope.Baton.Picks.CurrentPick.DestinationContainerLpn = '';
                $rootScope.Baton.Picks.CurrentPick.SourceContainerLpn = '';
                $scope.process();
                return;
            }

            attr = $scope.toteInfo['SkuAttributes'];
            if ((attr & 0x2) == 2) {
                $rootScope.Baton.Picks.CurrentPick.SourceContainerLpn = '';
                $rootScope.Baton.Picks.CurrentPick.InputSku = '';
                $scope.process();
                return;
            }

            attr = $scope.toteInfo['ConfirmToteAttributes'];
            if ((attr & 0x2) == 2) {
                $rootScope.Baton.Picks.CurrentPick.InputSku = '';
                $scope.process();
                return;
            }
        }

        function processFieldAttributes(fieldName, attr) {
            var field = document.getElementById(fieldName);
            if ((attr & 0x01) == 1) {
                field.style.visibility = 'visible';
                if ((attr & 0x2) == 2)
                    focusField(fieldName + 'Input');
                else if ((attr & 0x3) == 3)
                    field.readOnly = 'readonly';
            }
            else
                field.style.visibility = 'hidden';

            if ((attr & 0x2) != 2)
                field.readOnly = 'readonly';
            else
                field.readOnly = '';
        }

        function focusField(fieldName) {
            $timeout(function () {
                var field = document.getElementById(fieldName);
                if (field != null)
                    field.focus();
            }, 100);
        }

        function init() {
            resizeListener();

            window.onkeydown = function (e) {
                if (e.keyCode === 13) {
                    var el = document.activeElement;
                    if ((el.nodeName == 'INPUT') && (el.value != ''))
                        $scope.process();
                    return false;
                }
                else if (e.keyCode === 27) {
                    $scope.back();
                    return false;
                }
            }

            if ($rootScope.Baton == null)
                $rootScope.loadWorkflow('replenishment', load);
            else
                load();

            $timeout(function () {
                $rootScope.handleResize('Details', 'DetailsGrips',
                    function (fillWidth) {
                        $scope.fillWidth = fillWidth;
                        $scope.$apply();
                    });

                sizeTables(250);
            }, 100);
        }

        function load() {
            focusField('ToteLPNInput');
        }

        $scope.isDetailsVisible = function () {
            return $rootScope.Baton.Containers.SourceContainer != null;
        }

        var sizeTimer = null;
        function sizeTables(delay) {
            delay = delay || 10;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById('Details');
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 0)
                        itemHeight = table.rows[0].clientHeight;

                    var rect = table.getBoundingClientRect();
                    var minHeight = 2 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    screenHeight = document.body.clientHeight - rect.top - 170;

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    var body = table.children[1];
                    body.style.minHeight = body.style.maxHeight = screenHeight + 'px';
                    var isScrollVisible = (body.scrollHeight > screenHeight);

                    var padCol = document.getElementById('padCol');
                    if (padCol != null) {
                        if (isScrollVisible)
                            padCol.style.display = '';
                        else
                            padCol.style.display = 'none';
                    }

                    var dv = document.getElementById('Details');
                    dv.style.width = dv.style.maxWidth = document.body.clientWidth - rect.left - 30 - table.scrollLeft + 'px';

                    rect = table.getBoundingClientRect();
                    var scrollHeight = (itemHeight > screenHeight) ? 17 : 0;
                    var grips = document.getElementById('DetailsGrips');
                    //grips.style.backgroundColor = 'goldenrod';
                    //grips.style.opacity = 0.25;
                    grips.style.left = rect.left + 'px';
                    grips.style.top = rect.top - table.scrollTop + 'px';
                    grips.style.width = rect.width - scrollHeight + 'px';
                    grips.style.height = rect.height - ((table.scrollWidth > table.clientWidth) ? 17 : 0) + "px";

                    $timeout(function () {
                        $rootScope.expandColumn(table, grips, -1);
                    }, 100);

                    $scope.fillWidth = 0;
                    var header = table.children[0].children[0];
                    var body = table.children[1].children[0];
                    for (var i = 0; i < header.cells.length - 1; ++i) {
                        if (body != null)
                            body.cells[i].style.minWidth = body.cells[i].style.maxWidth = header.cells[i].style.maxWidth;
                        $scope.fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);
                    }
                    $scope.fillWidth = rect.width - $scope.fillWidth;

                    $rootScope.recalcDivs(table, grips);
                }

                sizeTimer = null;
            }, delay);
        };

        function resizeListener() {
            window.onresize = function (e) {
                sizeTables();
            };

            window.onscroll = function (e) {
                sizeTables();
            };
        }

        init();
    }
})(angular.module('fastTrakWebUI'));

// Tote: TOT201806070001
// Pallet: P201805090001
// Sku: 88810@200@@@@@
// Sku: 88503@100@@@@@
