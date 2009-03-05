function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}

function pageLoad_enableLockedDownFeedsInMozillaWiki(doc) {
  // If a mozilla.org wiki page with the extension .locked-down.js is
  // in the browser, dynamically insert a <link> element into the page
  // that tells Ubiquity the page has locked-down commands.

  var loc = doc.location;
  if (loc.protocol == "https:" &&
      loc.host == "wiki.mozilla.org" &&
      loc.pathname.match(/.*\.locked-down\.js$/)) {
    var link = doc.createElement("link");
    link.rel = "locked-down-commands";
    link.href = ("https://wiki.mozilla.org/index.php?title=" +
                 loc.pathname.slice(1) +
                 "&action=raw&ctype=text/javascript");
    doc.documentElement.appendChild(link);
  }
}
