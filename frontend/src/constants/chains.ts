export const chains = {
    bscTestnet: {
        chainId: '0x61', // 97 in hexadecimal
        chainName: 'BSC Testnet',
        nativeCurrency: {
            name: 'Binance Coin',
            symbol: 'tBNB',
            decimals: 18
        },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
        blockExplorerUrls: ['https://testnet.bscscan.com']
    },
    // Add other chains here as needed
};