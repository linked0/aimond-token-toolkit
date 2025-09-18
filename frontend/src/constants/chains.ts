export const chains = {
    bscTestnet: {
        chainId: '0x61', // 97 in hexadecimal
        chainName: 'BSC Testnet',
        nativeCurrency: {
            name: 'Binance Coin',
            symbol: 'tBNB',
            decimals: 18
        },
        rpcUrls: [process.env.REACT_APP_RPC_BSC_TESTNET || ''],
        blockExplorerUrls: ['https://testnet.bscscan.com']
    },
    // Add other chains here as needed
};