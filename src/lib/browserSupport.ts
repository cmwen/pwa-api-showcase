export type SupportState = 'supported' | 'partial' | 'unsupported'
export type CapabilityCategory =
  | 'Installability'
  | 'Engagement'
  | 'Device access'
  | 'System integration'
  | 'Advanced hardware'

export type ApiActionId = 'clipboard' | 'install' | 'notification' | 'share' | 'vibrate'

export interface CapabilityCard {
  id: string
  name: string
  category: CapabilityCategory
  description: string
  detail: string
  support: SupportState
  requiresSecureContext: boolean
  action?: ApiActionId
}

export interface CapabilityReport {
  cards: CapabilityCard[]
  supportedCount: number
  partialCount: number
  unsupportedCount: number
}

export interface RuntimeSnapshot {
  browserLabel: string
  platformLabel: string
  language: string
  viewportLabel: string
  screenLabel: string
  connectionLabel: string
  deviceMemoryLabel: string
  notificationPermissionLabel: string
  online: boolean
  isSecureContext: boolean
  standaloneDisplay: boolean
  installPromptAvailable: boolean
  serviceWorker: boolean
  serviceWorkerController: boolean
  notification: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  push: boolean
  backgroundSync: boolean
  periodicBackgroundSync: boolean
  webShare: boolean
  clipboardWrite: boolean
  badging: boolean
  fileSystemAccess: boolean
  wakeLock: boolean
  screenOrientation: boolean
  fullscreen: boolean
  geolocation: boolean
  mediaCapture: boolean
  deviceMemory: boolean
  networkInformation: boolean
  vibration: boolean
  bluetooth: boolean
  nfc: boolean
  serial: boolean
  usb: boolean
  paymentRequest: boolean
  idleDetection: boolean
  contactsPicker: boolean
  launchQueue: boolean
  webxr: boolean
}

interface ExtendedNavigator extends Navigator {
  standalone?: boolean
  connection?: {
    effectiveType?: string
    saveData?: boolean
    downlink?: number
  }
  deviceMemory?: number
  serial?: unknown
  usb?: unknown
  bluetooth?: unknown
  nfc?: unknown
  contacts?: {
    select: (...args: unknown[]) => Promise<unknown>
  }
  xr?: unknown
}

interface ExtendedWindow extends Window {
  Notification?: typeof Notification
  PushManager?: unknown
  SyncManager?: unknown
  PeriodicSyncManager?: unknown
  showOpenFilePicker?: unknown
  PaymentRequest?: unknown
  IdleDetector?: unknown
  launchQueue?: unknown
}

const makeStatus = (
  support: SupportState,
  detail: string,
): Pick<CapabilityCard, 'support' | 'detail'> => ({
  support,
  detail,
})

export const categoryOrder: CapabilityCategory[] = [
  'Installability',
  'Engagement',
  'Device access',
  'System integration',
  'Advanced hardware',
]

export function formatBrowserLabel(userAgent: string): string {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge'
  if (userAgent.includes('Chrome/')) return 'Google Chrome'
  if (userAgent.includes('Firefox/')) return 'Mozilla Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari'
  return 'Unknown browser'
}

