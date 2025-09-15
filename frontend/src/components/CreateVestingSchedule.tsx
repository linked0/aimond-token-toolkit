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

const imgImage1 = "http://localhost:3845/assets/61efd074028aa96a1e9eef1d0a7e03d7a1e8d1d9.png";
const imgImage11 = "http://localhost:3845/assets/1ed94ff64da2f3f54ae899366804c1f3be74ddb3.png";
const imgImage9 = "http://localhost:3845/assets/f3ea69cf1d730c80059ab8535ad3aba56c43b94c.png";
const imgImage12 = "http://localhost:3845/assets/030c05192da4d93b6c814a2ca95588fb343c1150.png";
const imgDocument = "http://localhost:3845/assets/341a1df35fe58500cd53c6a3285273c0ae19f457.svg";
const imgActivity = "http://localhost:3845/assets/b9a06a8ea7727b6112fc48a1ea42e3311e517406.svg";
const imgCategory = "http://localhost:3845/assets/a0780ca1ddab4ba69dcc5cbbf001b03f512a41a1.svg";
const imgTicket = "http://localhost:3845/assets/26dc285d6123c704fcead993203a95bfacfe2e9c.svg";
const imgChart = "http://localhost:3845/assets/b0c7e6f5fe9ebe343217871c27c56e843e34b836.svg";
const imgBg = "http://localhost:3845/assets/507932cbecfd97d1d83084a16b8a00c58a3f2988.svg";

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
        <div className="absolute contents left-[54px] top-12" data-name="Address Image" data-node-id="2615:179">
          <div className="absolute h-[30px] left-[54.32px] top-12 w-[27.485px]" data-name="bg" data-node-id="2615:180">
            <img alt="" className="block max-w-none size-full" src={imgBg} />
          </div>
          <div className="absolute bg-center bg-cover bg-no-repeat left-[54px] size-[30px] top-12" data-name="image 11" data-node-id="2615:210" style={{ backgroundImage: `url('${imgImage11}')` }} />
        </div>
        <div className="absolute contents left-[554px] top-[52px]" data-name="button" data-node-id="2615:185">
          <div className="absolute bg-[#e71d36] h-[27px] left-[554px] opacity-90 rounded-[33px] top-[52px] w-[132px]" data-node-id="2615:186" />
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3.5 leading-[0] left-[573px] text-[14px] text-white top-[55px] w-[102px]" data-node-id="2615:187">
            <p className="leading-[normal]">Approve (1/4)</p>
          </div>
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
        <div className="absolute contents left-[54px] top-[137px]" data-name="Address Image" data-node-id="2615:196">
          <div className="absolute h-[30px] left-[54.32px] top-[137px] w-[27.485px]" data-name="bg" data-node-id="2615:197">
            <img alt="" className="block max-w-none size-full" src={imgBg} />
          </div>
          <div className="absolute bg-center bg-cover bg-no-repeat left-[54px] size-[30px] top-[137px]" data-name="image 9" data-node-id="2615:204" style={{ backgroundImage: `url('${imgImage9}')` }} />
        </div>
        <div className="absolute contents left-[554px] top-[141px]" data-name="button" data-node-id="2615:199">
          <div className="absolute bg-[#e71d36] h-[27px] left-[554px] opacity-90 rounded-[33px] top-[141px] w-[132px]" data-node-id="2615:200" />
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3.5 leading-[0] left-[573px] text-[14px] text-white top-36 w-[102px]" data-node-id="2615:201">
            <p className="leading-[normal]">Approve (2/4)</p>
          </div>
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
        <div className="absolute contents left-[54px] top-[226px]" data-name="Address Image" data-node-id="2615:219">
          <div className="absolute h-[30px] left-[54.32px] top-[226px] w-[27.485px]" data-name="bg" data-node-id="2615:220">
            <img alt="" className="block max-w-none size-full" src={imgBg} />
          </div>
          <div className="absolute bg-center bg-cover bg-no-repeat left-[54px] size-[30px] top-[226px]" data-name="image 12" data-node-id="2615:227" style={{ backgroundImage: `url('${imgImage12}')` }} />
        </div>
        <div className="absolute contents left-[554px] top-[230px]" data-name="button" data-node-id="2615:222">
          <div className="absolute bg-[#b3b3bf] h-[27px] left-[554px] opacity-20 rounded-[33px] top-[230px] w-[132px]" data-node-id="2615:223" />
          <div className="absolute font-['Nunito:Regular',_sans-serif] font-normal h-3.5 leading-[0] left-[584px] text-[14px] text-black top-[233px] w-[69px]" data-node-id="2615:224">
            <p className="leading-[normal]">Approved</p>
          </div>
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

              if (!window.ethereum) {
                alert('MetaMask or a compatible Ethereum wallet is not installed.');
                return;
              }

              try {
                const provider = new BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(contractAddress, contractABI, provider);
                const cliffDuration = await contract.cliffDurationInDays();
                alert(`${contractName} Cliff Duration: ${cliffDuration.toString()} days`);
              } catch (error) {
                console.error('Error fetching cliff duration:', error);
                alert(`Failed to fetch cliff duration for ${contractName}. See console for details.`);
              }
            }}
          >
            <p className="leading-[normal]">Submit</p>
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
          <div className="absolute contents left-[53px] top-[41px]" data-name="Address Image" data-node-id="2615:155">
            <div className="absolute h-[30px] left-[53.32px] top-[41px] w-[27.485px]" data-name="bg" data-node-id="2615:156">
              <img alt="" className="block max-w-none size-full" src={imgBg} />
            </div>
            <div className="absolute bg-center bg-cover bg-no-repeat left-[53px] size-[30px] top-[41px]" data-name="image 10" data-node-id="2615:207" style={{ backgroundImage: `url('${imgImage11}')` }} />
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