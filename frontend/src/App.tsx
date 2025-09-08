import React, { useState, useEffect } from 'react';
import LoyaltyPointAdmin from './components/LoyaltyPointAdmin';
import LoyaltyPointBasic from './components/LoyaltyPointBasic';
import './App.css';

// To avoid TypeScript errors for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Point {
  address: string;
  referralAmount: number;
  paidPointAmount: number;
  airdropAmount: number;
  status: string;
}

function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  console.log("walletAddress: ", walletAddress);

  // This effect runs once when the component mounts to check for a pre-existing connection
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (window.ethereum) {
          // The 'eth_accounts' method returns an array containing the accounts the user has already granted access to.
          // It doesn't open MetaMask, it just checks for authorization.
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });

          if (accounts.length > 0) {
            console.log("Found an authorized account:", accounts[0]);
            setWalletAddress(accounts[0]);
          } else {
            console.log("No authorized account found.");
          }
        } else {
          console.log("MetaMask is not installed.");
        }
      } catch (error) {
        console.error("Error checking for wallet connection:", error);
      }
    };

    checkIfWalletIsConnected();
    
    const fetchPoints = async () => {
      try {
        const response = await fetch('/points');
        const data = await response.json();
        setPoints(data);
      } catch (error) {
        console.error("Error fetching points:", error);
      }
    };

    fetchPoints();
  }, []); // The empty dependency array ensures this runs only once on startup.

  const handleConnectWallet = async () => {
    try {
      if (window.ethereum) {
        // 'eth_requestAccounts' will open the MetaMask UI for the user to connect their wallet.
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Wallet connected:", accounts[0]);
        setWalletAddress(accounts[0]);
      } else {
        alert("Please install MetaMask to use this feature!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  return (
    <div className="App">
      {walletAddress ? (
        <LoyaltyPointAdmin walletAddress={walletAddress} points={points} />
      ) : (
        <div>
          <button onClick={handleConnectWallet}>Connect Wallet</button>
          <LoyaltyPointBasic points={points} />
        </div>
      )}
    </div>
  );
}

export default App;