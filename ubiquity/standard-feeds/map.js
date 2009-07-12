var API_KEY = "ABQIAAAAO0oNFUXoUNx4MuxcPwakNhR3yUCx-o6JvWtDFa7jNOakHN7MrBSTsaKtGJjaVMeVURIpTa3cD1qNfA";
// This API key is for https://people.mozilla.com only."
// TODO: Update to use Google Maps API V3, which doesn't require a key

CmdUtils.CreateCommand({
  names: ["map"],
  arguments: {object: noun_type_async_address},
  icon: "chrome://ubiquity/skin/icons/map.png",
  description: "Turns an address or location name into a Google Map.",
  help: "Try issuing &quot;map kalamazoo&quot;.  You can click on the map in the preview pane to get a" +
       " larger, interactive map that you can zoom and pan around.  You can then click the &quot;insert map in page&quot;" +
       " (if you're in an editable text area) to insert the map.  So you can, for example, type an address in an email, " +
       " select it, issue &quot;map&quot;, click on the preview, and then insert the map.",
  execute: function map_execute({object: {text}}) {
    Utils.openUrlInBrowser("http://maps.google.com/" +
                           (text ? "?q=" + encodeURIComponent(text) : ""));
  },
  previewUrl: "templates/map.html",
  preview: function map_preview(pblock, {object}) {
    // TODO: This isn't terribly safe; ideally, we should be communicating
    // with the other page via DOM events, etc.
    var previewWindow =
      XPCSafeJSObjectWrapper(pblock.ownerDocument.defaultView);
    var {Ubiquity} = previewWindow;

    Ubiquity.context = context;
    Ubiquity.resizePreview = function map_resizePreview(height) {
      // TODO: Do something to change height of iframe?
    };
    Ubiquity.insertHtml = function map_insertHtml(html, text) {
      if (typeof html !== "string")
        return;
      var doc = context.focusedWindow.document;
      var focused = context.focusedElement;
      
      if (doc.designMode === "on") {
        // The "query" here is useful so that you don't have to retype what
        // you put in the map command. That said, this is map-command
        // specific and should be factored out. -- Aza
        doc.execCommand("insertHTML", false, object.html + "<br/>" + html);
      }
      else if (CmdUtils.getSelection() ||
               $(context.focusedElement).is("input:text, textarea"))
        CmdUtils.setSelection(html, {text: text});
      else {
        Utils.clipboard.text = text;
        displayMessage(_("Cannot insert in a non-editable space. " +
                         "Use 'edit page' for an editable page."));
      }
    };
    Ubiquity.onPreview(object);
  }
});
