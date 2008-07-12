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
