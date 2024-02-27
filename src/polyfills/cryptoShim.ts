// src/shims/cryptoShim.ts

// Your shim implementation
const crypto2 = {
  getCiphers: () => {
    // Implementation
    return ['aes-256-cbc', 'aes-128-cbc'] // Example ciphers
  }
}

// Export for ES Modules
export { crypto2 }

// Export for CommonJS
module.exports = crypto2
