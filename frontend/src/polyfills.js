import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for Privy
if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = Buffer;
  window.process = process;
} 