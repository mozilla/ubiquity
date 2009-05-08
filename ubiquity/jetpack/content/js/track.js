var MemoryTracking = {
  COMPACT_INTERVAL: 1000,
  _trackedObjects: {},
  isSupported: function() {
    try {
      if (window.getWeakReference || Components.utils.getWeakReference)
        return true;
    } catch (e) {}
    return false;
  },
  forceGC: function forceGC() {
    if (window.forceGC)
      window.forceGC();
    else
      Components.utils.forceGC();
  },
  track: function track(object, bin) {
    var weakref;
    try {
      if (window.getWeakReference)
        weakref = window.getWeakReference(object);
      else
        weakref = Components.utils.getWeakReference(object);
    } catch (e) {
      throw new Error(e);
      // Weakrefs aren't available, do nothing.
      return;
    }

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
    if (MemoryTracking.isSupported())
      window.setInterval(function() { MemoryTracking.compact(); },
                         MemoryTracking.COMPACT_INTERVAL);
  });
