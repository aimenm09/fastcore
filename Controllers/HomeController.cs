using System;
using System.Collections.Generic;
using System.Configuration;
using System.Dynamic;
using System.Net.Http;
using System.Web.Mvc;
using System.Linq;
using FastTrakWebUI.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace FastTrakWebUI.Controllers
{
    public class HomeController : Controller
    {
        [ADAuthorize]
        public ActionResult Index()
        {
            return View();
        }

        #region Settings
        public ActionResult Settings(string angularModuleName = "fastTrakWebUI")
        {
            var settings = new ConfigSettings
            {
                LocalBaseUrl = GetAppSetting<string>("LocalBaseUrl"),
                WebApiBaseUrl = GetAppSetting<string>("WebApiBaseUrl"),
                WebApiVersion = GetAppSetting<string>("WebApiVersion"),
                UseAD = GetAppSetting<bool>("UseAD")
            };

            var serializerSettings = new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            };

            var settingsJson = JsonConvert.SerializeObject(settings, Formatting.Indented, serializerSettings);

            var settingsVm = new SettingsViewModel
            {
                SettingsJson = settingsJson,
                AngularModuleName = angularModuleName
            };

            Response.ContentType = "text/javascript";
            return View(settingsVm);
        }

        protected static T GetAppSetting<T>(string key)
        {
            return (T)Convert.ChangeType(ConfigurationManager.AppSettings[key], typeof(T));
        }
        #endregion
    }
}