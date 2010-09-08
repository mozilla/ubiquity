Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");

function maybeFixUpUbiquityMessage(target) {
  var href = "getAttribute" in target && target.getAttribute("href");
  if (href && href != (href = SandboxFactory.unmungeUrl(href)))
    target.setAttribute("href", href);
}

addEventListener("load", function consoleLoad() {
  var box = document.getElementById("ConsoleBox");
  Array.forEach(box.getElementsByClassName("console-row"),
                maybeFixUpUbiquityMessage);
  box.addEventListener("DOMNodeInserted", function onNewRow(ev) {
    maybeFixUpUbiquityMessage(ev.originalTarget);
  }, false);
}, false);
