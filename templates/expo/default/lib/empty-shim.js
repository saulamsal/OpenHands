/**
 * Empty shim for native-only libraries on web
 * 
 * This provides empty objects/functions for native libraries
 * so the app doesn't crash on web.
 */

// Export empty object that can be used as any native library
module.exports = new Proxy({}, {
  get() {
    // Return a function that does nothing for any property access
    return () => {};
  }
});