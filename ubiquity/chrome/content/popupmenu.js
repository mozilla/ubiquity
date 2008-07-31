function UbiquityPopupMenu(popupElement, cmdSuggester) {
  function contextPopupShowing(event) {
    if (event.target.id != popupElement.id)
      return;

    /* Remove previously added menus */
    for(let i=popupElement.childNodes.length - 1; i >= 0; i--) {
      popupElement.removeEventListener("command", openURL, true);
      // popupElement.removeEventListener("click", executeClick, true);
      popupElement.removeChild(popupElement.childNodes.item(i));
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

    var results = cmdSuggester(popupContext, data);

    for (i in results) {
      var tempMenu = document.createElement("menuitem");
      tempMenu.label = i;
      tempMenu.setAttribute("label", tempMenu.label);
      tempMenu.addEventListener("command", results[i], true);
      event.target.appendChild(tempMenu);
    }
  }

  popupElement.addEventListener("popupshowing", contextPopupShowing, false);
}

/* data object contains info about selection */

/* popupContext determines what we have (for foo in bar to get it
 * all) */

/* Don't forget to worry about encoding when passing data to web
 * services */

/* Invoke ubiquity with popup context, data, get array of
 * names/function back */

function fakeCommandSuggester(popupContext, data) {
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
