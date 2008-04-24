/*
 * Creates a Friday interface and binds it to the given message
 * panel and text box.
 *
 * The message panel should be a xul:panel instance, and the text box
 * should be a xul:textbox instance with Firefox autocomplete.
 */
function Friday(msgPanel, textBox, cmdManager)
{
    this.__msgPanel = msgPanel;
    this.__textBox = textBox;
    this.__cmdManager = cmdManager;
    this.__needsToExecute = false;
    this.__showCount = 0;

    var self = this;

    msgPanel.addEventListener( "popupshown",
                               function() { self.__onShown(); },
                               false );
    msgPanel.addEventListener( "popuphidden",
                               function() { self.__onHidden(); },
                               false );
    textBox.onTextEntered = function() { self.__onTextEntered(); };
    textBox.onTextReverted = function() { self.__onTextReverted(); };
}

Friday.prototype = {

__onTextEntered: function()
{
    this.__needsToExecute = true;
    this.__msgPanel.hidePopup();
},

__onTextReverted: function()
{
    this.__msgPanel.hidePopup();
},

__onHidden: function()
{
    this.__showCount -= 1;

    if (this.__showCount > 0)
        return;

    var context = {focusedWindow : this.__focusedWindow,
                   focusedElement : this.__focusedElement};

    if (this.__focusedElement)
        this.__focusedElement.focus();
    else {
        if (this.__focusedWindow)
            this.__focusedWindow.focus();
    }
    this.__focusedWindow = null;
    this.__focusedElement = null;

    if (this.__needsToExecute) {
        this.__cmdManager.execute(this.__textBox.value, context);
        this.__needsToExecute = false;
    }
},

__onShown: function()
{
    if (this.__showCount == 0) {
        this.__textBox.focus();
        this.__textBox.select();
    }
    this.__showCount += 1;
},

openWindow: function()
{
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;

    this.__msgPanel.openPopup(null, "", 0, 0, false, true);
}

};
