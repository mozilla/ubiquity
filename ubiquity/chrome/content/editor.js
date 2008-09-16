function saveAs() {
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
                 .createInstance(nsIFilePicker);
    fp.init(window, "Dialog Title", nsIFilePicker.modeSave);
    fp.appendFilters(nsIFilePicker.filterAll);

    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      let editor = document.getElementById("editor");

      saveTextToFile(editor.value, fp.file);

      LinkRelCodeSource.addMarkedPage({url: fp.fileURL.spec,
                                       sourceCode: "",
                                       canUpdate: true});

      editor.value = "";
      PrefCommands.setCode("");

      $("#save-as-div").html(
        "<p>The command source was saved to <b>" + fp.file.path + "</b> " +
        "and you are now subscribed to that page. Edit that file and any " +
        "changes will take effect the moment you invoke Ubiquity.</p>" +
        "<p>You can remove this subscription on the " +
        "<a href='about:ubiquity'>Ubiquity main page</a></p>" +
        "<p><a href=''>Reload this page</a> to create a new command.</p>");
      $("#editor-div").slideUp();
    }
  } catch(e) {
    Components.utils.reportError(e);
    alert("Error: " + e);
  }
}


function saveTextToFile(text, file) {
  var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                           .createInstance(Components.interfaces.nsIFileOutputStream);
  // write, create, truncate; r+W for owner, read-only for everybody else
  foStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);

  var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                     .createInstance(Components.interfaces.nsIConverterOutputStream);
  os.init(foStream, "UTF-8", 0, 0x0000);

  os.writeString(text);
  os.close();

  foStream.close();
}
