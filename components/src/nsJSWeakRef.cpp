#include <stdio.h>

#include "nsJSWeakRef.h"

nsJSWeakRef::nsJSWeakRef()
{
}

nsJSWeakRef::~nsJSWeakRef()
{
}

NS_IMETHODIMP nsJSWeakRef::Set()
{
  return NS_OK;
}

NS_IMETHODIMP nsJSWeakRef::Get()
{
  return NS_OK;
}

NS_IMPL_ISUPPORTS1(nsJSWeakRef, nsIJSWeakRef);
