import { defineConfig } from '@expo/cli';

export default defineConfig({
  name: 'Somni',
  slug: 'somni',
  sdkVersion: '53.0.0',

  /** ───── IKONY ───── */
  icon: './assets/icon.png',          // iOS + Android
  android: {
    adaptiveIcon: {                   
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    }
  },

  /** ───── SPLASH ───── */
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',            
    backgroundColor: '#ffffff',
  }
});
