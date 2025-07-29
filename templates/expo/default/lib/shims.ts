/**
 * Web Shim Re-exports for Template
 * 
 * This file re-exports the web shim library list from the shared directory.
 * Metro/Babel will use this to provide empty objects for native-only libraries on web.
 */

export { webShimLibraries } from '../shared/shims/web_shim';
export { default as webShimLibraries } from '../shared/shims/web_shim';