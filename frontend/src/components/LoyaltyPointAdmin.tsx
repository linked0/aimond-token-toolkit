import Jazzicon from './Jazzicon';
import { useState, useCallback } from "react";

const imgPlus = "/assets/plus.svg";
const imgBatch = "/assets/batch.svg";

interface Point {
    address: string;
    referralAmount: number;
    paidPointAmount: number; // This will now represent only SPENDING_REWARD
    airdropAmount: number;
    paidMemberAmount: number; // Added for PAID_MEMBER allocations
    status: string;
    totalClaimedAmount: number;
}

interface LoyaltyPointAdminProps {
    points: Point[];
    walletAddress: string | null;
    refreshPoints: () => void;
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LoyaltyPointAdmin({ points, walletAddress, refreshPoints }: LoyaltyPointAdminProps) {
    const [activeItem, setActiveItem] = useState('Loyalty Point');
    const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
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

    const handleReleaseBatch = async () => {
        if (selectedPoints.length === 0) {
            alert("Please select users to release");
            return;
        }

        try {
            const response = await fetch('/api/release-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ addresses: selectedPoints }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to release batch: ${errorData}`);
            }

            const result = await response.json();
            console.log("Batch Release Results:", result.message);
            result.results.forEach((item: any) => {
                console.log(`  Address: ${item.address}, Success: ${item.success}, TxHash: ${item.txHash || 'N/A'}, Error: ${item.error || 'N/A'}`);
            });
            alert("Batch release completed");
            refreshPoints();

        } catch (error: any) {
            console.error("An error occurred during the batch release process:", error);
            alert(`Release failed: ${error.message}`);
        }
    };

    return (
        <div className="relative size-full">
            
            {/* Main Content Area */}
            <div>
                <div className="flex justify-between items-center mb-4 p-6">
                    <div>
                        <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
                            <p>Loyalty Point List</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="bg-[#605bff] h-[42px] w-[180px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
                            <img src={imgPlus} alt="New Airdrop" className="w-5 h-5 mr-2" />
                            New Airdrop
                        </button>
                        <button onClick={handleReleaseBatch} className="bg-[#605bff] h-[42px] w-[180px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc]">
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
                                <th scope="col" className="py-3 px-6">Total Claimed</th>
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
