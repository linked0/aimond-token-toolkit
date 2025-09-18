import React, { useState, useEffect } from 'react';
import Jazzicon from './Jazzicon';
import { ethers } from 'ethers';
import { founderVestingAddress, founderVestingABI } from '../constants/contracts';

const imgPlus = "/assets/plus.svg";

interface VestingItem {
  address: string;
  totalVesting: number;
  totalPayout: number;
  currentRelease: number;
  status: string;
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function FounderVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  const [vestingData, setVestingData] = useState<VestingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVestingData = async () => {
      if (!(window as any).ethereum) {
        console.error("MetaMask is not installed");
        alert("Please install MetaMask to use this feature.");
        return;
      }

      setLoading(true);
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const address = founderVestingAddress;
        const abi = founderVestingABI;

        if (!address || address.includes('0x...')) {
            console.error(`Contract address for Founder vesting is not configured.`);
            alert(`Contract address for Founder vesting is not configured. Please set it in your environment variables.`);
            setVestingData([]);
            return;
        }
        const contract = new ethers.Contract(address, abi, provider);

        const events = await contract.queryFilter(contract.filters.VestingScheduleCreated());

        const schedules = await Promise.all(events.map(async (event: any) => {
          const beneficiary = event.args.beneficiary;
          const schedule = await contract.vestingSchedules(beneficiary);
          const currentlyReleasable = await contract.getCurrentlyReleasableAmount(beneficiary);

          let status = "Pending";
          if (schedule.releasedAmount > 0 && schedule.releasedAmount < schedule.totalAmount) {
              status = "In Progress";
          } else if (schedule.releasedAmount > 0 && schedule.releasedAmount === schedule.totalAmount) {
              status = "Completed";
          }

          return {
            address: beneficiary,
            totalVesting: Number(ethers.formatUnits(schedule.totalAmount, 18)),
            totalPayout: Number(ethers.formatUnits(schedule.releasedAmount, 18)),
            currentRelease: Number(ethers.formatUnits(currentlyReleasable, 18)),
            status: status,
          };
        }));

        setVestingData(schedules);
      } catch (error) {
        console.error("Error fetching vesting data:", error);
        alert("Error fetching vesting data. Check the console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchVestingData();
  }, []);

  return (
    <div className="bg-[#f7f7f8] relative size-full">
      <div>
        <div className="flex justify-between items-center mb-4 p-6">
          <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
            <p>Founder Vesting Release List (Vesting Status)</p>
          </div>
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
                <th scope="col" className="py-3 px-6"></th>
                <th scope="col" className="py-3 px-6">Address</th>
                <th scope="col" className="py-3 px-6">Total Vesting</th>
                <th scope="col" className="py-3 px-6">Total Payout</th>
                <th scope="col" className="py-3 px-6">Current Release</th>
                <th scope="col" className="py-3 px-6">Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
              ) : vestingData.length > 0 ? (
                vestingData.map((vesting, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6"><Jazzicon address={vesting.address} size={32} /></td>
                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                      {truncateAddress(vesting.address)}
                    </td>
                    <td className="py-4 px-6">{vesting.totalVesting}</td>
                    <td className="py-4 px-6">{vesting.totalPayout}</td>
                    <td className="py-4 px-6">{vesting.currentRelease}</td>
                    <td className="py-4 px-6">{vesting.status}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center py-4">No vesting schedules found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
