import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'src/assets/icon.svg',
    developmentIndicator: 'overlay',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'IntelliFlow',
    description: 'Switch AI models and reasoning levels without leaving the keyboard.',
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://chatgpt.com/*'],
    commands: {
      'cycle-model': {
        suggested_key: {
          default: 'Ctrl+Shift+M',
          mac: 'MacCtrl+Shift+M',
        },
        description: 'Cycle through available models',
      },
      'cycle-reasoning': {
        suggested_key: {
          default: 'Ctrl+Shift+H',
          mac: 'MacCtrl+Shift+H',
        },
        description: 'Cycle through available reasoning levels',
      },
    },
  },
});
