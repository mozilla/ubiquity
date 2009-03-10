/* This is a template command. */
CmdUtils.CreateCommand({
  name: "example",
  icon: "http://example.com/example.png",
  homepage: "http://example.com/",
  author: {name: "Your Name", email: "you@example.com"},
  license: "GPL",
  description: "A short description of your command",
  help: "How to use your command",
  takes: {"input": /.*/},
  preview: function(pblock, input) {
    pblock.innerHTML = "Your input is <b>" + input.text + "</b>.";
  },
  execute: function(input) {
    displayMessage("You selected: " + input.text);
  }
});
