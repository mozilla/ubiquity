/* This is a template command. */
CmdUtils.CreateCommand({
  name: "example",
  description: "(A short description of your command)",
  help: "(How to use your command)",
  icon: "http://www.mozilla.com/favicon.ico",
  author: {name: "Your Name", email: "you@mozilla.com"},
  license: "GPL",
  homepage: "http://www.mozilla.com/",
  takes: {"input": /.*/},
  preview: function(pblock, input) {
    pblock.innerHTML = "Your input is <b>" + input.html + "</b>.";
  },
  execute: function(input) {
    displayMessage("You selected: " + input.text);
  }
});
