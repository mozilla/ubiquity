#include "nsIGenericFactory.h"
#include "nsJSWeakRef.h"

#if XP_MACOSX
#include "nsUbiquityDesktopIntegration.h"
#endif

NS_GENERIC_FACTORY_CONSTRUCTOR(nsJSWeakRef)

#if XP_MACOSX
NS_GENERIC_FACTORY_CONSTRUCTOR(nsUbiquityDesktopIntegration)
#endif

static nsModuleComponentInfo components[] =
{
    {
        NSJSWEAKREFDI_CLASSNAME,
        NSJSWEAKREFDI_CID,
        NSJSWEAKREFDI_CONTRACTID,
        nsJSWeakRefConstructor,
    },
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
