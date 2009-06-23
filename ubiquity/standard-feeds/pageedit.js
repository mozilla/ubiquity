
CmdUtils.CreateCommand({
  names: ["delete"],
  description: "Deletes the selected chunk of HTML from the page.",
  icon: "chrome://ubiquity/skin/icons/delete.png",
  execute: function() {
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
});

CmdUtils.CreateCommand({
  names: ["undelete"],
  description: "Restores the HTML deleted by the delete command.",
  icon: "chrome://ubiquity/skin/icons/arrow_undo.png",
  execute: function() {
    CmdUtils.loadJQuery(function(jQuery) {
      jQuery("._toRemove").slideDown();
    });
  }
});

CmdUtils.CreateCommand({
  names: ["edit page", "turn on edit mode"],
  description: "Puts the web page into a mode where you can edit the contents.",
  help: "In edit mode, you can edit the page like any document: Select text, delete it, add to it, copy and paste it.  Issue \'bold\', \'italic\', or \'underline\' commands to add formatting.  Issue the 'save' command to save your changes so they persist even when you reload the page.  Issue 'stop-editing-page' when you're done to go back to the normal page viewing mode.",
  icon: "chrome://ubiquity/skin/icons/page_edit.png",
  execute: function() {
    // TODO: works w/o wrappedJSObject in CmdUtils.getDocumentInsecure() call- fix this
    CmdUtils.getDocumentInsecure().body.contentEditable = 'true';
    CmdUtils.getDocumentInsecure().designMode='on';
  }
});

CmdUtils.CreateCommand({
  names: ["stop editing page", "turn off edit mode"],
  description: "If you used the 'edit page' command to put the page into " +
               "editable mode, use this command to end that mode and go " +
                "back to normal page viewing. If you want the changes to " +
                "persist on page reload, issue the 'save' command first.",
  icon: "chrome://ubiquity/skin/icons/page_refresh.png",
  execute: function() {
    CmdUtils.getDocumentInsecure().body.contentEditable = 'false';
    CmdUtils.getDocumentInsecure().designMode='off';
  }
});

CmdUtils.CreateCommand({
  names: ["save page edits"],
  description: "Saves edits you've made to this page in an annotation. " +
               "They will persist on page reload. You can remove them " +
               "with the 'undo page edits' command.",
  icon: "chrome://ubiquity/skin/icons/page_save.png",
  execute: function() {
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
});

var pageLoad_restorePageAnnotations = function (window) {
  if (!window.location)
    return;

  var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                          .getService(Components.interfaces.nsIAnnotationService);
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

  var uri = ioservice.newURI(window.location.href, null, null);

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

// removes all page annotations - add more functionality
CmdUtils.CreateCommand({
  names: ["undo page edits", "remove annotations"],
  description: "Resets any annotation changes you've made to this page.",
  icon: "chrome://ubiquity/skin/icons/page_delete.png",
  execute: function() {
    var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
                            .getService(Components.interfaces.nsIAnnotationService);
    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
    annotationService.removePageAnnotations(ioservice.newURI(window.content.location.href, null, null));
    window.content.location.reload();
  }
});