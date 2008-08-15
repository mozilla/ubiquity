function onClick(event) {
	var target = event.target;
	while(target) {
		if (target.nodeName == 'A')
			break;
		
		target = target.parentNode;
	}
	
	if(!target)
		return;
	
	// only those referencing an external page
	if(!target.href || target.href.indexOf("#") == 0)
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
  
  // Get the main window that contains the browser XUL document
  // and close the Ubiquity popup
  var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIWebNavigation)
                     .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                     .rootTreeItem
                     .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIDOMWindow);
  mainWindow.gUbiquity.closeWindow();

}

document.addEventListener("click", onClick, true);
