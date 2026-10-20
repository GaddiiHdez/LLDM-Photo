import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bereasnap.app',
  appName: 'BereaSnap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
