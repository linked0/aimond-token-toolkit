export const chains = {
    bsc: {
        chainId: '0x38', // 56 in hexadecimal
        chainName: 'BSC Mainnet',
        nativeCurrency: {
            name: 'Binance Coin',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: [process.env.RPC_BSC || process.env.RPC_URL || 'https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com']
    },
    bscTestnet: {
        chainId: '0x61', // 97 in hexadecimal
        chainName: 'BSC Testnet',
        nativeCurrency: {
            name: 'Binance Coin',
            symbol: 'tBNB',
            decimals: 18
        },
        rpcUrls: [process.env.RPC_BSC_TESTNET || ''],
        blockExplorerUrls: ['https://testnet.bscscan.com']
    },
    // Add other chains here as needed
};
