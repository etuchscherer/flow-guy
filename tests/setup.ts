import Module from 'node:module';

/**
 * Headless Node test environment setup:
 * Alias react-native to react-native-web so flow screen components can be loaded headless.
 */
const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: any[]) {
  if (request === 'react-native') {
    return require.resolve('react-native-web');
  }
  return origResolve.call(this, request, ...args);
};
