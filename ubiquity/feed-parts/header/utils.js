var Utils = {};

(function()
{
  // Let's "subclass" the Utils JS module.
  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/utils.js", jsm);
  Utils.__proto__ = jsm.Utils;
})();

// TODO: Make this deprecated and move this function to CmdUtils.
Utils.safeWrapper = function safeWrapper(func) {
  var wrappedFunc = function safeWrappedFunc() {
    try {
      func.apply(this, arguments);
    } catch (e) {
      displayMessage(
        {text: ("An exception occurred while running " +
                func.name + "()."),
         exception: e}
      );
    }
  };

  return wrappedFunc;
};

Utils.ajaxGet = function ajaxGet(url, callbackFunction, failureFunction) {
  jQuery.ajax({
    url:url,
    success: callbackFunction,
    error: failureFunction
  });
};

Utils.parseRemoteDocument = function parseRemoteDocument(remoteUrl, postParams, successCallback, errorCallback) {
  // based on code from http://mxr.mozilla.org/mozilla/source/browser/components/microsummaries/src/nsMicrosummaryService.js

  var rootElement = null;
  var iframe = null;

  var parseHandler = {
    handleEvent: function handleEvent(event) {
      event.target.removeEventListener("DOMContentLoaded", this, false);
      var doc = iframe.contentDocument;
      rootElement.removeChild(iframe);
      successCallback(doc);
    }
  };

  function parseHtml(htmlText) {
    var window = Utils.currentChromeWindow;
    var document = window.document;
    rootElement = document.documentElement;
    iframe = document.createElement('iframe');
    iframe.setAttribute("collapsed", true);
    // secure iframe against untrusted content
    iframe.setAttribute("type", "content");
    // needed to create a docshell
    rootElement.appendChild(iframe);
    // stop loading about:blank (not needed, and weird things could happpen apparently)
    iframe.docShell.QueryInterface(Ci.nsIWebNavigation)
      .stop(Ci.nsIWebNavigation.STOP_NETWORK);
    // turn off unneeded/unwanted/bad things
    iframe.docShell.allowJavascript = false;
    iframe.docShell.allowAuth = false;
    iframe.docShell.allowPlugins = false;
    iframe.docShell.allowMetaRedirects = false;
    iframe.docShell.allowSubframes = false;
    iframe.docShell.allowImages = false;

    // Convert the HTML text into an input stream.
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var stream = converter.convertToInputStream(htmlText);
    // Set up a channel to load the input stream.
    var channel = Cc["@mozilla.org/network/input-stream-channel;1"]
      .createInstance(Ci.nsIInputStreamChannel);
    channel.setURI(Utils.url(remoteUrl));
    channel.contentStream = stream;
    // Load in the background so we don't trigger web progress listeners.
    channel.QueryInterface(Ci.nsIRequest)
      .loadFlags |= Ci.nsIRequest.LOAD_BACKGROUND;
    // need to specify content type, so user isn't prompted to download "unknown" file type
    var baseChannel = channel.QueryInterface(Ci.nsIChannel);
    baseChannel.contentType = "text/html";
    // this will always be UTF-8 thanks to XMLHttpRequest and nsIScriptableUnicodeConverter
    baseChannel.contentCharset = "UTF-8";

    // background loads don't fire "load" events, listen for DOMContentLoaded instead
    iframe.addEventListener("DOMContentLoaded", parseHandler, true);
    var uriLoader = Cc["@mozilla.org/uriloader;1"]
      .getService(Ci.nsIURILoader);
    uriLoader.openURI(channel, true, iframe.docShell);
  }

  var ajaxOptions = {
    url: remoteUrl,
    type: "GET",
    datatype: "string",
    success: function success(responseText) {
      parseHtml(responseText);
    },
    error: function error() {
      if(errorCallback)
        errorCallback();
    }
  };

  if(postParams) {
    ajaxOptions.type = "POST";
    ajaxOptions.data = postParams;
  }

  jQuery.ajax(ajaxOptions);

};
