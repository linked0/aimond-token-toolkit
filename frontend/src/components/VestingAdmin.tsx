import React from 'react';
import Jazzicon from './Jazzicon'; // Import Jazzicon

// Only keep imgPlus if it's used in the "New Vesting Schedule" button
const imgPlus = "http://localhost:3845/assets/e1514ec954dd3eb265200e1ce27083756b4d0da4.svg";

interface VestingItem {
  address: string;
  totalVesting: number;
  totalPayout: number;
  currentRelease: number;
  status: string;
}

const vestingData: VestingItem[] = [
  { address: "0x1234567890abcdef1234567890abcdef12345678", totalVesting: 3000000, totalPayout: 1400000, currentRelease: 100000, status: "Released" },
  { address: "0xabcdef1234567890abcdef1234567890abcdef12", totalVesting: 2000000, totalPayout: 1500000, currentRelease: 300000, status: "Release (0/4)" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", totalVesting: 3000000, totalPayout: 2200000, currentRelease: 500000, status: "Released" },
  { address: "0xabcdef1234567890abcdef1234567890abcdef12", totalVesting: 2500000, totalPayout: 1000000, currentRelease: 300000, status: "Release (3/4)" },
];

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function VestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  return (
    <div className="bg-[#f7f7f8] relative size-full">
      {/* Main Content Area */}
      <div>
        <div className="flex justify-between items-center mb-4 p-6">
          <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
            <p>Vesting Release List (Vesting Status)</p>
          </div>
          {/* New Vesting Schedule Button - adapted from original Figma code */}
          <button onClick={() => { setView('createVestingSchedule'); setActiveItem('Create Vesting'); }} className="bg-[#605bff] h-[42px] w-[231px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
            <div className="h-[20px] relative shrink-0 w-[17px]">
              <img alt="" className="block max-w-none size-full" src={imgPlus} />
            </div>
            <p className="leading-[normal] ml-2">New Vesting Schedule</p>
          </button>
        </div>

        <div className="relative overflow-x-auto shadow-md sm:rounded-lg mx-6">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-6"></th> {/* New column for Jazzicon */}
                <th scope="col" className="py-3 px-6">Address</th>
                <th scope="col" className="py-3 px-6">Total Vesting</th>
                <th scope="col" className="py-3 px-6">Total Payout</th>
                <th scope="col" className="py-3 px-6">Current Release</th>
                <th scope="col" className="py-3 px-6">Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {vestingData.map((vesting, index) => (
                <tr key={index} className="bg-white border-b hover:bg-gray-50">
                  <td className="py-4 px-6"><Jazzicon address={vesting.address} size={32} /></td> {/* Jazzicon */}
                  <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                    {truncateAddress(vesting.address)}
                  </td>
                  <td className="py-4 px-6">{vesting.totalVesting}</td>
                  <td className="py-4 px-6">{vesting.totalPayout}</td>
                  <td className="py-4 px-6">{vesting.currentRelease}</td>
                  <td className="py-4 px-6">{vesting.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}