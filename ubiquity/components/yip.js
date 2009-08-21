Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Ci = Components.interfaces;
const Cc = Components.classes;


//////////////////////////////////////////////////////////////////////////////
////////////////////////////////// EXTERNAL //////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// UTF8 functions used here under GNU GPL. Copyright (c) 2009 Ruben Verweij
var utf8 = {
 
	// public method for encoding
	encode : function (string) {
		if(typeof(string)!="undefined"&&string!=null){
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
		}
		
	},
 
	// public method for decoding
	decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}

//Based on the growlgntp Firefox extension and code by Swaroop Hegde

var growlgntp = {
  APPNAME : "Yip/Firefox",

  send : function(data){
    var transportService = Cc["@mozilla.org/network/socket-transport-service;1"]
                           .getService(Ci.nsISocketTransportService);

    var socket = transportService.createTransport(null, 0, "localhost", 23053, null);
    socket.setTimeout(socket.TIMEOUT_READ_WRITE, 2);
    
    var stream = socket.openOutputStream(0, 0, 0);
    stream.write(data, data.length);
    stream.close();
  },

  init : function(appName, appIcon) {
    this.APPNAME = appName;
    this.register(appIcon);
  },

  register : function(appIcon){
    var data = "GNTP/1.0 REGISTER NONE\r\n" +
             "Application-Name: " + this.APPNAME + "\r\n" +
             "Application-Icon: " + appIcon + "\r\n" +
             "Notifications-Count: 1\r\n" +
             "\r\n" +
             "Notification-Name: normal\r\n" +
             "Notification-Display-Name: normal\r\n" +
             "Notification-Enabled: True\r\n" +
             "\r\n";
    this.send(data);
  },

  doNotification : function(title, text, icon){
    var data = "GNTP/1.0 NOTIFY NONE\r\n" +
             "Application-Name: " + this.APPNAME + "\r\n" +
             "Notification-Name: normal\r\n" +
             "Notification-Icon: " + icon + "\r\n" +
             "Notification-Title: " + title + "\r\n" +
             "Notification-Text: " + text + "\r\n" +
             "\r\n";
    this.send(data);
  }
};


//////////////////////////////////////////////////////////////////////////////
////////////////////////////////// YIP ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function Yip() {
  this.wrappedJSObject = this;
}

Yip.prototype = {
  classDescription: "Yip Notifications Javascript XPCOM Component",
  classID:          Components.ID("{184FF392-644C-4153-8C21-EF5A207719D1}"),
  contractID:       "@abi.sh/yip;1",
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIYip, Ci.nsIClassInfo]),
  implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,
  flags: Ci.nsIClassInfo.DOM_OBJECT,
  getInterfaces: function(countRef) {
     var interfaces = [Ci.nsIYip, Ci.nsIClassInfo, Ci.nsISupports];
     countRef.value = interfaces.length;
     return interfaces;
  },
  getHelperForLanguage:  function(count) {return null;},
  // This is where we add support for various notification systems 
  // such as libnotify, Snarl and Growl for Windows
  displayNotification : function(aNotifyObject, appName, appIconChrome, appIconWindows, appIconLinux){
    
    var title = aNotifyObject.title ? String(aNotifyObject.title) : appName + " Notification";
    var text = aNotifyObject.description ? aNotifyObject.description : "";
    var icon = aNotifyObject.icon ? String(aNotifyObject.icon) : appIconChrome;
    var textClickable = false;
    var cookie = "";
    var alertListener = null;
    
    var {onclick, onfinished} = aNotifyObject;
    if (onclick || onfinished) {
      textClickable = true;
      alertListener = {
        observe: function alertObserver(subject, topic, data) {
          if (topic === "alertclickcallback" && onclick)
            onclick();
          else if (topic === "alertfinished" && onfinished)
            onfinished();
        }
      };
    }
    
    var osString = Cc["@mozilla.org/xre/app-info;1"]
                   .getService(Ci.nsIXULRuntime).OS;
    var msgSent = false;
    var Application = Cc["@mozilla.org/fuel/application;1"]
                      .getService(Ci.fuelIApplication);

                      
    if(osString == "WINNT"){
      
      var tempIcon = (icon == appIconChrome) ? appIconWindows : icon;
      var GFW_PREF = "extensions."  + appName.toLowerCase() + ".gfw";

      if(Application.prefs.getValue(GFW_PREF, false)){
        try{
          growlgntp.init(appName, appIconWindows);
          growlgntp.doNotification(title, text, tempIcon);
          msgSent = true;
        }catch(e){
          Components.utils.reportError(e);
          msgSent = false;
        }
      }
      
      if(!msgSent){
        // open the interface to Snarl
        const cid = "@tlhan-ghun.de/snarlInterface;5";
        var snarlInterface = Cc[cid].createInstance();
        snarlInterface = snarlInterface.QueryInterface(Ci.ISNARLINTERFACE);
        
        // check if Snarl is running
        if (snarlInterface.snGetIsRunning()){
          try{
            // get the window which has been generated in the observer
            var generateWindow = snarlInterface.snGetWindowHandle(appName + "Wnd"); 
            //send notification
            var snarlMsgId = snarlInterface.snShowMessageEx(title, text, 15, tempIcon, 0, 0, "", "Notification");
            
            // avoid sending it again
            msgSent = true;
          }catch(e){
            Components.utils.reportError(e);
            msgSent = false;
          }
        }
      }
      
    }else if(osString == "Linux"){
      //Use libnotify
      try {
       
        var file = Cc["@mozilla.org/file/local;1"]
                   .createInstance(Ci.nsILocalFile);
        file.initWithPath("/usr/bin/notify-send");

        var process = Cc["@mozilla.org/process/util;1"]
            .createInstance(Ci.nsIProcess);
        process.init(file);
        var args = [utf8.encode(title), utf8.encode(text), "-i", appIconLinux];
        process.run(false, args, args.length);
        msgSent = true;
        
      }catch(e){
        msgSent = false;
      }
      
    }
    
    if(!msgSent){
      try {
        var classObj = Cc["@mozilla.org/alerts-service;1"];
        var alertService = classObj.getService(Ci.nsIAlertsService);
        alertService.showAlertNotification(icon, title, text, textClickable, cookie, alertListener);
      } catch (e) {
        Components.utils.reportError(e);
      }
    }
    
  }
};

var components = [Yip];

function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}