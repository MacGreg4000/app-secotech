/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    'tailwindcss': {},
    'postcss-preset-env': {
      features: {
        'nesting-rules': true
      }
    },
    'autoprefixer': {}
  },
};

export default config;
