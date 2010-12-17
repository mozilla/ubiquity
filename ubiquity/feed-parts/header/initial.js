var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

var Utils = {
  __proto__: Cu.import("resource://ubiquity/modules/utils.js", null).Utils,
};
// Just like the standard Utils.uri, only if we get a malformed URI
// error, we'll try re-evaluating the string using a base URI of the
// feed making the call.
let ({uri} = Utils)
Utils.uri = Utils.url = function _uri(obj, defaultUri) {
  try { return uri(obj, defaultUri) }
  catch (e if (typeof obj == "string" &&
               e.result === Cr.NS_ERROR_MALFORMED_URI)) {
    return uri({uri: obj, base: feed.id}, defaultUri);
  }
};
Utils.ajaxGet = function ajaxGet(url, callback, errorCallback) {
  return jQuery.ajax({url: url, success: callback, error: errorCallback});
};
Utils.parseRemoteDocument = function parseRemoteDocument(
  remoteUrl, postParams, callback, errorCallback) {
  var ajaxOptions = {
    url: remoteUrl,
    dataType: "text",
    success: function pRD_success(htm) { Utils.parseHtml(htm, callback) },
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
};

Cu.import("resource://ubiquity/modules/nountypes.js");
noun_arb_text.loadGlobals(this);

var _ = (function prepareGettext({LocalizationUtils}, {UbiquitySetup}) {
  function renderTemplate(x, data) (
    data
    ? Template.parseTemplate(x).process(data, {keepWhitespace: true})
    : x);

  var {languageCode} = UbiquitySetup;
  if (!LocalizationUtils.loadLocalPo(feed.id, languageCode)) {
    LocalizationUtils.getFeedGlobals(feed.id).splice(0, 1/0);
    return function registerTemplate(x, data) {
      "l10n" in context || LocalizationUtils.registerFeedGlobal(feed.id, x);
      return renderTemplate(x, data);
    };
  }

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
