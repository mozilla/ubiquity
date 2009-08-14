var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

var Utils = {
  __proto__: (Cu.import("resource://ubiquity/modules/utils.js", null)
              .Utils),
  __globalObject: this,

  // Just like the standard Utils.uri, only if we get a malformed URI
  // error, we'll try re-evaluating the string using a base URI of the
  // feed making the call.
  uri: function uri(obj) {
    if (typeof obj !== "string") return this.__proto__.uri(obj);
    try {
      return this.__proto__.uri(obj);
    } catch (e if e.result === Components.results.NS_ERROR_MALFORMED_URI) {
      return this.__proto__.uri({uri: obj, base: feed.id});
    }
  }
};
Utils.url = Utils.uri;
Utils.ajaxGet = function ajaxGet(url, callbackFunction, failureFunction) {
  jQuery.ajax({
    url: url,
    success: callbackFunction,
    error: failureFunction
  });
};
Utils.parseRemoteDocument = function parseRemoteDocument(remoteUrl,
                                                         postParams,
                                                         successCallback,
                                                         errorCallback) {
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

var CmdUtils = {
  __proto__: (Cu.import("resource://ubiquity/modules/cmdutils.js", null)
              .CmdUtils),
  __globalObject: this,
  __nextId: 0,
};

Cu.import("resource://ubiquity/modules/nountypes.js");
noun_arb_text.loadGlobals(this);

var _ = (function () {
  function renderTemplate(x, data) (
    data
    ? Template.parseTemplate(x).process(data, {keepWhitespace: true})
    : x);
  var {UbiquitySetup} =
    Cu.import("resource://ubiquity/modules/setup.js", null);
  var {LocalizationUtils} =
    Cu.import("resource://ubiquity/modules/localization_utils.js", null);

  return (
    UbiquitySetup.parserVersion === 2 && LocalizationUtils.loadLocalPo(feed.id)
    ? function _(x, data) renderTemplate(LocalizationUtils.getLocalized(x),
                                         data)
    : renderTemplate);
}());
