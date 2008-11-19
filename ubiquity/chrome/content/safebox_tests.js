Components.utils.import("resource://ubiquity-modules/safebox.js");

function testSafeboxWorks() {
  let inf = {evalInSandbox: Components.utils.evalInSandbox,
             sandbox: Components.utils.Sandbox('http://www.foo.com')};
  let safebox = new SafeBox(inf.sandbox, inf.evalInSandbox);

  let test = this;
  let received;

  let responder = {
    receiveFromInside: function receiveFromInside(obj) {
      test.assert(typeof(received) == 'undefined');
      received = obj;
    }
  };

  // This function won't actually be used from outside the sandbox,
  // it'll just be toString()'d and evaluated in the context of the
  // sandbox.
  function receiveFromOutside(obj) {
    var val = 0;
    sendOutside({hi: obj.hai + 1,
                 get dynamic() { return val++; },
                 get isEvil() {
                   try {
                     var s = Components.utils.Sandbox('http://www.goo.com');
                     return true;
                   } catch (e) {
                     return false;
                   }
                 }});
  }

  inf.evalInSandbox(receiveFromOutside.toString(), inf.sandbox);
  safebox.addResponder(responder);
  safebox.sendInside({hai: 2});

  test.assert(received.hi == 3);
  test.assert(received.dynamic == 0);
  test.assert(received.dynamic == 0);
  test.assert(received.isEvil == false);
}
