/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
 *   Satoshi Murakami <murky.satyr@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// -----------------------------------------------------------------
// SYSTEM COMMANDS
// -----------------------------------------------------------------

const Help = "about:ubiquity";
const Editor = "chrome://ubiquity/content/editor.xhtml";
const CmdList = "chrome://ubiquity/content/cmdlist.xhtml";
const Settings = "chrome://ubiquity/content/settings.xhtml";
const BugReport = ("http://getsatisfaction.com/" +
                   "mozilla/products/mozilla_ubiquity");
const Support = "chrome://ubiquity/content/support.xhtml";

const {prefs} = Application;

Cu.import("resource://ubiquity/modules/setup.js");

XML.prettyPrinting = XML.ignoreWhitespace = false;

CmdUtils.CreateCommand({
  names: ["help", "about", "?"],
  icon: "chrome://ubiquity/skin/icons/help.png",
  description: "" + (
    <>Takes you to the Ubiquity <a href={Help}>main help page</a>.<br/>
      Or, enter the name of a command to get help on that command.</>),
  argument: noun_type_command,
  preview: function help_preview(pblock, {object: {data}}) {
    pblock.innerHTML = data ? data.previewDefault() : this.description;
  },
  execute: function help_execute({object: {data}}) {
    if (data)
      Utils.openUrlInBrowser(CmdList + "#" + data.id);
    else
      Utils.focusUrlInBrowser(Help);
  }
});

CmdUtils.CreateCommand({
  names: ["open (ubiquity settings page)",
          "show (ubiquity settings page)"],
  argument: CmdUtils.NounType("ubiquity settings page", {
    "help": Help,
    "command editor": Editor,
    "command list": CmdList,
    "settings": Settings,
    "support": Support,
    "bug report": BugReport,
  }),
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
      <>Opens one of the Ubiquity documentation/settings pages.</>),
  preview: function open_preview(pb, {object: {text}}) {
    pb.innerHTML = (text
                    ? _("Opens the Ubiquity ${goal} page.",
                        {goal: text})
                    : this.description);
  },
  execute: function open_execute(args) {
    Utils.openUrlInBrowser(args.object.data || Help);
  }
});

CmdUtils.CreateCommand({
  names: ["write ubiquity commands",
          "edit ubiquity commands",
          "hack ubiquity"],
  icon: "chrome://ubiquity/skin/icons/plugin_edit.png",
  description: "" + (
    <>Takes you to the Ubiquity <a href={Editor}>command editor</a> page.</>),
  execute: Editor
});

CmdUtils.CreateCommand({
  names: ["list ubiquity commands"],
  icon: "chrome://ubiquity/skin/icons/application_view_list.png",
  description: "" + (
    <>Opens <a href={CmdList}>the list</a>
      of all Ubiquity commands available and what they all do.</>),
  execute: CmdList
});

CmdUtils.CreateCommand({
  names: ["change ubiquity settings",
          "change ubiquity preferences"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
    <>Takes you to the <a href={Settings}>settings</a> page,
      where you can change your skin, key combinations, etc.</>),
  execute: Settings
});

CmdUtils.CreateCommand({
  names: ["get support"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
    <>Takes you to the <a href={Support}>support</a> page,
    where you can report bugs, get troubleshooting help, etc.</>),
  execute: Support
});

CmdUtils.CreateCommand({
  names: ["report bug"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
    <>Takes you to the <a href={BugReport}>bug report</a> page.</>),
  execute: BugReport
});

CmdUtils.CreateCommand({
  names: ["change skin"],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "Changes your Ubiquity skin.",
  argument: noun_type_skin,
  execute: function chskin_execute({object: {data: skin}}) {
    if (skin)
      UbiquitySetup.createServices().skinService.changeSkin(skin.localUrl);
    else
      Utils.focusUrlInBrowser(Settings);
  },
  preview: function chskin_preview(pb, {object: {html}}) {
    pb.innerHTML = (
      html
      ? _("Changes to ${name}.", {name: html.bold()})
      : this.previewDefault());
  },
});

(function toggleCommand(names, desc, nt, disabled, tmpl) {
  CmdUtils.CreateCommand({
    names: names,
    icon: "chrome://ubiquity/skin/icons/favicon.ico",
    description: desc,
    argument: nt,
    execute: function xable_cmd_execute({object: {text, data: cmd}}) {
      if (cmd) {
        cmd.disabled = disabled;
        displayMessage(text, this);
      }
    },
    preview: function xable_cmd_preview(pb, {object: {html, data: cmd}}) {
      pb.innerHTML = (
        cmd
        ? (CmdUtils.renderTemplate(tmpl, {name: "<b>" + html + "</b>"}) +
           "<hr/>" + cmd.previewDefault())
        : this.description);
    }
  });
  return arguments.callee;
})
(["disable command"],
 ("Disables a Ubiquity command, so that it will no longer " +
  "show up in the suggestion list."),
 noun_type_enabled_command,
 true,
 _("Disables ${name}."))
