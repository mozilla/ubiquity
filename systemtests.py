import os
import sys
import threading

try:
    import jsbridge
except ImportError:
    print ("I couldn't import jsbridge. Please install jsbridge, "
           "either by running 'easy_install jsbridge' or going "
           "to http://code.google.com/p/jsbridge/, and try "
           "this again.")
    sys.exit(1)

import jsbridge.events
import jsbridge.network

# Maximum time to wait for system tests to finish, in seconds.
MAX_TIMEOUT = 25

module_path = os.path.abspath(os.path.dirname(__file__))
extension_path = os.path.join(module_path, 'ubiquity')

settings = jsbridge.get_settings()
settings['JSBRIDGE_START_FIREFOX'] = True
settings['MOZILLA_PLUGINS'].append(extension_path)

if __name__ == '__main__':
    result = {'is_successful' : False}
    is_done = threading.Event()

    def listener(event_name, obj):
        if event_name == 'ubiquity:success':
            result['is_successful'] = obj
            is_done.set()

    jsbridge.events.add_global_listener(listener)

    moz = jsbridge.start_from_settings(settings)

    uri = 'resource://ubiquity-tests/systemtests.js';
    tests = jsbridge.JSObject(
        jsbridge.network.bridge,
        "Components.utils.import('%s')" % uri
        )
    tests.start()

    is_done.wait(MAX_TIMEOUT)
    moz.stop()

    if result['is_successful']:
        print "Success!"
    else:
        print "Failure."
        if not is_done.isSet():
            print "Timeout occurred."
        sys.exit(-1)
