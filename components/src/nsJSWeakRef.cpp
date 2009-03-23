#include "nsJSWeakRef.h"

#include "jsapi.h"
#include "nsIXPConnect.h"
#include "nsAXPCNativeCallContext.h"
#include "nsServiceManagerUtils.h"
#include "nsComponentManagerUtils.h"

class nsJSWeakRefListNode {
public:
  nsJSWeakRef *data;
  nsJSWeakRefListNode *next;
};

class nsJSWeakRefImpl {
public:
  JSObject *weakRef;
  JSContext *weakCx;
  nsJSWeakRefListNode *node;
};

static nsJSWeakRefListNode *gList;
static JSGCCallback gOldJSGCCallback;

void processGarbage() {
  nsJSWeakRefListNode *node = gList;
  nsJSWeakRefListNode *prevNode = nsnull;
  nsJSWeakRefListNode *nextNode = nsnull;
  while (node) {
    nextNode = node->next;
    if (node->data) {
      if (JS_IsAboutToBeFinalized(node->data->impl->weakCx,
                                  node->data->impl->weakRef)) {
        // Tell the weak reference holder that its target no longer exists.
        node->data->impl->weakRef = nsnull;
        node->data->impl->weakCx = nsnull;
        node->data->impl->node = nsnull;

        // Delete this node.
        if (prevNode)
          prevNode->next = nextNode;
        else
          gList = nextNode;
        delete node;
      } else
        // This is our general case; just move on to the next node.
        prevNode = node;
    } else {
      // The weak reference holder went away, so just delete this node.
      if (prevNode)
        prevNode->next = nextNode;
      else
        gList = nextNode;
      delete node;
    }
    node = nextNode;
  }
}

static JSBool XPCCycleCollectGCCallback(JSContext *cx, JSGCStatus status) {
  if (status == JSGC_MARK_END)
    processGarbage();
  return gOldJSGCCallback ? gOldJSGCCallback(cx, status) : JS_TRUE;
}

nsJSWeakRef::nsJSWeakRef()
{
  this->impl = new nsJSWeakRefImpl();
  this->impl->weakRef = nsnull;
  this->impl->weakCx = nsnull;
  this->impl->node = nsnull;
}

nsJSWeakRef::~nsJSWeakRef()
{
  if (this->impl->node)
    // Tell the GC callback to remove our node from the list next time around.
    this->impl->node->data = nsnull;

  delete this->impl;
  this->impl = nsnull;
}

NS_IMETHODIMP nsJSWeakRef::Set()
{
  nsresult rv = NS_OK;
  nsCOMPtr<nsIXPConnect> xpc = do_GetService(
    "@mozilla.org/js/xpc/XPConnect;1",
    &rv
  );
  if (NS_FAILED(rv))
    return NS_ERROR_FAILURE;

  // get the xpconnect native call context
  nsAXPCNativeCallContext *cc = nsnull;
  xpc->GetCurrentNativeCallContext(&cc);
  if(!cc)
    return NS_ERROR_FAILURE;

  // Get JSContext of current call
  JSContext* cx;
  rv = cc->GetJSContext(&cx);
  if(NS_FAILED(rv) || !cx)
    return NS_ERROR_FAILURE;

  // get place for return value
  jsval *rval = nsnull;
  rv = cc->GetRetValPtr(&rval);
  if(NS_FAILED(rv) || !rval)
    return NS_ERROR_FAILURE;

  // get argc and argv and verify arg count
  PRUint32 argc;
  rv = cc->GetArgc(&argc);
  if(NS_FAILED(rv))
    return rv;

  if (argc < 1)
    return NS_ERROR_XPC_NOT_ENOUGH_ARGS;

  jsval *argv;
  rv = cc->GetArgvPtr(&argv);
  if (NS_FAILED(rv))
    return rv;

  if (!JSVAL_IS_OBJECT(argv[0]))
    return NS_ERROR_ILLEGAL_VALUE;

  this->impl->weakRef = JSVAL_TO_OBJECT(argv[0]);
  this->impl->weakCx = cx;

  // Insert a new node at the head of the global list.
  nsJSWeakRefListNode *newNode = new nsJSWeakRefListNode();
  newNode->data = this;
  newNode->next = gList;
  this->impl->node = newNode;
  gList = newNode;

  // TODO: Note that this is never removed.
  if (!gOldJSGCCallback)
    gOldJSGCCallback = JS_SetGCCallback(cx, XPCCycleCollectGCCallback);

  return NS_OK;
}

NS_IMETHODIMP nsJSWeakRef::Get()
{
  nsresult rv = NS_OK;
  nsCOMPtr<nsIXPConnect> xpc = do_GetService(
    "@mozilla.org/js/xpc/XPConnect;1",
    &rv
  );
  if (NS_FAILED(rv))
    return NS_ERROR_FAILURE;

  // get the xpconnect native call context
  nsAXPCNativeCallContext *cc = nsnull;
  xpc->GetCurrentNativeCallContext(&cc);
  if(!cc)
    return NS_ERROR_FAILURE;

  // get place for return value
  jsval *rval = nsnull;
  rv = cc->GetRetValPtr(&rval);
  if(NS_FAILED(rv) || !rval)
    return NS_ERROR_FAILURE;

  // TODO: Do we have to increase the reference count of the object
  // or anything?

  // This automatically is set to JSVAL_NULL if weakRef is nsnull.
  *rval = OBJECT_TO_JSVAL(this->impl->weakRef);
  cc->SetReturnValueWasSet(PR_TRUE);

  return NS_OK;
}

NS_IMPL_ISUPPORTS1(nsJSWeakRef, nsIJSWeakRef);
