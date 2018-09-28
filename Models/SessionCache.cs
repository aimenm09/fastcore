using Microsoft.IdentityModel.Clients.ActiveDirectory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace FastTrakWebUI.Models
{
    public class SessionCache : TokenCache
    {
        #region Members
        private static readonly object FileLock = new object();
        private readonly string CacheId = string.Empty;
        private string UserObjectId = string.Empty;
        private readonly HttpContext _httpContext;
        #endregion

        #region Constructors
        public SessionCache(string userId)
        {
            _httpContext = HttpContext.Current;
            UserObjectId = userId;
            CacheId = UserObjectId + "_TokenCache";

            AfterAccess = AfterAccessNotification;
            BeforeAccess = BeforeAccessNotification;
            Load();
        }
        #endregion

        #region Public methods
        public void Load()
        {
            lock (FileLock)
            {
                if (_httpContext != null)
                {
                    Deserialize((byte[])_httpContext.Session[CacheId]);
                }
            }
        }

        public void Persist()
        {
            lock (FileLock)
            {
                if (_httpContext != null)
                {
                    // reflect changes in the persistent store
                    _httpContext.Session[CacheId] = Serialize();
                    // once the write operation took place, restore the HasStateChanged bit to false
                    HasStateChanged = false;
                }
            }
        }

        // Empties the persistent store.
        public override void Clear()
        {
            base.Clear();
            if (_httpContext != null)
            {
                _httpContext.Session.Remove(CacheId);
            }
        }

        public override void DeleteItem(TokenCacheItem item)
        {
            base.DeleteItem(item);
            Persist();
        }
        #endregion

        #region Private methods
        // Triggered right before ADAL needs to access the cache.
        // Reload the cache from the persistent store in case it changed since the last access.
        private void BeforeAccessNotification(TokenCacheNotificationArgs args)
        {
            Load();
        }

        // Triggered right after ADAL accessed the cache.
        private void AfterAccessNotification(TokenCacheNotificationArgs args)
        {
            // if the access operation resulted in a cache update
            if (HasStateChanged)
            {
                Persist();
            }
        }
        #endregion
    }
}