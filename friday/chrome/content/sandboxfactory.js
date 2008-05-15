function SandboxFactory(messageService) {
  this._messageService = messageService;
  this._target = SandboxFactory.target;
  this._globals = {};
}

SandboxFactory.target = this;

SandboxFactory.prototype = {
  SYMBOLS_TO_IMPORT: ["Application", "Components", "window"],

  makeSandbox: function() {
    var sandbox = Components.utils.Sandbox(this._target);
    var messageService = this._messageService;

    for each (symbolName in this.SANDBOX_SYMBOLS_TO_IMPORT) {
      if (this._target[symbolName] && !sandbox[symbolName])
        sandbox[symbolName] = this._target[symbolName];
    }

    sandbox["globals"] = this._globals;

    sandbox.displayMessage = function(msg, title, icon) {
      messageService.displayMessage(msg, title, icon);
    };

    return sandbox;
  }
};
