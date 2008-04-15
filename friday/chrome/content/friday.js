friday = {

needsToShow: false,

onTextEntered: function()
{
    var msgPanel = document.getElementById("transparent-msg-panel");
    msgPanel.hidePopup();
},

onShown: function()
{
    if (this.needsToShow)
    {
        var textBox = document.getElementById("cmd-entry");
        textBox.focus();
        textBox.select();
        this.needsToShow = false;
    }
},

openWindow: function()
{
    this.needsToShow = false;
    var msgPanel = document.getElementById("transparent-msg-panel");
    msgPanel.openPopup(null, "", 0, 0, false, true);
    this.needsToShow = true;
}

}
