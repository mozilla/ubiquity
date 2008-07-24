function getTextSelection(context) {
  var focused = context.focusedElement;
  var retval = "";

  if (focused)
    if (focused.selectionStart != focused.selectionEnd)
      retval = focused.value.substring(focused.selectionStart,
                                       focused.selectionEnd);
  if (!retval) {
    var sel = context.focusedWindow.getSelection();
    if (sel.rangeCount >= 1)
      retval = sel.toString();
  }
  return retval;
}
