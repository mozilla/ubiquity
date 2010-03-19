var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

var Utils = {
  __proto__: Cu.import("resource://ubiquity/modules/utils.js", null).Utils,
  __globalObject: this,

  // Just like the standard Utils.uri, only if we get a malformed URI
  // error, we'll try re-evaluating the string using a base URI of the
  // feed making the call.
  uri: function uri(obj) {
    try {
      return this.__proto__.uri(obj);
    } catch (e if (typeof obj !== "string" &&
                   e.result === Cr.NS_ERROR_MALFORMED_URI)) {
      return this.__proto__.uri({uri: obj, base: feed.id});
    }
  }
};
Utils.url = Utils.uri;
Utils.ajaxGet = function ajaxGet(url, callbackFunction, failureFunction) (
  jQuery.ajax({url: url, success: callbackFunction, error: failureFunction}));
Utils.parseRemoteDocument = function parseRemoteDocument(
  remoteUrl, postParams, successCallback, errorCallback) {
  var ajaxOptions = {
    url: remoteUrl,
    dataType: "text",
    success: function pRD_success(htm) { Utils.parseDocument(htm, callback) },
    error: errorCallback,
  };
  if (postParams) {
    ajaxOptions.type = "POST";
    ajaxOptions.data = postParams;
  }
  return jQuery.ajax(ajaxOptions);
};

var CmdUtils = {
  __proto__:
  Cu.import("resource://ubiquity/modules/cmdutils.js", null).CmdUtils,
  __globalObject: this,
  __nextId: 0,
};

Cu.import("resource://ubiquity/modules/nountypes.js");
noun_arb_text.loadGlobals(this);

var _ = (function prepareGettext({LocalizationUtils}, {UbiquitySetup}) {
  function renderTemplate(x, data) (
    data
    ? Template.parseTemplate(x).process(data, {keepWhitespace: true})
    : x);

  var {languageCode} = UbiquitySetup;
  if (!LocalizationUtils.loadLocalPo(feed.id, languageCode))
    return function registerTemplate(x, data) {
      "l10n" in context || LocalizationUtils.registerFeedGlobal(feed.id, x);
      return renderTemplate(x, data);
    };

  var feedKey = LocalizationUtils.getLocalFeedKey(feed.id, languageCode);
  return function gettext(x, data) {
    var msgctxt = context.l10n;
    return renderTemplate(
      (msgctxt
       ? LocalizationUtils.getLocalizedStringFromContext(feedKey, msgctxt, x)
       : LocalizationUtils.getLocalizedString(feedKey, x)),
      data);
  };
})(Cu.import("resource://ubiquity/modules/localization_utils.js", null),
   Cu.import("resource://ubiquity/modules/setup.js", null));
