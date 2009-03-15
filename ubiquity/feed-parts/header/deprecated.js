// This file provides deprecated functionality that will
// eventually need to be removed.  Note, however, that doing so
// will break backwards compatibility with some legacy third-party
// command feeds.

// This is deprecated behavior ever since we made command feed sandboxes
// singletons for the entire application, rather than window-specific.
this.__defineGetter__(
  "window",
  function() {
    Utils.reportWarning("The global window object is deprecated in command " +
                        "feeds. Please use context.chromeWindow instead.", 1);
    return context.chromeWindow;
  }
);

// This is deprecated behavior from Ubiquity 0.1.1.
var makeSearchCommand = function deprecated_makeSearchCommand() {
  Utils.reportWarning("makeSearchCommand() is deprecated; please use " +
                      "CmdUtils.makeSearchCommand() instead.", 1);
  return CmdUtils.makeSearchCommand.apply(CmdUtils, arguments);
};
