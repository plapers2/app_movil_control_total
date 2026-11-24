module.exports = {
  preset: '@react-native/jest-preset',
  // El preset solo transforma .js/.ts/.tsx: agregamos .jsx (todas las pantallas)
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      require.resolve('@react-native/jest-preset/jest/assetFileTransformer.js'),
  },
  // AsyncStorage 3 y las librerías de navegación vienen como ESM
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|react-native-vector-icons|react-native-safe-area-context|react-native-screens)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
