using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace FastTrakWebUI.Models
{
    public class ADAuthorizeAttribute : AuthorizeAttribute
    {
        public override void OnAuthorization(AuthorizationContext filterContext)
        {
            if (ConfigurationManager.AppSettings["UseAD"] == "true")
            {
                base.OnAuthorization(filterContext);
            }
        }
    }
}