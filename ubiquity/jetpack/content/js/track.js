var MemoryTracking = {
  COMPACT_INTERVAL: 1000,
  _trackedObjects: {},
  track: function track(object, bin) {
    var weakref = Components.utils.getWeakReference(object);
    if (!bin)
      bin = object.constructor.name;
    if (!(bin in this._trackedObjects))
      this._trackedObjects[bin] = [];
    this._trackedObjects[bin].push({weakref: weakref,
                                    created: new Date()});
  },
  compact: function compact() {
    var newTrackedObjects = {};
    for (name in this._trackedObjects) {
      var oldBin = this._trackedObjects[name];
      var newBin = newTrackedObjects[name] = [];
      for (var i = 0; i < oldBin.length; i++)
        if (oldBin[i].weakref.get())
          newBin.push(oldBin[i]);
    }
    this._trackedObjects = newTrackedObjects;
  },
  getLiveObjects: function getLiveObjects(bin) {
    function getLiveObjectsInBin(bin, array) {
      for (var i = 0; i < bin.length; i++) {
        var object = bin[i].weakref.get();
        if (object)
          array.push(object);
      }
    }

    var results = [];
    if (bin) {
      if (bin in this._trackedObjects)
        getLiveObjectsInBin(this._trackedObjects[bin], results);
    } else
      for (name in this._trackedObjects)
        getLiveObjectsInBin(this._trackedObjects[name], results);
    return results;
  }
};

$(window).ready(
  function() {
    window.setInterval(function() { MemoryTracking.compact(); },
                       MemoryTracking.COMPACT_INTERVAL);
  });
