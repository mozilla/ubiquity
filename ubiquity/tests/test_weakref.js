Components.utils.import("resource://ubiquity/tests/framework.js");

function test_blah() {
  var weakref = Components.classes["@labs.mozilla.com/jsweakrefdi;1"]
                .createInstance(Components.interfaces.nsIJSWeakRef);
  var obj = new Object();
  weakref.set(obj);
  this.assertEquals(weakref.get(), obj,
                    "weakref.get() should be obj.");
}

exportTests(this);
