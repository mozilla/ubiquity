function onKeydown(aEvent) {
  if (aEvent.keyCode == 88 && aEvent.ctrlKey) {
    gUbiquity.openWindow();
    aEvent.preventDefault();
  }
}

window.addEventListener("keydown", onKeydown, false);
