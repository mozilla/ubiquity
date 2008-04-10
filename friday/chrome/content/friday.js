friday = {

openWindow: function()
{
    dump("hai\n");
    msgPanel = document.getElementById("transparent-msg-panel");
    msgPanel.openPopupAtScreen(0, 0, false);
    dump("done\n");
}

}
