var lf = Components.classes["@mozilla.org/file/directory_service;1"]
                   .getService(Components.interfaces.nsIProperties)
                   .get("ComsD", Components.interfaces.nsILocalFile);

var xulr = Components.classes["@mozilla.org/xre/app-info;1"]
                     .getService(Components.interfaces.nsIXULRuntime);

dump(lf.target + "\n");
dump(xulr.OS + "\n");
dump(xulr.XPCOMABI + "\n");
