function cmd_delete() {
  var sel = context.focusedWindow.getSelection();
  var document = context.focusedWindow.document;

  if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = document.createElement("div");
      newNode.className = "_toRemove";
      range.surroundContents(newNode);
  }

  CmdUtils.loadJQuery(function(jQuery) {
    jQuery("._toRemove").slideUp();
  });
}
cmd_delete.description = "Deletes the selected chunk of HTML from the page.";
cmd_delete.icon = "chrome://ubiquity/skin/icons/delete.png";
cmd_delete.preview = function( pblock ) {
  pblock.innerHTML = cmd_delete.description;
};

function cmd_undelete() {
  CmdUtils.loadJQuery(function(jQuery) {
    jQuery("._toRemove").slideDown();
  });
}
cmd_undelete.description = "Restores the HTML deleted by the delete command.";
cmd_undelete.icon = "chrome://ubiquity/skin/icons/arrow_undo.png";
cmd_undelete.preview = function( pblock ) {
  pblock.innerHTML = cmd_undelete.description;
};

function cmd_edit_page() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'true';
  CmdUtils.getDocumentInsecure().designMode='on';
}
cmd_edit_page.description = "Puts the web page into a mode where you can edit the contents.";
cmd_edit_page.help = "In edit mode, you can edit the page like any document: Select text, delete it, add to it, copy and paste it.  Issue \'bold\', \'italic\', or \'underline\' commands to add formatting.  Issue the 'save' command to save your changes so they persist even when you reload the page.  Issue 'stop-editing-page' when you're done to go back to the normal page viewing mode.";
cmd_edit_page.icon = "chrome://ubiquity/skin/icons/page_edit.png";
cmd_edit_page.preview = function( pblock ) {
  pblock.innerHTML = cmd_edit_page.description;
};

function cmd_stop_editing_page() {
  CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
  CmdUtils.getDocumentInsecure().designMode='off';
}
cmd_stop_editing_page.description = "If you used the 'edit page' command to put the page into editable mode, use this command to end that mode and go back to normal page viewing.";
cmd_stop_editing_page.preview = function( pblock ) {
  pblock.innerHTML = cmd_stop_editing_page.description;
}
cmd_stop_editing_page.icon = "chrome://ubiquity/skin/icons/page_refresh.png";

// I think edit-mode on and edit-mode off would be

function cmd_save() {
  // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
  CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
  CmdUtils.getDocumentInsecure().designMode = 'off';

  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  var body = jQuery( CmdUtils.getDocumentInsecure().body );

  annotationService.setPageAnnotation(ioservice.newURI(window.content.location.href, null, null), "ubiquity/edit", body.html(), 0, 4);

}
cmd_save.description = "Saves page edits. Undo with 'remove-annotations'";
cmd_save.icon = "chrome://ubiquity/skin/icons/page_save.png";
cmd_save.preview = function( pblock ) {
  pblock.innerHTML = cmd_save.description;
};

var pageLoad_restorePageAnnotations = function () {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var uri = ioservice.newURI(window.content.location.href, null, null);

  var annotationNames = annotationService.getPageAnnotationNames(uri, {});

  for (var i=0; i<annotationNames.length; i++) {

    var annotationName, annotationValue;
    var startNode, endNode;
    var startXpath, endXpath;
    var startOffset, endOffset;

    if (annotationNames[i].match("ubiquity/delete/")) {
      annotationName = annotationNames[i].substring(16);
      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);

      // get xpaths out of name
      startXpath = annotationName.substring(0, annotationName.indexOf("#"));
      endXpath = annotationName.substring(annotationName.indexOf("#") + 1);

      // get offsets out of value
      startOffset = parseInt(annotationValue.substring(0, annotationValue.indexOf("#")));
      endOffset = parseInt(annotationValue.substring(annotationValue.indexOf("#") + 1));


      // find the nodes from the xpaths
      var iterator;
      iterator = doc.evaluate(startXpath, doc, null, XPathResult.ANY_TYPE, null);
      startNode = iterator.iterateNext();
      iterator = doc.evaluate(endXpath, doc, null, XPathResult.ANY_TYPE, null);
      endNode = iterator.iterateNext();


      // delete the text content in between the start and end nodes
      if (startNode == endNode) {
        startNode.textContent = startNode.textContent.substring(0, startOffset) +
          startNode.textContent.substring(endOffset);
      }
      else {
        startNode.textContent = startNode.textContent.substring(0, startOffset);
        var curNode = startNode.nextSibling;
        while (curNode && (curNode != endNode)) {
          curNode.textContent = "";
          curNode = curNode.nextSibling;
        }
        endNode.textContent = endNode.textContent.substring(endOffset);
      }

    }

    if (annotationNames[i] == "ubiquity/edit") {
      // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
      var body = jQuery( CmdUtils.getDocumentInsecure().body );

      annotationValue = annotationService.getPageAnnotation(uri, annotationNames[i]);
      body.html(annotationValue);

      // TODO: Fix "TypeError: head is not defined" on some pages

    }
  }
};
cmd_save.description = "Saves edits you've made to this page in an annotation.";
cmd_save.preview = function( pblock ) {
  pblock.innerHTML = cmd_save.description;
}

// removes all page annotations - add more functionality
function cmd_remove_annotations() {
  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

  annotationService.removePageAnnotations(ioservice.newURI(window.content.location.href, null, null));

  window.content.location.reload();
}
cmd_remove_annotations.description = "Resets any annotation changes you've made to this page.";
cmd_remove_annotations.preview = function( pblock ) {
  pblock.innerHTML = cmd_remove_annotations.description;
};

cmd_remove_annotations.icon = "chrome://ubiquity/skin/icons/page_delete.png";
