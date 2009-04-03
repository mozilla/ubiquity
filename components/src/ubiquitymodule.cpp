#include "nsIGenericFactory.h"

#if XP_MACOSX
#include "nsUbiquityDesktopIntegration.h"
NS_GENERIC_FACTORY_CONSTRUCTOR(nsUbiquityDesktopIntegration)
#endif

static nsModuleComponentInfo components[] =
{
#if XP_MACOSX
    {
        NSUBIQUITYDI_CLASSNAME,
        NSUBIQUITYDI_CID,
        NSUBIQUITYDI_CONTRACTID,
        nsUbiquityDesktopIntegrationConstructor,
    }
#endif
};

NS_IMPL_NSGETMODULE("nsUbiquityModule", components)
