/*
 * Creates a Friday interface and binds it to the given message
 * panel and text box.
 *
 * The message panel should be a xul:panel instance, and the text box
 * should be a xul:textbox instance with Firefox autocomplete.
 */
function Friday(msgPanel, textBox, cmdManager)
{
    this.__needsToShow = false;
    this.__msgPanel = msgPanel;
    this.__textBox = textBox;
    this.__cmdManager = cmdManager;

    self = this;

    msgPanel.addEventListener( "popupshown",
                               function() { self.__onShown(); },
                               false );
    textBox.onTextEntered = function() { self.__onTextEntered(); };
}

Friday.prototype = {

__onTextEntered: function()
{
    this.__msgPanel.hidePopup();

    var context = {focusedWindow : this.__focusedWindow,
                   focusedElement : this.__focusedElement};
    this.__focusedWindow = null;
    this.__focusedElement = null;

    this.__cmdManager.execute(this.__textBox.value, context);
},

__onShown: function()
{
    if (this.__needsToShow)
    {
        this.__textBox.focus();
        this.__textBox.select();
        this.__needsToShow = false;
    }
},

openWindow: function()
{
    this.__focusedWindow = document.commandDispatcher.focusedWindow;
    this.__focusedElement = document.commandDispatcher.focusedElement;

    this.__needsToShow = false;
    this.__msgPanel.openPopup(null, "", 0, 0, false, true);
    this.__needsToShow = true;
}

};
