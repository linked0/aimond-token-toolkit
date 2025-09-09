import Jazzicon from './Jazzicon';
import { useState } from "react";
import Sidebar from './Sidebar';

const imgPlus = "/assets/plus.svg";
const imgBatch = "/assets/batch.svg";

interface Point {
    address: string;
    referralAmount: number;
    paidPointAmount: number;
    airdropAmount: number;
    status: string;
}

interface LoyaltyPointAdminProps {
    points: Point[];
    walletAddress: string | null;
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LoyaltyPointAdmin({ points, walletAddress }: LoyaltyPointAdminProps) {
    const [activeItem, setActiveItem] = useState('Loyalty Point');
    const [selectedPoints, setSelectedPoints] = useState<string[]>([]);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedPoints(points.map(p => p.address));
        } else {
            setSelectedPoints([]);
        }
    };

    const handleSelectPoint = (address: string) => {
        if (selectedPoints.includes(address)) {
            setSelectedPoints(selectedPoints.filter(p => p !== address));
        } else {
            setSelectedPoints([...selectedPoints, address]);
        }
    };

    return (
        <div className="bg-[#f7f7f8] relative size-full">
            
            {/* Main Content Area */}
            <div>
                <div className="flex justify-between items-center mb-4 p-6">
                    <div>
                        <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
                            <p>Loyalty Point List</p>
                        </div>
                        <div className="font-['Nunito:Regular',_sans-serif] text-sm text-gray-500">
                            <p>Admin: {truncateAddress(walletAddress || '')}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="bg-[#605bff] h-[42px] w-[150px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
                            <img src={imgPlus} alt="New Airdrop" className="w-5 h-5 mr-2" />
                            New Airdrop
                        </button>
                        <button className="bg-[#605bff] h-[42px] w-[180px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
                            <img src={imgBatch} alt="Release Batch" className="w-5 h-5 mr-2" />
                            Release Batch
                        </button>
                    </div>
                </div>

                <div className="relative overflow-x-auto shadow-md sm:rounded-lg mx-6">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="p-4">
                                    <div className="flex items-center">
                                        <input id="checkbox-all-search" type="checkbox" onChange={handleSelectAll} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                        <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                                    </div>
                                </th>
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
                                    <td className="w-4 p-4">
                                        <div className="flex items-center">
                                            <input id={`checkbox-table-search-${index}`} type="checkbox" checked={selectedPoints.includes(point.address)} onChange={() => handleSelectPoint(point.address)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                            <label htmlFor={`checkbox-table-search-${index}`} className="sr-only">checkbox</label>
                                        </div>
                                    </td>
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
        </div>
    );
}
