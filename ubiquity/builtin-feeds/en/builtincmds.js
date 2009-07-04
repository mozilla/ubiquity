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
const Editor = "chrome://ubiquity/content/editor.html";
const CmdList = "chrome://ubiquity/content/cmdlist.html";
const Settings = "chrome://ubiquity/content/settings.html";
const BugReport = "http://getsatisfaction.com/mozilla/products/mozilla_ubiquity";
const Support = "chrome://ubiquity/content/support.html";

XML.prettyPrinting = XML.ignoreWhitespace = false;

CmdUtils.CreateCommand({
  names: ["help", "about", "?"],
  icon: "chrome://ubiquity/skin/icons/help.png",
  description: "" + (
    <>Takes you to the Ubiquity <a href={Help}>main help page</a>.<br/>
      Or, enter the name of a command to get help on that command.</>),
  argument: noun_type_command,
  preview: function(pblock, {object: {data}}) {
    pblock.innerHTML = data ? data.previewDefault() : this.description;
  },
  execute: function({object: {data}}) {
    if (data)
      Utils.openUrlInBrowser(CmdList + "#" + data.id);
    else
      Utils.focusUrlInBrowser(Help);
  }
});

CmdUtils.CreateCommand({
  names: ["open (ubiquity settings page)",
          "show (ubiquity settings page)"],
  arguments: [{ role: "object",
                nountype: ["help",
                           "command editor",
                           "command list",
                           "settings",
                           "support",
                           "bug report"],
                label: "ubiquity settings page" }],
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  description: "" + (
      <>Opens one of the Ubiquity documentation/settings pages.</>),
  preview: function( pBlock, args ){
    if (args.object.text) {
      pBlock.innerHTML = _("Opens the Ubiquity ${goal} page.",
                           {goal: args.object.text});
    }
    else {
      pBlock.innerHtml = this.description;
    }
  },
  execute: function( args ) {
    var targetPage;
    if (!args.object || !args.object.text) {
      targetPage = Help;
    }
    else {
      switch (args.object.text) {
      // we won't localize these for the time being, as they're
      // dependent on the nountype being localized
      case "help":
        targetPage = Help;
        break;
      case "command editor":
        targetPage = Editor;
        break;
      case "command list":
        targetPage = CmdList;
        break;
      case "settings":
        targetPage = Settings;
        break;
      case "support":
        targetPage = Support;
        break;
      case "bug report":
        targetPage = BugReport;
        break;
      }
    }
    Utils.openUrlInBrowser( targetPage );
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
          "change ubiquity preferences",
          "change ubiquity skin"],
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

(function toggleCommand(names, desc, nt, disabled, tmpl) {
  CmdUtils.CreateCommand({
    names: names,
    icon: "chrome://ubiquity/skin/icons/favicon.ico",
    description: desc,
    argument: nt,
    execute: function({object: {text, data: cmd}}) {
      if (cmd) {
        cmd.disabled = disabled;
        displayMessage(text, this);
      }
    },
    preview: function(pb, {object: {html, data: cmd}}) {
      pb.innerHTML = (
        cmd
        ? CmdUtils.renderTemplate(tmpl,
                                  { name: "<b>" + html + "</b>",
                                    help: cmd.previewDefault() })
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
 "Disables ${name}.<hr/>${help}")
(["enable command"],
 "Re-enables a Ubiquity command that you disabled.",
 noun_type_disabled_command,
 false,
 "Enables ${name}.<hr/>${help}");

var ubiquityLoad_commandHistory = (function() {{}
const
Name = "command history",
PHistory = "extensions.ubiquity.history.",
PBin = PHistory + "bin",
PMax = PHistory + "max",
DefaultMax = 42,
Sep = "\n",
{prefs} = Application;
CmdUtils.CreateCommand({
  names: [Name, "vita"],
  arguments: {"object filter": noun_arb_text},
  description: "Accesses your command history.",
  help: "" + (
    <ul style="list-style-image:none">
    <li>Use accesskey or click to reuse.</li>
    <li>Type to filter.</li>
    <li>Execute to delete all matched histories.</li>
    <li>Edit <a href="about:config"><code>{PMax}</code></a> to
      set max number of histories.</li></ul>),
  author: {name: "satyr", email: "murky.satyr@gmail.com"},
  license: "MIT",
  icon: "chrome://ubiquity/skin/icons/favicon.ico",
  execute: function({object: {text}}) {
    var bin = Utils.trim(prefs.getValue(PBin, ""));
    if (!bin) return;
    if (text) {
      var rem = this._get(text, true).join(Sep);
      if (rem.length === bin.length) return;
      prefs.setValue(PBin, rem);
      this._say(_("Deleted matched histories. Click here to undo."),
                function() { prefs.setValue(PBin, bin) });
    } else
      this._say('Type "^" to delete all.');
  },
  preview: function(pbl, args) {
    var his = this._get(args.object.text);
    if (!his[0]) {
      pbl.innerHTML = "<i>"+_("No histories match.")+"</i>" + this.help;
      return;
    }
    CmdUtils.previewList(
      pbl,
      [<span> <code>{h}</code> </span> for each (h in his)],
      function(i) {
        var {gUbiquity} = context.chromeWindow;
        gUbiquity.__textBox.value = his[i];
        gUbiquity.__delayedProcessInput();
      });
  },
  _say: function(txt, cb) {
    displayMessage({text: txt, onclick: cb}, this);
  },
  _get: function(txt, rev) {
    var bin = Utils.trim(prefs.getValue(PBin, ""));
    if (!bin) return [];
    var his = bin.split(Sep);
    if (txt) {
      try { var re = RegExp(txt, "i") }
      catch(e){ re = RegExp(txt.replace(/\W/g, "\\$&"), "i") }
      his = his.filter(function(h) h && rev ^ re.test(h));
    }
    return his;
  },
});
return function UL_commandHistory(U) {
  U.__msgPanel.addEventListener("popuphidden", function saveEntry() {
    var ent = Utils.trim(U.__textBox.value);
    if (!ent) return;
    var his = prefs.getValue(PBin, "").split(Sep), idx = his.indexOf(ent);
    if (~idx) his.unshift(his.splice(idx, 1));
    else {
      var max = prefs.getValue(PMax, DefaultMax);
      if (his.unshift(ent) > max) his.length = max;
    }
    prefs.setValue(PBin, his.join(Sep));
  }, false);
};
})();

function startup_openUbiquityWelcomePage() {
  if (Components.utils.import("resource://ubiquity/modules/setup.js", null)
      .UbiquitySetup.isNewlyInstalledOrUpgraded)
    Utils.focusUrlInBrowser(Help);
}

function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}
