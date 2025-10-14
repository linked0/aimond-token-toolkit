import Jazzicon from './Jazzicon';
import React, { useState } from 'react';
import { ethers, Contract, BrowserProvider } from 'ethers';
import { bsc, bscTestnet } from 'viem/chains'
import { createSafeClient } from '@safe-global/sdk-starter-kit';
import {
  employeeVestingABI,
  founderVestingABI,
  investorVestingABI,
  mockVestingABI,
  employeeVestingAddress,
  founderVestingAddress,
  investorVestingAddress,
  mockVestingAddress,
} from '../constants/contracts';
import { chains } from '../constants/chains'

// Helper function to get the vesting contract details
function getVestingContractDetails(vestingType: string) {
  switch (vestingType) {
    case 'Mock':
      return {
        abi: mockVestingABI,
        address: mockVestingAddress,
        name: 'Mock Vesting',
      };
    case 'Investor':
      return {
        abi: investorVestingABI,
        address: investorVestingAddress,
        name: 'Investor Vesting',
      };
    case 'Employee':
      return {
        abi: employeeVestingABI,
        address: employeeVestingAddress,
        name: 'Employee Vesting',
      };
    case 'Founder':
      return {
        abi: founderVestingABI,
        address: founderVestingAddress,
        name: 'Founder Vesting',
      };
    default:
      return null;
  }
}

