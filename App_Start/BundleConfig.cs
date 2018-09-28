using System.Web;
using System.Web.Optimization;

namespace FastTrakWebUI
{
    public class BundleConfig
    {
        // For more information on bundling, visit https://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at https://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/vendors").Include(
                "~/Scripts/Vendors/jquery.js",
                "~/Scripts/Vendors/bootstrap.js",
                "~/Scripts/Vendors/toastr.js",
                "~/Scripts/Vendors/jquery.raty.js",
                "~/Scripts/Vendors/respond.src.js",
                "~/Scripts/Vendors/angular.js",
                "~/Scripts/Vendors/angular-route.js",
                "~/Scripts/Vendors/angular-cookies.js",
                "~/Scripts/Vendors/angular-validator.js",
                "~/Scripts/Vendors/angular-base64.js",
                "~/Scripts/Vendors/angular-file-upload.js",
                "~/Scripts/Vendors/angular-ui-router.js",
                "~/Scripts/Vendors/angucomplete-alt.min.js",
                "~/Scripts/Vendors/ui-bootstrap-tpls-0.13.1.js",
                "~/Scripts/Vendors/underscore.js",
                "~/Scripts/Vendors/raphael.js",
                "~/Scripts/Vendors/morris.js",
                "~/Scripts/Vendors/jquery.fancybox.js",
                "~/Scripts/Vendors/jquery.fancybox-media.js",
                "~/Scripts/Vendors/loading-bar.js",
                "~/Scripts/Vendors/powerbi.js",
                "~/Scripts/Vendors/es6-promise.js",
                "~/Scripts/Vendors/es6-promise-auto.js",
                "~/Scripts/Vendors/bowser.js",
                "~/Scripts/Vendors/bowser.min.js"
                ));

            bundles.Add(new ScriptBundle("~/bundles/spa").Include(
                "~/Scripts/jquery.signalR-2.2.2.min.js",
                "~/signalr/hubs",
                "~/Scripts/spa/app.js",
                "~/Scripts/spa/modules/common.core.js",
                "~/Scripts/spa/modules/common.ui.js",
                "~/Scripts/spa/services/apiService.js",
                "~/Scripts/spa/services/notificationService.js",
                "~/Scripts/spa/services/membershipService.js",
                "~/Scripts/spa/services/fileUploadService.js",
                "~/Scripts/spa/layout/topBar.directive.js",
                "~/Scripts/spa/layout/sideBar.directive.js",
                "~/Scripts/spa/layout/customPager.directive.js",
                "~/Scripts/spa/account/loginCtrl.js",
                "~/Scripts/spa/account/registerCtrl.js",
                "~/Scripts/spa/account/passwordChangeCtrl.js",
                "~/Scripts/spa/confirmation/confirmCtrl.js",
                "~/Scripts/spa/confirmation/notificationCtrl.js",
                "~/Scripts/spa/home/rootCtrl.js",
                "~/Scripts/spa/home/indexCtrl.js",
                "~/Scripts/spa/main/tabMainCtrl.js",
                "~/Scripts/spa/inventory/check/checkTransactionCtrl.js",
                "~/Scripts/spa/inventory/whereIs/whereIsTransactionCtrl.js",
                "~/Scripts/spa/monitors/groups/groupMonitorCtrl.js",
                "~/Scripts/spa/monitors/groups/groupCommentCtrl.js",
                "~/Scripts/spa/monitors/groups/searchDialogCtrl.js",
                "~/Scripts/spa/monitors/groups/groupOrdersCtrl.js",
                "~/Scripts/spa/monitors/groups/groupReleaseCtrl.js",
                "~/Scripts/spa/monitors/groups/shortItemsCtrl.js",
                "~/Scripts/spa/monitors/groups/shortGroupItemsCtrl.js",
                "~/Scripts/spa/monitors/groups/releaseProgressCtrl.js",
                "~/Scripts/spa/monitors/orders/orderMonitorCtrl.js",
                "~/Scripts/spa/transactions/replenishment/replenishmentTransCtrl.js",
                "~/Scripts/spa/monitors/replenishment/replenishmentMonitorCtrl.js",
                "~/Scripts/spa/itemmaster/itemMasterCtrl.js",
                "~/Scripts/spa/itemmaster/imSearchDialogCtrl.js",
                "~/Scripts/spa/itemmaster/unitsOfMeasureCtrl.js",
                "~/Scripts/spa/routing/routeManagerCtrl.js",
                "~/Scripts/spa/unitofmeasure/unitOfMeasuresCtrl.js",
                "~/Scripts/spa/locations/locationsCtrl.js",
                "~/Scripts/spa/locations/locationMonitorCtrl.js",
                "~/Scripts/spa/stations/stationsCtrl.js",
                "~/Scripts/spa/stations/stationLinkCtrl.js",
                "~/Scripts/spa/stations/stationSwitchPromptCtrl.js",
                "~/Scripts/spa/stations/stationHardlinkRequestCtrl.js",
                "~/Scripts/spa/users/usersCtrl.js",
                "~/Scripts/spa/users/permissionsCtrl.js",
                "~/Scripts/spa/users/permissionGroupsCtrl.js",
                "~/Scripts/spa/users/addGroupUsersCtrl.js",
                "~/Scripts/spa/users/addGroupPermissionsCtrl.js",
                "~/Scripts/spa/invatabi/dashboardsCtrl.js",
                "~/Scripts/spa/invatabi/dashboards/configureCtrl.js",
                "~/Scripts/spa/invatabi/dashboards/activatePagesCtrl.js",
                "~/Scripts/spa/transactions/infoPageTemplateCtrl.js"
                ));

            bundles.Add(new StyleBundle("~/Content/css_styles").Include(
                "~/content/css/site.css",
                "~/content/css/bootstrap.css",
                "~/content/css/font-awesome.css",
                "~/content/css/morris.css",
                "~/content/css/toastr.css",
                "~/content/css/jquery.fancybox.css",
                "~/content/css/loading-bar.css",
                "~/content/css/custom.css"));
        }
    }
}
