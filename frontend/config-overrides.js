require('dotenv').config({ path: process.env.ENV_FILE || '.env' });
const webpack = require('webpack');

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "util": require.resolve("util/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url/"),
        "zlib": require.resolve("browserify-zlib"),
        "process": require.resolve("process/browser.js")
    });
    
    // Add alias for process/browser to handle react-router imports
    config.resolve.alias = {
        ...config.resolve.alias,
        "process/browser": require.resolve("process/browser.js")
    };
    config.resolve.fallback = fallback;

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: require.resolve('process/browser.js'),
            Buffer: ['buffer', 'Buffer']
        })
    ]);

    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
}