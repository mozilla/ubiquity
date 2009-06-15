/* This is a template command. */
CmdUtils.CreateCommand({
  name: "example",
  icon: "http://www.mozilla.com/favicon.ico",
  description: "A short description of your command.",
  help: "How to use your command.",
  author: {name: "Your Name", email: "you@mozilla.com"},
  license: "GPL",
  homepage: "http://www.mozilla.com/",
  arguments: {object: noun_arb_text},
  preview: function(pblock, args) {
    pblock.innerHTML = "Your input is <b>" + args.object.html + "</b>.";
  },
  execute: function(args) {
    displayMessage("You selected: " + args.object.text, this);
  }
});

