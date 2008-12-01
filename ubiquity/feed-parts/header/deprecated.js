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
                        "feeds. Please use context.window instead.",
                        Components.stack.caller);
    return context.window;
  }
);

// This is deprecated behavior from Ubiquity 0.1.1.
var makeSearchCommand = function deprecated_makeSearchCommand() {
  Utils.reportWarning("makeSearchCommand() is deprecated; please use " +
                      "CmdUtils.makeSearchCommand() instead.",
                      Components.stack.caller);
  return CmdUtils.makeSearchCommand.apply(CmdUtils, arguments);
};