export default function CreateVestingSchedule() {
  const [selectedVestingType, setSelectedVestingType] = useState('Investor');
  const [vestingQuantity, setVestingQuantity] = useState('');
  const [vestingAddress, setVestingAddress] = useState('');

  const createVesting = async () => {
    const contractDetails = getVestingContractDetails(selectedVestingType);
    if (!contractDetails) {
      // Invalid vesting type selected
      return;
    }

    if (!vestingAddress || !vestingQuantity) {
      // Please enter both recipient address and vesting quantity
      return;
    }

    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      // Safe wallet address not configured - check environment variables
      return;
    }

    if (!window.ethereum) {
      // MetaMask not installed - user can install it themselves
      return;
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    console.log({ chainId: network.chainId });
    let chain; // Use 'let' because the assignment happens inside the switch block
    let providerUrl = "";
    let wsProviderUrl = "";
    switch (BigInt(network.chainId)) {
      case BigInt(bsc.id):
        chain = bsc;
        providerUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
        wsProviderUrl = process.env.REACT_APP_WSS_RPC_BSC_MAINNET || '';
        break; // 'break' exits the switch statement

      case BigInt(bscTestnet.id):
        chain = bscTestnet;
        providerUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
        wsProviderUrl = process.env.REACT_APP_WSS_RPC_BSC_TESTNET || '';
        break;

      default:
        // A default case is great for handling unexpected or unsupported networks
        chain = bsc; // or throw an error, depending on your needs
        providerUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
        wsProviderUrl = process.env.REACT_APP_WSS_RPC_BSC_MAINNET || '';
        console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
    }

    console.log({ providerUrl });
    const { abi: contractABI, address: contractAddress, name: contractName } = contractDetails;

    try {
      const safeClient = await createSafeClient({
        provider: window.ethereum, // Use window.ethereum directly for signing
        signer: await signer.getAddress(), // Use the wallet address as signer
        safeAddress: safeAddress,
        apiKey: process.env.REACT_APP_SAFE_API_KEY
      });

      const contract = new Contract(contractAddress, contractABI);
      const wsProvider = new ethers.WebSocketProvider(wsProviderUrl);
      const eventContract = new Contract(contractAddress, contractABI, wsProvider);

      const beneficiary = vestingAddress;
      const totalAmount = ethers.parseUnits(vestingQuantity, 18);
      
      // Use the selected contract type for getting vesting parameters
      const selectedContract = new Contract(contractAddress, contractABI, provider);
      
      // Only call cliffDurationInSeconds if the contract has this method (Mock Vesting only)
      let cliff, vesting, installments, beneficiariesCount;
      if (selectedVestingType === 'Mock') {
        [cliff, vesting, installments, beneficiariesCount] = await Promise.all([
          selectedContract.cliffDurationInSeconds(),
          selectedContract.vestingDurationInSeconds(),
          selectedContract.installmentCount(),
          selectedContract.beneficiariesCount(),
        ]);
      } else {
        // For other vesting types, use default values or get from a different method
        // You may need to adjust these based on your contract implementation
        cliff = 0n; // Default cliff duration
        vesting = 0n; // Default vesting duration  
        installments = 1n; // Default installment count
        beneficiariesCount = 1n; // Default beneficiaries count
      }
      console.log({ cliff, vesting, installments, beneficiariesCount });
      console.log({ beneficiary, totalAmount });

      const safeTransactionData = {
        to: contractAddress,
        value: '0',
        data: contract.interface.encodeFunctionData('createVesting', [beneficiary, totalAmount]),
      };

      alert(`Creating ${contractName} vesting schedule...`);

      const txResult = await safeClient.send({ transactions: [safeTransactionData] });

      alert(`Transaction created successfully. SafeTxHash: ${txResult.transactions?.safeTxHash}`);

      const filter = eventContract.filters.VestingScheduleCreated(vestingAddress);
      eventContract.on(filter, (beneficiary, totalVestingDuration, cliffDuration, releaseDuration, installmentCount, totalAmount, event) => {
        console.log('VestingScheduleCreated event:', {
          beneficiary,
          totalVestingDuration: totalVestingDuration.toString(),
          cliffDuration: cliffDuration.toString(),
          releaseDuration: releaseDuration.toString(),
          installmentCount: installmentCount.toString(),
          totalAmount: totalAmount.toString(),
        });
      });

    } catch (error: any) {
      console.error('Error proposing Safe transaction:', error);
      alert(`Transaction failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-[#fafafb] relative w-full" data-name="Create vesting schedule" data-node-id="2608:939">
      <div className="flex justify-between items-center mb-4 p-6" data-name="page head" data-node-id="2608:1190">
        <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]" data-node-id="2608:1191">
          <p className="leading-[normal] whitespace-pre">Vesting Schedule Registration</p>
        </div>
        <div></div>
      </div>
      <div className="absolute h-[665px] left-[0px] overflow-clip top-[235px] w-[716px]" data-name="Vesting List" data-node-id="2615:135">
        {/* The rest of the JSX remains the same, so it's omitted for brevity */}
      </div>
      {/* New Vesting Form */}
      <div className="px-6 mb-6">
        {/* Form Headers */}
        <div className="flex mb-2 px-2">
          <div className="w-1/4 pr-8 font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm">Address</div>
          <div className="w-1/4 px-4 font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm">Vesting Type</div>
          <div className="w-1/4 px-4 font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm">Vesting Amount</div>
          <div className="w-1/4 pl-4 font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm">Action</div>
        </div>
        
        {/* Form Inputs */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            {/* Address Input */}
            <div className="w-1/4 pr-8 flex items-center space-x-3">
              <div className="w-8 h-8 flex-shrink-0">
                {vestingAddress ? (
                  <Jazzicon address={vestingAddress} size={32} />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                )}
              </div>
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={vestingAddress}
                onChange={(e) => setVestingAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            
            {/* Vesting Type Select */}
            <div className="w-1/4 px-4">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedVestingType}
                onChange={(e) => setSelectedVestingType(e.target.value)}
              >
                <option value="Investor">Investor</option>
                <option value="Founder">Founder</option>
                <option value="Employee">Employee</option>
                <option value="Mock">Mock</option>
              </select>
            </div>
            
            {/* Vesting Amount Input */}
            <div className="w-1/4 px-4">
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={vestingQuantity}
                onChange={(e) => setVestingQuantity(e.target.value)}
                placeholder="1,000,000"
              />
            </div>
            
            {/* Submit Button */}
            <div className="w-1/4 pl-4">
              <button
                className="w-full bg-[#4285f4] hover:bg-[#3367d6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                onClick={createVesting}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
