import Jazzicon from './Jazzicon';
import { useState, useCallback } from "react";
import { connectWallet } from "../utils/connectWallet"; // Corrected import
import Sidebar from './Sidebar';


// Interface definitions remain the same...
interface Point {
  address: string;
  referralAmount: number;
  paidPointAmount: number; // This will now represent only SPENDING_REWARD
  airdropAmount: number;
  paidMemberAmount: number; // Added for PAID_MEMBER allocations
  status: string;
  totalClaimedAmount: number;
}
  
interface LoyaltyPointBasicProps {
  points: Point[];
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LoyaltyPointBasic({ points }: LoyaltyPointBasicProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState('Loyalty Point');
  const [copiedMessage, setCopiedMessage] = useState<{ [key: string]: boolean }>({});

  const handleCopy = useCallback(async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          setCopiedMessage(prev => ({ ...prev, [text]: true }));
          setTimeout(() => {
              setCopiedMessage(prev => ({ ...prev, [text]: false }));
          }, 2000);
      } catch (err) {
          console.error('Failed to copy: ', err);
      }
  }, []);

  return (
    <div className="bg-[#f7f7f8] relative size-full">
      
      {/* Main Content Area */}
      <div>
        <div className="flex justify-between items-center mb-4 p-6">
          <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
            <p>Loyalty Point List</p>
          </div>
          <button onClick={() => connectWallet(setWalletAddress)} className="bg-[#605bff] h-[42px] w-[231px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
            {walletAddress ? (
              <div className="flex items-center">
                <span>Connected: {truncateAddress(walletAddress)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent connectWallet from being called
                    handleCopy(walletAddress);
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Copy address"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 0h-2M16 7H8" />
                  </svg>
                </button>
                {copiedMessage[walletAddress] && <span className="ml-2 text-xs text-green-500">Copied!</span>}
              </div>
            ) : (
              "Connect Wallet"
            )}
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
                <th scope="col" className="py-3 px-6">Total Claimed</th>
                <th scope="col" className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={index} className="bg-white border-b hover:bg-gray-50">
                  <td className="py-4 px-6"><Jazzicon address={point.address} size={32} /></td>
                  <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap flex items-center">
                    {truncateAddress(point.address)}
                    <button
                      onClick={() => handleCopy(point.address)}
                      className="ml-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Copy address"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 0h-2M16 7H8" />
                      </svg>
                    </button>
                    {copiedMessage[point.address] && <span className="ml-2 text-xs text-green-500">Copied!</span>}
                  </td>
                  <td className="py-4 px-6">{point.referralAmount}</td>
                  <td className="py-4 px-6">{point.paidPointAmount + point.paidMemberAmount}</td>
                  <td className="py-4 px-6">{point.airdropAmount}</td>
                  <td className="py-4 px-6">{point.totalClaimedAmount}</td>
                  <td className="py-4 px-6">{point.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}