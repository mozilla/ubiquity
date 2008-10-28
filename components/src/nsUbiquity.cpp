#include "nsIGenericFactory.h"
#include "nsUbiquity.h"

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
