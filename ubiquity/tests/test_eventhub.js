Components.utils.import("resource://ubiquity/modules/eventhub.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

function HubFramework() {
  let self = this;
  self.hub = new EventHub();
  self.lastNotify = {eventName: undefined, data: undefined};
  self.listener = function listener(eventName, data) {
    self.lastNotify.eventName = eventName;
    self.lastNotify.data = data;
  };
}

function testEHNotifies() {
  let fw = new HubFramework();

  fw.hub.addListener("testEvent", fw.listener);
  fw.hub.notifyListeners("testEvent", "foo");
  this.assertEquals(fw.lastNotify.eventName, "testEvent");
  this.assertEquals(fw.lastNotify.data, "foo");
}

function testEHRemoveWorks() {
  let fw = new HubFramework();

  fw.hub.addListener("testEvent", fw.listener);
  fw.hub.removeListener("testEvent", fw.listener);
  fw.hub.notifyListeners("testEvent", "foo");
  this.assertEquals(fw.lastNotify.eventName, undefined);
  this.assertEquals(fw.lastNotify.data, undefined);
}

function testEHRaisesErrorOnDoubleRemove() {
  let fw = new HubFramework();

  fw.hub.addListener("testEvent", fw.listener);
  fw.hub.removeListener("testEvent", fw.listener);
  this.assertRaisesMessage(
    function() { fw.hub.removeListener("testEvent", fw.listener); },
    'Listener not registered for event "testEvent"'
  );
}

function testEHRaisesErrorOnDoubleRegister() {
  let fw = new HubFramework();

  fw.hub.addListener("testEvent", fw.listener);
  this.assertRaisesMessage(
    function() { fw.hub.addListener("testEvent", fw.listener); },
    'Listener already registered for event "testEvent"'
  );
}

function testEHAttachMethodsWorks() {
  let fw = new HubFramework();

  let obj = new Object();

  fw.hub.attachMethods(obj);

  obj.addListener("testEvent", fw.listener);
  fw.hub.notifyListeners("testEvent", "foo");
  this.assertEquals(fw.lastNotify.eventName, "testEvent");
  this.assertEquals(fw.lastNotify.data, "foo");
  obj.removeListener("testEvent", fw.listener);
}

exportTests(this);
