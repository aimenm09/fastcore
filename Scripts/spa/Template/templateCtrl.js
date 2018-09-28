(function (app) {
    'use strict';

    app.controller('unitOfMeasuresCtrl', unitOfMeasuresCtrl);

    unitOfMeasuresCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$modal', 'settings', 'apiService', 'notificationService'];

  
    function unitOfMeasuresCtrl($scope, $rootScope, $timeout, $modal, settings, apiService, notificationService) {
        $scope.pageClass = 'page-uoms';
        $scope.loadingUnitOfMeasures = false;
        $scope.unitOfMeasures = [];

        $scope.apiServer = {};

        $scope.page = 0;
        $scope.pagesCount = 0;
        $scope.totalCount = 0;

        $scope.loadXXXX = loadXXXX;
        $scope.sizePanels = sizePanels;

        var pageSize = 100;
        var webApiBaseUrl = settings.webApiBaseUrl;

        $scope.orderByField = 'Column1';
        $scope.reverseSort = true;

        $scope.sort = function (table, column) {
            switch (table) {
                case 'xxxx':
                    if ($scope.orderByField == column) {
                        $scope.reverseSort = !$scope.reverseSort;
                    }
                    else {
                        $scope.orderByField = column;
                    }

                    $scope.loadXXXX(0);
                    break;

            }
        };

        $scope.getSortClass = function (table, column) {
            switch (table) {
                case 'xxxx':
                    if ($scope.orderByField == column)
                        return $scope.reverseSort ? 'fa fa-sort-asc' : 'fa fa-sort-desc'
                    break;
            }

            return '';
        };


        var loadingData;

        var stop;
        function showSpinner(spinner) {
            stop = $timeout(function() {
                $timeout.cancel(stop);

                if (spinner == "XXXX")
                    $scope.loadingXXXX = true;

            }, 1000);
        }


        function sizePanels() {
            $timeout(function() {
                var retryCount = 3;
                do {
                    $rootScope.pageSizePanels(35);
                } while (retryCount-- > 0);
            }, 10);
        };

       function loadXXXs(page) {

            $scope.page = page || 0;

            showSpinner("XXXX");
            apiService.get(webApiBaseUrl + '/api/xxxx', null,
                xxxxLoadCompleted,
                xxxxLoadFailed);
        }

        function xxxxLoadCompleted(result) {
            $timeout.cancel(stop);
            $scope.XXXX = result.data.XXXX;
            $scope.loadingXXXX = false;
            
            var pageCount = Math.trunc(result.data.TotalCount / pageSize);
            var extraPageNeeded = (result.data.TotalCount % pageSize) > 0;
            $scope.pagesCount = pageCount + (extraPageNeeded ? 1 : 0);
            $scope.totalCount = result.data.TotalCount;
        }

        function xxxxLoadFailed(response) {
            $timeout.cancel(stop);
            $scope.loadingXXXX = false;
            notificationService.displayError(response);
        }
      
        $scope.menuSelection = function (menu, item) {
            toggleMenuOff();
            var id = taskItemInContext.children[0].innerText.trim();

            switch (menuName) {
                case "XXXX":
                    switch (item) {
                        case "item1":
                            $scope.getDetails(id);
                            break;

                        case "item2":
                            break;
                        
                        case "item3":
                            break;

                        case "item4":
                            break;

                        case "item5":
                            break;

                    }
                    break;

                case "yyyy":
                    switch (item) {
                        case "item1":
                            $scope.getDetails(id);
                            break;

                        case "item2":
                            break;

                        case "item3":
                            break;

                        case "item4":
                            break;

                        case "item5":
                            break;
                    }
                    break;
  
            }
        };

        var menuName;

        function clickInsideElement(e) {
            for (var i = 0; i < taskItemClassNames.length; ++i) {
                var className = taskItemClassNames[i];

                var el = e.srcElement || e.target;
                var elOrig = el;
                if (el.classList && el.classList.contains(className)) {
                    menuName = className;
                    return el;
                } else {
                    while (el = el.parentNode) {
                        if (el.classList && el.classList.contains(className)) {
                            menuName = className;

                            if (className == "xxxx") {
                                if ((el.nodeName != "NAV") && ((el.children[1].children == null) || (el.children[1].children.length > 0)))
                                    return elOrig.parentNode;
                                else
                                    return el;
                            }

                            return el;
                        }
                    }
                }
            }

            return null;
        }

        function getPosition(e) {
            var posx = 0;
            var posy = 0;

            if (!e) var e = window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            } else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            return {
                x: posx,
                y: posy
            }
        }

        var contextMenuClassName = "context-menu";
        var contextMenuItemClassName = "context-menu__item";
        var contextMenuLinkClassName = "context-menu__link";
        var contextMenuActive = "context-menu--active";

        var taskItemClassNames = ["xxxx", "yyyy",];
        var taskItemInContext;

        var clickCoords;
        var clickCoordsX;
        var clickCoordsY;

        var menu = document.querySelector("#context-menu");
        var menuItems = menu.querySelectorAll(".context-menu__item");
        var menuState = 0;
        var menuWidth;
        var menuHeight;
        var menuPosition;
        var menuPositionX;
        var menuPositionY;

        var windowWidth;
        var windowHeight;

        function init() {
            $rootScope.registerEventHandler("contextmenu", contextListener);
            $rootScope.registerEventHandler("click", clickListener);
            keyupListener();
            keydownListener();
            resizeListener();
        }

        function contextListener(e) {
            taskItemInContext = clickInsideElement(e);

            if (taskItemInContext != null) {
                var item = taskItemInContext.children[0].innerText.trim();

                   
                e.preventDefault();
                toggleMenuOff();
                toggleMenuOn();
                positionMenu(e);
            }
            else
                toggleMenuOff();
        }

        var focusPanel;
        function clickListener(e) {
            var clickElIsLink = clickInsideElement(e);

            if ((clickElIsLink != null) && clickElIsLink.classList.contains(contextMenuLinkClassName)) {
                e.preventDefault();
                menuItemListener(clickElIsLink);
            }
            else {
                var button = e.which || e.button;
                if (button === 1)
                    toggleMenuOff();
    
                focusPanel = null;
            }
        }

        function keyupListener() {
            window.onkeyup = function (e) {
                if (e.keyCode === 27) {
                    toggleMenuOff();
                }
            }
        }

        function keydownListener() {
            window.onkeydown = function (e) {
                if ((e.keyCode == 38) || (e.keyCode == 40)) {
                    if (loadingData)
                        return false;

                    var items = document.getElementsByClassName(focusPanel);
                    var item;
                   
                    for (var i = 0; i < items.length; ++i) {
                        var curContainer = items[i].children[0].innerText.trim();
                        if (curContainer == item) {
                            var index = -1;
                            if ((e.keyCode == 38) && (i > 0))
                                index = i - 1;
                            else if ((e.keyCode == 40) && (i < items.length - 1))
                                index = i + 1;

                            if (index > -1) {

                                items[index].scrollIntoView(false);
                                return false;
                            }
                        }
                    }
                }
            }
        }

      
        function resizeListener() {
            window.onresize = function (e) {
                toggleMenuOff();
            };
        }

        function toggleMenuOn() {
            if (menuState !== 1) {
                menuState = 1;

                var menus = document.getElementsByClassName("context-menu");
                for (var i = 0; i < menus.length; ++i) {
                    menu = menus[i];
                    if (menu.classList.contains(menuName)) {
                        menu.classList.add(contextMenuActive);
                        break;
                    }
                }
            }
        }

        function toggleMenuOff() {
            if (menuState !== 0) {
                menuState = 0;
                menu.classList.remove(contextMenuActive);
            }
        }

        function positionMenu(e) {
            clickCoords = getPosition(e);
            clickCoordsX = clickCoords.x;
            clickCoordsY = clickCoords.y;

            menuWidth = menu.offsetWidth + 4;
            menuHeight = menu.offsetHeight + 4;

            windowWidth = window.innerWidth;
            windowHeight = window.innerHeight;

            if ((windowWidth - clickCoordsX) < menuWidth) {
                menu.style.left = windowWidth - menuWidth + "px";
            } else {
                menu.style.left = clickCoordsX + "px";
            }

            if ((windowHeight - clickCoordsY) < menuHeight) {
                menu.style.top = windowHeight - menuHeight + "px";
            } else {
                menu.style.top = clickCoordsY - 60 + "px";
            }
        }

        function menuItemListener(link) {
            toggleMenuOff();
        }

        $scope.loadFilters();
    }
})(angular.module('fastTrakWebUI'));