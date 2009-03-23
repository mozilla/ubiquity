#include "nsIJSWeakRef.h"

#define NSJSWEAKREFDI_CONTRACTID "@labs.mozilla.com/jsweakrefdi;1"
#define NSJSWEAKREFDI_CLASSNAME "nsJSWeakRef"
#define NSJSWEAKREFDI_CID \
  {0x32665020, 0x17e1, 0x11de, \
    { 0x8c, 0x30, 0x08, 0x00, 0x20, 0x0c, 0x9a, 0x66 }}
class nsJSWeakRef : public nsIJSWeakRef
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIJSWEAKREF

  nsJSWeakRef();

private:
  virtual ~nsJSWeakRef();

protected:
  /* additional members */
};
