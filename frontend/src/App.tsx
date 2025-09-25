import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Route mapping for better URIs
const routeMap: { [key: string]: string } = {
  'loyalty': '/loyalty-point',
  'mockVestingAdmin': '/vesting/mock',
  'investorVestingAdmin': '/vesting/investor',
  'founderVestingAdmin': '/vesting/founder',
  'employeeVestingAdmin': '/vesting/employee',
  'createVestingSchedule': '/vesting/create',
  'sampleData': '/sample-data'
};

// Reverse mapping for navigation
const viewMap: { [key: string]: string } = {
  '/loyalty-point': 'loyalty',
  '/vesting/mock': 'mockVestingAdmin',
  '/vesting/investor': 'investorVestingAdmin',
  '/vesting/founder': 'founderVestingAdmin',
  '/vesting/employee': 'employeeVestingAdmin',
  '/vesting/create': 'createVestingSchedule',
  '/sample-data': 'sampleData'
};

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

  const handleNavigation = (newView: string) => {
    setView(newView);
    const currentMenuItem = menuItems.find(item => item.view === newView);
    if (currentMenuItem) {
      setActiveItem(currentMenuItem.name);
    }
  };

  return (
    <Router>
      <div className="App flex">
        <Sidebar 
          activeItem={activeItem} 
          setActiveItem={setActiveItem} 
          setView={handleNavigation}
          walletAddress={walletAddress}
          setWalletAddress={setWalletAddress}
        />
        <div className="flex-grow bg-[#f7f7f8] min-h-screen" style={{ marginLeft: '254px' }}>
          <Routes>
            {/* Default route - redirect to loyalty point */}
            <Route path="/" element={<Navigate to="/loyalty-point" replace />} />
            
            {/* Loyalty Point Routes */}
            <Route 
              path="/loyalty-point" 
              element={
                walletAddress ? (
                  <LoyaltyPointAdmin walletAddress={walletAddress} points={points} refreshPoints={refreshPoints} />
                ) : (
                  <div>
                    <button onClick={handleConnectWallet}>Connect Wallet</button>
                    <LoyaltyPointBasic points={points} />
                  </div>
                )
              } 
            />
            
            {/* Vesting Routes */}
            <Route 
              path="/vesting/mock" 
              element={<MockVestingAdmin setView={handleNavigation} setActiveItem={setActiveItem} />} 
            />
            <Route 
              path="/vesting/investor" 
              element={<InvestorVestingAdmin setView={handleNavigation} setActiveItem={setActiveItem} />} 
            />
            <Route 
              path="/vesting/founder" 
              element={<FounderVestingAdmin setView={handleNavigation} setActiveItem={setActiveItem} />} 
            />
            <Route 
              path="/vesting/employee" 
              element={<EmployeeVestingAdmin setView={handleNavigation} setActiveItem={setActiveItem} />} 
            />
            <Route 
              path="/vesting/create" 
              element={<CreateVestingSchedule />} 
            />
            
            {/* Point Data Route */}
            <Route 
              path="/sample-data" 
              element={<SampleDataInput points={points} refreshPoints={refreshPoints} />} 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/loyalty-point" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;