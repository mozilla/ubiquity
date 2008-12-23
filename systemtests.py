import os
import sys
import threading

import jsbridge
import jsbridge.events
import jsbridge.network

MAX_TIMEOUT = 5

if __name__ == '__main__':
    module_path = os.path.abspath(os.path.dirname(__file__))
    extension_path = os.path.join(module_path, 'ubiquity')

    result = {'is_successful' : False}
    is_done = threading.Event()

    def listener(event_name, obj):
        if event_name == 'ubiquity:success':
            result['is_successful'] = obj
            is_done.set()

    jsbridge.events.add_global_listener(listener)

    settings = jsbridge.get_settings()
    settings['JSBRIDGE_START_FIREFOX'] = True
    settings['MOZILLA_PLUGINS'].append(extension_path)
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
