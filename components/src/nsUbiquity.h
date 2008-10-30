#include "nsIUbiquity.h"

#define NSUBIQUITY_CONTRACTID "@labs.mozilla.com/ubiquity;1"
#define NSUBIQUITY_CLASSNAME "nsUbiquity"
#define NSUBIQUITY_CID \
  {0xd7c743cd, 0x34b0, 0x4290, \
    { 0xb2, 0x13, 0xa3, 0xb6, 0x1d, 0x2b, 0x9f, 0x9b }}

class nsUbiquity : public nsIUbiquity
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIUBIQUITY

  nsUbiquity();

private:
  ~nsUbiquity();

protected:
  /* additional members */
};
