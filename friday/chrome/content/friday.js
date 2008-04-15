function Friday(msgPanel, textBox)
{
    this.__needsToShow = false;
    this.__msgPanel = msgPanel;
    this.__textBox = textBox;
}

Friday.prototype = {

onTextEntered: function()
{
    this.__msgPanel.hidePopup();
},

onShown: function()
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
    this.__needsToShow = false;
    this.__msgPanel.openPopup(null, "", 0, 0, false, true);
    this.__needsToShow = true;
}

};