export function collectRuntimeSnapshot(
  windowObject: Window = window,
  installPromptAvailable = false,
): RuntimeSnapshot {
  const navigatorObject = windowObject.navigator as ExtendedNavigator
  const win = windowObject as ExtendedWindow
  const connection = navigatorObject.connection
  const standaloneDisplay =
    windowObject.matchMedia('(display-mode: standalone)').matches ||
    navigatorObject.standalone === true
  const deviceMemory =
    typeof navigatorObject.deviceMemory === 'number' ? navigatorObject.deviceMemory : null
  const notificationPermission = win.Notification ? win.Notification.permission : 'unsupported'

  return {
    browserLabel: formatBrowserLabel(navigatorObject.userAgent),
    platformLabel: navigatorObject.platform || 'Unknown platform',
    language: navigatorObject.language,
    viewportLabel: `${windowObject.innerWidth} x ${windowObject.innerHeight}`,
    screenLabel: `${windowObject.screen.width} x ${windowObject.screen.height}`,
    connectionLabel: connection
      ? `${connection.effectiveType ?? 'unknown'}${connection.saveData ? ' • data saver' : ''}`
      : 'Not exposed',
    deviceMemoryLabel: deviceMemory ? `${deviceMemory} GB (reported)` : 'Not exposed',
    notificationPermissionLabel:
      notificationPermission === 'unsupported' ? 'Unsupported' : notificationPermission,
    online: navigatorObject.onLine,
    isSecureContext: windowObject.isSecureContext,
    standaloneDisplay,
    installPromptAvailable,
    serviceWorker: 'serviceWorker' in navigatorObject,
    serviceWorkerController: Boolean(navigatorObject.serviceWorker?.controller),
    notification: 'Notification' in windowObject,
    notificationPermission,
    push: 'PushManager' in win && 'serviceWorker' in navigatorObject,
    backgroundSync: 'SyncManager' in win && 'serviceWorker' in navigatorObject,
    periodicBackgroundSync:
      'PeriodicSyncManager' in win && 'serviceWorker' in navigatorObject,
    webShare: typeof navigatorObject.share === 'function',
    clipboardWrite: typeof navigatorObject.clipboard?.writeText === 'function',
    badging:
      typeof navigatorObject.setAppBadge === 'function' ||
      typeof navigatorObject.clearAppBadge === 'function',
    fileSystemAccess: typeof win.showOpenFilePicker === 'function',
    wakeLock: typeof navigatorObject.wakeLock?.request === 'function',
    screenOrientation: Boolean(windowObject.screen.orientation),
    fullscreen: Boolean(windowObject.document.fullscreenEnabled),
    geolocation: 'geolocation' in navigatorObject,
    mediaCapture: Boolean(navigatorObject.mediaDevices?.getUserMedia),
    deviceMemory: deviceMemory !== null,
    networkInformation: Boolean(connection),
    vibration: typeof navigatorObject.vibrate === 'function',
    bluetooth: Boolean(navigatorObject.bluetooth),
    nfc: Boolean(navigatorObject.nfc),
    serial: Boolean(navigatorObject.serial),
    usb: Boolean(navigatorObject.usb),
    paymentRequest: 'PaymentRequest' in win,
    idleDetection: 'IdleDetector' in win,
    contactsPicker: typeof navigatorObject.contacts?.select === 'function',
    launchQueue: 'launchQueue' in win,
    webxr: Boolean(navigatorObject.xr),
  }
}

