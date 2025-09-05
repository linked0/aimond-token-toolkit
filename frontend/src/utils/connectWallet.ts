import { ethers } from "ethers";
import { chains } from "../constants/chains";

export const connectWallet = async (setWalletAddress: (address: string | null) => void) => {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask is not installed!");
        alert("Please install MetaMask to use this feature.");
        return;
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const selectedAddress = accounts[0];

        // Create an ethers provider from the window.ethereum object
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Get the signer
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // Ensure the address from the signer matches the one we received from the request
        if (address.toLowerCase() !== selectedAddress.toLowerCase()) {
            throw new Error("Address mismatch between request and signer.");
        }

        // Check current chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const bscTestnetChainId = chains.bscTestnet.chainId;

        if (chainId !== bscTestnetChainId) {
            try {
                // Try to switch to BSC Testnet
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: bscTestnetChainId }],
                });
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    try {
                        // Try to add BSC Testnet
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: bscTestnetChainId,
                                    chainName: chains.bscTestnet.chainName,
                                    nativeCurrency: chains.bscTestnet.nativeCurrency,
                                    rpcUrls: chains.bscTestnet.rpcUrls,
                                    blockExplorerUrls: chains.bscTestnet.blockExplorerUrls,
                                },
                            ],
                        });
                    } catch (addError) {
                        console.error("Error adding BSC Testnet:", addError);
                        alert("Failed to add BSC Testnet. Please add it manually.");
                        return;
                    }
                } else {
                    console.error("Error switching to BSC Testnet:", switchError);
                    alert("Failed to switch to BSC Testnet.");
                    return;
                }
            }
        }

        console.log("Wallet Connected:", address);
        setWalletAddress(address);

        // Your app-specific logic for navigation
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage({ pluginMessage: { type: 'navigate-to-frame', frameName: 'Loyalty Point User' } }, '*');

    } catch (error: any) {
        // The user rejected the connection request if the error code is 4001
        if (error.code === 4001) {
            console.log('User rejected the connection request.');
        } else {
            console.error("Error connecting to wallet:", error);
        }
    }
};