import React, { useState, useEffect } from 'react';
import LoyaltyPointAdmin from './components/LoyaltyPointAdmin';
import LoyaltyPointBasic from './components/LoyaltyPointBasic';
import SampleDataInput from './components/SampleDataInput';
import Sidebar from './components/Sidebar';
import CreateVestingSchedule from './components/CreateVestingSchedule';
import MockVestingAdmin from './components/MockVestingAdmin';
import InvestorVestingAdmin from './components/InvestorVestingAdmin';
import FounderVestingAdmin from './components/FounderVestingAdmin';
import EmployeeVestingAdmin from './components/EmployeeVestingAdmin';
import { menuItems, MenuItem } from './components/Sidebar'; // Import menuItems and MenuItem
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
  paidMemberAmount: number; // Added
  status: string;
  totalClaimedAmount: number;
}

function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [view, setView] = useState('loyalty');
  const [activeItem, setActiveItem] = useState('Loyalty Point');
  console.log("walletAddress: ", walletAddress);

  useEffect(() => {
    const currentMenuItem = menuItems.find(item => item.view === view);
    if (currentMenuItem && activeItem !== currentMenuItem.name) {
      setActiveItem(currentMenuItem.name);
    }
  }, [view, activeItem]);

  // This effect runs once when the component mounts to check for a pre-existing connection
  const refreshPoints = async () => {
    try {
      const uri = '/api/points';
      console.log("Fetching points from URI:", uri);
      const response = await fetch(uri);
      const data = await response.json();
      console.log("Raw points data:", data);
      const parsedData: Point[] = data.map((item: any) => ({
        ...item,
        referralAmount: parseFloat(item.referralAmount),
        paidPointAmount: parseFloat(item.paidPointAmount),
        airdropAmount: parseFloat(item.airdropAmount),
        paidMemberAmount: parseFloat(item.paidMemberAmount) || 0, // Added
        totalClaimedAmount: parseFloat(item.totalClaimedAmount) || 0,
      }));
      console.log("Parsed points data:", parsedData);
      setPoints(parsedData);
    } catch (error) {
      console.error("Error fetching points:", error);
    }
  };

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (window.ethereum) {
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
    refreshPoints();
  }, []);

  useEffect(() => {
    if (view === 'loyalty') {
      refreshPoints();
    }
  }, [view]);

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

  const renderContent = () => {
    if (view === 'sampleData') {
      return <SampleDataInput points={points} refreshPoints={refreshPoints} />;
    }
    
    if (view === 'loyalty') {
      return walletAddress ? (
        <LoyaltyPointAdmin walletAddress={walletAddress} points={points} refreshPoints={refreshPoints} />
      ) : (
        <div>
          <button onClick={handleConnectWallet}>Connect Wallet</button>
          <LoyaltyPointBasic points={points} />
        </div>
      );
    }

    if (view === 'mockVestingAdmin') {
      return <MockVestingAdmin setView={setView} setActiveItem={setActiveItem} />;
    }
    if (view === 'investorVestingAdmin') {
      return <InvestorVestingAdmin setView={setView} setActiveItem={setActiveItem} />;
    }
    if (view === 'founderVestingAdmin') {
      return <FounderVestingAdmin setView={setView} setActiveItem={setActiveItem} />;
    }
    if (view === 'employeeVestingAdmin') {
      return <EmployeeVestingAdmin setView={setView} setActiveItem={setActiveItem} />;
    }
    if (view === 'createVestingSchedule') {
      return <CreateVestingSchedule />;
    }
    // Placeholder for other views
    return <div>{view}</div>;
  };

  return (
    <div className="App flex">
      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} setView={setView} />
      <div className="flex-grow" style={{ marginLeft: '254px' }}>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;