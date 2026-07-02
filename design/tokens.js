// design/tokens.js
// Design tokens — Distill.pub / TED style
// Usage: const tokens = require('./tokens.js');

module.exports = {
  colors: {
    navyDark: '#1B2631',      // narrative-impact slide backgrounds
    teal: '#1A8F85',          // primary accent
    textPrimary: '#2C3E50',   // text on white backgrounds
    textSecondary: '#7F8C8D', // captions, notes
    purple: '#8E44AD',        // secondary accent (data series)
    white: '#FFFFFF',         // default background
  },

  fonts: {
    heading: 'Georgia',
    body: 'Calibri',
    code: 'Consolas',
  },

  fontSizes: {
    title: 42,   // cover title
    h1: 30,      // slide title
    h2: 24,      // subtitle / section
    body: 14,    // general text
    caption: 11, // footnotes, sources
  },

  principles: {
    maxColorsPerSlide: 3,
    defaultBackground: 'white',
    darkBackgroundUse: 'narrative impact only', // opening, closing, transitions
  },
};
