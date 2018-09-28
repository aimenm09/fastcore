using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace FastTrakWebUI.Models
{
    public class Globals
    {
        public const string ObjectIdClaimType = "http://schemas.microsoft.com/identity/claims/objectidentifier";
        public const string TenantIdClaimType = "http://schemas.microsoft.com/identity/claims/tenantid";
        public const string SurnameClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname";
        public const string GivenNameClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
    }
}