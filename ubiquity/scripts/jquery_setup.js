// This sets up jQuery when it's loaded in a hidden chrome window
// that doesn't provide a user interface (e.g., a WebJsModule).

jQuery.ajaxSetup(
  {xhr: function() {
     // This is a fix for #470. We're going to create the XHR object
     // from whatever current window the user's using, so that any UI
     // that needs to be brought up as a result of the XHR is shown
     // to the user, rather than being invisible and locking up the
     // application.

     var jsm = {};
     Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
     var window = jsm.Utils.currentChromeWindow;
     return new window.XMLHttpRequest();
   }
  });
