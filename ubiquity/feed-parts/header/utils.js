var Utils = {};

(function()
{
  // Let's "subclass" the Utils JS module.
  var jsm = {};
  Components.utils.import("resource://ubiquity-modules/utils.js", jsm);
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
