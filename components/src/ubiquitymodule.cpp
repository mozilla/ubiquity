#include "nsIGenericFactory.h"
#include "nsJSWeakRef.h"
#include "nsUbiquity.h"

#if XP_MACOSX
#include "nsUbiquityDesktopIntegration.h"
#endif

NS_GENERIC_FACTORY_CONSTRUCTOR(nsJSWeakRef)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsUbiquity)

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
    {
        NSUBIQUITY_CLASSNAME,
        NSUBIQUITY_CID,
        NSUBIQUITY_CONTRACTID,
        nsUbiquityConstructor,
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
