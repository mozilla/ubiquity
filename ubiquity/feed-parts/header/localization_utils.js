var _ = (function () {
  function renderTemplate(x, data)(
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
