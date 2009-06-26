var API_KEY = "ABQIAAAAO0oNFUXoUNx4MuxcPwakNhR3yUCx-o6JvWtDFa7jNOakHN7MrBSTsaKtGJjaVMeVURIpTa3cD1qNfA";
// This API key is for https://people.mozilla.com only."
// TODO: Update to use Google Maps API V3, which doesn't require a key

CmdUtils.CreateCommand({
  names: ["map"],
  arguments: [{role: "object",
               nountype: noun_type_async_address,
               label: "address"}],
  icon: "chrome://ubiquity/skin/icons/map.png",
  description: "Turns an address or location name into a Google Map.",
  help:"Try issuing &quot;map kalamazoo&quot;.  You can click on the map in the preview pane to get a" +
       " larger, interactive map that you can zoom and pan around.  You can then click the &quot;insert map in page&quot;" +
       " (if you're in an editable text area) to insert the map.  So you can, for example, type an address in an email, " +
       " select it, issue &quot;map&quot;, click on the preview, and then insert the map.",
  execute: function( arguments ) {
    if (arguments.object && arguments.object.text) {
      var location = arguments.object.text;
      var url = "http://maps.google.com/?q=";
      url += encodeURIComponent(location);

      Utils.openUrlInBrowser( url );
    } else {
      Utils.openUrlInBrowser( "http://maps.google.com" );
    }
  },
  previewUrl: "templates/map.html",
  preview: function(pblock, arguments) {
      // TODO: This isn't terribly safe; ideally, we should be communicating
      // with the other page via DOM events, etc.
    if (arguments.object && arguments.object.text ){
      var dobj = arguments.object;
      var previewWindow = pblock.ownerDocument.defaultView;
      previewWindow = XPCSafeJSObjectWrapper(previewWindow);
      previewWindow.Ubiquity.context = context;

      previewWindow.Ubiquity.resizePreview = function(height) {
        // TODO: Do something to change height of iframe?
      };

      previewWindow.Ubiquity.insertHtml = function(html) {
        if (typeof(html) != "string")
          return;
        var doc = context.focusedWindow.document;
        var focused = context.focusedElement;

        if (doc.designMode == "on") {
          // The "query" here is useful so that you don't have to retype what
          // you put in the map command. That said, this is map-command
          // specific and should be factored out. -- Aza
          doc.execCommand("insertHTML", false, dobj.html + "<br/>" + html);
        }
        else if (CmdUtils.getSelection()) {
	  CmdUtils.setSelection(html);
      	}
      	else {
      	  displayMessage(_("Cannot insert in a non-editable space. Use 'edit page' for an editable page."));
      	}
      };
      previewWindow.Ubiquity.onPreview(dobj);
    } else {
      pblock.innerHTML = this.description;
    }
  }
});

