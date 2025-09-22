const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/v1', // This is the path that your frontend will request
    createProxyMiddleware({
      target: 'https://safe-transaction-bsc.safe.global',
      changeOrigin: true,
      pathRewrite: {
        '^/v1': '/v1', // rewrite path
      },
      onProxyReq: function (proxyReq, req, res) {
        // add origin header to proxy request
        proxyReq.setHeader('Origin', 'https://safe-transaction-bsc-testnet.bnbchain.org');
      }
    })
  );
};
