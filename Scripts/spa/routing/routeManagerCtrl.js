(function (app) {
    'use strict';

    app.controller('routeManagerCtrl', routeManagerCtrl);

    routeManagerCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

    function routeManagerCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-routemanager';
        $scope.controllerState;
        $scope.ioStats;
        $scope.sysMessage;
        $scope.lastComm;
        $scope.isStarted = false;
        $scope.spinnerVisible = false;
        $scope.engines = [];
        $scope.EngineDetails = [];
        $scope.curEngine;

        $scope.start = start;
        $scope.pause = pause;
        $scope.stop = stop;

        var localBaseUrl = settings.localBaseUrl;
        var errorLevel = 2;

        var stop;
        function showSpinner() {
            stop = $timeout(function () {
                $timeout.cancel(stop);
                $scope.spinnerVisible = true;
            }, 1000);
        }

        $scope.pageTransPrefix = 'spa.routing.routemanager.routemanager.';

        $scope.localTranslate = function (key, noPrefix) {
            noPrefix = noPrefix || false;
            return $rootScope.translate(noPrefix ? key : $scope.pageTransPrefix + key)
        }

        $scope.selectTab = function (tab) {
            angular.forEach($scope.EngineDetails, function (value, key) {
                value.active = false;
            });

            tab.active = true;
            $scope.curEngine = tab.content;

            sizeTables();
        };

        $scope.closeTab = function (index) {
            $scope.EngineDetails.splice(index, 1);
            if ($scope.EngineDetails.length > 0)
                $scope.EngineDetails[$scope.EngineDetails.length - 1].active = true;

            if ($scope.EngineDetails.length == 0)
                $scope.curEngine = null;
        };

        $scope.openDetails = function (event) {
            if (event.Details != null) {
                $scope.Text1 = event.Time;
                $scope.Text2 = event.Details;
                $scope.Image = 'Content/images/error.png';
                $scope.Buttons = 'OK';
                $scope.status = { ButtonClicked: '' };
                $modal.open({
                    templateUrl: 'scripts/spa/confirmation/notification.html',
                    controller: 'notificationCtrl',
                    scope: $scope
                });
            }
        };

        $scope.toggleEngineSelection = function togglePickGroupStatusSelection(engine) {
            var idx = -1;
            for (var i = 0; i < $scope.EngineDetails.length; ++i) {
                if ($scope.EngineDetails[i].title == engine.EngineId) {
                    idx = i;
                    break;
                }
            }

            // Is currently selected
            if (idx > -1)
                $scope.EngineDetails.splice(idx, 1);
            // Is newly selected
            else {
                var newTab =
                    {
                        id: ($scope.EngineDetails == null) ? 1 : $scope.EngineDetails.length + 1,
                        title: engine.EngineId,
                        content: engine,
                        active: false
                    }

                $scope.EngineDetails.push(newTab);
                $scope.selectTab($scope.EngineDetails[$scope.EngineDetails.length - 1]);

                sizeTables();
                for (var i = 0; i < newTab.content.TableInfo.length; ++i) {
                    update(true, -1, newTab.content.TableInfo[i].Category);
                }
            }
        };

        $scope.IsEngineSelected = function (engine) {
            for (var i = 0; i < $scope.EngineDetails.length; ++i) {
                if ($scope.EngineDetails[i].title == engine.EngineId)
                    return true;
            }
        }

        function initChat() {
            errorLevel = $rootScope.errorLevel();
            if ($.connection && $.connection.hub) {
                if ($.connection.hub.stop) {
                    $.connection.hub.stop();
                }

                var chat = $.connection.fastRouteHub;
                if (chat) {
                    chat.client.broadcastControllerStateChanged = function (newState) {
                        $scope.controllerState = newState;
                        update(false);
                    };

                    chat.client.broadcastEngineStateChanged = function (engineId, newState) {
                        var engine = findEngine(engineId);
                        if (engine != null) {
                            engine.CurrentState = newState;
                            update(false);
                        }
                    };

                    chat.client.broadcastLastComm = function (engineId, lastComm) {
                        var engine = findEngine(engineId);
                        if (engine != null) {
                            var first = lastComm.split(',')[0];
                            $scope.lastComm = first.substring(2, first.length - 1);
                            engine.LastComm = lastComm;
                            update(false);
                        }
                    };

                    chat.client.broadcastGridError = function (engineId, category, data, operation) {
                        var rowData = JSON.parse(data);

                        var index = -1;
                        var eventList = getEventList(engineId, category);
                        if (eventList != null) {
                            if (operation == 0) // Insert
                                eventList.push(rowData);
                            else if (operation == 1) // Update
                                index = updateElement(eventList, rowData);
                            else // Delete
                                deleteElement(eventList, rowData);
                            update(true, index, category);
                        }
                    };

                    chat.client.broadcastGridEntry = function (engineId, category, data, operation) {
                        var rowData = JSON.parse(data);

                        var index = -1;
                        var eventList = getEventList(engineId, category);
                        if (eventList != null) {
                            if (operation == 0) // Insert
                                eventList.push(rowData);
                            else if (operation == 1) // Update
                                index = updateElement(eventList, rowData);
                            else // Delete
                                deleteElement(eventList, rowData);
                            update(true, index, category);
                        }
                    };

                    chat.client.broadcastMessage = function (engineId, category, message, messageLevel, operation) {
                        if (messageLevel <= errorLevel) {
                            var rowData = JSON.parse(message);

                            var eventList = getEventList(engineId, category);
                            if (eventList != null) {
                                eventList.push(rowData);
                                update(true, -1, category);
                            }
                        }
                    };

                    chat.client.broadcastIOStatChanged = function (ioStats) {
                        $scope.ioStats = ioStats;
                        update(false);
                    };

                    chat.client.broadcastStatisticsChanged = function (engineId, statistics) {
                        var engine = findEngine(engineId);
                        if (engine != null) {
                            engine.Statistics = statistics;
                            update(false);
                        }
                    };

                    chat.client.broadcastSystemMessageStateChanged = function (systemMessagestate) {
                        $scope.controllerState = systemMessagestate;
                        update(false);
                    };
                }
                try {
                    $.connection.hub.start().done(function () {
                        showSpinner();
                        init();
                        //initWithTimer();

                        window.onresize = function (e) {
                            if (($scope.curEngine != null) && ($scope.curEngine.TableInfo.length > 0)) {
                                sizeTables();
                                update();
                            }
                        };
                    });
                } catch (e) {
                    console.log(e);
                }
            }
        }

        //function initWithTimer() {
        //    $timeout(function () {
        //        init();
        //    }, 3000);
        //}

        var sizeTimer = null;
        function sizeTables() {
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var itemHeight;
                var screenHeight;
                var table = document.getElementById($scope.curEngine.TableInfo[0].Category + 1);
                if (table != null) {
                    var itemHeight = 0;
                    if (table.rows.length > 0)
                        itemHeight = table.rows[0].clientHeight;

                    var minHeight = 4 * itemHeight;
                    itemHeight = itemHeight * table.rows.length;
                    var offset = 380 + ((document.body.scrollHeight > document.body.clientHeight) ? 17 : 0);
                    screenHeight = ((document.body.clientHeight - offset) / $scope.curEngine.TableInfo.length);

                    if (screenHeight < minHeight)
                        screenHeight = minHeight;

                    $scope.curEngine.TableHeight = screenHeight;
                    $scope.curEngine.TableWidth = document.body.clientWidth - 18;

                    for (var eng = 0; eng < $scope.engines.length; ++eng) {
                        var curEngine = $scope.engines[eng];
                        for (var i = 0; i < curEngine.TableInfo.length; ++i) {
                            var tableInfo = curEngine.TableInfo[i];
                            var table = document.getElementById(tableInfo.Category + (eng + 1));
                            if (table != null) {
                                var scrollWidth = 0;
                                if (table.children[1].rows.length > 0) {
                                    var itemHeight = table.children[1].rows[0].clientHeight;
                                    if ((itemHeight * table.children[1].rows.length) > table.children[1].clientHeight)
                                        scrollWidth = 17;
                                }

                                var padCol = document.getElementById('padCol' + i);
                                if (padCol != null) {
                                    if (itemHeight > screenHeight)
                                        padCol.style.display = '';
                                    else
                                        padCol.style.display = 'none';
                                }

                                var scrollHeight = 0;
                                if (table.scrollWidth > table.clientWidth)
                                    scrollHeight = 17;

                                var rect = table.getBoundingClientRect();
                                var grips = document.getElementById(table.id + 'Grips');
                                //grips.style.backgroundColor = 'goldenrod';
                                //grips.style.opacity = 0.25;
                                grips.style.left = rect.left + 'px';
                                grips.style.top = rect.top + 'px';
                                grips.style.width = rect.width - scrollHeight + 'px';
                                grips.style.height = rect.height - ((table.scrollWidth > table.clientWidth) ? 17 : 0) + "px";
                                $rootScope.recalcDivs(table, grips);
                            }
                        }
                    }
                }

                sizeTimer = null;
            }, 100);
        };

        function update(isMessage, index, category) {
            $timeout(function () {
                if (isMessage) {
                    var table = document.getElementById(category);
                    var count = (index == -1) ? table.children[1].children.length - 1 : index;
                    if (count > 5) {
                        var el = table.children[1].children[count];
                        el.scrollIntoView(false);
                    }
                }
            });
        };

        function updateElement(log, entry) {
            var isFound = false;
            for (var i = 0; i < log.length; ++i) {
                var logEntry = log[i];
                if (logEntry['Escort'] == entry['Escort']) {
                    isFound = true;
                    logEntry = entry;
                    return i;
                }
            }

            if (!isFound)
                log.push(entry);
            return -1;
        };

        function deleteElement(log, entry) {
            var isFound = false;
            for (var i = 0; i < log.length; ++i) {
                var logEntry = log[i];
                if (logEntry['Escort'] == entry['Escort']) {
                    log.splice(i, 1);
                    return i;
                }
            }
            return -1;
        };

        function findEngine(engineId) {
            for (var i = 0; i < $scope.engines.length; ++i) {
                var engine = $scope.engines[i];
                if (engine.EngineId == engineId)
                    return engine;
            }
            return null;
        }

        function getEventList(engineId, category) {
            for (var e = 0; e < $scope.engines.length; ++e) {
                var engine = $scope.engines[e];
                if (engine.EngineId == engineId) {
                    for (var t = 0; t < engine.TableInfo.length; ++t) {
                        var table = engine.TableInfo[t];
                        if (table.Category == category)
                            return table.Events;
                    }
                    break;
                }
            }
            return null;
        }

        function init() {
            apiService.get(localBaseUrl + '/home/InitConcentrator', null,
                initConcentratorCompleted,
                initConcentratorFailed);
        }

        function initConcentratorCompleted(response) {
            for (var i = 0; i < response.data.Engines.length; ++i) {
                var engine = response.data.Engines[i];

                var tableInfo = [];
                for (var def = 0; def < engine.FieldDefs.length; ++def) {
                    var field = engine.FieldDefs[def];
                    var cols = [];
                    var tableWidth = 0;
                    for (var col = 0; col < field.Info.length; ++col) {
                        var c = field.Info[col];
                        c.Width += 20;
                        tableWidth += c.Width;
                        cols.push({
                            Caption: c.Caption,
                            Style: 'border-right: solid 1px gray; cursor: pointer; min-width: ' + c.Width + 'px; max-width: ' + c.Width + 'px; padding: 0 5px; text-align: ' + c.Alignment.toLowerCase()
                        });
                    }

                    var events = [];
                    if (response.data.RowData[field.Category] != null) {
                        var rows = response.data.RowData[field.Category];
                        for (var ix = 0; ix < rows.length; ++ix)
                            events.push(JSON.parse(rows[ix]));
                    }

                    tableInfo.push({
                        Category: field.Category,
                        Columns: cols,
                        Events: events,
                        TableWidth: tableWidth,
                        FillWidth: 0
                    });
                }

                var maxWidth = 0;
                for (var ix = 0; ix < tableInfo.length; ++ix)
                    maxWidth = Math.max(maxWidth, tableInfo[ix].TableWidth);

                for (var ix = 0; ix < tableInfo.length; ++ix)
                    tableInfo[ix].FillWidth = maxWidth - tableInfo[ix].TableWidth;

                var engineInfo =
                {
                    EngineId: engine.EngineID,
                    CurrentState: engine.CurrentState,
                    CommLabels: engine.CommLabels,
                    LastComm: engine.LastComm,
                    Statistics: engine.Statistics,
                    TableInfo: tableInfo,
                    TableWidth: maxWidth
                }
                $scope.engines.push(engineInfo);

                var newTab =
                {
                    id: i + 1,
                    title: engine.EngineID,
                    content: engineInfo,
                    active: false
                }
                $scope.EngineDetails.push(newTab);
            }

            $scope.selectTab($scope.EngineDetails[0]);
            $scope.controllerState = response.data.CurrentState;
            $scope.statistics = response.data.Stats;
            $scope.ioStats = response.data.IOStats;
            $scope.sysMessage = response.data.SysMessage;

            $timeout.cancel(stop);
            $scope.spinnerVisible = false;
            $scope.isStarted = true;

            $timeout(function () {
                sizeTables();
                for (var i = 0; i < $scope.EngineDetails.length; ++i) {
                    for (var j = 0; j < $scope.EngineDetails[i].content.TableInfo.length; ++j) {
                        var category = $scope.EngineDetails[i].content.TableInfo[j].Category;
                        update(true, -1, category);
                        //$rootScope.handleResize(category + (i + 1), category + (i + 1) + 'Grips');
                    }
                }
            }, 100);
        }

        function initConcentratorFailed() {
            notificationService.displayError('The controller has failed to start');
        }

        var action;
        function start() {
            if ($scope.curEngine.CurrentState == 3)
                return;

            action = 'start';
            apiService.post(localBaseUrl + '/home/start', null,
                startCompleted,
                startFailed);
        }

        function pause() {
            if ($scope.curEngine.CurrentState != 3)
                return;

            action = 'pause';
            apiService.post(localBaseUrl + '/home/pause', null,
                startCompleted,
                startFailed);
        }

        function stop() {
            if ($scope.curEngine.CurrentState != 3)
                return;

            action = 'stop';
            apiService.post(localBaseUrl + '/home/stop', null,
                startCompleted,
                startFailed);
        }

        function startCompleted(response) {
            notificationService.displaySuccess('The ' + action + ' request has been sent successfully.');
        }

        function startFailed(response) {
            notificationService.displayError(response.data);
        }

        initChat();
    }
})(angular.module('fastTrakWebUI'));