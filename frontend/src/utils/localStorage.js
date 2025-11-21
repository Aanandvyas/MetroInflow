// Safe localStorage utility that works in both browser and Node.js environments

// Use a function to avoid referencing localStorage during module loading
const getLocalStorage = () => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const safeLocalStorage = {
  getItem: (key) => {
    const storage = getLocalStorage();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    const storage = getLocalStorage();
    if (!storage) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
      return false;
    }
  },
  
  removeItem: (key) => {
    const storage = getLocalStorage();
    if (!storage) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
      return false;
    }
  }
};