Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;

function UbiquityAboutHandler() {
}

UbiquityAboutHandler.prototype = {
    newChannel : function(aURI) {
        var ios = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);

        var channel = ios.newChannel(
          "chrome://ubiquity/content/about.html",
          null,
          null
        );

        channel.originalURI = aURI;
        return channel;
    },

    getURIFlags: function(aURI) {
        return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
    },

    classDescription: "About Ubiquity Page",
    classID: Components.ID("3a54db0f-281a-4af7-931c-de747c37b423"),
    contractID: "@mozilla.org/network/protocol/about;1?what=ubiquity",
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule])
}

function NSGetModule(aCompMgr, aFileSpec) {
  return XPCOMUtils.generateModule([UbiquityAboutHandler]);
}
