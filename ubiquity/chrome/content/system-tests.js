var UbiquitySystemTests = {
  output: {done: false,
           errorsOccurred: false,
           errors: ""},

  run: function UbiquitySystemTests_run() {
    var output = UbiquitySystemTests.output;

    Utils.setTimeout(
      function() {
        if (!window.gUbiquity) {
          output.errorsOccurred = true;
          output.errors = "window.gUbiquity is " + window.gUbiquity;
        }
        output.done = true;
      }, 1000);

    // We have to return something or jsbridge hangs.
    return true;
  }
};
