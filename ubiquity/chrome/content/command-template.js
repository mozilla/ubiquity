/* This is a template command. */
CmdUtils.CreateCommand({
  names: ["example"],
  description: "A short description of your command.",
  help: "How to use your command.",
  author: {
    name: "Your Name",
    email: "you@mozilla.com",
    homepage: "http://labs.mozilla.com/",
  },
  license: "GPL",
  homepage: "http://ubiquity.mozilla.com/",
  icon: "http://www.mozilla.com/favicon.ico",
  arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
  execute: function execute(args) {
    displayMessage("You input: " + args.object.text, this);
  },
  preview: function preview(pblock, args) {
    pblock.innerHTML = "Your input is " + args.object.html.bold() + ".";
  },
});

