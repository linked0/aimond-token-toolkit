export const chains = {
    bscTestnet: {
        chainId: '0x61', // 97 in hexadecimal
        chainName: 'BSC Testnet',
        nativeCurrency: {
            name: 'Binance Coin',
            symbol: 'tBNB',
            decimals: 18
        },
        rpcUrls: [process.env.RPC_URL || ''],
        blockExplorerUrls: ['https://testnet.bscscan.com']
    },
    // Add other chains here as needed
};
