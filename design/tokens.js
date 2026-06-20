// design-system/tokens.js
// Tokens de diseño — Estilo Distill.pub / TED
// Uso: const tokens = require('./tokens.js');

module.exports = {
  colors: {
    navyDark: '#1B2631',     // Fondo de diapositivas de impacto narrativo
    teal: '#1A8F85',         // Acento principal
    textPrimary: '#2C3E50',  // Texto sobre fondo blanco
    textSecondary: '#7F8C8D',// Captions, notas
    purple: '#8E44AD',       // Acento secundario (series de datos)
    white: '#FFFFFF',        // Fondo por default
  },

  fonts: {
    heading: 'Georgia',
    body: 'Calibri',
    code: 'Consolas',
  },

  fontSizes: {
    title: 42,    // Portada
    h1: 30,       // Título de diapositiva
    h2: 24,       // Subtítulo / sección
    body: 14,     // Texto general
    caption: 11,  // Notas al pie, fuentes
  },

  principles: {
    maxColorsPerSlide: 3,
    defaultBackground: 'white',
    darkBackgroundUse: 'narrative impact only', // apertura, cierre, transiciones
  },
};
