Cu.import("resource://ubiquity/modules/prefcommands.js");

var editor, file, lastModifiedTime = 0;

function initialize() {
  document.getElementById("feedTypeMenu").value = PrefCommands.type;
}
function launch() {
  file = Editor.launchEditor(editor.value);
  if (!file || !file.exists()) return;
  lastModifiedTime = file.lastModifiedTime;
  setTimeout(watchFile, 500);
}
function watchFile() {
  if (!file || !file.exists()) return;
  var time = file.lastModifiedTime;
  if (time > lastModifiedTime) {
    PrefCommands.setCode(editor.value = Editor.readFile(file));
    lastModifiedTime = time;
  }
  setTimeout(watchFile, 500);
}

function changeEditor() {
  var bespin = this.checked;
  gPrefs.set("extensions.ubiquity.editor.useBespin", bespin);
  var $ediv = $("#editor-div").empty();
  if (bespin) {
    let [iframe] = $("<iframe/>", {
      src: "chrome://ubiquity/content/bespin.html",
      style: "width: 100%; height: 100%; border:0",
    }).appendTo($ediv);
    addEventListener("message", onBespin, false);
  }
  else {
    editor = document.createElement("textarea");
    editor.style.cssText = "width:100%; height:100%";
    editor.value = PrefCommands.getCode();
    editor.addEventListener("input", updateCode, false);
    $ediv.append(editor);
    editor.focus();
  }
}
function onBespin(ev) {
  var [win] = frames;
  editor = (win.wrappedJSObject || win)[ev.data];
  editor.value = PrefCommands.getCode();
  editor.element.addEventListener("keyup", updateCode, false);
  focusEditor();
}
function focusEditor() {
  if ("focus" in editor) editor.focus();
  else {
    editor.getPath("pane.applicationView.centerView.textView").focus();
    editor.get("pane").becomeKeyPane();
  }
}
function updateCode() {
  PrefCommands.setCode(editor.value);
}

var Editor = {
  EDITOR_PREF : "extensions.ubiquity.editor",

  onFeedTypeChange: function () {
    var value = $("#feedTypeMenu").val();
    PrefCommands.changeType(value);
    $(".feed-type-desc").hide();
    $("#" + value).show();
  },
  onLoad: function () {
    var editor = gPrefs.getValue(this.EDITOR_PREF, null);
    $("#editorInputBox").val(editor);
    this.onFeedTypeChange();
  },
  onSave: function () {
    gPrefs.setValue(this.EDITOR_PREF, $("#editorInputBox").val());
  },
  launchEditor: function (value) {
    var editor = gPrefs.getValue(this.EDITOR_PREF, null);
    //errorToLocalize
    if (!editor) {
      displayMessage("please set your external editor");
      return;
    }

    // For the mac, wrap with a call to "open".
    var isOSX = Utils.OS === "Darwin" && editor.slice(-4) === ".app";
    var executable = (Cc["@mozilla.org/file/local;1"]
                      .createInstance(Ci.nsILocalFile));
    executable.followLinks = true;
    executable.initWithPath(isOSX ? "/usr/bin/open" : editor);
    if (executable.exists()) {
      var file = Utils.DirectoryService.get("TmpD", Ci.nsIFile);
      file.append("ubiquity.tmp.js");
      file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

      Utils.reportInfo("temp file path    : " + file.path);
      // file is nsIFile, data is a string
      var foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream));

      // use 0x02 | 0x10 to open file for appending.
      foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
      // write, create, truncate
      // In a c file operation, we have no need to set file mode with or operation,
      // directly using "r" or "w" usually.
      foStream.write(value, value.length);
      foStream.close();
      try {
        var process = (Cc["@mozilla.org/process/util;1"]
                       .createInstance(Ci.nsIProcess));
        process.init(executable);
        var args = new Array();
        if (isOSX) {
          args[0] = "-a";
          args[1] = editor;
          args[2] = file.path;
        }
        else {
          args[0] = file.path;
        }
        Utils.reportInfo("Executable : " + executable);
        Utils.reportInfo("args       : " + args);
        ret = process.run(false, args, args.length);
        Utils.reportInfo("ret code   : " + ret);
      } catch (e) {
        Cu.reportError(e);
        //errorToLocalize
        displayMessage("Error running editor : " + e);
        return null;
      }
      Cc["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Ci.nsPIExternalAppLauncher).
        deleteTemporaryFileOnExit(file);
      return file;
    }
    //errorToLocalize
    displayMessage(editor + " is not an executable");
    return null;
  },
  readFile: function (file) {
    var fstream = (Cc["@mozilla.org/network/file-input-stream;1"]
                   .createInstance(Ci.nsIFileInputStream));
    var sstream = (Cc["@mozilla.org/scriptableinputstream;1"]
                   .createInstance(Ci.nsIScriptableInputStream));
    fstream.init(file, -1, 0, 0);
    sstream.init(fstream);

    var value = "";
    var str = sstream.read(4096);
    while (str) {
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
    var code = editor.value;
    if (feedType === "commands")
      pasteToGist("x", code, /^\s*</.test(code) ? "xhtml" : "js");
    else if (feedType === "locked-down-commands") {
      var url = ("http://ubiquity.mozilla.com/locked-down-feeds/" +
                 "?initial_content=" + encodeURIComponent(code));
      Utils.openUrlInBrowser(url);
    }
  } catch (e) {
    Cu.reportError(e);
    displayMessage(e);
  }
}

function importTemplate() {
  var code = Utils.getLocalUrl("command-template.js") + editor.value;
  PrefCommands.setCode(editor.value = code);
  focusEditor();
}

function saveAs() {
  try {
    const {nsIFilePicker} = Ci;

    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Save your commands", nsIFilePicker.modeSave);

    //Save as a javascript file
    //fp.appendFilters(nsIFilePicker.filterAll);
    fp.appendFilter("JavaScript", "*.js");

    var rv = fp.show();
    if (rv === nsIFilePicker.returnOK || rv === nsIFilePicker.returnReplace) {
      saveTextToFile(editor.value, fp.file);

      let feedMgr = UbiquitySetup.createServices().feedManager;
      feedMgr.addSubscribedFeed({
        url: fp.fileURL.spec,
        sourceUrl: fp.fileURL.spec,
        sourceCode: "",
        canAutoUpdate: true});

      PrefCommands.setCode(editor.value = "");
      //ToLocalize
      $("#editor-log").html(
        "<p>The command source was saved to <strong>" + fp.file.path +
        "</strong> and you are now subscribed to that page. Edit that file " +
        "and any changes will take effect the moment you invoke Ubiquity." +
        "</p><p>You can remove this subscription on the " +
        "<a href='about:ubiquity?cmdlist'>Command List</a>.</p>");
    }
  } catch (e) {
    Cu.reportError(e);
    displayMessage(e);
  }
}

function saveTextToFile(text, file) {
  var foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                  .createInstance(Ci.nsIFileOutputStream));
  // write, create, truncate; r+W for owner, read-only for everybody else
  foStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);

  var os = (Cc["@mozilla.org/intl/converter-output-stream;1"]
            .createInstance(Ci.nsIConverterOutputStream));
  os.init(foStream, "UTF-8", 0, 0x0000);

  os.writeString(text);
  os.close();

  foStream.close();
}

function displayMessage(msg) {
  $("#notification-bar").text(msg).show("fast");
}

function onload() {
  initialize();
  var [ubcb] = $("#usebespin").change(changeEditor);
  ubcb.checked = gPrefs.get("extensions.ubiquity.editor.useBespin", true);
  changeEditor.call(ubcb);
}
