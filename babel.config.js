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
        },
      },
    ],
  ],
};
