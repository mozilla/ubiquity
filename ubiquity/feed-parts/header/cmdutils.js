const Cc = Components.classes;
const Ci = Components.interfaces;

const CmdUtils = (function(jsm){
  Components.utils.import("resource://ubiquity/modules/cmdutils.js", jsm);
  return {
    __proto__: jsm.CmdUtils,
    __globalObject: this,
  };
}({}));
