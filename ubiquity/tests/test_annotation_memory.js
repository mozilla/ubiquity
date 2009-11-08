Components.utils.import("resource://ubiquity/modules/annotation_memory.js");
Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

EXPORTED_SYMBOLS = ["TestAnnotationMemory"];

function TestAnnotationMemory(test) {
  return new AnnotationService(getTempConnection(test));
}

function getTempDbFile() {
  var Ci = Components.interfaces;
  var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Ci.nsIProperties);
  var file = dirSvc.get("TmpD", Ci.nsIFile);
  file.append("testdb.sqlite");
  file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0x600);
  return file;
}

function getTempConnection(test) {
  var file = getTempDbFile();

  if (file.exists())
    file.remove(false);

  var connection = AnnotationService.openDatabase(file);

  function teardown() {
    connection.close();
    file.remove(false);
  };

  test.addToTeardown(teardown);

  return connection;
}

function testMemoryPersists() {
  var file = getTempDbFile();

  if (file.exists())
    file.remove(false);

  var connection = AnnotationService.openDatabase(file);
  var annSvc = new AnnotationService(connection);

  function reopenDb() {
    connection.close();
    connection = AnnotationService.openDatabase(file);
    annSvc = new AnnotationService(connection);
  }

  var url = Utils.url("http://www.foo.com");
  annSvc.setPageAnnotation(url, "perm", "foo");
  this.assertEquals(annSvc.getPagesWithAnnotation("perm").length, 1);

  annSvc.setPageAnnotation(url, "temp", "foo", 0, annSvc.EXPIRE_SESSION);
  this.assertEquals(annSvc.getPagesWithAnnotation("temp").length, 1);

  reopenDb();

  this.assertEquals(annSvc.getPagesWithAnnotation("perm").length, 1);
  annSvc.removePageAnnotation(url, "perm");

  this.assertEquals(annSvc.getPagesWithAnnotation("temp").length, 0);
  annSvc.setPageAnnotation(url, "temp", "foo", 0, annSvc.EXPIRE_SESSION);
  annSvc.removePageAnnotation(url, "temp");
  this.assertEquals(annSvc.getPagesWithAnnotation("temp").length, 0);

  reopenDb();

  this.assertEquals(annSvc.getPagesWithAnnotation("perm").length, 0);

  connection.close();
  file.remove(false);
}

function testGetPagesWithAnnotation() {
  var annSvc = new AnnotationService(getTempConnection(this));

  var url = Utils.url("http://www.foo.com");
  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 0);
  annSvc.setPageAnnotation(url, "blah", "foo");
  var results = annSvc.getPagesWithAnnotation("blah");
  this.assertEquals(results.length, 1);
  this.assertEquals(results[0].spec, "http://www.foo.com/");
}

function testPageHasAnnotation() {
  var annSvc = new AnnotationService(getTempConnection(this));

  var url = Utils.url("http://www.foo.com");
  annSvc.setPageAnnotation(url, "blah", "foo");
  this.assertEquals(annSvc.pageHasAnnotation(url, "blah"), true);
}

function testGetPageAnnotation() {
  var annSvc = new AnnotationService(getTempConnection(this));

  var url = Utils.url("http://www.foo.com");

  annSvc.setPageAnnotation(url, "blah", "foo");
  this.assertEquals(annSvc.getPageAnnotation(url, "blah"), "foo");
}

function testRemovePageAnnotation() {
  var annSvc = new AnnotationService(getTempConnection(this));

  var uri = Utils.uri("http://www.foo.com");
  annSvc.setPageAnnotation(uri, "blah", "foo");
  annSvc.removePageAnnotation(uri, "blah");
  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 0);

  annSvc.setPageAnnotation(uri, "blah", true);
  annSvc.setPageAnnotation(uri, "bleh", 42);
  annSvc.removePageAnnotations(uri);
  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 0);
  this.assertEquals(annSvc.getPagesWithAnnotation("bleh").length, 0);
}

function testPageAnnotationObserversWork() {
  var obRemoveCalled = false;
  var obSetCalled = false;
  var self = this;

  var ob = {
    onPageAnnotationSet: function(uri, name) {
      self.assertEquals(uri.spec, "http://www.foo.com/");
      self.assertEquals(name, "blah");
      obSetCalled = true;
    },
    onPageAnnotationRemoved: function(uri, name) {
      self.assertEquals(uri.spec, "http://www.foo.com/");
      self.assertEquals(name, "blah");
      obRemoveCalled = true;
    }
  };

  var annSvc = new AnnotationService(getTempConnection(this));
  var uri = Utils.uri("http://www.foo.com");
  annSvc.addObserver(ob);

  annSvc.setPageAnnotation(uri, "blah", "foo");
  this.assertEquals(obSetCalled, true);
  annSvc.removePageAnnotation(uri, "blah");
  this.assertEquals(obRemoveCalled, true);

  obSetCalled = false;
  obRemoveCalled = false;
  annSvc.removeObserver(ob);

  annSvc.setPageAnnotation(uri, "blah", "foo");
  this.assertEquals(obSetCalled, false);
  annSvc.removePageAnnotation(uri, "blah");
  this.assertEquals(obRemoveCalled, false);

  annSvc.setPageAnnotation(uri, "blah", "foo");
  annSvc.addObserver({
    onPageAnnotationRemoved: function(uri, name) {
      self.assertEquals(uri.spec, "http://www.foo.com/");
      self.assertEquals(name, "");
      obRemoveCalled = true;
    }
  });
  annSvc.removePageAnnotations(uri);
  this.assertEquals(obRemoveCalled, true);
}

exportTests(this);
