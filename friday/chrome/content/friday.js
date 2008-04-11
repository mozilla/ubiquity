friday = {

needsToShow: false,

onShown: function()
{
    if (friday.needsToShow)
    {
        textBox = document.getElementById("cmd-entry");
        textBox.focus();
        friday.needsToShow = false;
    }
},

openWindow: function()
{
    friday.needsToShow = false;
    msgPanel = document.getElementById("transparent-msg-panel");
    msgPanel.openPopup(null, "", 0, 0, false, true);
    friday.needsToShow = true;
}

}
