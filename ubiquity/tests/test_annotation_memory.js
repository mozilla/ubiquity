Components.utils.import("resource://ubiquity-modules/annotation_memory.js");
Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-tests/framework.js");

function getTempDbFile() {
  var Ci = Components.interfaces;
  var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Ci.nsIProperties);
  var file = dirSvc.get("TmpD", Ci.nsIFile);
  file.append("testdb.sqlite");
  file.createUnique(Ci.nsIFile.TYPE_NORMAL_FILE, 0x600);
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

  var url = Utils.url("http://www.foo.com");
  annSvc.setPageAnnotation(url, "blah", "foo");
  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 1);

  connection.close();
  connection = AnnotationService.openDatabase(file);
  annSvc = new AnnotationService(connection);

  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 1);

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

  var url = Utils.url("http://www.foo.com");
  annSvc.setPageAnnotation(url, "blah", "foo");
  annSvc.removePageAnnotation(url, "blah");
  this.assertEquals(annSvc.getPagesWithAnnotation("blah").length, 0);
}

exportTests(this);
