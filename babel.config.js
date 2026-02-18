module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@navigation': './src/navigation',
          '@constants': './src/constants',
          '@types': './src/types',
          '@config': './src/config',
          '@store': './src/store',
          '@contexts': './src/contexts',
        },
      },
    ],
    // Remove console.log in production builds only
    process.env.NODE_ENV === 'production' && 'transform-remove-console',
  ].filter(Boolean),
};
