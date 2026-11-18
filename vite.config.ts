import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:phone` sets PHONE=1: phone browsers only allow camera access over HTTPS,
// so that mode serves the app with a self-signed certificate on the local network.
const phoneMode = process.env.PHONE === '1';

// The GitHub Pages build sets BASE_PATH=/qr-check-in/, since Pages serves the app under the
// repo name. Cloud Run and dev serve it from the root.
export default defineConfig({
    base: process.env.BASE_PATH ?? '/',
    envDir: '.secret',
    plugins: [react(), tailwindcss(), ...(phoneMode ? [basicSsl()] : [])],
});
