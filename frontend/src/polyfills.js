import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for Privy
if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = Buffer;
  window.process = process;
  
  // Add this section to ensure ethereum property is configurable
  if (!window.ethereum) {
    // Only define a placeholder if ethereum isn't already present
    Object.defineProperty(window, 'ethereum', {
      value: null,
      writable: true,
      configurable: true
    });
  }
} 