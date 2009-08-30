const AS = (Cc["@mozilla.org/browser/annotation-service;1"]
            .getService(Ci.nsIAnnotationService));
const IOS = (Cc["@mozilla.org/network/io-service;1"]
             .getService(Ci.nsIIOService));

const CLASS_TO_REMOVE = "_toRemove";
const ANNO_EDIT = "ubiquity/edit";

CmdUtils.CreateCommand({
  names: ["delete"],
  description: "Deletes the selected chunk of HTML from the page.",
  icon: "chrome://ubiquity/skin/icons/delete.png",
  execute: function delete_execute() {
    var {focusedWindow} = context;
    var {document} = focusedWindow;
    var sel = focusedWindow.getSelection();
    for (var i = sel.rangeCount; i--;) {
      var range = sel.getRangeAt(i);
      var div = document.createElement("div");
      div.className = CLASS_TO_REMOVE;
      div.appendChild(range.cloneContents());
      range.deleteContents();
      range.insertNode(div);
    }
    jQuery("." + CLASS_TO_REMOVE, document).slideUp();
  }
});

CmdUtils.CreateCommand({
  names: ["undelete"],
  description: "Restores the HTML deleted by the delete command.",
  icon: "chrome://ubiquity/skin/icons/arrow_undo.png",
  execute: function undelete_execute() {
    jQuery("." + CLASS_TO_REMOVE, context.focusedWindow.document)
      .slideDown(function onUndelete() {
        var $div = jQuery(this);
        $div.after($div.contents()).remove();
      });
  }
});

function stopEditingPage() {
  var doc = CmdUtils.getDocument();
  doc.body.contentEditable = "false";
  doc.designMode = "off";
  return doc;
}

CmdUtils.CreateCommand({
  names: ["edit page", "turn on edit mode"],
  description:
  "Puts the web page into a mode where you can edit the contents.",
  help: ("In edit mode, you can edit the page like any document: " +
         "Select text, delete it, add to it, copy and paste it.  " +
         "Issue 'bold', 'italic', or 'underline' commands to add " +
         "formatting.  Issue the 'save' command to save your changes " +
         "so they persist even when you reload the page.  " +
         "Issue 'stop-editing-page' when you're done to go back to the " +
         "normal page viewing mode."),
  icon: "chrome://ubiquity/skin/icons/page_edit.png",
  execute: function edit_page_execute() {
    var doc = CmdUtils.getDocument();
    doc.body.contentEditable = "true";
    doc.designMode = "on";
  }
});

CmdUtils.CreateCommand({
  names: ["stop editing page", "turn off edit mode"],
  description: ("If you used the 'edit page' command to put the page into " +
                "editable mode, use this command to end that mode and go " +
                "back to normal page viewing. If you want the changes to " +
                "persist on page reload, issue the 'save' command first."),
  icon: "chrome://ubiquity/skin/icons/page_refresh.png",
  execute: stopEditingPage,
});

CmdUtils.CreateCommand({
  names: ["save page edits"],
  description: "Saves edits you've made to this page in an annotation. " +
               "They will persist on page reload. You can remove them " +
               "with the 'undo page edits' command.",
  icon: "chrome://ubiquity/skin/icons/page_save.png",
  execute: function save_edits_execute() {
    var {location, body} = stopEditingPage();
    AS.setPageAnnotation(IOS.newURI(location.href, null, null),
                         ANNO_EDIT, body.innerHTML, 0, 4);
  }
});

// removes all page annotations - add more functionality
CmdUtils.CreateCommand({
  names: ["undo page edits", "remove annotations"],
  description: "Resets any annotation changes you've made to this page.",
  icon: "chrome://ubiquity/skin/icons/page_delete.png",
  execute: function undo_edits_execute() {
    var {location} = CmdUtils.getWindow();
    AS.removePageAnnotations(IOS.newURI(location.href, null, null));
    location.reload();
  },
});

function pageLoad_restorePageAnnotations(document) {
  if (!document.location) return;

  var uri = IOS.newURI(document.location.href, null, null);
  AS.getPageAnnotationNames(uri, {}).forEach(function eachAN(annoName) {
    if (annoName === ANNO_EDIT) {
      document.body.innerHTML = AS.getPageAnnotation(uri, annoName);
      // TODO: Fix "TypeError: head is not defined" on some pages
    }
  });
}
