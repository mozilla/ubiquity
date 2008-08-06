// TODO: This code is duplicated from cmdutils.js, which should eventually
// be namespaced so that it can be directly imported into browser.xul.
// In other words, this file is temporary.

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

function getHtmlSelection(context) {
  var sel = context.focusedWindow.getSelection();

  if (sel.rangeCount >= 1) {
    var html = sel.getRangeAt(0).cloneContents();
    var newNode = context.focusedWindow.document.createElement("p");
    newNode.appendChild(html);
    return newNode.innerHTML;
  }

  return null;
}

function safeWrapper(func) {
  var wrappedFunc = function() {
    try {
      func.apply(this, arguments);
    } catch (e) {
      displayMessage(
        {text: ("An exception occurred while running " +
                func.name + "()."),
         exception: e}
      );
    }
  };

  return wrappedFunc;
}
