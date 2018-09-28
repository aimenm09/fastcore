using Owin;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Cookies;
using Microsoft.Owin.Security.OpenIdConnect;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using System.Configuration;
using System.Threading.Tasks;
using System;
using System.Web;
using FastTrakWebUI.Models;
using Newtonsoft.Json;

namespace FastTrakWebUI
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            if (ConfigurationManager.AppSettings["UseAD"] == "true")
            {
                ConfigureAuth(app);
            }
        }

        public void ConfigureAuth(IAppBuilder app)
        {
            app.SetDefaultSignInAsAuthenticationType(CookieAuthenticationDefaults.AuthenticationType);
            app.UseCookieAuthentication(new CookieAuthenticationOptions());

            app.UseOpenIdConnectAuthentication(
                new OpenIdConnectAuthenticationOptions
                {
                    ClientId = ConfigHelper.ClientId,
                    Authority = ConfigHelper.Authority,
                    PostLogoutRedirectUri = ConfigHelper.PostLogoutRedirectUri,
                    Notifications = new OpenIdConnectAuthenticationNotifications
                    {
                        AuthorizationCodeReceived = async context =>
                        {
                            ClientCredential credential = new ClientCredential(ConfigHelper.ClientId, ConfigHelper.ClientSecret);
                            string userObjectId = context.AuthenticationTicket.Identity.FindFirst(Globals.ObjectIdClaimType).Value;
                            AuthenticationContext authContext = new AuthenticationContext(ConfigHelper.Authority, new SessionCache(userObjectId));
                            AuthenticationResult result = await authContext.AcquireTokenByAuthorizationCodeAsync(
                                context.Code, new Uri(HttpContext.Current.Request.Url.GetLeftPart(UriPartial.Path)), credential, ConfigHelper.GraphResourceId);

                            context.Response.Cookies.Append("UserInfo", JsonConvert.SerializeObject(result.UserInfo));
                        },
                        AuthenticationFailed = context =>
                        {
                            context.HandleResponse();
                            context.Response.Redirect("/Error?message=" + context.Exception.Message);
                            return Task.FromResult(0);
                        }
                    }
                });
        }
    }
}