(["enable command"],
 "Re-enables a Ubiquity command that you disabled.",
 noun_type_disabled_command,
 false,
 _("Enables ${name}."));

var CmdHst = {
  PREF_BIN: "extensions.ubiquity.history.bin",
  PREF_MAX: "extensions.ubiquity.history.max",
  DEFAULT_MAX: 42,
  SEPARATOR: "\n",
  add: function CH_add(str) {
    if (!str) return this;
    var bin = this.get(), idx = bin.indexOf(str);
    if (~idx) bin.unshift(bin.splice(idx, 1)[0]);
    else {
      var max = prefs.getValue(this.PREF_MAX, this.DEFAULT_MAX);
      if (bin.unshift(str) > max) bin.length = max;
    }
    return this._save();
  },
  get: function CH_get() {
    if ("_bin" in this) return this._bin;
    var a = prefs.getValue(this.PREF_BIN, "").split(this.SEPARATOR);
    return this._bin = [h for each (h in a) if (h)];
  },
  set: function CH_set(arr) {
    var bin = this.get();
    bin.splice.apply(bin, [0, 1/0].concat(arr));
    return this._save();
  },
  _save: function CH__save() {
    prefs.setValue(this.PREF_BIN, this._bin.join(this.SEPARATOR));
    return this;
  },
};

CmdUtils.CreateCommand({
  names: ["command history", "vita"],
  arguments: {"object filter": noun_arb_text},
  description: "Accesses your command history.",
  help: "" + (
    <ul style="list-style-image:none">
    <li>Use accesskey or click to reuse.</li>
    <li>Type to filter.</li>
    <li>Execute to delete all matched histories.</li>
    <li>Edit <a href="about:config"><code>{CmdHst.PREF_MAX}</code></a> to
      set max number of histories.</li></ul>),
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  execute: function cmdh_execute({object: {text}}) {
    var bin = CmdHst.get();
    if (!bin.length) return;
    if (text) {
      var rem = this._filter(bin, text, true);
      if (rem.length === bin.length) return;
      CmdHst.set(rem);
      this._say(_("Deleted matched histories. Click here to undo."),
                function cmdh__undo() { CmdHst.set(bin) });
    }
    else this._say(_('Type "^" to delete all.'));
  },
  preview: function cmdh_preview(pb, args) {
    var his = this._filter(CmdHst.get(), args.object.text);
    if (!his.length) {
      pb.innerHTML = ("<em>" + _("No histories match.") + "</em>" +
                      this.help);
      return;
    }
    CmdUtils.previewList(
      pb,
      [<span> <code>{h}</code> </span> for each (h in his)],
      function cmdh__reuse(i) {
        context.chromeWindow.gUbiquity.preview(his[i]);
      });
  },
  _say: function cmdh__say(txt, cb) {
    displayMessage({text: txt, onclick: cb}, this);
  },
  _filter: function cmdh__filter(his, txt, rev) {
    if (txt) {
      try { var re = RegExp(txt, "i") }
      catch(e){ re = RegExp(Utils.regexp.quote(txt), "i") }
      his = [h for each (h in his) if (rev ^ re.test(h))];
    }
    return his;
  },
});

function ubiquityLoad_commandHistory(U) {
  var cursor = -1, {textBox} = U;
  textBox.parentNode.addEventListener("keydown", function loadHistory(ev) {
    if (!ev.ctrlKey) return;
    switch (ev.keyCode) {
      case 38: case 40: { // UP DOWN
        var bin = CmdHst.get();
        if (cursor === -1 && textBox.value) {
          CmdHst.add(textBox.value);
          cursor = 0;
        }
        cursor += 39 - ev.keyCode;
        if (cursor < -1 || bin.length <= cursor) cursor = -1;
        textBox.value = bin[cursor] || "";
        break;
      }
      default: return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  U.msgPanel.addEventListener("popuphidden", function saveEntry() {
    CmdHst.add(textBox.value);
    cursor = -1;
  }, false);
};

function startup_openUbiquityWelcomePage() {
  if (Cu.import("resource://ubiquity/modules/setup.js", null)
      .UbiquitySetup.isNewlyInstalledOrUpgraded)
    Utils.focusUrlInBrowser(Help);
}

function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}
