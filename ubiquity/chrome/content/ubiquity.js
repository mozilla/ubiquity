// Creates a Ubiquity interface and binds it to the given message
// panel, text box, and--optionally--preview block element.
//
// The message panel should be a xul:panel instance, and the text box
// should be a xul:textbox instance. The preview block, if supplied,
// should be a HTML block element (e.g., a DIV).

function Ubiquity(msgPanel, textBox, cmdManager, previewBlock) {
  this.__msgPanel = msgPanel;
  this.__textBox = textBox;
  this.__cmdManager = cmdManager;
  this.__previewBlock = previewBlock;
  this.__needsToExecute = false;
  this.__showCount = 0;
  this.__lastValue = null;

  var self = this;

  msgPanel.addEventListener( "popupshown",
                             function() { self.__onShown(); },
                             false );
  msgPanel.addEventListener( "popuphidden",
                             function() { self.__onHidden(); },
                             false );
  window.addEventListener("mousemove",
                          function(event) { self.__onMouseMove(event); },
                          false);
  textBox.addEventListener("keyup",
                           function(event) { self.__onInput(event); },
                           false);

  this.__resetPreview();
}

Ubiquity.prototype = {
  __DEFAULT_PREVIEW_LOCATION: "chrome://ubiquity/content/preview.html",
  __KEYCODE_ENTER: 13,
  __MIN_CMD_PREVIEW_LENGTH: 3,
  __DEFAULT_PREVIEW: ("Type the name of a command and press enter to " +
                      "execute it, or <b>help</b> for assistance."),

  __onMouseMove: function(event) {
    this.__x = event.screenX;
    this.__y = event.screenY;
  },

  __onInput: function(event) {
    if (event.keyCode == this.__KEYCODE_ENTER) {
      if (this.__textBox.value)
        this.__needsToExecute = true;
      this.__msgPanel.hidePopup();
    } else
      this.__updatePreview();
  },

  __updatePreview: function() {
    if (this.__previewBlock) {
      var cmdName = this.__textBox.value;
      if (cmdName != this.__lastValue) {

        this.__lastValue = cmdName;
        var wasPreviewShown = false;

        if (cmdName.length >= this.__MIN_CMD_PREVIEW_LENGTH)
          wasPreviewShown = this.__cmdManager.preview(
            cmdName,
            this.__makeContext(),
            this.__previewBlock
          );
        if (!wasPreviewShown)
          this.__resetPreview();
      }
    }
  },

  __resetPreview: function() {
    if (this.__previewBlock) {
        this.__previewBlock.innerHTML = this.__DEFAULT_PREVIEW;
    }
  },

  __makeContext: function() {
    var context = {focusedWindow : this.__focusedWindow,
                   focusedElement : this.__focusedElement,
                   screenX : this.__x,
                   screenY : this.__y};
    return context;
  },

  __onHidden: function() {
    this.__showCount -= 1;

    if (this.__showCount > 0)
      return;

    var context = this.__makeContext();

    if (this.__focusedElement)
      this.__focusedElement.focus();
    else
      if (this.__focusedWindow)
        this.__focusedWindow.focus();

    this.__focusedWindow = null;
    this.__focusedElement = null;

    if (this.__needsToExecute) {
      this.__cmdManager.execute(this.__textBox.value, context);
      this.__needsToExecute = false;
    }
  },

  __onShown: function() {
    if (this.__showCount == 0) {
      this.__textBox.focus();
      this.__textBox.select();
      this.__cmdManager.refresh();
    }
    this.__showCount += 1;
  },

  openWindow: function() {
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;
    this.__resetPreview();

    this.__msgPanel.openPopup(null, "", 0, 0, false, true);
  }
};
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
      results["Context"] = function() {alert(contextString);}
      if (popupContext["selection"]) {
        results["Selection text"] = function() {alert(data.selection);}
        results["Selection HTML"] = function() {alert(data.selectionHTML);}
      }
      if (popupContext["link"]) {
        results["Link text"] = function() {alert(data.linkText);}
        results["Link URL"] = function() {alert(data.link);}
      }
      if (popupContext["document"]) {
        results["Document title"] = function() {alert(data.documentTitle);}
        results["Document URL"] = function() {alert(data.documentUrl);}
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


