import React, { useState, useEffect } from 'react';
import Jazzicon from './Jazzicon';
import { ethers } from 'ethers';
import { mockVestingAddress, mockVestingABI } from '../constants/contracts';
import { bsc, bscTestnet } from 'viem/chains';
import { createSafeClient } from '@safe-global/sdk-starter-kit';

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

export default function MockVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  const [vestingData, setVestingData] = useState<VestingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ongoingTransaction, setOngoingTransaction] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);

  async function fetchCurrentUserAddress() {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log("Current user address:", address);
      setCurrentUserAddress(address);
    } catch (error) {
      console.error("Error fetching current user address:", error);
    }
  }

  async function handleConfirmTransaction(tx: any) {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      alert("Please install MetaMask to use this feature.");
      return;
    }

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      // Network detection for RPC URL selection
      console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);

      // Get the RPC URL for the provider
      let rpcUrl = "";
      switch (BigInt(network.chainId)) {
        case BigInt(bsc.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          break;
        case BigInt(bscTestnet.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
          break;
        default:
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network ${network.name}`);
      }

      // Use the safe address from environment if tx.safeAddress is not available
      const safeAddressToUse = tx.safeAddress || process.env.REACT_APP_SAFE_WALLET;
      
      if (!safeAddressToUse) {
        throw new Error("No safe address available. Please check REACT_APP_SAFE_WALLET environment variable.");
      }

      // Create Safe client with proper configuration
      // Use window.ethereum directly for signing operations
      const safeClient = await createSafeClient({
        provider: window.ethereum, // Use window.ethereum directly for signing
        signer: await signer.getAddress(), // Use the wallet address as signer
        safeAddress: safeAddressToUse,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      console.log(`Confirming transaction with safeTxHash: ${tx.safeTxHash}`);
      console.log("Transaction object:", tx);
      console.log("Safe address from transaction:", tx.safeAddress);
      console.log("Safe address from env:", process.env.REACT_APP_SAFE_WALLET);
      console.log("Using safe address:", safeAddressToUse);
      
      const txResponse = await safeClient.confirm({
        safeTxHash: tx.safeTxHash,
      });

      console.log("Transaction confirmed:", txResponse);
      alert("Transaction confirmed successfully!");
      fetchPendingTransactions(); // Refresh the list of pending transactions
    } catch (error: any) {
      console.error("Error confirming transaction:", error);
      alert(`Error confirming transaction: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  async function fetchVestingData() {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      alert("Please install MetaMask to use this feature.");
      return;
    }

    setLoading(true);
    try {
      console.log("Fetching vesting data for Mock Vesting...");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(mockVestingAddress, mockVestingABI, provider);

      const beneficiaryCount = await contract.beneficiariesCount();
      const beneficiaries: string[] = [];
      for (let i = 0; i < beneficiaryCount; i++) {
          beneficiaries.push(await contract.getBeneficiaryAtIndex(i));
      }

      const schedules = await Promise.all(beneficiaries.map(async (beneficiary: string) => {
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
    } catch (error: any) {
      console.error("Error fetching vesting data:", error);
      alert(`Error fetching vesting data. Check the console for details. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingTransactions() {
    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      alert('Safe wallet address not found in environment variables.');
      return;
    }

    if (!window.ethereum) {
      alert('MetaMask is not installed.');
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);

    try {
      const signer = await provider.getSigner();
      
      // Get the RPC URL for the provider
      let rpcUrl = "";
      switch (BigInt(network.chainId)) {
        case BigInt(bsc.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          break;
        case BigInt(bscTestnet.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
          break;
        default:
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network ${network.name}`);
      }

      console.log("Creating Safe client with:");
      console.log("- Provider: Browser provider (MetaMask)");
      console.log("- Signer:", await signer.getAddress());
      console.log("- Safe Address:", safeAddress);
      console.log("- API Key:", process.env.REACT_APP_SAFE_API_KEY ? "Present" : "Missing");

      // Create Safe client with proper configuration
      // Use window.ethereum directly for signing operations
      const safeClient = await createSafeClient({
        provider: window.ethereum, // Use window.ethereum directly for signing
        signer: await signer.getAddress(), // Use the wallet address as signer
        safeAddress: safeAddress,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });
      
      const pendingTxs = await safeClient.getPendingTransactions();
      console.log("Fetched pending transactions:", pendingTxs);
      console.log("Transaction structure:", pendingTxs.results?.[0]);
      setPendingTransactions(pendingTxs.results || []);
    } catch (error: any) {
      console.error("Error fetching pending transactions:", error);
      setPendingTransactions([]);
      alert("Error fetching pending transactions. Please check the console for details.");
    }
  }

  useEffect(() => {
    fetchVestingData();
    fetchPendingTransactions();
    fetchCurrentUserAddress();
  }, []);

  function getVestingAmount(tx: any) {
    if (!tx.dataDecoded) {
      return 'N/A';
    }

    if (tx.dataDecoded.method === 'createVesting') {
      const amount = tx.dataDecoded.parameters.find((p: any) => p.name === 'totalAmount')?.value;
      return amount ? Number(ethers.formatUnits(amount, 18)).toLocaleString() : 'N/A';
    }

    if (tx.dataDecoded.method === 'release') {
      const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
      const beneficiary = beneficiaryParam ? beneficiaryParam.value : tx.dataDecoded.parameters[0].value;
      if (beneficiary) {
        const vestingInfo = vestingData.find(v => v.address.toLowerCase() === beneficiary.toLowerCase());
        return vestingInfo ? vestingInfo.totalVesting.toLocaleString() : 'N/A';
      }
    }

    return 'N/A';
  }

  function getBeneficiary(tx: any) {
    if (!tx.dataDecoded) {
      return 'N/A';
    }
  
    if (tx.dataDecoded.method === 'createVesting' || tx.dataDecoded.method === 'release') {
      const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
      const beneficiary = beneficiaryParam ? beneficiaryParam.value : tx.dataDecoded.parameters[0].value;
      return beneficiary ? truncateAddress(beneficiary) : 'N/A';
    }
  
    return 'N/A';
  }

  function getBeneficiaryAddress(tx: any): string | null {
    if (!tx.dataDecoded) {
      return null;
    }
  
    if (tx.dataDecoded.method === 'createVesting' || tx.dataDecoded.method === 'release') {
      const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
      return beneficiaryParam ? beneficiaryParam.value : tx.dataDecoded.parameters[0].value;
    }
  
    return null;
  }

  async function handleRelease(beneficiaryAddress: string) {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      alert("Please install MetaMask to use this feature.");
      return;
    }

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(mockVestingAddress, mockVestingABI, signer);

      console.log(`Releasing tokens for ${beneficiaryAddress}...`);
      const tx = await contract.release(beneficiaryAddress);
      await tx.wait();
      console.log("Transaction successful:", tx);

      alert("Tokens released successfully!");
      fetchVestingData(); 
    } catch (error: any) {
      console.error("Error releasing tokens:", error);
      alert(`Error releasing tokens: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  return (
    <div className="bg-[#f7f7f8] relative size-full">
      {ongoingTransaction && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
          <p>Transaction in progress...</p>
        </div>
      )}
      <div>
        <div className="flex justify-between items-center mb-4 p-6">
          <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
            <p>Mock Vesting Release List (Vesting Status)</p>
          </div>
          <button 
            onClick={() => { setView('createVestingSchedule'); setActiveItem('Create Vesting'); }}
            className="bg-[#605bff] h-[42px] w-[231px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4a47cc] disabled:bg-gray-400"
            disabled={ongoingTransaction}
          >
            {ongoingTransaction ? (
              <p>Processing...</p>
            ) : (
              <>
                <div className="h-[20px] relative shrink-0 w-[17px]">
                  <img alt="" className="block max-w-none size-full" src={imgPlus} />
                </div>
                <p className="leading-[normal] ml-2">New Vesting Schedule</p>
              </>
            )}
          </button>
        </div>

        <div className="mx-6">
          <h2 className="text-xl font-bold mb-4">Pending Safe Transactions</h2>
          <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6"></th>
                  <th scope="col" className="py-3 px-6">Beneficiary</th>
                  <th scope="col" className="py-3 px-6">Total Vesting Amount</th>
                  <th scope="col" className="py-3 px-6">Safe Tx Hash</th>
                  <th scope="col" className="py-3 px-6">Nonce</th>
                  <th scope="col" className="py-3 px-6">Confirmations</th>
                  <th scope="col" className="py-3 px-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.length > 0 ? (
                  pendingTransactions.map((tx: any, index: number) => {
                    const beneficiaryAddress = getBeneficiaryAddress(tx);
                    const hasConfirmed = tx.confirmations.some((c: any) => c.owner.toLowerCase() === currentUserAddress?.toLowerCase());
                    const isInitiator = tx.origin?.toLowerCase() === currentUserAddress?.toLowerCase(); // Assuming tx.origin holds the initiator
                    const canConfirm = currentUserAddress && !hasConfirmed && !isInitiator && !tx.isExecuted; // Assuming tx.isExecuted exists
                    
                    // Debug logging
                    console.log(`Transaction ${index}:`, {
                      currentUserAddress,
                      hasConfirmed,
                      isInitiator,
                      isExecuted: tx.isExecuted,
                      canConfirm,
                      confirmations: tx.confirmations,
                      origin: tx.origin
                    });

                    return (
                      <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="py-4 px-6">
                          {beneficiaryAddress && <Jazzicon address={beneficiaryAddress} size={32} />}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{getBeneficiary(tx)}</td>
                        <td className="py-4 px-6">{getVestingAmount(tx)}</td>
                        <td className="py-4 px-6">
                          {truncateAddress(tx.safeTxHash)}
                        </td>
                        <td className="py-4 px-6">{tx.nonce}</td>
                        <td className="py-4 px-6">{tx.confirmations.length} / {tx.confirmationsRequired}</td>
                        <td className="py-4 px-6">
                          {canConfirm ? (
                            <button 
                              onClick={() => handleConfirmTransaction(tx)}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                              disabled={ongoingTransaction}
                            >
                              Confirm
                            </button>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {!currentUserAddress && "No wallet connected"}
                              {currentUserAddress && hasConfirmed && "Confirmed"}
                              {currentUserAddress && isInitiator && "You initiated this"}
                              {currentUserAddress && tx.isExecuted && "Already executed"}
                              {currentUserAddress && !hasConfirmed && !isInitiator && !tx.isExecuted && "Can confirm"}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">No pending transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative overflow-x-auto shadow-md sm:rounded-lg mx-6 mt-8">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-6"></th>
                <th scope="col" className="py-3 px-6">Address</th>
                <th scope="col" className="py-3 px-6">Total Vesting</th>
                <th scope="col" className="py-3 px-6">Total Payout</th>
                <th scope="col" className="py-3 px-6">Current Release</th>
                <th scope="col" className="py-3 px-6">Approval Status</th>
                <th scope="col" className="py-3 px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : vestingData.length > 0 ? (
                vestingData.map((vesting: VestingItem, index: number) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6"><Jazzicon address={vesting.address} size={32} /></td>
                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                      {truncateAddress(vesting.address)}
                    </td>
                    <td className="py-4 px-6">{vesting.totalVesting}</td>
                    <td className="py-4 px-6">{vesting.totalPayout}</td>
                    <td className="py-4 px-6">{vesting.currentRelease}</td>
                    <td className="py-4 px-6">{vesting.status}</td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => handleRelease(vesting.address)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        disabled={ongoingTransaction}
                      >
                        Release
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-4">No vesting schedules found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}