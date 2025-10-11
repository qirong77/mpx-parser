// Polyfills for Babel in browser environment
declare global {
  interface Window {
    process: any;
    global: any;
  }
}

// Polyfill for process object
if (typeof window !== 'undefined') {
  window.process = window.process || {
    env: {
      NODE_ENV: 'development'
    },
    version: '',
    versions: {},
    nextTick: (fn: () => void) => setTimeout(fn, 0),
    cwd: () => '/',
    platform: 'browser'
  };
  
  // Polyfill for global object
  window.global = window.global || window;
}

export {};