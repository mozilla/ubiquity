var xulr = Components.classes["@mozilla.org/xre/app-info;1"]
                     .getService(Components.interfaces.nsIXULRuntime);

dump(xulr.OS + "\n");
dump(xulr.XPCOMABI + "\n");
