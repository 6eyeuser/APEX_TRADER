/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    // Force Webpack to ignore the React Native package MetaMask is looking for
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    config.externals.push('pino-pretty', 'lokijs', 'encoding', '@coinbase/cdp-sdk');
    return config;
  },
};

module.exports = nextConfig;