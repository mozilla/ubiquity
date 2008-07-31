function UbiquityPopupMenu(popupElement, cmdSuggester) {
  function contextPopupShowing(event) {
    if (event.target.id != popupElement.id)
      return;

    /* Remove previously added menus */
    for(let i=popupElement.childNodes.length - 1; i >= 0; i--) {
      // TODO: openURL() isn't defined... Is this code ever called?
      popupElement.removeEventListener("command", openURL, true);
      // popupElement.removeEventListener("click", executeClick, true);
      popupElement.removeChild(popupElement.childNodes.item(i));
    }

    var context = {
      screenX: 0,
      screenY: 0,
      lastCmdResult: null
    };

    if (gContextMenu.isContentSelection()) {
      context.focusedWindow = document.commandDispatcher.focusedWindow;
      context.focusedElement = document.commandDispatcher.focusedElement;
    }

    if (context.focusedWindow) {
      var results = cmdSuggester(context);

      for (i in results) {
        var tempMenu = document.createElement("menuitem");
        tempMenu.label = i;
        tempMenu.setAttribute("label", tempMenu.label);
        tempMenu.addEventListener("command", results[i], true);
        event.target.appendChild(tempMenu);
      }
    }
  }

  popupElement.addEventListener("popupshowing", contextPopupShowing, false);
}
