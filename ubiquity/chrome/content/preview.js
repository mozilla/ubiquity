function onClick(event) {
  var target = event.target;
  if (target.nodeName != 'A' || !target.href)
    return;

  event.preventDefault();

  openUrl(target.href);
}

function openUrl(url) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
  var browserWindow = wm.getMostRecentWindow("navigator:browser");
  var browser = browserWindow.getBrowser();

  if (browser.mCurrentBrowser.currentURI.spec == "about:blank")
    browserWindow.loadURI(url, null, null, false);
  else
    browser.loadOneTab(url, null, null, null, false, false);
}

document.addEventListener("click", onClick, true);
