import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neonwatty.bleepthat',
  appName: 'Bleep That',
  webDir: 'out',
  server: {
    // Allow navigation within the app
    allowNavigation: ['*'],
  },
  ios: {
    // Improve WebView performance
    preferredContentMode: 'mobile',
  },
};

export default config;
