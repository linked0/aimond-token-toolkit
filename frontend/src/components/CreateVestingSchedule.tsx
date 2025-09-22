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
      alert('Invalid vesting type selected.');
      return;
    }

    if (!vestingAddress || !vestingQuantity) {
      alert('Please enter both recipient address and vesting quantity.');
      return;
    }

    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      alert('Safe wallet address not found in environment variables.');
      return;
    }

    if (!window.ethereum) {
      alert('MetaMask is not installed.');
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
        provider: providerUrl,
        signer: process.env.REACT_APP_ADMIN_KEY,
        safeAddress: safeAddress,
        apiKey: process.env.REACT_APP_SAFE_API_KEY
      });

      const contract = new Contract(contractAddress, contractABI);
      const wsProvider = new ethers.WebSocketProvider(wsProviderUrl);
      const eventContract = new Contract(contractAddress, contractABI, wsProvider);

      const beneficiary = vestingAddress;
      const totalAmount = ethers.parseUnits(vestingQuantity, 18);
      const mockVestingContract = new Contract(mockVestingAddress, mockVestingABI, provider);
      const [cliff, vesting, installments, beneficiariesCount] = await Promise.all([
        mockVestingContract.cliffDurationInSeconds(),
        mockVestingContract.vestingDurationInSeconds(),
        mockVestingContract.installmentCount(),
        mockVestingContract.beneficiariesCount(),
      ]);
      console.log({ cliff, vesting, installments, beneficiariesCount });
      console.log({ beneficiary, totalAmount });

      const safeTransactionData = {
        to: contractAddress,
        value: '0',
        data: contract.interface.encodeFunctionData('createVesting', [beneficiary, totalAmount]),
      };

      alert(`Proposing transaction to Safe wallet ${safeAddress} to create ${contractName} vesting schedule...`);

      const txResult = await safeClient.send({ transactions: [safeTransactionData] });

      alert(`Transaction proposed successfully to your Safe wallet! SafeTxHash: ${txResult.transactions?.safeTxHash}\nPlease go to your Safe app to approve and execute the transaction.`);

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
      let errorMessage = `Failed to propose transaction for ${contractName} Vesting Schedule.`;
      if (error.message) {
        errorMessage += `\nError: ${error.message}`;
      }
      alert(`${errorMessage}\nSee console for more details.`);
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
      <div className="absolute h-28 left-[0px] overflow-clip top-[123px] w-[775px]" data-name="New Vesting" data-node-id="2615:136">
        <div className="absolute contents left-[35px] top-[26px]" data-name="Frist Table" data-node-id="2615:142">
          <div className="absolute bg-white h-[60px] left-[35px] rounded-[10px] shadow-[1px_17px_44px_0px_rgba(3,2,41,0.07)] top-[26px] w-[478px]" data-name="bg" data-node-id="2615:143" />
          <button
            className="absolute bg-[#4285f4] h-[27px] left-[553px] opacity-90 rounded-[33px] top-[41px] w-[132px] text-white text-[14px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center"
            data-name="button"
            data-node-id="2615:144"
            onClick={createVesting}
          >
            Submit
          </button>
          <div className="absolute contents left-[375px] top-11" data-name="Paid Point" data-node-id="2615:149">
            <input
              type="number"
              className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[375px] text-[#030229] text-[14px] top-11 w-[100px] h-[30px] border border-gray-300 rounded-md p-2"
              data-node-id="2615:150"
              value={vestingQuantity}
              onChange={(e) => setVestingQuantity(e.target.value)}
              placeholder="1,000,000"
            />
          </div>
          <div className="absolute contents left-[232px] top-[45px]" data-name="Referral" data-node-id="2615:151">
            <select
              className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[232px] text-[#030229] text-[14px] top-[45px] w-[100px] h-[30px] border border-gray-300 rounded-md"
              data-node-id="2615:152"
              value={selectedVestingType}
              onChange={(e) => setSelectedVestingType(e.target.value)}
            >
              <option value="Investor">Investor</option>
              <option value="Founder">Founder</option>
              <option value="Employee">Employee</option>
              <option value="Mock">Mock</option>
            </select>
          </div>
          <div className="absolute contents left-[91px] top-12" data-name="Address" data-node-id="2615:153">
            <input
              type="text"
              className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[91px] text-[#030229] text-[14px] top-12 w-[120px] h-[30px] border border-gray-300 rounded-md p-2"
              data-node-id="2615:154"
              value={vestingAddress}
              onChange={(e) => setVestingAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="absolute left-[53px] top-[41px]" data-name="Address Image" data-node-id="2615:155">
            {vestingAddress ? (
              <Jazzicon address={vestingAddress} size={30} />
            ) : (
              <div className="absolute h-[30px] left-[0px] top-[0px] w-[30px] bg-gray-200 rounded-full" />
            )}
          </div>
        </div>
        <div className="absolute contents left-[55px] top-0" data-name="Table heading" data-node-id="2615:158">
          <div className="absolute contents left-[375px] top-0" data-name="Total Payout" data-node-id="2615:163">
            <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3 leading-[0] left-[375px] opacity-70 text-[#030229] text-[12px] top-0 w-[137.557px]" data-node-id="2615:164">
              <p className="leading-[normal]">Vesting Amount</p>
            </div>
          </div>
          <div className="absolute contents left-[232px] top-0" data-name="Total Vesting" data-node-id="2615:165">
            <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3 leading-[0] left-[232px] opacity-70 text-[#030229] text-[12px] top-0 w-[97px]" data-node-id="2615:166">
              <p className="leading-[normal]">Vesting Type</p>
            </div>
          </div>
          <div className="absolute contents left-[91px] top-0" data-name="Address" data-node-id="2615:167">
            <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3 leading-[0] left-[91px] opacity-70 text-[#030229] text-[12px] top-0 w-[98.009px]" data-node-id="2615:168">
              <p className="leading-[normal]">Address</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
