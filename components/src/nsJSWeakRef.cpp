#include "nsJSWeakRef.h"

#include "jsapi.h"
#include "nsIXPConnect.h"
#include "nsAXPCNativeCallContext.h"
#include "nsServiceManagerUtils.h"

static JSObject *gWeakref;
static JSContext *gWeakCx;
static JSGCCallback gOldJSGCCallback;

static JSBool XPCCycleCollectGCCallback(JSContext *cx, JSGCStatus status) {
  if (status == JSGC_MARK_END &&
      gWeakCx &&
      gWeakref &&
      JS_IsAboutToBeFinalized(gWeakCx, gWeakref)) {
    gWeakCx = NULL;
    gWeakref = NULL;
  }
  return gOldJSGCCallback ? gOldJSGCCallback(cx, status) : JS_TRUE;
}

nsJSWeakRef::nsJSWeakRef()
{
}

nsJSWeakRef::~nsJSWeakRef()
{
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

  gWeakref = JSVAL_TO_OBJECT(argv[0]);
  gWeakCx = cx;

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

  if (gWeakref) {
    // get place for return value
    jsval *rval = nsnull;
    rv = cc->GetRetValPtr(&rval);
    if(NS_FAILED(rv) || !rval)
      return NS_ERROR_FAILURE;

    // TODO: Do we have to increase the reference count of the object
    // or anything?

    *rval = OBJECT_TO_JSVAL(gWeakref);

    cc->SetReturnValueWasSet(PR_TRUE);
  }

  return NS_OK;
}

NS_IMPL_ISUPPORTS1(nsJSWeakRef, nsIJSWeakRef);
