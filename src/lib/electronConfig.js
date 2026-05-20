/**
 * Electron Configuration Helper
 * Obsługuje komunikację między Vue a procesem głównym Electron
 */

export const isElectron = () => {
  return typeof window !== 'undefined' && window.electron && window.electron.isElectron;
};

/**
 * Wykrywa czy aplikacja działa na urządzeniu mobilnym.
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getElectronAPI = () => {
  if (isElectron()) {
    return window.electron;
  }
  return null;
};

export async function getElectronConfig() {
  if (!isElectron()) {
    return null;
  }
  
  try {
    return await window.electron.getConfig();
  } catch (error) {
    console.error('Failed to get electron config:', error);
    return null;
  }
}

export async function initializeElectron() {
  if (!isElectron()) {
    return null;
  }

  try {
    const config = await getElectronConfig();
    
    // Ustaw backend URL jeśli nie jest ustawiony
    if (config) {
      // Przechwycona zmienna w api.js - będzie używać localhost:backendPort
      localStorage.setItem('_electron_backend_url', config.backendUrl || '');
      localStorage.setItem('_electron_is_standalone', String(!!config.isStandalone));
    }

    console.log('[Electron] Initialized with config:', config);
    return config;
  } catch (error) {
    console.error('[Electron] Init failed:', error);
    return null;
  }
}

/**
 * Przywróć electron API w konsoli (debug)
 */
if (typeof window !== 'undefined' && isElectron()) {
  window.__electronAPI__ = window.electron;
  console.log('[Electron] API available at window.__electronAPI__');
}
