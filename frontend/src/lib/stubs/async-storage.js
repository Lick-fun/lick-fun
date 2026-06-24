// Stub for @react-native-async-storage/async-storage
// MetaMask SDK imports this React Native package in its browser bundle.
// On web it is never called, so a no-op export is safe.
module.exports = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};
