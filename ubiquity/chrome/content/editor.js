Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/prefcommands.js");
Cu.import("resource://ubiquity/modules/setup.js");


function BespinEditor() {};
BespinEditor.prototype = {
  CHARSET: 'utf-8',
  _component: null,
  initUI: function initUI(divId, window) {
    // Loads and configures the objects that the editor needs
    var self = this;
    var save;
    self._component = new bespin.editor.Component(divId,{language:    "js", 
                                                         loadfromdiv: true,
                                                         set: {tabmode: "off",
                                                               tabsize: 2,
                                                               closepairs: "on",
                                                               autoindent: "on"}});
    document.getElementById(divId)._editor = self._component;
  },
};

var Editor = {
  EDITOR_PREF : "extensions.ubiquity.editor",

  onFeedTypeChange: function() {
    var value = $("#feedTypeMenu").val();
    PrefCommands.changeType(value);
    $(".feed-type-desc").hide();
    $("#" + value).show();
  },
  onLoad : function(){
    var editor = Application.prefs.getValue(this.EDITOR_PREF, null);
    $("#editorInputBox").val(editor);
    this.onFeedTypeChange();
  },
  onSave : function(){
    Application.prefs.setValue(this.EDITOR_PREF, $("#editorInputBox").val());
  },
  launchEditor : function(value){
    var editor = Application.prefs.getValue(this.EDITOR_PREF, null);
    //errorToLocalize
    if (editor == null || editor == "") {
      displayMessage('please set your external editor');
    }

    // For the mac, wrap with a call to "open".
    var isOSX = Utils.OS === "Darwin" && editor.slice(-4) === ".app";
    var executable = (Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsILocalFile));
    executable.followLinks = true;
    executable.initWithPath(isOSX ? "/usr/bin/open" : editor);
    if (executable.exists()) {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties)
                           .get("TmpD", Components.interfaces.nsIFile);
      file.append("ubiquity.tmp.js");
      file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

      Application.console.log("temp file path    : " + file.path);
      // file is nsIFile, data is a string
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                               .createInstance(Components.interfaces.nsIFileOutputStream);

      // use 0x02 | 0x10 to open file for appending.
      foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
      // write, create, truncate
      // In a c file operation, we have no need to set file mode with or operation,
      // directly using "r" or "w" usually.
      foStream.write(value, value.length);
      foStream.close();
      try {
        var process = Components.classes["@mozilla.org/process/util;1"]
                            .createInstance(Components.interfaces.nsIProcess);
        process.init(executable);
        var args = new Array();
        if(isOSX) {
          args[0] = "-a";
          args[1] = editor;
          args[2] = file.path;
        } else {
          args[0] = file.path;
        }
        Application.console.log("Executable : " + executable);
        Application.console.log("args       : " + args);
        ret = process.run(false, args, args.length);
        Application.console.log("ret code   : " + ret);
      } catch (e) {
        Application.console.log("Error running editor         : " + e);
        //errorToLocalize
        displayMessage("Error running editor : " + e);
        return null;
      }
      Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Components.interfaces.nsPIExternalAppLauncher).
        deleteTemporaryFileOnExit(file);
      return file;
    }
    //errorToLocalize
    displayMessage(editor + ' is not an executable');
    return null;
  },
  readFile : function(file) {
      var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                              .createInstance(Components.interfaces.nsIFileInputStream);
      var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                              .createInstance(Components.interfaces.nsIScriptableInputStream);
      fstream.init(file, -1, 0, 0);
      sstream.init(fstream);

      var value = "";
      var str = sstream.read(4096);
      while (str.length > 0) {
        value += str;
        str = sstream.read(4096);
      }

      sstream.close();
      fstream.close();
      return value;
  }
}

function paste() {
  try {
    var feedType = $("#feedTypeMenu").val();
    var editor = document.getElementById("editor-div");
    var code = editor._editor.getContent();
    if (feedType == "commands") {
      var file = encodeURIComponent("[gistfile1]");
      var quickPaste = ("file_ext" + file + "=.js&file_name" +
                        file + "=x.js&file_contents" + file +
                        "=" + encodeURIComponent(code));
      var updateUrl = "http://gist.github.com/gists";
      Utils.openUrlInBrowser(updateUrl, quickPaste);
    } else if (feedType == "locked-down-commands") {
      var url = ("http://ubiquity.mozilla.com/locked-down-feeds/" +
                 "?initial_content=" + encodeURIComponent(code));
      Utils.openUrlInBrowser(url);
    }
  } catch(e) {
    Cu.reportError(e);
    displayMessage("Error: " + e);
  }
}

function importTemplate() {
  var {_editor} = document.getElementById("editor-div");
  var code = (Utils.getLocalUrl("command-template.js") +
              _editor.getContent());
  _editor.setContent(code);
  PrefCommands.setCode(code);
  document.getElementById("canvas").focus();
}

function saveAs() {
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
                 .createInstance(nsIFilePicker);
    fp.init(window, "Save your commands", nsIFilePicker.modeSave);

    //Save as a javascript file
    //fp.appendFilters(nsIFilePicker.filterAll);
    fp.appendFilter("Javascript","*.js");

    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      let editor = document.getElementById("editor-div");

      saveTextToFile(editor._editor.getContent(), fp.file);

      let feedMgr = UbiquitySetup.createServices().feedManager;
      feedMgr.addSubscribedFeed({url: fp.fileURL.spec,
                                        sourceUrl: fp.fileURL.spec,
                                        sourceCode: "",
                                        canAutoUpdate: true});

      editor._editor.setContent("");
      PrefCommands.setCode("");
      //errorToLocalize
      $("#editor-log").html(
        "<p>The command source was saved to <strong>" + fp.file.path + "</strong> " +
        "and you are now subscribed to that page. Edit that file and any " +
        "changes will take effect the moment you invoke Ubiquity.</p>" +
        "<p>You can remove this subscription on the " +
        "<a href='about:ubiquity'>Ubiquity main page</a></p>");
    }
  } catch(e) {
    Cu.reportError(e);
    displayMessage("Error: " + e);
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

function displayMessage(msg){
  $("#notification-bar").text(msg).show("fast");
}

$(function ready() {
  $("#editor-div").bind("keyup", function updateCode(){
    PrefCommands.setCode(this._editor.getContent());
  });
});
