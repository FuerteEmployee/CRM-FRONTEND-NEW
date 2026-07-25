import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trinetra.crm',
  appName: 'Trinetra TechnoWorld',
  webDir: 'dist',
  server: {
    url: 'https://erp.trinetratechnoworld.com',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
