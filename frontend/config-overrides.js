require('dotenv').config({ path: process.env.ENV_FILE || '.env' });
const webpack = require('webpack');

const applyWebpackOverrides = (config) => {
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
};

const applyDevServerOverrides = (configFunction) => {
    return (proxy, allowedHost) => {
        const config = configFunction(proxy, allowedHost);

        if (Array.isArray(config.allowedHosts)) {
            // Remove empty entries to satisfy webpack-dev-server schema validation.
            const sanitizedHosts = config.allowedHosts.filter(Boolean);
            config.allowedHosts = sanitizedHosts.length > 0 ? sanitizedHosts : 'all';
        }

        return config;
    };
};

module.exports = {
    webpack: applyWebpackOverrides,
    devServer: applyDevServerOverrides
};
