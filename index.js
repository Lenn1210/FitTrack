import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import './web.css';

import App from './App';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.title = 'FitTrack';

  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = './manifest.webmanifest';
  document.head.appendChild(manifestLink);

  const appleTouchIcon = document.createElement('link');
  appleTouchIcon.rel = 'apple-touch-icon';
  appleTouchIcon.href = './icons/icon-192.png';
  document.head.appendChild(appleTouchIcon);

  const themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#44b5ff';
  document.head.appendChild(themeColor);

  const appleWebApp = document.createElement('meta');
  appleWebApp.name = 'apple-mobile-web-app-capable';
  appleWebApp.content = 'yes';
  document.head.appendChild(appleWebApp);

  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator && !__DEV__) {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .catch((error) => console.error('FitTrack offline cache registration failed:', error));
    }
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
