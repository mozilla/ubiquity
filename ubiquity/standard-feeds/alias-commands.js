CmdUtils.CreateCommand({
  names: ["germanize"],
  icon: "chrome://ubiquity/skin/icons/german_flag.png",
  arguments: [{role: "object", nountype: noun_arb_text},
              {role: "source", nountype: noun_type_lang_google}],
  preview: function germanize_preview(pblock, args) {
    CmdUtils.previewCommand("translate", pblock, this._setArgs(args));
  },
  execute: function germanize_execute(args) {
    CmdUtils.executeCommand("translate", this._setArgs(args));
  },
  _setArgs: function germanize__setArgs(args){
    var a = {};
    for (var [k, v] in new Iterator(args)) a[k] = v;
    a.goal = this._goal;
    return a;
  },
  _goal: noun_type_lang_google.suggest("^German$")[0],
});

CmdUtils.CreateAlias({
  names: ["anglicize"],
  verb: "translate",
  givenArgs: { goal: "English" },
  icon: "resource://ubiquity/chrome/skin/icons/union_jack.ico"
});
