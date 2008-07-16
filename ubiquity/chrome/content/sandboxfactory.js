function SandboxFactory(globals) {
  this._target = SandboxFactory.target;

  if (globals == undefined)
    globals = {};
  this._globals = globals;
}

SandboxFactory.target = this;

SandboxFactory.prototype = {
  makeSandbox: function() {
    var sandbox = Components.utils.Sandbox(this._target);

    for (symbolName in this._globals) {
      sandbox[symbolName] = this._globals[symbolName];
    }

    return sandbox;
  },

  evalInSandbox: function(code, sandbox) {
    Components.utils.evalInSandbox(code, sandbox);
  }
};
