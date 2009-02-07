#include "nsIUbiquityDesktopIntegration.h"

#define NSUBIQUITYDI_CONTRACTID "@labs.mozilla.com/ubiquitydi;1"
#define NSUBIQUITYDI_CLASSNAME "nsUbiquityDesktopIntegration"
#define NSUBIQUITYDI_CID \
  {0xd7c743dd, 0x34b0, 0x4290, \
    { 0xb2, 0x13, 0xa3, 0xb6, 0x1d, 0x2b, 0x9f, 0x9b }}

class nsUbiquityDesktopIntegration : public nsIUbiquityDesktopIntegration
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIUBIQUITYDESKTOPINTEGRATION

  nsUbiquityDesktopIntegration();

private:
  ~nsUbiquityDesktopIntegration();

protected:
  /* additional members */
};
