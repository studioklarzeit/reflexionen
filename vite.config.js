import { defineConfig } from 'vite';

// Production-only: entfernt 'unsafe-inline' aus script-src CSP
function cspPlugin() {
  return {
    name: 'remove-unsafe-inline',
    transformIndexHtml(html) {
      return html.replace(
        /script-src 'self' 'unsafe-inline'/g,
        "script-src 'self'"
      );
    },
    apply: 'build',
  };
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: '',
  },
  plugins: [cspPlugin()],
  server: {
    port: parseInt(process.env.PORT) || 3000,
    open: false,
  },
});