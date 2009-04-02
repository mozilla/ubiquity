#include "nsUbiquity.h"

#include "nsIXPConnect.h"
#include "nsServiceManagerUtils.h"

#include <stdio.h>

NS_IMPL_ISUPPORTS1(nsUbiquity, nsIUbiquity)

nsUbiquity::nsUbiquity()
{
  /* member initializers and constructor code */
}

nsUbiquity::~nsUbiquity()
{
  /* destructor code */
}

NS_IMETHODIMP nsUbiquity::FlagSystemFilenamePrefix(const char *filenamePrefix,
                                                   PRBool wantNativeWrappers)
{
  nsresult rv = NS_OK;
  nsCOMPtr<nsIXPConnect> xpc = do_GetService("@mozilla.org/js/xpc/XPConnect;1", &rv);

  if (NS_FAILED(rv))
    return NS_ERROR_FAILURE;

  rv = xpc->FlagSystemFilenamePrefix(filenamePrefix, wantNativeWrappers);

  return rv;
}
