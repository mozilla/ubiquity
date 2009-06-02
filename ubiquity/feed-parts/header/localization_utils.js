(function(){
  var globalObj = CmdUtils.__globalObject;
  Cu.import("resource://ubiquity/modules/localization_utils.js");
  globalObj._ = function(key, replacements) LocalizationUtils.getLocalized(key, replacements);
}());
