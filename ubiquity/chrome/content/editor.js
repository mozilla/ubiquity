
var Editor = {
 
  EDITOR_PREF : "extensions.ubiquity.editor",
 
  onLoad : function(){
    var editor = Application.prefs.getValue(this.EDITOR_PREF, null);
    $("#editorInputBox").val(editor);
  },
  onSave : function(){
    Application.prefs.setValue(this.EDITOR_PREF, $("#editorInputBox").val());
  },
  launchEditor : function(value){
    var editor = Application.prefs.getValue(this.EDITOR_PREF, null);
    if(editor == null || editor == "") {
      displayMessage('please set your external editor');
    }
   
    // For the mac, wrap with a call to "open".
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                          .getService(Components.interfaces.nsIXULRuntime);
    var isOSX = ("Darwin"== xulRuntime.OS) && (editor.substring(editor.length-4)==".app");
         
    Application.console.log("Editor        : " + editor);
    Application.console.log("xulRuntime.OS : " + xulRuntime.OS);
    Application.console.log("isOSX         : " + isOSX);
    var executable = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
    executable.followLinks = true;
    if(isOSX) {
            executable.initWithPath("/usr/bin/open");
    } else {
      executable.initWithPath(editor);
    }
    if (executable.exists()) {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties)
                           .get("TmpD", Components.interfaces.nsIFile);
      file.append("ubiquity.tmp");
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
        displayMessage("Error running editor : " + e);
        return null;
      }
      Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Components.interfaces.nsPIExternalAppLauncher).
        deleteTemporaryFileOnExit(file);
      return file;
    } 
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
     
      value = "";
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
        
    editor = document.getElementById("editor");
    file = encodeURIComponent("[gistfile1]");
    quickPaste = "file_ext" + file + "=.js&file_name" + file + "=x&file_contents" + file + "=" + encodeURIComponent(editor.editor.editor.getCode()) + "&x=27&y=27";
    updateUrl = "http://gist.github.com/gists";
    Utils.openUrlInBrowser(updateUrl, quickPaste);
    
  } catch(e) {
    Components.utils.reportError(e);
    displayMessage("Error: " + e);
  }
}

function importTemplate() {
  editor = document.getElementById("editor");
  var template = "\n\
\/* This is a template command */\n\
CmdUtils.CreateCommand({ \n\
  name: \"example\",\n\
  icon: \"http://example.com/example.png\",\n\
  homepage: \"http://example.com/\",\n\
  author: { name: \"Your Name\", email: \"you@example.com\"},\n\
  license: \"GPL\",\n\
  description: \"A short description of your command\",\n\
  help: \"how to use your command\",\n\
  takes: {\"input\": noun_arb_text},\n\
  preview: function( pblock, input ) {\n\
    var template = \"Hello ${name}\";\n\
    pblock.innerHTML = CmdUtils.renderTemplate(template, {\"name\": \"World!\"});\n\
  },\n\
  execute: function(input) {\n\
    CmdUtils.setSelection(\"You selected: \"+input.html);\n\
  }\n\
});";
  editor.editor.setCode(editor.editor.getCode()+template);
  PrefCommands.setCode(editor.editor.getCode());
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
      let editor = document.getElementById("editor");

      saveTextToFile(editor.editor.editor.getCode(), fp.file);

      LinkRelCodeSource.addMarkedPage({url: fp.fileURL.spec,
                                       sourceCode: "",
                                       canUpdate: true});

      editor.editor.setCode("");
      PrefCommands.setCode("");

      $("#editor-actions").html(
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
