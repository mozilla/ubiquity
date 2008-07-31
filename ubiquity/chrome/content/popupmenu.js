(function () {
  /* This function handles the window startup piece, initializing the UI and preferences */
  function startup()
  {
    var menupopup = document.getElementById("ubiquity-menupopup");
    menupopup.addEventListener("popupshowing", contextPopupShowing, false);

  }
  function openURL(event) {
    openUILink(event.target.url, event);
  }
  /* This function handles the window closing piece, removing listeners and observers */
  function shutdown()
  {
    var menupopup = document.getElementById("ubiquity-menupopup");
    menupopup.removeEventListener("popupshowing", contextPopupShowing, false);
  }

  function contextPopupShowing(event) {
    if (event.target.id != "ubiquity-menupopup") {
      return;
    }

    /* Remove previously added menus */
    var menupopup = event.target;
    for(let i=menupopup.childNodes.length - 1; i >= 0; i--) {
      menupopup.removeEventListener("command", openURL, true);
//      menupopup.removeEventListener("click", executeClick, true);
      menupopup.removeChild(menupopup.childNodes.item(i));
    }

    var popupContext = [];
    var data = {};
    var mfNode;
    if (gContextMenu.onImage) {
      popupContext["image"] = true;
      // Do we want to add data about the image?
    }
    if (gContextMenu.onTextInput) {
      popupContext["textinput"] = true;
      // Do we want to add data about the text input?
    }
    if (gContextMenu.onLink) {
      popupContext["link"] = true;
      data.link = gContextMenu.linkURL;
      data.linkText = gContextMenu.linkText.call(gContextMenu);
    }
    if (gContextMenu.isContentSelection()) {
      popupContext["selection"] = true;
      var selection = document.commandDispatcher.focusedWindow.getSelection();
      data.selection = selection.toString();
      var div = content.document.createElement("div");
      div.appendChild(selection.getRangeAt(0).cloneContents());
      data.selectionHTML = div.innerHTML;
    }
    popupContext["document"] = true;
    data.documentTitle = content.document.title;
    data.documentUrl = content.document.location.href;

    /* data oject contains info about selection */
    /* popupContext determines what we have (for foo in bar to get it all) */
    /* Don't forget to worry about encoding when passing data to web services */
    /* Invoke ubiquity with popup context, data, get array of names/function back */

    function ubiquity(popupContext, data) {
      var results = {};
      var contextString = "";
      for (let i in popupContext) {
        contextString += i + " ";
      }
      results["Context"] = function() {alert(contextString);};
      if (popupContext["selection"]) {
        results["Selection text"] = function() {alert(data.selection);};
        results["Selection HTML"] = function() {alert(data.selectionHTML);};
      }
      if (popupContext["link"]) {
        results["Link text"] = function() {alert(data.linkText);};
        results["Link URL"] = function() {alert(data.link);};
      }
      if (popupContext["document"]) {
        results["Document title"] = function() {alert(data.documentTitle);};
        results["Document URL"] = function() {alert(data.documentUrl);};
      }
      return results;
    }

    var results = ubiquity(popupContext, data);

    for (let i in results) {
      var tempMenu = document.createElement("menuitem");
      tempMenu.label = i;
      tempMenu.setAttribute("label", tempMenu.label);
      tempMenu.addEventListener("command", results[i], true);
      event.target.appendChild(tempMenu);
    }
  }

  var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                         .getService(Components.interfaces.nsIStringBundleService)
                         .createBundle("chrome://ubiquity/locale/ubiquity.properties");

  /* Attach listeners for page load */
  window.addEventListener("load", startup, false);
  window.addEventListener("unload", shutdown, false);
})();
