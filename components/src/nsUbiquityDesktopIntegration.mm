#include <Carbon/Carbon.h>
#include <AppKit/NSApplication.h>

#include "nsServiceManagerUtils.h"
#include "nsStringAPI.h"
#include "nsIObserverService.h"
#include "nsUbiquityDesktopIntegration.h"

NS_IMPL_ISUPPORTS1(nsUbiquityDesktopIntegration,
                   nsIUbiquityDesktopIntegration)

static nsISupports *gSingleton;

nsUbiquityDesktopIntegration::nsUbiquityDesktopIntegration()
{
  /* member initializers and constructor code */
}

nsUbiquityDesktopIntegration::~nsUbiquityDesktopIntegration()
{
  /* destructor code */
}

static OSStatus HotKeyHandler(EventHandlerCallRef nextHandler,
                              EventRef theEvent,
                              void *userData) {
  nsresult rv;
  nsCOMPtr<nsIObserverService>                                        \
      obSvc(do_GetService(NS_OBSERVERSERVICE_CONTRACTID, &rv));

  // TODO: Do something?
  if (NS_FAILED(rv)) {};

  rv = obSvc->NotifyObservers(gSingleton,
                              "ubiquity:hotkey",
                              NS_LITERAL_STRING("keypress").get());

  // TODO: Do something?
  if (NS_FAILED(rv)) {}

  return noErr;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::RegisterGlobalHotkey(
  PRInt32 keyCode,
  PRInt32 modifiers
  )
{
  gSingleton = this;
  this->AddRef();

  EventHotKeyRef gMyHotKeyRef;
  EventHotKeyID gMyHotKeyID;
  EventTypeSpec eventType;
  eventType.eventClass=kEventClassKeyboard;
  eventType.eventKind=kEventHotKeyPressed;
  InstallApplicationEventHandler(&HotKeyHandler,1,&eventType,NULL,NULL);

  gMyHotKeyID.signature='htk1';
  gMyHotKeyID.id=1;
  RegisterEventHotKey(keyCode, modifiers, gMyHotKeyID, 
                      GetApplicationEventTarget(), 0, &gMyHotKeyRef);

  return NS_OK;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::BringAppToForeground()
{
  NSApplication *sharedApp = [NSApplication sharedApplication];
  [sharedApp activateIgnoringOtherApps: YES];
  return NS_OK;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::DeactivateApp()
{
  NSApplication *sharedApp = [NSApplication sharedApplication];
  [sharedApp deactivate];
  return NS_OK;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::HideApp()
{
  NSApplication *sharedApp = [NSApplication sharedApplication];
  [sharedApp hide: sharedApp];
  return NS_OK;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::UnhideAppWithoutActivation()
{
  NSApplication *sharedApp = [NSApplication sharedApplication];
  [sharedApp unhideWithoutActivation];
  return NS_OK;
}

NS_IMETHODIMP nsUbiquityDesktopIntegration::IsAppActive(PRBool *isActive)
{
  NSApplication *sharedApp = [NSApplication sharedApplication];
  *isActive = [sharedApp isActive];
  return NS_OK;
}
