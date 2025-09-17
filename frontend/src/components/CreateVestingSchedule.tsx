import Jazzicon from './Jazzicon';
import React, { useState } from 'react';
import { ethers, BrowserProvider } from 'ethers';
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
import { listenForVestingScheduleCreated } from '../utils/eventListeners';



export default function CreateVestingSchedule() {
  const [selectedVestingType, setSelectedVestingType] = useState('Investor');
  const [vestingQuantity, setVestingQuantity] = useState('');
  const [vestingAddress, setVestingAddress] = useState('');

  return (
    <div className="bg-[#fafafb] relative w-full" data-name="Create vesting schedule" data-node-id="2608:939">
      <div className="flex justify-between items-center mb-4 p-6" data-name="page head" data-node-id="2608:1190">
        <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]" data-node-id="2608:1191">
          <p className="leading-[normal] whitespace-pre">Vesting Schedule Registration</p>
        </div>
        {/* Placeholder for a button or other elements to maintain layout */}
        <div></div>
      </div>
      <div className="absolute h-[665px] left-[0px] overflow-clip top-[235px] w-[716px]" data-name="Vesting List" data-node-id="2615:135">
        <div className="absolute bg-white h-[60px] left-9 rounded-[10px] shadow-[1px_17px_44px_0px_rgba(3,2,41,0.07)] top-[33px] w-[478px]" data-name="bg" data-node-id="2615:172" />
        <div className="absolute contents left-[376px] top-[51px]" data-name="Paid Point" data-node-id="2615:173">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[376px] text-[#030229] text-[14px] top-[51px] w-[74.356px]" data-node-id="2615:174">
            <p className="leading-[normal]">1,000,000</p>
          </div>
        </div>
        <div className="absolute contents left-[233px] top-[52px]" data-name="Referral" data-node-id="2615:175">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[233px] text-[#030229] text-[14px] top-[52px] w-[73px]" data-node-id="2615:176">
            <p className="leading-[normal]">Investor</p>
          </div>
        </div>
        <div className="absolute contents left-[92px] top-[55px]" data-name="Address" data-node-id="2615:177">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[92px] text-[#030229] text-[14px] top-[55px] w-28" data-node-id="2615:178">
            <p className="leading-[normal]">0x23...BC</p>
          </div>
        </div>
        <div className="absolute left-[54px] top-12" data-name="Address Image" data-node-id="2615:179">
          <Jazzicon address="0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2" size={30} />
        </div>
        <div className="absolute left-[554px] top-[52px] w-[132px] h-[27px] bg-[#e71d36] opacity-90 rounded-[33px] flex items-center justify-center" data-name="button" data-node-id="2615:185">
          <p className="text-white text-[14px] font-['Nunito:Regular',_sans-serif]">Approve (1/4)</p>
        </div>
        <div className="absolute bg-white h-[60px] left-9 rounded-[10px] shadow-[1px_17px_44px_0px_rgba(3,2,41,0.07)] top-[122px] w-[478px]" data-name="bg" data-node-id="2615:189" />
        <div className="absolute contents left-[376px] top-[140px]" data-name="Paid Point" data-node-id="2615:190">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[376px] text-[#030229] text-[14px] top-[140px] w-[74.356px]" data-node-id="2615:191">
            <p className="leading-[normal]">1,400,000</p>
          </div>
        </div>
        <div className="absolute contents left-[233px] top-[141px]" data-name="Referral" data-node-id="2615:192">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[233px] text-[#030229] text-[14px] top-[141px] w-[73px]" data-node-id="2615:193">
            <p className="leading-[normal]">Founder</p>
          </div>
        </div>
        <div className="absolute contents left-[92px] top-36" data-name="Address" data-node-id="2615:194">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[92px] text-[#030229] text-[14px] top-36 w-28" data-node-id="2615:195">
            <p className="leading-[normal]">0x51...A1</p>
          </div>
        </div>
        <div className="absolute left-[54px] top-[137px]" data-name="Address Image" data-node-id="2615:196">
          <Jazzicon address="0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db" size={30} />
        </div>
        <div className="absolute left-[554px] top-[141px] w-[132px] h-[27px] bg-[#e71d36] opacity-90 rounded-[33px] flex items-center justify-center" data-name="button" data-node-id="2615:199">
          <p className="text-white text-[14px] font-['Nunito:Regular',_sans-serif]">Approve (2/4)</p>
        </div>
        <div className="absolute bg-white h-[60px] left-9 rounded-[10px] shadow-[1px_17px_44px_0px_rgba(3,2,41,0.07)] top-[211px] w-[478px]" data-name="bg" data-node-id="2615:212" />
        <div className="absolute contents left-[376px] top-[229px]" data-name="Paid Point" data-node-id="2615:213">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[376px] text-[#030229] text-[14px] top-[229px] w-[74.356px]" data-node-id="2615:214">
            <p className="leading-[normal]">1,000,000</p>
          </div>
        </div>
        <div className="absolute contents left-[233px] top-[230px]" data-name="Referral" data-node-id="2615:215">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[233px] text-[#030229] text-[14px] top-[230px] w-[73px]" data-node-id="2615:216">
            <p className="leading-[normal]">Employee</p>
          </div>
        </div>
        <div className="absolute contents left-[92px] top-[233px]" data-name="Address" data-node-id="2615:217">
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal leading-[0] left-[92px] text-[#030229] text-[14px] top-[233px] w-28" data-node-id="2615:218">
            <p className="leading-[normal]">0x76...01</p>
          </div>
        </div>
        <div className="absolute left-[54px] top-[226px]" data-name="Address Image" data-node-id="2615:219">
          <Jazzicon address="0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB" size={30} />
        </div>
        <div className="absolute left-[554px] top-[230px] w-[132px] h-[27px] rounded-[33px] flex items-center justify-center" data-name="button" data-node-id="2615:222" style={{backgroundColor: 'rgba(179, 179, 191, 0.2)'}}>
          <p className="text-black text-[14px] font-['Nunito:Regular',_sans-serif]">Approved</p>
        </div>
      </div>
      <div className="absolute h-28 left-[0px] overflow-clip top-[123px] w-[775px]" data-name="New Vesting" data-node-id="2615:136">
        <div className="absolute contents left-[35px] top-[26px]" data-name="Frist Table" data-node-id="2615:142">
          <div className="absolute bg-white h-[60px] left-[35px] rounded-[10px] shadow-[1px_17px_44px_0px_rgba(3,2,41,0.07)] top-[26px] w-[478px]" data-name="bg" data-node-id="2615:143" />
          <button
            className="absolute bg-[#4285f4] h-[27px] left-[553px] opacity-90 rounded-[33px] top-[41px] w-[132px] text-white text-[14px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center"
            data-name="button"
            data-node-id="2615:144"
            onClick={async () => {
              let contractABI;
              let contractAddress;
              let contractName;

              switch (selectedVestingType) {
                case 'Mock':
                  contractABI = mockVestingABI;
                  contractAddress = mockVestingAddress;
                  contractName = 'Mock Vesting';
                  break;
                case 'Investor':
                  contractABI = investorVestingABI;
                  contractAddress = investorVestingAddress;
                  contractName = 'Investor Vesting';
                  break;
                case 'Employee':
                  contractABI = employeeVestingABI;
                  contractAddress = employeeVestingAddress;
                  contractName = 'Employee Vesting';
                  break;
                case 'Founder':
                  contractABI = founderVestingABI;
                  contractAddress = founderVestingAddress;
                  contractName = 'Founder Vesting';
                  break;
                default:
                  alert('Invalid vesting type selected.');
                  return;
              }

              if (!vestingAddress || !vestingQuantity) {
                alert('Please enter both recipient address and vesting quantity.');
                return;
              }

              if (!window.ethereum) {
                alert('MetaMask or a compatible Ethereum wallet is not installed.');
                return;
              }

              try {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(); // Get the signer from the connected wallet
                const contract = new ethers.Contract(contractAddress, contractABI, signer); // Use signer for state-changing calls

                const beneficiary = vestingAddress;
                const totalAmount = ethers.parseUnits(vestingQuantity, 18); // Convert to BigNumber with 18 decimals

                alert(`Sending transaction to create ${contractName} vesting schedule for ${beneficiary} with amount ${vestingQuantity}...`);

                const tx = await contract.createVesting(beneficiary, totalAmount);
                alert(`Transaction sent! Tx Hash: ${tx.hash}\nWaiting for confirmation...`);

                const receipt = await tx.wait(); // Wait for the transaction to be mined

                if (receipt && receipt.status === 1) {
                  alert(`${contractName} Vesting Schedule created successfully!\nTx Hash: ${receipt.hash}`);

                  // Start listening for the VestingScheduleCreated event
                  listenForVestingScheduleCreated(contract, (beneficiary, totalVestingDuration, cliffDuration, releaseDuration, installmentCount, totalAmount) => {
                    alert(`VestingScheduleCreated event received for beneficiary: ${beneficiary}, amount: ${totalAmount.toString()}`);
                    // You can add further UI updates or logic here based on the event
                  });

                } else {
                  alert(`Failed to create ${contractName} Vesting Schedule. Transaction reverted.\nTx Hash: ${receipt?.hash || 'N/A'}`);
                }

              } catch (error: any) {
                console.error('Error creating vesting schedule:', error);
                let errorMessage = `Failed to create ${contractName} Vesting Schedule.`;
                if (error.message) {
                  errorMessage += `\nError: ${error.message}`;
                }
                if (error.code) {
                  errorMessage += ` (Code: ${error.code})`;
                }
                alert(`${errorMessage}\nSee console for more details.`);
              }
            }}
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