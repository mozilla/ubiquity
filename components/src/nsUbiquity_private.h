// The following code was all taken from
// js/src/xpconnect/src/xpcprivate.h in mozilla-central.

#include "jsobj.h"
#include "nsIPrincipal.h"
#include "nsIScriptObjectPrincipal.h"
#include "nsAutoPtr.h"
#include "nsIJSContextStack.h"
#include "nsStringAPI.h"

class AutoJSRequestWithNoCallContext
{
public:
    AutoJSRequestWithNoCallContext(JSContext* aCX) : mCX(aCX) {BeginRequest();}
    ~AutoJSRequestWithNoCallContext() {EndRequest();}

    void EndRequest() {
        if(mCX) {
            JS_EndRequest(mCX);
            mCX = nsnull;
        }
    }
private:
    void BeginRequest() {
        if(JS_GetContextThread(mCX))
            JS_BeginRequest(mCX);
        else
            mCX = nsnull;
    }
private:
    JSContext* mCX;
};

class AutoJSSuspendRequestWithNoCallContext
{
public:
    AutoJSSuspendRequestWithNoCallContext(JSContext *aCX)
      : mCX(aCX) {SuspendRequest();}
    ~AutoJSSuspendRequestWithNoCallContext() {ResumeRequest();}

    void ResumeRequest() {
        if(mCX) {
            JS_ResumeRequest(mCX, mDepth);
            mCX = nsnull;
        }
    }
private:
    void SuspendRequest() {
        if(JS_GetContextThread(mCX))
            mDepth = JS_SuspendRequest(mCX);
        else
            mCX = nsnull;
    }
private:
    JSContext* mCX;
    jsrefcount mDepth;
};

// A helper class to deal with temporary JS contexts. It destroys the context
// when it goes out of scope.
class XPCAutoJSContext
{
public:
    XPCAutoJSContext(JSContext *aContext, PRBool aGCOnDestroy)
        : mContext(aContext), mGCOnDestroy(aGCOnDestroy)
    {
    }

    ~XPCAutoJSContext()
    {
        if(!mContext)
            return;

        if(mGCOnDestroy)
            JS_DestroyContext(mContext);
        else
            JS_DestroyContextNoGC(mContext);
    }

    operator JSContext * () {return mContext;}

private:
    JSContext *mContext;
    PRBool mGCOnDestroy;
};

class ContextHolder : public nsISupports
{
public:
    ContextHolder(JSContext *aOuterCx, JSObject *aSandbox);

    JSContext * GetJSContext()
    {
        return mJSContext;
    }

    NS_DECL_ISUPPORTS

private:
    static JSBool ContextHolderOperationCallback(JSContext *cx);
    
    XPCAutoJSContext mJSContext;
    JSContext* mOrigCx;
};

NS_IMPL_ISUPPORTS0(ContextHolder)

ContextHolder::ContextHolder(JSContext *aOuterCx, JSObject *aSandbox)
    : mJSContext(JS_NewContext(JS_GetRuntime(aOuterCx), 1024), JS_FALSE),
      mOrigCx(aOuterCx)
{
    if(mJSContext)
    {
        JS_SetOptions(mJSContext,
                      JSOPTION_DONT_REPORT_UNCAUGHT |
                      JSOPTION_PRIVATE_IS_NSISUPPORTS);
        JS_SetGlobalObject(mJSContext, aSandbox);
        JS_SetContextPrivate(mJSContext, this);

        if(JS_GetOperationCallback(aOuterCx))
        {
            JS_SetOperationCallback(mJSContext, ContextHolderOperationCallback,
                                    JS_GetOperationLimit(aOuterCx));
        }
    }
}

JSBool
ContextHolder::ContextHolderOperationCallback(JSContext *cx)
{
    ContextHolder* thisObject =
        static_cast<ContextHolder*>(JS_GetContextPrivate(cx));
    NS_ASSERTION(thisObject, "How did that happen?");

    JSContext *origCx = thisObject->mOrigCx;
    JSOperationCallback callback = JS_GetOperationCallback(origCx);
    JSBool ok = JS_TRUE;
    if(callback)
    {
        ok = callback(origCx);
        callback = JS_GetOperationCallback(origCx);
        if(callback)
        {
            // If the callback is still set in the original context, reflect
            // a possibly updated operation limit into cx.
            JS_SetOperationLimit(cx, JS_GetOperationLimit(origCx));
            return ok;
        }
    }

    JS_ClearOperationCallback(cx);
    return ok;
}

inline void *
xpc_GetJSPrivate(JSObject *obj)
{
    jsval v;

    JS_ASSERT(STOBJ_GET_CLASS(obj)->flags & JSCLASS_HAS_PRIVATE);
    v = obj->fslots[JSSLOT_PRIVATE];
    if (!JSVAL_IS_INT(v))
        return NULL;
    return JSVAL_TO_PRIVATE(v);
}
