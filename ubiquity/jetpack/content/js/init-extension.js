const Cc = Components.classes;
const Ci = Components.interfaces;

var Extension = {
  // TODO: Eventually we may want to be able to put extensions in iframes
  // that are in visible windows, which these flags aren't compatible
  // with (right now they assume that if they're in an iframe, they're in
  // the hidden window).
  isVisible: (window.frameElement === null),
  isHidden: (window.frameElement !== null),

  Manager: {}
};

(function() {
   var host;
   if (window.location.protocol == "about:")
     host = window.location.href.slice(window.location.href.indexOf(":") + 1);
   else
     host = window.location.host;

   var initUrl  = "resource://" + host + "/modules/init.js";
   Components.utils.import(initUrl, Extension.Manager);
   Extension.Manager.set(window);
 })();
