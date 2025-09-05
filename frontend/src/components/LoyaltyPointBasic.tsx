import Jazzicon from './Jazzicon';
import { useState } from "react";
import { connectWallet } from "../utils/connectWallet"; // Corrected import


const imgImage1 = "/assets/loyalty-card.png";
const imgTicket = "/assets/ticket.svg";
const imgChart = "/assets/chart.svg";
const imgDocument = "/assets/document.svg";
const imgActivity = "/assets/activity.svg";

// Interface definitions remain the same...
interface Point {
    address: string;
    referralAmount: number;
    paidPointAmount: number;
    airdropAmount: number;
    status: string;
}
  
interface LoyaltyPointBasicProps {
    points: Point[];
}

// Define a type for our menu items for better type safety
interface MenuItem {
    name: string;
    icon: string;
}

// **FIX:** Define the menuItems array outside the component
const menuItems: MenuItem[] = [
    { name: 'Loyalty Point', icon: imgChart },
    { name: 'Investor Vesting', icon: imgTicket },
    { name: 'Founder Vesting', icon: imgDocument },
    { name: 'Employee Vesting', icon: imgActivity },
];

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LoyaltyPointBasic({ points }: LoyaltyPointBasicProps) {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState('Loyalty Point');

    return (
        <div className="bg-[#f7f7f8] relative size-full">
            {/* Main Content Area */}
            <div className="ml-[254px]">
                <div className="flex justify-between items-center mb-4 p-6">
                    <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
                        <p>Loyalty Point List</p>
                    </div>
                    <button onClick={() => connectWallet(setWalletAddress)} className="bg-[#605bff] h-[42px] w-[231px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
                        {walletAddress ? `Connected: ${truncateAddress(walletAddress)}` : "Connect Wallet"}
                    </button>
                </div>

                <div className="relative overflow-x-auto shadow-md sm:rounded-lg mx-6">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="py-3 px-6"></th>
                                <th scope="col" className="py-3 px-6">Address</th>
                                <th scope="col" className="py-3 px-6">Referral</th>
                                <th scope="col" className="py-3 px-6">Paid Point</th>
                                <th scope="col" className="py-3 px-6">Airdrop</th>
                                <th scope="col" className="py-3 px-6">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {points.map((point, index) => (
                                <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                    <td className="py-4 px-6"><Jazzicon address={point.address} size={32} /></td>
                                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{truncateAddress(point.address)}</td>
                                    <td className="py-4 px-6">{point.referralAmount}</td>
                                    <td className="py-4 px-6">{point.paidPointAmount}</td>
                                    <td className="py-4 px-6">{point.airdropAmount}</td>
                                    <td className="py-4 px-6">{point.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Menu */}
             <nav className="absolute top-0 left-0 bg-white w-[254px] flex flex-col shadow-lg">
                <div className="h-[120px] flex items-center justify-center p-4">
                    <img alt="Logo" className="max-h-full" src={imgImage1} />
                </div>
                
                <ul className="flex flex-col space-y-2 px-4">
                    {menuItems.map((item) => (
                        <li key={item.name}>
                            <a 
                                href="#" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveItem(item.name);
                                }}
                                className={`flex items-center p-3 rounded-lg transition-colors ${
                                    activeItem === item.name
                                    ? 'text-[#605bff] font-semibold bg-gray-100' 
                                    : 'text-[#030229] opacity-50 font-semibold hover:bg-gray-100'
                                }`}
                            >
                                {activeItem === item.name && (
                                    <div className="absolute left-0 bg-gradient-to-r from-[#aca9ff] h-12 opacity-20 rounded-r-[5px] to-[#aca9ff00] to-[91.25%] w-[62px]" />
                                )}
                                <img src={item.icon} alt={`${item.name} icon`} className="w-5 h-5 mr-4" />
                                <span className="text-base">{item.name}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}