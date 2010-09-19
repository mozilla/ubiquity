Cu.import("resource://ubiquity/modules/prefcommands.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquity.properties");

var editor, file, lastModifiedTime = 0;

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
  var besp = this.checked;
  gPrefs.set("extensions.ubiquity.editor.useBespin", besp);
  if (besp) {
    if (self.bespin) {
      $("#editor").hide();
      $("div.bespin").slideDown();
      onBespinLoad();
    }
    else if (!document.querySelector("script[src~=BespinEmbedded]"))
      $("<script>", {src: "bespin/BespinEmbedded.js"}).appendTo("body");
  }
  else {
    $("div.bespin").hide();
    if (editor) editor.focus = false;
    [editor] = $("#editor").slideDown();
    editor.value = PrefCommands.getCode();
    editor.addEventListener("input", updateCode, false);
    editor.focus();
  }
}
function onBespinLoad() {
  ({editor}) = document.getElementById("editor").bespin;
  editor.value = PrefCommands.getCode();
  editor.textChanged.removeAll();
  editor.textChanged.add(updateCode);
  editor.focus = true;
}
function focusEditor() {
  if (editor instanceof Element) editor.focus();
  else editor.focus = true;
}
function updateCode() {
  PrefCommands.setCode(editor.value);
}

var Editor = {
  EDITOR_PREF : "extensions.ubiquity.editor",

  onLoad: function () {
    $("#editorInputBox").val(gPrefs.get(this.EDITOR_PREF, ""));
  },
  onSave: function () {
    gPrefs.set(this.EDITOR_PREF, $("#editorInputBox").val());
  },
  launchEditor: function (value) {
    var editor = gPrefs.getValue(this.EDITOR_PREF, null);
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
      let file = Utils.DirectoryService.get("TmpD", Ci.nsIFile);
      file.append("ubiquity.tmp.js");
      file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

      let foStream = (Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream));

      // use 0x02 | 0x10 to open file for appending.
      foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
      // write, create, truncate
      // In a c file operation, we have no need to set file mode with or operation,
      // directly using "r" or "w" usually.
      foStream.write(value, value.length);
      foStream.close();
      try {
        let process = (Cc["@mozilla.org/process/util;1"]
                       .createInstance(Ci.nsIProcess));
        process.init(executable);
        let args = [];
        if (isOSX) args.push("-a", editor, file.path);
        else args[0] = file.path;
        ret = process.run(false, args, args.length);
      } catch (e) {
        Cu.reportError(e);
        displayMessage("Error running editor : " + e);
        return null;
      }
      Cc["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Ci.nsPIExternalAppLauncher).
        deleteTemporaryFileOnExit(file);
      return file;
    }
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
    var code = editor.value;
    pasteToGist("x", code, /^\s*</.test(code) ? "xhtml" : "js");
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
    fp.init(window, L("ubiquity.editor.savecommands"), nsIFilePicker.modeSave);
    fp.appendFilter("JavaScript", "*.js");
    if (fp.show() == nsIFilePicker.returnCancel) return;

    saveTextToFile(editor.value, fp.file);
    UbiquitySetup.createServices().feedManager.addSubscribedFeed({
      title: fp.file.leafName,
      sourceUrl: fp.fileURL.spec,
      canAutoUpdate: true,
    });
    PrefCommands.setCode(editor.value = "");
    $("#editor-log").html(
      "<p>" + L("ubiquity.editor.savelogmsgp1",
                "<strong>" + H(fp.file.path) + "</strong>") + "</p>" +
      "<p>" + L("ubiquity.editor.savelogmsgp2") + "</p>");
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
  $("#notification-bar").hide().text(msg).show("fast");
}

function onload() {
  var [ubcb] = $("#usebespin").change(changeEditor);
  ubcb.checked = gPrefs.get("extensions.ubiquity.editor.useBespin", true);
  changeEditor.call(ubcb);
  Editor.onLoad();
}
