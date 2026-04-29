import { describe, expect, it } from 'vitest'
import { buildCapabilityReport, formatBrowserLabel, type RuntimeSnapshot } from './browserSupport'

const baseSnapshot: RuntimeSnapshot = {
  browserLabel: 'Microsoft Edge',
  platformLabel: 'Android',
  language: 'en-AU',
  viewportLabel: '412 x 915',
  screenLabel: '412 x 915',
  connectionLabel: '4g',
  deviceMemoryLabel: '8 GB (reported)',
  notificationPermissionLabel: 'default',
  online: true,
  isSecureContext: true,
  standaloneDisplay: false,
  installPromptAvailable: true,
  serviceWorker: true,
  serviceWorkerController: true,
  notification: true,
  notificationPermission: 'default',
  push: true,
  backgroundSync: true,
  periodicBackgroundSync: false,
  webShare: true,
  clipboardWrite: true,
  badging: true,
  fileSystemAccess: true,
  wakeLock: true,
  screenOrientation: true,
  fullscreen: true,
  geolocation: true,
  mediaCapture: true,
  deviceMemory: true,
  networkInformation: true,
  vibration: true,
  bluetooth: false,
  nfc: false,
  serial: false,
  usb: false,
  paymentRequest: true,
  idleDetection: false,
  contactsPicker: false,
  launchQueue: true,
  webxr: false,
}

describe('formatBrowserLabel', () => {
  it('recognises common browsers', () => {
    expect(formatBrowserLabel('Mozilla/5.0 Edg/123.0')).toBe('Microsoft Edge')
    expect(formatBrowserLabel('Mozilla/5.0 Chrome/123.0 Safari/537.36')).toBe('Google Chrome')
    expect(formatBrowserLabel('Mozilla/5.0 Firefox/126.0')).toBe('Mozilla Firefox')
  })
})

describe('buildCapabilityReport', () => {
  it('counts support states across the capability cards', () => {
    const report = buildCapabilityReport(baseSnapshot)

    expect(report.cards.length).toBeGreaterThan(20)
    expect(report.supportedCount).toBeGreaterThan(report.unsupportedCount)
    expect(report.partialCount).toBe(0)
  })

  it('marks installability as partial when the prompt is unavailable', () => {
    const report = buildCapabilityReport({
      ...baseSnapshot,
      installPromptAvailable: false,
      standaloneDisplay: false,
      serviceWorker: true,
    })

    const installCard = report.cards.find((card) => card.id === 'install-prompt')
    expect(installCard?.support).toBe('partial')
  })

  it('treats denied notifications as partial support', () => {
    const report = buildCapabilityReport({
      ...baseSnapshot,
      notificationPermission: 'denied',
    })

    const notificationCard = report.cards.find((card) => card.id === 'notifications')
    expect(notificationCard?.support).toBe('partial')
  })
})
