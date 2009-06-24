var _ = (function () {
  function renderTemplate(x, data) Template.parseTemplate(x).process(data);
  var {UbiquitySetup} =
    Cu.import("resource://ubiquity/modules/setup.js", null);
  var {LocalizationUtils} =
    Cu.import("resource://ubiquity/modules/localization_utils.js", null);
  if (UbiquitySetup.parserVersion < 2 ||
      !LocalizationUtils.isLocalizable(feed.id))
    return renderTemplate;

  LocalizationUtils.loadLocalPo(feed.id);
  return function _(x, data) {
    var localized = LocalizationUtils.getLocalized(x);
    return data ? renderTemplate(localized, data) : localized;
  };
}());
