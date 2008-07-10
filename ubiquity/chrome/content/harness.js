function openCommandWindow() {
  var panel = document.getElementById("transparent-msg-panel");
  panel.openPopup(null, "", 0, 0, false, true);
}

function onKeydown(aEvent) {
  if (aEvent.keyCode == 88 && aEvent.ctrlKey) {
    openCommandWindow();
    aEvent.preventDefault();
  }
}

window.addEventListener("keydown", onKeydown, false);
