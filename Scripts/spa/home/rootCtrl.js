(function (app) {
    'use strict';

    app.controller('rootCtrl', rootCtrl);

    rootCtrl.$inject = ['$scope', '$location', '$timeout', '$modal', '$state', 'membershipService', '$rootScope', 'settings', 'apiService'];

    function rootCtrl($scope, $location, $timeout, $modal, $state, membershipService, $rootScope, settings, apiService) {
        $rootScope.userData = {};
        $rootScope.userData.displayUserInfo = displayUserInfo;
        $scope.pageOffset = 50;
        $rootScope.state = $state;
        $rootScope.curLocale;
        $rootScope.stationData = {};

        $rootScope.parseWidth = function (width) {
            if (width != '')
                return parseInt(width.substring(0, width.length - 2));
            else
                return 0;
        }

        $rootScope.formatDate = function (d) {
            var dt = new Date(d);
            return [dt.getMonth() + 1, dt.getDate(), dt.getFullYear()].join('/') + ' ' +
                   [dt.getHours(), dt.getMinutes(), dt.getSeconds()].join(':');
        }

        var translations = [];
        $rootScope.translate = function (key) {
            return translations[key];
        }

        $rootScope.getTranslations = function (locale) {
            if ($rootScope.curLocale != locale) {
                $rootScope.curLocale = locale;
                apiService.get(settings.webApiBaseUrl + '/api/accounts/translations?lang=' + $rootScope.curLocale, null,
                    loadTranslationsCompleted,
                    loadTranslationsFailed);
            }
        }

        function loadTranslationsCompleted(result) {
            translations = result.data;
            var test = $rootScope.translate('Monitors');
        }

        function loadTranslationsFailed(response) {
        }

        function displayUserInfo(name) {
            $rootScope.userData.isUserLoggedIn = membershipService.isUserLoggedIn();
            if ($rootScope.userData.isUserLoggedIn) {
                $rootScope.userData.userId = membershipService.userId();
                $rootScope.userData.isUserInRole = function (role) { return membershipService.isUserInRole(role); }
                $rootScope.username = membershipService.username();
                $rootScope.getTranslations(membershipService.language());
                $rootScope.stationData = membershipService.station();
            }
        }

        $rootScope.localTranslate = function (key) {
            if (key != null)
                return $rootScope.translate(key);
        }

        $rootScope.logout = function () {
            membershipService.removeCredentials();
            $location.path('/login');
            $scope.userData.displayUserInfo();

            apiService.post(settings.webApiBaseUrl + '/api/accounts/logout', null, logoutCompleted, logoutFailed);
            function logoutCompleted(result) { }
            function logoutFailed(response) { }
        }

        $rootScope.switchStation = function () {
            $modal.open({
                templateUrl: 'scripts/spa/stations/stationSwitchPrompt.html',
                controller: 'stationSwitchPromptCtrl',
                scope: $scope
            });
        }

        $rootScope.getCookie = function getCookie(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        $rootScope.setCookie = function setCookie(cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        }

        $rootScope.Baton = null;
        $rootScope.loadWorkflow = function (workflowName, callback) {
             apiService.get(settings.webApiBaseUrl + '/api/workflows/execute?workflowname=' + workflowName + '&stationname=' + $rootScope.stationData.StationName, null,
                loadWorkflowCompleted,
                loadWorkflowFailed);

            function loadWorkflowCompleted(result) {
                $rootScope.Baton = result.data;
                $location.path('/' + $rootScope.Baton.PageDetails.DisplayTemplate);

                if (callback != null)
                    callback();
            }

            function loadWorkflowFailed(response) {
            }
        }

        $rootScope.initColumns = function  (fields, columnNames, isNullableColumn) {
            var array = [];
            for (var key in fields)
                array.push({ key: key, value: fields[key] });

            array.sort(function (a, b) { return a.value.DisplayOrder - b.value.DisplayOrder });

            for (var i = 0; i < array.length; ++i) {
                var item = array[i];
                if (item.value.Displayed) {
                    columnNames.push({
                        Caption: item.value.DisplayName,
                        DataId: item.key,
                        DataType: item.value.DataType,
                        IsNullable: (isNullableColumn != null) ? isNullableColumn(item.key) : false,
                        Width: item.value.FieldWidth,
                        Filterable: item.value.Filterable,
                        FilterAlias: item.value.FilterAlias,
                        Style: 'cursor: pointer; min-width: ' + item.value.FieldWidth + 'px; max-width: ' + item.value.FieldWidth + 'px; padding: 0 5px;'
                    });
                }
            }
        }

        $rootScope.handleResize = function (tableId, gripsId, callback, sortHandler) {
            var tbl;
            var grips;
            var clicks = 0, delay = 400;
            var capture;
            var tbl;
            var head;
            var rows;
            var col;
            var posX;
            var offWidth;

            tbl = document.getElementById(tableId);
            grips = document.getElementById(gripsId);

            grips.addEventListener("wheel", function (e) {
                var body = tbl.children[1];
                body.scrollBy(0, e.deltaY);
            });

            grips.addEventListener("mousemove", mouseMove);

            grips.addEventListener("mousedown", function (e) {
                event.preventDefault();
                clicks++;

                setTimeout(function () {
                    clicks = 0;
                }, delay);

                head = tbl.children[0].children[0];
                rows = tbl.children[1].children;
                col = parseInt(e.target.className);

                if (clicks === 2) {
                    if (col) {
                        $rootScope.expandColumn(tbl, grips, col);
                        calcFillWidth();
                    }
                    else {
                        var body = tbl.children[1];
                        if ((body.children != null) && (body.children.length > 0)) {
                            var row = getRowUnderCursor(event, body);
                            if ((row > -1) && (row <= body.rows.length)) {
                                // index is the row, now find the cell
                                var header = head.children;
                                var left = -tbl.scrollLeft;
                                var rect = tbl.getBoundingClientRect();
                                for (var i = 0; i < header.length; ++i) {
                                    left += $rootScope.parseWidth(header[i].style.maxWidth);
                                    if (left > event.clientX - rect.left)
                                        break;
                                }
                            }

                            sortHandler(colId, tableId, row, 'dblclick');
                        }
                    }
                }
                else {
                    posX = event.clientX;

                    offWidth = -$('#' + tableId).scrollLeft();
                    for (var i = 0; i < col; ++i)
                        offWidth += $rootScope.parseWidth(head.cells[i].style.minWidth);

                    capture = e.target;
                    $scope.left = $rootScope.parseWidth(capture.style.left);

                    grips.removeEventListener("mouseup", mouseUp);
                    grips.addEventListener("mouseup", mouseUp);

                    var rect = tbl.getBoundingClientRect();
                    if (event.offsetY < 20) {
                        if (sortHandler != null) {
                            var x = event.clientX;
                            var off = -$('#' + tableId).scrollLeft();
                            off += rect.left;
                            for (var colOff = 0 ; colOff < head.cells.length; ++colOff) {
                                off += $rootScope.parseWidth(head.cells[colOff].style.minWidth);
                                if (off > x) {
                                    var colId = head.cells[colOff].id;
                                    if (colId == 'expander')
                                        return;

                                    var orderBy = orderByFields[tableId];

                                    if (orderBy.Field == colId)
                                        orderBy.IsReversed = !orderBy.IsReversed;
                                    else {
                                        var el = document.getElementById(orderBy.Field);
                                        el.children[0].className = '';
                                        orderBy.IsReversed = false;
                                        orderBy.Field = colId;
                                    }

                                    var el = document.getElementById(orderBy.Field);
                                    el.children[0].className = orderBy.IsReversed ? 'fa fa-sort-asc' : 'fa fa-sort-desc';

                                    if (!sortHandler(colId, tableId, -1))
                                        $rootScope.applySort(tableId);
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        var body = tbl.children[1];
                        if ((body.children != null) && (body.children.length > 0)) {
                            var row = getRowUnderCursor(event, body);
                            if ((row > -1) && (row <= body.rows.length)) {
                                // index is the row, now find the cell
                                var header = head.children;
                                var left = -tbl.scrollLeft;
                                for (var i = 0; i < header.length; ++i) {
                                    left += $rootScope.parseWidth(header[i].style.maxWidth);
                                    if (left > event.clientX - rect.left)
                                        break;
                                }
                            }

                            sortHandler(colId, tableId, row);
                        }
                    }
                }
            });

            function mouseMove(e) {
                if (e.buttons == 0)
                    grips.style.cursor = ((event.clientY - tbl.getBoundingClientRect().top) < 20) ? 'pointer' : 'default';
                else if (e.buttons == 1) {
                    if (head.cells !== undefined && head.cells[col] !== undefined) {
                        var style = head.cells[col].style;

                        if (style.visibility != 'hidden') {
                            $scope.offset = $scope.left - offWidth + (event.clientX - posX);
                            style.minWidth = style.maxWidth = $scope.offset + 'px';

                            for (var row = 0; row < rows.length; ++row) {
                                if (col < rows[row].cells.length) {
                                    var style = rows[row].cells[col].style;
                                    style.minWidth = style.maxWidth = $scope.offset + 'px';
                                }
                            }

                            calcFillWidth();
                        }
                    }                    
                }
            }

            function calcFillWidth() {
                $rootScope.recalcDivs(tbl, grips);
                if (callback != null) {
                    var fillWidth = 0;
                    var header = tbl.children[0].children[0];
                    for (var i = 0; i < header.cells.length - 1; ++i)
                        fillWidth += $rootScope.parseWidth(header.cells[i].style.maxWidth);

                    var itemHeight = 0;
                    if (tbl.rows.length > 1)
                        itemHeight = tbl.rows[1].clientHeight;

                    itemHeight = itemHeight * tbl.rows.length;

                    var clientRect = tbl.getBoundingClientRect();
                    var screenHeight = clientRect.bottom - clientRect.top;

                    var scrollWidth = (itemHeight > screenHeight) ? 17 : 0;
                    var width = clientRect.right - clientRect.left - scrollWidth;
                    callback(tbl, Math.max(0, width - fillWidth), col, $scope.offset);
                }
            }

            function mouseUp(e) {
                grips.removeEventListener("mouseup", mouseUp);
                $rootScope.recalcDivs(tbl, grips);
            }

            tbl.onscroll = function () {
                var el = event.target;
                var sel = '#' + el.id + ' > *';
                $(sel).width(el.clientWidth + el.scrollLeft);

                var grips = document.getElementById(gripsId);
                $rootScope.recalcDivs(el, grips);
            };

            calcFillWidth();
        }

        function getRowUnderCursorTable(event, table) {
            var itemHeight = table.children[1].clientHeight;
            for (var row = 1; row < table.children.length; ++row) {
                var body = table.children[row];
                var subItem = checkMouseOnElement(event, body);
                if (subItem != -1)
                    return { Row: row, SubItem: subItem };
            }

            return { Row: -2, SubItem: 0 };
        }

        function getRowUnderCursorBody(event, body) {
            var itemHeight = body.children[0].clientHeight;
            var off = event.offsetY + body.scrollTop - itemHeight;
            var row = Math.floor(off / itemHeight);
            
            if (row < body.rows.length) {
                var rect = body.children[row].getBoundingClientRect();
            
                while (!((event.clientY > rect.top) && (event.clientY < rect.bottom)))
                    rect = body.children[++row].getBoundingClientRect();
            }
            else
                return { Row: -2, SubItem: 0 };
            
            return { Row: row, SubItem: 0 };
        }

        function checkMouseOnElement(event, el) {
            var rect = el.getBoundingClientRect();
            if ((event.clientY > rect.top) && (event.clientY < rect.bottom)) {
                for (var i = 1; i < el.children.length; ++i) {
                    var child = el.children[i];
                    rect = child.getBoundingClientRect();
                    if ((event.clientY > rect.top) && (event.clientY < rect.bottom))
                        return i;
                }

                return 0;
            }

            return -1;
        }

        function getRowUnderCursor(event, body) {
            var itemHeight = body.children[0].clientHeight;
            var off = event.offsetY + body.scrollTop - itemHeight;
            var row = Math.floor(off / itemHeight);

            if (row < body.rows.length) {
                if (body.children[row] !== undefined) {
                    var rect = body.children[row].getBoundingClientRect();                
                    while (!((event.clientY > rect.top) && (event.clientY < rect.bottom))) {
                        if (body.children[++row] != undefined) {
                            rect = body.children[++row].getBoundingClientRect();
                        }                        
                    }                        
                }
            }
            else
                row = -2;

            return row;
        }

        $rootScope.recalcDivs = function (table, grips) {
            var divs = '';
            var left = -table.scrollLeft;
            var headerRow = table.children[0].children[0];
            var columns = headerRow.children.length - 2;
            for (var i = 0; i < columns; ++i) {
                if (headerRow.cells[i].style.visibility != 'hidden') {
                    left += $rootScope.parseWidth(headerRow.cells[i].style.minWidth) + 0.23;
                    //divs += "<div class='" + i + "' style='border-right: solid 1px black; position: absolute; cursor: e-resize; width: 5px; height: " + grips.style.height + "; left: " + left + "px; background-color: red; opacity: 0.25;'></div>";
                    //divs += "<div class='" + i + "' style='border-right: solid 1px gray; position: absolute; cursor: e-resize; height: " + grips.style.height + "; left: " + left + "px; padding-left: 0px;'></div>";
                    divs += "<div class='" + i + "' style='border-right: solid 1px gray; position: absolute; cursor: e-resize; height: " + grips.style.height + "; left: " + left + "px; width: 3px; padding-left: 1.5px;'></div>";
                }
            }

            grips.innerHTML = divs;
        }

        $rootScope.expandColumn = function (tbl, grips, col) {
            var head = tbl.children[0].children[0];
            var rows = tbl.children[1].children;

            var width = 0;
            if (col == -1) {
                for (var c = 0; c < grips.children.length; ++c) {
                    if (head.children[c].style.visibility != 'hidden')
                        width += columnExpand(head, rows, c, tbl.style);
                }
            }
            else
                width = columnExpand(head, rows, col, tbl.style);

            $rootScope.recalcDivs(tbl, grips);
            return width;
        }

        function columnExpand(head, rows, col, style) {
            var width = head.cells[col].innerText.visualLength(style) + 30;
            for (var row = 0; row < rows.length; ++row) {
                var len = rows[row].cells[col].innerText.toString().visualLength(style) + 15;
                width = Math.max(width, len);
            }

            head.cells[col].style.minWidth = head.cells[col].style.maxWidth = width + 'px';
            for (var row = 0; row < rows.length; ++row) {
                var style = rows[row].cells[col].style;
                style.minWidth = style.maxWidth = width + 'px';
            }

            return width;
        }

        $rootScope.errorLevel = function () {
            return membershipService.errorLevel();
        }

        String.prototype.visualLength = function (style) {
            var ruler = document.getElementById('ruler');
            ruler.innerHTML = this;

            if (style != null) {
                ruler.style.fontSize = style.fontSize;
                ruler.style.fontWeight = style.fontWeight;
            }

            return ruler.offsetWidth;
        }

        $rootScope.userData.displayUserInfo();

        window.onunload = function () {
            for (var i = 0; i < handlers.length; ++i) {
                var handler = handlers[i];
                removeEventListener(handler.Name, handler.Fn);
            }
        }

        var handlers = [];
        $rootScope.registerEventHandler = function (name, fn) {
            var idx = checkHandlers(name);

            if (idx > -1) {
                document.removeEventListener(name, fn);
                handlers.splice(idx, 1);
            }

            document.addEventListener(name, fn);
            handlers.push({ Name: name, Fn: fn });
        }

        function checkHandlers(name) {
            for (var i = 0; i < handlers.length; ++i) {
                var handler = handlers[i];
                if (handler.Name == name)
                    return i;
            }
        
            return -1;
        }

        function init() {
            $rootScope.registerEventHandler("contextmenu", contextListener);
            $rootScope.registerEventHandler("click", clickListener);
        }

        $rootScope.fillWidths = {};
        $rootScope.initGrids = function (sortHandler) {
            initListeners();

            $timeout(function () {
                $rootScope.resize();

                var items = document.getElementsByClassName('scrollTable');
                for (var i = 0; i < items.length; ++i) {
                    var id = items[i].id;

                    // Get the tbody rows
                    var body = items[i].children;
                    var head = body[0].children[0].children;
                    if ((body.length > 0) && (orderByFields[id] == null)) {
                        // Access the data
                        var data;
                        if (body[1].className == '')
                            data = $rootScope[id];
                        else {
                            // Check if there is an index
                            var index = id.replace(/^\D+/g, '');
                            var len = index.length;
                            if (len > 0) {
                                --index;
                                data = $rootScope[body[1].className][index].content[id.substring(0, id.length - len)];
                            }
                            else
                                data = $rootScope[body[1].className][id];
                        }

                        if ((data != null) && (data.length > 0))
                            $rootScope.initSortColumns(id, head, data);
                    }

                    // Add a 'grips' div
                    var gripsEl = document.getElementById(id + 'Grips');
                    if (gripsEl == null) {
                        var parent = items[i].parentElement;
                        var div = document.createElement('div');
                        div.id = id + 'Grips';
                        div.style.overflowX = 'hidden';
                        div.style.zIndex = 100;
                        div.style.position = 'fixed';
                        parent.appendChild(div);
                    
                        $rootScope.handleResize(id, id + 'Grips',
                            function (tbl, fillWidth) {
                                $rootScope.fillWidths[tbl.id] = fillWidth;
                                $scope.$apply();
                            }, sortHandler);
                    }
                }
            }, 1);
        }

        var orderByFields = {};
        $rootScope.initSortColumns = function (id, head, data) {
            if (orderByFields[id] != null)
                return;

            // Parse the columns and add an id to the head
            var array = [];
            for (var i = 0; i < head.length; ++i) {
                if ((head[i].id == '') && (head[i].id != 'expander')) {
                    for (var key in data[0])
                        array.push('col' + id + key);
                }
            }

            var colSet = false;
            for (var c = 0; c < head.length - 1; ++c) {
                var col = head[c];
                if (head[c].id == '')
                    col.id = array[c];

                var s;
                if (!colSet && (head[c].style.visibility != 'hidden') && (head[c].id != 'expander')) {
                    colSet = true;
                    orderByFields[id] = { Field: col.id, IsReversed: false };
                    s = '&nbsp;<i style="display: inline-block;" class="fa fa-sort-desc"></i>';
                }
                else
                    s = '&nbsp;<i style="display: inline-block;"></i>';

                col.innerHTML = col.innerHTML + s;
            }
        }

        $rootScope.getOrderByField = function (fieldName) {
            return orderByFields[fieldName];
        }

        $rootScope.removeOrderByField = function (fieldName) {
            if (orderByFields[fieldName] != null)
                delete orderByFields[fieldName];
        }

        $rootScope.applySort = function (tableId) {
            var orderBy = orderByFields[tableId];
            if (orderBy != null) {
                var pre = orderBy.IsReversed ? '-' : '';
                var field = pre + orderBy.Field.substring(tableId.length + 3, orderBy.Field.length);

                if ($rootScope[tableId] != null)
                    $rootScope[tableId].sort($rootScope.dynamicSort(field));
                else {
                    var table = document.getElementById(tableId);
                    if (table !== undefined) {
                        var body = table.children[1];

                        // Check if there is an index
                        var index = tableId.replace(/^\D+/g, '');
                        var len = index.length;
                        if (len > 0) {
                            --index;
                            $rootScope[body.className][index].content[tableId.substring(0, tableId.length - len)].sort($rootScope.dynamicSort(field));
                        }
                        else
                            $rootScope[body.className][tableId].sort($rootScope.dynamicSort(field));
                    }                    
                }

                $scope.$apply();
            }
        }

        $rootScope.dynamicSort = function (property) {
            var sortOrder = 1;
            if (property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }

            return function (a, b) {
                var fa = a[property] == null ? ' ' : a[property];
                var fb = b[property] == null ? ' ' : b[property];
                var result = (fa < fb) ? -1 : (fa > fb) ? 1 : 0;
                return result == 0 ? 0 : result * sortOrder;
            }
        }

        var taskItemInContext;
        $rootScope.menuHandler = null;
        $rootScope.menuClickHandler = null;
        $rootScope.clickHandler = null;
        $rootScope.sortHandler = null;
        function contextListener(e) {
            $rootScope.toggleMenuOff();
            taskItemInContext = clickInsideElement(e);

            if (taskItemInContext != null) {
                e.preventDefault();
                if ($rootScope.menuHandler != null)
                    $rootScope.menuHandler(menuName, taskItemInContext);
                toggleMenuOn(e);
            }
        }

        var menuName;
        function clickInsideElement(e) {
            var el = e.srcElement || e.target;

            if (el.id.includes('Grips')) {
                // Get the associated table by id
                var id = el.id.substring(0, el.id.length - 5);
                var table = document.getElementById(id);
                var rect = table.getBoundingClientRect();
                var mouseX = e.clientX;
                var mouseY = e.clientY;
                menuName = id.toLowerCase().replace(/[0-9]/g, '');

                // Get item height
                var body = table.children[1];
                var header = table.children[0].children[0].children;
                if ((body.children != null) && (body.children.length > 0)) {
                    $scope.row = getRowUnderCursor(event, body);
                    if ($scope.row > -1) {
                        // index is the row, now find the cell
                        var left = -table.scrollLeft;
                        for (var i = 0; i < header.length; ++i) {
                            left += $rootScope.parseWidth(header[i].style.maxWidth);
                            if (left > event.clientX - rect.left)
                                break;
                        }

                        return { Row: body.rows[$scope.row], Col: i };
                    }
                    else
                        return { Row: $scope.row, Col: -1, ColName: '' };
                }
                else {
                    var header = table.children[0].children[0].children;
                    var left = -table.scrollLeft;
                    for (var i = 0; i < header.length; ++i) {
                        left += $rootScope.parseWidth(header[i].style.maxWidth);
                        if (left > event.clientX - rect.left)
                            break;
                    }

                    return { Row: -1, Col: i, ColName: '' };
                }
            }

            return null;
        }

        var menu;
        var menuState = 0;

        var contextMenuClassName = "context-menu";
        var contextMenuItemClassName = "context-menu__item";
        var contextMenuLinkClassName = "context-menu__link";
        var contextMenuActive = "context-menu--active";

        function clickListener(e) {
            var el = e.srcElement || e.target;
            if ($rootScope.clickHandler != null)
                $rootScope.clickHandler(el);

            if (menuState == 1) {
                $rootScope.toggleMenuOff();

                if (($rootScope.menuClickHandler != null) && el.classList.contains(contextMenuLinkClassName) && el.classList.contains('active'))
                    $rootScope.menuClickHandler(menuName, el.id, taskItemInContext);
            }
        }

        function toggleMenuOn(e) {
            if (menuState !== 1) {
                menuState = 1;

                var menus = document.getElementsByClassName("context-menu");
                for (var i = 0; i < menus.length; ++i) {
                    menu = menus[i];
                    if (menu.classList.contains(menuName)) {
                        menu.classList.add(contextMenuActive);
                        positionMenu(e);
                        break;
                    }
                }
            }
        }

        $rootScope.toggleMenuOff = function() {
            if (menuState !== 0) {
                menuState = 0;
                if (menu !== undefined) {
                    menu.classList.remove(contextMenuActive);
                }                
            }
        }

        function positionMenu(e) {
            var clickCoords = getPosition(e);
            var clickCoordsX = clickCoords.x;
            var clickCoordsY = clickCoords.y;

            var menuWidth = menu.offsetWidth + 4;
            var menuHeight = menu.offsetHeight + 4;

            var windowWidth = menu.parentNode.clientWidth;
            var windowHeight = menu.parentNode.clientHeight;

            if ((windowWidth - clickCoordsX) < menuWidth)
                menu.style.left = windowWidth - menuWidth + "px";
            else
                menu.style.left = clickCoordsX + "px";

            if ((windowHeight - clickCoordsY + 60) < menuHeight)
                menu.style.top = windowHeight - menuHeight + "px";
            else
                menu.style.top = clickCoordsY - 60 + "px";
        }

        function getPosition(e) {
            var posx = 0;
            var posy = 0;

            if (!e) var e = window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            return {
                x: posx,
                y: posy
            }
        }

        function initListeners() {
            window.onkeyup = function (e) {
                if (e.keyCode == 27)
                    $rootScope.toggleMenuOff();
                if ($rootScope.keyHandler != null)
                    $rootScope.keyHandler(e);
            }

            window.onresize = function (e) {
                $rootScope.resize();
            };

            var el = document.getElementById('mainBody');
            if (el != null) {
                el.onscroll = function (e) {
                    $rootScope.resize();
                };
            }

            el = document.getElementById('content');
            if (el != null) {
                el.onscroll = function (e) {
                    $rootScope.resize();
                }
            };
        }

        var sizeTimer = null;
        $rootScope.resize = function (delay) {
            delay = delay || 0;
            if (sizeTimer != null)
                $timeout.cancel(sizeTimer);

            sizeTimer = $timeout(function () {
                var content = document.getElementById('content');
                if (content) {
                    content.style.overflowX = 'hidden';
                }  
                var items = document.getElementsByClassName('scrollTable');
                if (items.length > 0) {
                    for (var i = 0; i < items.length; ++i) {
                        var tbl = items[i];
                        var rect = tbl.getBoundingClientRect();
                        var head = tbl.children[0].children[0];
                        var body = tbl.children[1];
                        var ht = rect.height - ((tbl.scrollWidth > tbl.clientWidth) ? 17 : 0);
                        var wd = Math.min(document.body.clientWidth - ((body.scrollHeight > ht) ? 17 : 0), rect.width);

                        if (document.body.clientWidth < (wd + rect.left)) {
                            wd += document.body.clientWidth - (wd + rect.left) - 10 - ((content.scrollHeight > content.clientHeight) ? 17 : 0);
                            tbl.style.width = wd + 'px';
                            rect = tbl.getBoundingClientRect();
                            ht = rect.height - ((tbl.scrollWidth > tbl.clientWidth) ? 17 : 0);
                        }
                        else {
                            tbl.style.width = wd + 'px';
                            if (tbl.style.maxWidth == '') {
                                wd = document.body.clientWidth - rect.left - 6 - ((content.scrollHeight > content.clientHeight) ? 17 : 0);
                                tbl.style.width = wd + 'px';
                                rect = tbl.getBoundingClientRect();
                                ht = rect.height - ((tbl.scrollWidth > tbl.clientWidth) ? 17 : 0);
                            }
                        }

                        body.style.minHeight = body.style.maxHeight = ht - (head.clientHeight + 4) + 'px';

                        var itemHeight = tbl.rows[0].clientHeight;
                        var minHeight = 4 * itemHeight;
                        itemHeight = itemHeight * tbl.rows.length;

                        if (ht < minHeight)
                            ht = minHeight;

                        var padCol = document.getElementById('padCol' + tbl.id);
                        if (padCol != null) {
                            if (itemHeight > ht)
                                padCol.style.display = '';
                            else
                                padCol.style.display = 'none';
                        }

                        var grips = document.getElementById(tbl.id + 'Grips');
                        if (grips != null) {
                            //grips.style.backgroundColor = 'goldenrod';
                            //grips.style.opacity = 0.25;
                            grips.style.left = rect.left + 'px';
                            grips.style.top = rect.top + 'px';
                            grips.style.width = wd - ((body.scrollHeight > ht) ? 17 : 0) + 'px';
                            grips.style.height = ht + "px";
                            $rootScope.recalcDivs(tbl, grips);
                        }
                    }

                }              

                sizeTimer = null;
            }, delay);
        }

        var webApiBaseUrl = settings.webApiBaseUrl;

        // Account APIs
        $rootScope.login = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/accounts?' + queryString, null, completed, failed);
        }

        $rootScope.loginAD = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/accounts/loginad?' + queryString, null, completed, failed);
        }

        $rootScope.resetPassword = function (user, completed, failed) {
            apiService.post('/api/users/resetpassword/', user, completed, failed);
        }

        $rootScope.changePassword = function (id, password, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/accounts/changepassword/' + id, { Password: password }, completed, failed);
        }

        $rootScope.registerUser = function (user, completed, failed) {
            apiService.post('/api/accounts/register', user, completed, failed);
        }

        // Item Master APIs
        $rootScope.getItemMasterFilters = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/itemmasters/filters', null, completed, failed);
        }

        $rootScope.getItemMasterDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/itemmasters/displayedfields', null, completed, failed);
        }

        $rootScope.getItemMasters = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/itemmasters?' + queryString, null, completed, failed);
        }

        $rootScope.getUnitsOfMeasure = function (itemMasterId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/itemmasters/' + itemMasterId + '/unitsofmeasure', null, completed, failed);
        }

        // Unit of Measure APIs
        $rootScope.getUnitOfMeasureDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/unitsofmeasure/displayedfields', null, completed, failed);
        }

        $rootScope.getAllUnitsOfMeasure = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/unitsofmeasure?' + queryString, null, completed, failed);
        }

        $rootScope.getUnitOfMeasureTypes = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/unitsofmeasure/types?' + queryString, null, completed, failed);
        }

        $rootScope.addUnitOfMeaseure = function (queryString, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/unitsofmeasure?' + queryString, null, completed, failed);
        }

        $rootScope.editUnitOfMeasure = function (queryString, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/unitsofmeasure?' + queryString, null, completed, failed);
        }

        // Pick Group APIs
        $rootScope.getPickGroupDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/displayedfields', null, completed, failed);
        }

        $rootScope.getPickgroupFilters = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/agg/statuses', null, completed, failed);
        }

        $rootScope.getPickgroupAges = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/agg/ages', null, completed, failed);
        }

        $rootScope.getPickgroups = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups?' + queryString, null, completed, failed);
        }

        $rootScope.getPickgroup = function (groupId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/' + groupId, null, completed, failed);
        }

        $rootScope.getPickgroupOrders = function (groupId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/' + groupId + '/orders', null, completed, failed);
        }

        $rootScope.pickgroupSearch = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/search?' + queryString, null, completed, failed);
        }

        $rootScope.getPickgroupContainers = function (orderHeaderId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/orders/' + orderHeaderId + '/containers', null, completed, failed);
        }

        $rootScope.getPickgroupSkus = function (groupId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/' + groupId + '/skus', null, completed, failed);
        }

        $rootScope.getPickgroupComment = function (id, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/' + id + '/comment', null, completed, failed);
        }

        $rootScope.getPickGroupInstructions = function (id, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/' + id + '/instructions', null, completed, failed);
        }

        $rootScope.addPickGroupComment = function (id, comment, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/pickgroups/' + id + '/comment', angular.toJson(comment), completed, failed);
        }

        $rootScope.addPickGroupInstructions = function (id, comment, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/pickgroups/' + id + '/instructions', angular.toJson(comment), completed, failed);
        }

        $rootScope.releasePickGroups = function (querystring, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/pickgroups/releasegroups?' + querystring, null, completed, failed);
        }

        // Container APIs
        $rootScope.getContainerSkus = function (containerId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/containers/' + containerId + '/skus', null, completed, failed);
        }

        // Order APIs
        $rootScope.getOrderStatuses = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/agg/statuses', null, completed, failed);
        }

        $rootScope.getOrderAges = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/agg/ages', null, completed, failed);
        }

        $rootScope.getOrderDisplayedFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/displayedfields', null, completed, failed);
        }

        $rootScope.getGroupOrderDisplayedFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/grouporderdisplayedfields', null, completed, failed);
        }

        $rootScope.getGroupReleaseDisplayedFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/groupreleasedisplayedfields', null, completed, failed);
        }

        $rootScope.getOrders = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders?' + queryString, null, completed, failed);
        }

        $rootScope.getUngroupedOrders = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/ungrouped?' + queryString, null, completed, failed);
        }

        $rootScope.getGroupedOrders = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/grouped', null, completed, failed);
        }

        $rootScope.applyRule = function (rule, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/applyRule?rule=' + rule, null, completed, failed);
        }

        $rootScope.getOrder = function (orderHeaderID, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/' + orderHeaderID, null, completed, failed);
        }

        $rootScope.getOrderContainers = function (orderHeaderID, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/' + orderHeaderID + '/containers', null, completed, failed);
        }

        $rootScope.getOrderDetails = function (orderHeaderID, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/' + orderHeaderID + '/details', null, completed, failed);
        }

        $rootScope.getOrderSkus = function (orderHeaderId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/orders/' + orderHeaderId + '/skus', null, completed, failed);
        }

        $rootScope.groupOrders = function (queryString, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/orders/grouporders?' + queryString, null, completed, failed);
        }

        // Rule APIs
        $rootScope.getRuleDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/rules/displayedfields', null, completed, failed);
        }

        $rootScope.getOrderRules = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/rules', null, completed, failed);
        }

        $rootScope.addOrderRule = function (rule, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/rules', rule, completed, failed);
        }

        $rootScope.editOrderRule = function (rule, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/rules', rule, completed, failed);
        }

        $rootScope.getOrderRuleCriteria = function (id, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/rules/rulecriteria/' + id, null, completed, failed);
        }

        $rootScope.editOrderRuleCriteria = function (rule, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/rules/rulecriteria', rule, completed, failed);
        }

        // Replenishment Stations APIs
        $rootScope.getReplenishmentDisplayedFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishmentdisplayedfields', null, completed, failed);
        }

        $rootScope.getStations = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations?' + queryString, null, completed, failed);
        }

        $rootScope.getReplenishmentStations = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishment?' + queryString, null, completed, failed);
        }

        $rootScope.getReplenishmentStation = function (locationId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishment/' + locationId, null, completed, failed);
        }

        $rootScope.getReplenishmentStationProcessingLpns = function (locationId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishment/' + locationId + '/processinglpns', null, completed, failed);
        }

        $rootScope.getReplenishmentStationPendingLpns = function (locationId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishment/' + locationId + '/pendinglpns', null, completed, failed);
        }

        $rootScope.getReplenishmentInductLocations = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishmentinductlocations?' + queryString, null, completed, failed);
        }

        $rootScope.getReplenishmentWorkstations = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishmentworkstations?' + queryString, null, completed, failed);
        }

        $rootScope.getReplenishmentPeningUnits = function (locationIDs, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishmentpendingunits?locationIDs=' + locationIDs, null, completed, failed);
        }

        $rootScope.getReplenishmentStagedPallets = function (locationIDs, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/replenishmentstagedpallets?locationIDs=' + locationIDs, null, completed, failed);
        }

        // User APIs
        $rootScope.getUserDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/displayedfields', null, completed, failed);
        }

        $rootScope.getUsers = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users?' + queryString, null, completed, failed);
        }

        $rootScope.addUser = function (user, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/users', user, completed, failed);
        }

        $rootScope.editUser = function (user, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/users', user, completed, failed);
        }

        $rootScope.getGroupDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/groups/displayedfields', null, completed, failed);
        }

        $rootScope.getUserGroups = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/groups', null, completed, failed);
        }

        $rootScope.addUserGroup = function (group, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/users/groups', group, completed, failed);
        }

        $rootScope.editUserGroup = function (group, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/users/groups', group, completed, failed);
        }

        $rootScope.getPermissionDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/permissions/displayedfields', null, completed, failed);
        }

        $rootScope.getUserGroupPermissions = function (groupId, queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/groups/permissions/' + groupId + '?' + queryString, null, completed, failed);
        }

        $rootScope.addUserGroupPermissions = function (groupId, selectedPermissions, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/users/groups/permissions/' + groupId, selectedPermissions, completed, failed);
        }

        $rootScope.getUserGroupUsers = function (groupId, queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/groups/users/' + groupId + '?' + queryString, null, completed, failed);
        }

        $rootScope.addUserGroupUsers = function (groupId, selectedUsers, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/users/groups/users/' + groupId, selectedUsers, completed, failed);
        }

        $rootScope.getUserPermissions = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/users/permissions?' + queryString, null, completed, failed);
        }

        $rootScope.addUserPermission = function (permission, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/users/permissions', permission, completed, failed);
        }

        $rootScope.editUserPermission = function (permission, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/users/permissions', permission, completed, failed);
        }

        // Stations APIs
        $rootScope.getStationsFilters = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/filters', null, completed, failed);
        }

        $rootScope.getStationsDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/displayedfields', null, completed, failed);
        }

        $rootScope.getStations = function (queryString, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations?' + queryString, null, completed, failed);
        }

        $rootScope.putStationsLink = function (id, linkcode, completed, failed) {
            apiService.put(webApiBaseUrl + '/api/stations/' + id + '/link?linkcode=' + linkcode, null, completed, failed);
        }

        $rootScope.postStationRequestLink = function (deviceidentifier, completed, failed) {
            apiService.post(webApiBaseUrl + '/api/stations/link?devicedescription=' + deviceidentifier, null, completed, failed);
        }

        $rootScope.getStationsBySoftLink = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/softlinks', null, completed, failed);
        }

        $rootScope.getStationByDevice = function (deviceidentifier, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/stations/device?deviceidentifier=' + deviceidentifier, null, completed, failed);
        }

        // Inventory APIs
        $rootScope.getWhereIsDisplayFields = function (completed, failed) {
            apiService.get(webApiBaseUrl + '/api/inventory/displayedfields', null, completed, failed);
        }

        $rootScope.getInventoryLocations = function (item, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/inventory/inventorylocations?item=' + item, null, completed, failed);
        }

        $rootScope.getInventoryLocationDetails = function (item, locationId, completed, failed) {
            apiService.get(webApiBaseUrl + '/api/inventory/inventorylocation/' + locationId + '/details?item=' + item, null, completed, failed);
        }

        init();
    }
})(angular.module('fastTrakWebUI'));