export function buildCapabilityReport(snapshot: RuntimeSnapshot): CapabilityReport {
  const cards: CapabilityCard[] = [
    {
      id: 'service-worker',
      name: 'Service worker',
      category: 'Installability',
      description: 'Background script support for offline handling and caching.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.serviceWorker ? 'supported' : 'unsupported',
        snapshot.serviceWorker
          ? snapshot.serviceWorkerController
            ? 'The page is controlled by a service worker.'
            : 'The browser can register a service worker, but this tab is not controlled yet.'
          : 'Service workers are unavailable in this browser.',
      ),
    },
    {
      id: 'install-prompt',
      name: 'Install prompt',
      category: 'Installability',
      description: 'Checks whether the browser can surface a native install prompt.',
      requiresSecureContext: true,
      action: 'install',
      ...makeStatus(
        snapshot.standaloneDisplay || snapshot.installPromptAvailable
          ? 'supported'
          : snapshot.serviceWorker
            ? 'partial'
            : 'unsupported',
        snapshot.standaloneDisplay
          ? 'The app is already running in standalone mode.'
          : snapshot.installPromptAvailable
            ? 'The browser has exposed the install prompt for this page.'
            : snapshot.serviceWorker
              ? 'PWA prerequisites are present, but this browser has not fired an install prompt yet.'
              : 'Install prompts depend on service worker and manifest support.',
      ),
    },
    {
      id: 'notifications',
      name: 'Notifications',
      category: 'Engagement',
      description: 'Native notifications for re-engagement flows and alerts.',
      requiresSecureContext: true,
      action: 'notification',
      ...makeStatus(
        snapshot.notification
          ? snapshot.notificationPermission === 'denied'
            ? 'partial'
            : 'supported'
          : 'unsupported',
        snapshot.notification
          ? `Notification API is exposed with "${snapshot.notificationPermission}" permission.`
          : 'Notification API is not available.',
      ),
    },
    {
      id: 'push',
      name: 'Push API',
      category: 'Engagement',
      description: 'Receive server-triggered pushes through a service worker.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.push ? 'supported' : 'unsupported',
        snapshot.push
          ? 'PushManager is available alongside service worker support.'
          : 'Push API is not available in this context.',
      ),
    },
    {
      id: 'background-sync',
      name: 'Background Sync',
      category: 'Engagement',
      description: 'Retry network work after connectivity is restored.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.backgroundSync ? 'supported' : 'unsupported',
        snapshot.backgroundSync
          ? 'SyncManager is available for deferred network work.'
          : 'Background Sync is not available.',
      ),
    },
    {
      id: 'periodic-sync',
      name: 'Periodic Background Sync',
      category: 'Engagement',
      description: 'Run periodic refresh tasks while the PWA stays installed.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.periodicBackgroundSync ? 'supported' : 'unsupported',
        snapshot.periodicBackgroundSync
          ? 'PeriodicSyncManager is available.'
          : 'Periodic background sync is not exposed.',
      ),
    },
    {
      id: 'web-share',
      name: 'Web Share',
      category: 'System integration',
      description: 'Open the native share sheet from the browser.',
      requiresSecureContext: true,
      action: 'share',
      ...makeStatus(
        snapshot.webShare ? 'supported' : 'unsupported',
        snapshot.webShare ? 'navigator.share is available.' : 'Web Share is unavailable.',
      ),
    },
    {
      id: 'clipboard',
      name: 'Clipboard write',
      category: 'System integration',
      description: 'Copy content to the device clipboard with user activation.',
      requiresSecureContext: true,
      action: 'clipboard',
      ...makeStatus(
        snapshot.clipboardWrite ? 'supported' : 'unsupported',
        snapshot.clipboardWrite
          ? 'Clipboard write access is available.'
          : 'Clipboard write access is not available.',
      ),
    },
    {
      id: 'badging',
      name: 'Badging API',
      category: 'System integration',
      description: 'Display app badge counts from the web app.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.badging ? 'supported' : 'unsupported',
        snapshot.badging ? 'App badge methods are available.' : 'Badging API is unavailable.',
      ),
    },
    {
      id: 'launch-queue',
      name: 'Launch Queue',
      category: 'System integration',
      description: 'Handle launch parameters and deeper OS integration hooks.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.launchQueue ? 'supported' : 'unsupported',
        snapshot.launchQueue
          ? 'launchQueue is available for file or protocol launches.'
          : 'Launch Queue is not available.',
      ),
    },
    {
      id: 'file-system-access',
      name: 'File System Access',
      category: 'System integration',
      description: 'Read and write local files with browser prompts.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.fileSystemAccess ? 'supported' : 'unsupported',
        snapshot.fileSystemAccess
          ? 'showOpenFilePicker is available.'
          : 'File System Access is unavailable.',
      ),
    },
    {
      id: 'wake-lock',
      name: 'Screen Wake Lock',
      category: 'Device access',
      description: 'Keep the screen awake during focused tasks.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.wakeLock ? 'supported' : 'unsupported',
        snapshot.wakeLock ? 'Wake Lock API is available.' : 'Wake Lock API is unavailable.',
      ),
    },
    {
      id: 'screen-orientation',
      name: 'Screen Orientation',
      category: 'Device access',
      description: 'Read and lock orientation in immersive experiences.',
      requiresSecureContext: false,
      ...makeStatus(
        snapshot.screenOrientation ? 'supported' : 'unsupported',
        snapshot.screenOrientation
          ? 'screen.orientation is available.'
          : 'Screen Orientation API is unavailable.',
      ),
    },
    {
      id: 'fullscreen',
      name: 'Fullscreen',
      category: 'Device access',
      description: 'Expand experiences beyond the browser chrome.',
      requiresSecureContext: false,
      ...makeStatus(
        snapshot.fullscreen ? 'supported' : 'unsupported',
        snapshot.fullscreen
          ? 'Fullscreen API is available.'
          : 'Fullscreen API is unavailable.',
      ),
    },
    {
      id: 'geolocation',
      name: 'Geolocation',
      category: 'Device access',
      description: 'Request the device location with user consent.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.geolocation ? 'supported' : 'unsupported',
        snapshot.geolocation
          ? 'Geolocation API is available.'
          : 'Geolocation API is unavailable.',
      ),
    },
    {
      id: 'media-capture',
      name: 'Media capture',
      category: 'Device access',
      description: 'Access the camera and microphone via getUserMedia.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.mediaCapture ? 'supported' : 'unsupported',
        snapshot.mediaCapture
          ? 'getUserMedia is available.'
          : 'Camera and microphone capture are unavailable.',
      ),
    },
    {
      id: 'vibration',
      name: 'Vibration',
      category: 'Device access',
      description: 'Trigger haptic feedback on supported mobile hardware.',
      requiresSecureContext: false,
      action: 'vibrate',
      ...makeStatus(
        snapshot.vibration ? 'supported' : 'unsupported',
        snapshot.vibration ? 'navigator.vibrate is available.' : 'Vibration API is unavailable.',
      ),
    },
    {
      id: 'network-information',
      name: 'Network Information',
      category: 'System integration',
      description: 'Inspect connection quality and data saver hints.',
      requiresSecureContext: false,
      ...makeStatus(
        snapshot.networkInformation ? 'supported' : 'unsupported',
        snapshot.networkInformation
          ? `Connection details exposed as ${snapshot.connectionLabel}.`
          : 'Network Information API is unavailable.',
      ),
    },
    {
      id: 'device-memory',
      name: 'Device Memory',
      category: 'System integration',
      description: 'Read coarse memory hints for adaptive UI decisions.',
      requiresSecureContext: false,
      ...makeStatus(
        snapshot.deviceMemory ? 'supported' : 'unsupported',
        snapshot.deviceMemory
          ? `Reported device memory: ${snapshot.deviceMemoryLabel}.`
          : 'Device memory hint is not exposed.',
      ),
    },
    {
      id: 'payment-request',
      name: 'Payment Request',
      category: 'System integration',
      description: 'Use the browser payment sheet for checkout flows.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.paymentRequest ? 'supported' : 'unsupported',
        snapshot.paymentRequest
          ? 'Payment Request API is available.'
          : 'Payment Request API is unavailable.',
      ),
    },
    {
      id: 'bluetooth',
      name: 'Web Bluetooth',
      category: 'Advanced hardware',
      description: 'Connect to nearby Bluetooth Low Energy devices.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.bluetooth ? 'supported' : 'unsupported',
        snapshot.bluetooth ? 'Web Bluetooth is available.' : 'Web Bluetooth is unavailable.',
      ),
    },
    {
      id: 'nfc',
      name: 'Web NFC',
      category: 'Advanced hardware',
      description: 'Read and write NFC tags from compatible Android devices.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.nfc ? 'supported' : 'unsupported',
        snapshot.nfc ? 'Web NFC is available.' : 'Web NFC is unavailable.',
      ),
    },
    {
      id: 'serial',
      name: 'Web Serial',
      category: 'Advanced hardware',
      description: 'Communicate with serial devices from the browser.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.serial ? 'supported' : 'unsupported',
        snapshot.serial ? 'Web Serial is available.' : 'Web Serial is unavailable.',
      ),
    },
    {
      id: 'usb',
      name: 'WebUSB',
      category: 'Advanced hardware',
      description: 'Connect to USB peripherals from supported browsers.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.usb ? 'supported' : 'unsupported',
        snapshot.usb ? 'WebUSB is available.' : 'WebUSB is unavailable.',
      ),
    },
    {
      id: 'webxr',
      name: 'WebXR',
      category: 'Advanced hardware',
      description: 'Run immersive AR and VR sessions in capable browsers.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.webxr ? 'supported' : 'unsupported',
        snapshot.webxr ? 'WebXR is available.' : 'WebXR is unavailable.',
      ),
    },
    {
      id: 'contacts-picker',
      name: 'Contacts Picker',
      category: 'Device access',
      description: 'Select contacts with explicit browser permission.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.contactsPicker ? 'supported' : 'unsupported',
        snapshot.contactsPicker
          ? 'Contacts Picker is available.'
          : 'Contacts Picker is unavailable.',
      ),
    },
    {
      id: 'idle-detection',
      name: 'Idle Detection',
      category: 'Engagement',
      description: 'Detect whether the user or screen is idle.',
      requiresSecureContext: true,
      ...makeStatus(
        snapshot.idleDetection ? 'supported' : 'unsupported',
        snapshot.idleDetection
          ? 'IdleDetector is available.'
          : 'Idle Detection is unavailable.',
      ),
    },
  ]

  const supportedCount = cards.filter((card) => card.support === 'supported').length
  const partialCount = cards.filter((card) => card.support === 'partial').length
  const unsupportedCount = cards.filter((card) => card.support === 'unsupported').length

  return {
    cards,
    supportedCount,
    partialCount,
    unsupportedCount,
  }
}
