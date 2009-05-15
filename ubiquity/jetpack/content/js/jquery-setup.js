// This sets up jQuery when it's loaded in a hidden chrome window
// that doesn't provide a user interface.

jQuery.ajaxSetup(
  {xhr: function() {
     // This is a fix for Ubiquity bug #470. We're going to create the
     // XHR object from whatever current window the user's using, so
     // that any UI that needs to be brought up as a result of the XHR
     // is shown to the user, rather than being invisible and locking
     // up the application.

     if (Extension.isHidden) {
       var jsm = {};
       Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
       var currWindow = jsm.Utils.currentChromeWindow;
       return new currWindow.XMLHttpRequest();
     }
     return new XMLHttpRequest();
   }
  });

MemoryTracking.track(jQuery, "jQuery");
