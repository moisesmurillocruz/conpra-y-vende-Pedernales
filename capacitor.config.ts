import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pedernales.comprayventa',
  appName: 'Compra y venta pedernales',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#0d0b10',
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#0d0b10',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
