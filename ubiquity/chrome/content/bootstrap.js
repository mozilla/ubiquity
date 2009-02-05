Components.utils.import("resource://ubiquity/modules/python_bootstrap.js");

function entityify(string) {
    return string.replace(/&/g, "&amp;").replace(/</g,
        "&lt;").replace(/>/g, "&gt;");
}

function log(text, appendNewline) {
  if (typeof(appendNewline) == "undefined")
    appendNewline = true;
  text = entityify(text);
  if (appendNewline)
    text += "\n";
  $("#install-log").append(text);
}

function startInstall() {
  PyBootstrap.install(log);
}

function killInstall() {
  PyBootstrap.uninstall(log);
}

function startJsbridge() {
  PyBootstrap.startJsbridge(log);
}
