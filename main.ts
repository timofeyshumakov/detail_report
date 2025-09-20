import { createApp } from 'vue';
import '@mdi/font/css/materialdesignicons.css'
// Pinia
import { createPinia } from 'pinia';
// Vuetify
import 'vuetify/styles';

import { createVuetify, type ThemeDefinition } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { ru } from 'vuetify/locale';
import VueTheMask from 'vue-the-mask';
import 'font-awesome/css/font-awesome.css';
// Components
import App from './App.vue';
import './reset.sass';
import { Form, Field } from 'vee-validate'
// Create Pinia instance
const pinia = createPinia();

// Define custom themes
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#1976D2',
    secondary: '#424242',
    accent: '#82B1FF',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    'on-background': '#000000',
    'on-surface': '#000000',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-error': '#FFFFFF',
    'on-info': '#FFFFFF',
    'on-success': '#FFFFFF',
    'on-warning': '#FFFFFF',
  },
};

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#121212',
    primary: '#BB86FC',
    secondary: '#03DAC6',
    accent: '#FFCA28',
    error: '#CF6679',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    'on-background': '#FFFFFF',
    'on-surface': '#FFFFFF',
    'on-primary': '#000000',
    'on-secondary': '#000000',
    'on-error': '#000000',
    'on-info': '#000000',
    'on-success': '#000000',
    'on-warning': '#000000',
  },
};

// Create Vuetify instance
const vuetify = createVuetify({
  locale: {
    locale: 'ru', // Установите локализацию по умолчанию на русский
    messages: { ru },
  },
  components,
  directives,
  icons: {
    iconfont: 'mdiSvg', // Используем SVG-версию иконок MDI
    defaults: 'mdiSolid', // Устанавливаем MDI-Solid как стандартный набор иконок
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
        }
      },
      dark: {
        colors: {
          primary: '#2196F3',
          secondary: '#424242',
        }
      }
    }
  }
});

// Create Vue app
const app = createApp(App);

// Use plugins and components
app.use(vuetify)
  .use(VueTheMask)
  .use(pinia)
  .component('Form', Form)
  .component('Field', Field)
  .mount('#app');