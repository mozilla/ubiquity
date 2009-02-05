import asyncore
import traceback
import Queue

import jsbridge
import jsbridge.events
import jsbridge.network

ENDPOINT_URI = 'resource://ubiquity/modules/python_feed_endpoint.js'

finished = False
queue = Queue.Queue()
feeds = {}

def get_endpoint():
    return jsbridge.JSObject(
        jsbridge.network.bridge,
        "Components.utils.import('%s')" % ENDPOINT_URI
        ).Endpoint

def handle_event(event_name, obj):
    try:
        global finished
        if event_name == 'ubiquity-python:refresh-feed':
            endpoint = get_endpoint()
            api = endpoint.getApi(obj['feed'])
            code = compile(obj['code'], obj['srcUri'], 'exec')
            feeds[obj['feed']] = {'ubiquity': api}
            exec code in feeds[obj['feed']]
        elif event_name == 'ubiquity-python:execute-verb':
            feeds[obj['feed']]['execute_verb'](obj['id'])
        elif event_name == 'ubiquity-python:shutdown':
            finished = True
        print "python feed server event: %s  obj: %s" % (event_name, obj)
    except:
        tb = traceback.format_exc()
        print tb
        try:
            endpoint = get_endpoint()
            api = endpoint.getApi(obj['feed'])
            api.reportError(tb)
        except:
            pass

def on_event(event_name, obj):
    queue.put((event_name, obj))

if __name__ == '__main__':
    jsbridge.start()
    jsbridge.network.events.add_global_listener(on_event)
    endpoint = get_endpoint()
    endpoint.registerServer()
    print "Python feed server running."
    while not finished:
        event_name, obj = queue.get()
        handle_event(event_name, obj)
