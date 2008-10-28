#include "nsIGenericFactory.h"
#include "nsUbiquity.h"

#include "jsapi.h"
#include "nsIXPConnect.h"
#include "nsAXPCNativeCallContext.h"
#include "nsServiceManagerUtils.h"

NS_IMPL_ISUPPORTS1(nsUbiquity, nsIUbiquity)

nsUbiquity::nsUbiquity()
{
  /* member initializers and constructor code */
}

nsUbiquity::~nsUbiquity()
{
  /* destructor code */
}

/* long add (in long a, in long b); */
NS_IMETHODIMP nsUbiquity::Add(PRInt32 a, PRInt32 b, PRInt32 *_retval)
{
    *_retval = a + b + 1;
    return NS_OK;
}

/* void throwArg (); */
NS_IMETHODIMP
nsUbiquity::ThrowArg(void)
{
    // This implementation was copied from
    // js/src/xpconnect/tests/components/xpctest_echo.cpp in
    // mozilla-central.

    nsresult rv;
    nsAXPCNativeCallContext *cc = nsnull;
    nsCOMPtr<nsIXPConnect> xpc(do_GetService(nsIXPConnect::GetCID(), &rv));

    if(NS_SUCCEEDED(rv))
      rv = xpc->GetCurrentNativeCallContext(&cc);

    if(NS_FAILED(rv) || !cc)
        return NS_ERROR_FAILURE;

    //nsCOMPtr<nsISupports> callee;
    //if(NS_FAILED(cc->GetCallee(getter_AddRefs(callee))) || 
    //   callee != static_cast<nsIEcho*>(this))
    //    return NS_ERROR_FAILURE;

    PRUint32 argc;
    if(NS_FAILED(cc->GetArgc(&argc)) || !argc)
        return NS_OK;

    jsval* argv;
    JSContext* cx;
    if(NS_FAILED(cc->GetArgvPtr(&argv)) ||
       NS_FAILED(cc->GetJSContext(&cx)))
        return NS_ERROR_FAILURE;

    JS_SetPendingException(cx, argv[0]);
    return NS_OK;
}

NS_GENERIC_FACTORY_CONSTRUCTOR(nsUbiquity)

static nsModuleComponentInfo components[] =
{
    {
        NSUBIQUITY_CLASSNAME,
        NSUBIQUITY_CID,
        NSUBIQUITY_CONTRACTID,
        nsUbiquityConstructor,
    }
};

NS_IMPL_NSGETMODULE("nsUbiquityModule", components)
