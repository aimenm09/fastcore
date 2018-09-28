using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace FastTrakWebUI.Models
{
    public class ConfigSettings
    {
        public string LocalBaseUrl { get; set; }
        public string WebApiBaseUrl { get; set; }
        public string WebApiVersion { get; set; }
        public bool UseAD { get; set; }
    }
}