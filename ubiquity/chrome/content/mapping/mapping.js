function cmd_test_mapping() {

}

cmd_test_mapping.preview = function(pblock) {
  var iframe = pblock.ownerDocument.createElement("iframe");
  iframe.setAttribute("src", "chrome://ubiquity/content/mapping/mapping.xul");
  iframe.style.border = "none";
  iframe.setAttribute("width", 500);
  iframe.setAttribute("height", 300);
  function onXulLoad() {
    var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    var extMgr = Components.classes["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    var loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");
    var extD = loc.getItemLocation("ubiquity@labs.mozilla.com");
    extD.append("chrome");
    extD.append("content");
    extD.append("mapping");
    extD.append("mapping.html");
    var uri = ioSvc.newFileURI(extD);
    var browser = iframe.contentDocument.createElement("browser");
    browser.setAttribute("src", uri.spec);
    browser.setAttribute("width", 500);
    browser.setAttribute("height", 300);
    function onBrowserLoad() {
      window.console.log(browser.wrappedJSObject.contentDocument);
    }
    browser.addEventListener("load", safeWrapper(onBrowserLoad), false);
    iframe.contentDocument.documentElement.appendChild(browser);
  }
  iframe.addEventListener("load", safeWrapper(onXulLoad), false);
  pblock.innerHTML = "";
  pblock.appendChild(iframe);
};
