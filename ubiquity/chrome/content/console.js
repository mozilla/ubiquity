Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");

function maybeFixUpUbiquityMessage(target) {
  if (typeof(target.getAttribute) != "function")
    return;
  var href = target.getAttribute("href");
  if (SandboxFactory.isInitialized && href) {
    if (SandboxFactory.isFilenameReported) {
      // A command feed's URL had to be "munged" by a sandbox in order to
      // have XPConnect wrappers implicitly made for it; let's "un-munge" it
      // here so that it looks intelligible to end-users.

      target.setAttribute("href", SandboxFactory.unmungeUrl(href));
    } else if (href == SandboxFactory.fileUri) {
      // We're in an older version of the platform that doesn't allow
      // code executed in a sandbox to have its file URI specified,
      // which means error reports will point to the file that the
      // sandbox call occurred in, rather than the file the code is
      // in.  Let's at least let the user know about this and tell
      // them what to do to get accurate information.

      target.setAttribute(
        "msg",
        (target.getAttribute("msg") + "\n\n" +
         "This " + target.getAttribute("type") + " may have occurred " +
         "in a Ubiquity command feed, but the source " +
         "file and line number reported below may be incorrect. To " +
         "receive accurate information, please consider upgrading to " +
         "the latest beta of Firefox 3.1.")
      );
    }
  }
}

window.addEventListener(
  "load",
  function consoleLoad() {
    var box = document.getElementById("ConsoleBox");
    box.addEventListener(
      "DOMNodeInserted",
      function(aEvt) { maybeFixUpUbiquityMessage(aEvt.originalTarget); },
      true
    );
    Array.forEach(box.getElementsByClassName("console-row"),
                  maybeFixUpUbiquityMessage);
  },
  false
);
