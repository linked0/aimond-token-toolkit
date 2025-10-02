import { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Jazzicon from '@metamask/jazzicon';
import { chains } from '../constants/chains';

const imgImage1 = "/assets/loyalty-card.svg";
const imgLoyaltyPoint = "/assets/plus.svg"; // Simple plus icon for loyalty points
const imgVestingAdmin = "/assets/plus.svg"; // Simple plus icon for admin
const imgMockVesting = "/assets/plus.svg"; // Simple plus icon for mock
const imgInvestorVesting = "/assets/plus.svg"; // Simple plus icon for investor
const imgFounderVesting = "/assets/plus.svg"; // Simple plus icon for founder
const imgEmployeeVesting = "/assets/plus.svg"; // Simple plus icon for employee
const imgCreateVesting = "/assets/plus.svg"; // Simple plus icon for create
const imgSampleData = "/assets/plus.svg"; // Simple plus icon for sample data

export interface MenuItem {
    name: string;
    icon: string;
    view: string;
}

// Route mapping for navigation
const routeMap: { [key: string]: string } = {
    'loyalty': '/loyalty-point',
    'mockVestingAdmin': '/vesting/mock',
    'investorVestingAdmin': '/vesting/investor',
    'founderVestingAdmin': '/vesting/founder',
    'employeeVestingAdmin': '/vesting/employee',
    'createVestingSchedule': '/vesting/create',
    'sampleData': '/sample-data'
};

export const menuItems: MenuItem[] = [
    { name: 'Loyalty Point', icon: imgLoyaltyPoint, view: 'loyalty' },
    { name: 'Investor Vesting', icon: imgInvestorVesting, view: 'investorVestingAdmin' },
    { name: 'Founder Vesting', icon: imgFounderVesting, view: 'founderVestingAdmin' },
    { name: 'Employee Vesting', icon: imgEmployeeVesting, view: 'employeeVestingAdmin' },
    { name: 'Mock Vesting', icon: imgMockVesting, view: 'mockVestingAdmin' },
    { name: 'New Vesting', icon: imgCreateVesting, view: 'createVestingSchedule' }, // Added New Vesting
    { name: 'New Airdrop/Point', icon: imgSampleData, view: 'sampleData' },
];

interface SidebarProps {
    activeItem: string;
    setActiveItem: (item: string) => void;
    setView: (view: string) => void;
    walletAddress: string | null;
    setWalletAddress: (address: string | null) => void;
}

export default function Sidebar({ activeItem, setActiveItem, setView, walletAddress, setWalletAddress }: SidebarProps) {
    const [jazziconElement, setJazziconElement] = useState<HTMLElement | null>(null);
    const [currentNetwork, setCurrentNetwork] = useState<{ name: string; chainId: string } | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Generate Jazzicon when wallet address changes
    useEffect(() => {
        if (walletAddress && jazziconElement) {
            const seed = parseInt(walletAddress.slice(2, 10), 16);
            const icon = Jazzicon(32, seed);
            jazziconElement.innerHTML = '';
            jazziconElement.appendChild(icon);
        }
    }, [walletAddress, jazziconElement]);

    // Get current network information
    useEffect(() => {
        const getCurrentNetwork = async () => {
            if (window.ethereum && walletAddress) {
                try {
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    
                    // Find network name based on chain ID
                    let networkName = 'Unknown Network';
                    if (chainId === chains.bscTestnet.chainId) {
                        networkName = chains.bscTestnet.chainName;
                    } else if (chainId === chains.bsc.chainId) {
                        networkName = chains.bsc.chainName;
                    }
                    
                    setCurrentNetwork({ name: networkName, chainId });
                } catch (error) {
                    console.error('Error getting network info:', error);
                }
            }
        };

        getCurrentNetwork();

        // Listen for network changes
        if (window.ethereum) {
            window.ethereum.on('chainChanged', getCurrentNetwork);
            
            return () => {
                if (window.ethereum.off) {
                    window.ethereum.off('chainChanged', getCurrentNetwork);
                } else if (window.ethereum.removeListener) {
                    window.ethereum.removeListener('chainChanged', getCurrentNetwork);
                }
            };
        }
    }, [walletAddress]);

    const handleConnectWallet = async () => {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log("Wallet connected:", accounts[0]);
                setWalletAddress(accounts[0]);
            } else {
                // MetaMask not installed - user can install it themselves
            }
        } catch (error) {
            console.error("Error connecting wallet:", error);
        }
    };

    const handleDisconnectWallet = () => {
        setWalletAddress(null);
        setCurrentNetwork(null);
    };


    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <nav className="absolute top-0 left-0 bg-white w-[254px] flex flex-col shadow-lg h-screen">
            <div className="h-[120px] flex items-center justify-center p-4">
                <img alt="Logo" className="max-h-full" src={imgImage1} />
            </div>
            
            <ul className="flex flex-col space-y-2 px-4 flex-grow">
                {menuItems.map((item) => (
                    <li key={item.name}>
                        <a 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveItem(item.name);
                                setView(item.view);
                                // Navigate to the route
                                const route = routeMap[item.view];
                                if (route) {
                                    navigate(route);
                                }
                            }}
                            className={`flex items-center p-3 rounded-lg transition-colors ${
                                activeItem === item.name
                                ? 'text-[#030229] font-semibold bg-gradient-to-r from-[#e3f2fd] to-[#bbdefb]' 
                                : 'text-[#030229] opacity-80 font-semibold hover:bg-gray-100 hover:opacity-100'
                            }`}
                        >
                            {activeItem === item.name && (
                                <div className="absolute left-0 bg-gradient-to-r from-[#4285f4] h-12 opacity-30 rounded-r-[5px] to-[#4285f400] to-[91.25%] w-[62px]" />
                            )}
                            <div className="w-6 h-6 mr-4 flex items-center justify-center">
                                {item.name === 'Loyalty Point' && (
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold">★</span>
                                    </div>
                                )}
                                {item.name === 'Investor Vesting' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-yellow-400 text-sm font-bold">$</span>
                                    </div>
                                )}
                                {item.name === 'Founder Vesting' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold">💎</span>
                                    </div>
                                )}
                                {item.name === 'Employee Vesting' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold">👨‍💼</span>
                                    </div>
                                )}
                                {item.name === 'Mock Vesting' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold">⚗️</span>
                                    </div>
                                )}
                                {item.name === 'New Vesting' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold -mt-0.5">+</span>
                                    </div>
                                )}
                                {item.name === 'New Airdrop/Point' && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${activeItem === item.name ? 'bg-red-500' : 'bg-red-500'}`}>
                                        <span className="text-white text-sm font-bold">📊</span>
                                    </div>
                                )}
                            </div>
                            <span className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-base">
                                {item.name}
                            </span>
                        </a>
                    </li>
                ))}
            </ul>

            {/* Wallet Connection Area */}
            <div className="p-4 border-t border-gray-200">
                {walletAddress ? (
                    <div className="space-y-3">
                        {/* Wallet Info */}
                        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                            <div 
                                ref={setJazziconElement}
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {formatAddress(walletAddress)}
                                </p>
                                <p className="text-xs text-gray-500">Connected</p>
                            </div>
                        </div>
                        
                        {/* Network Info */}
                        {currentNetwork && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-blue-800">{currentNetwork.name}</p>
                                    <p className="text-xs text-blue-600">Chain ID: {currentNetwork.chainId}</p>
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={handleDisconnectWallet}
                            className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Disconnect Wallet
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleConnectWallet}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-[#605bff] rounded-lg hover:bg-[#4c47d4] transition-colors"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </nav>
    );
}
