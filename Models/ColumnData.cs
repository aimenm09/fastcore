using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace FastTrakWebUI.Models
{
    public class ColumnData
    {
        public Dictionary<string, object> Value { get; set; }
        public Dictionary<string, string> Style { get; set; }
        public Dictionary<string, int> Colspan { get; set; }

        public ColumnData()
        {
            Value = new Dictionary<string, object>();
            Style = new Dictionary<string, string>();
            Colspan = new Dictionary<string, int>();
        }
    }
}