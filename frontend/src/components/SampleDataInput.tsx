import React, { useState, useEffect, useRef } from 'react';

interface Point {
  address: string;
  referralAmount: number;
  paidPointAmount: number;
  airdropAmount: number;
  paidMemberAmount: number; // Added
  status: string;
  totalClaimedAmount: number; // Added
}

interface SampleDataInputProps {
  points: Point[];
  refreshPoints: () => void;
}

const ComboBox: React.FC<{ options: string[], value: string, onChange: (value: string) => void }> = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredOptions(
      options.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      )
    );
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  const handleButtonClick = () => {
    if (!isOpen) {
      setFilteredOptions(options);
    }
    setIsOpen(!isOpen);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border rounded-md">
        <input 
          type="text" 
          value={value} 
          onChange={(e) => {
            onChange(e.target.value)
            if(!isOpen) setIsOpen(true);
          }} 
          className="w-full p-2 border-none rounded-md" 
        />
        {value && (
          <button onClick={() => onChange('')} className="p-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
        <button onClick={handleButtonClick} className="p-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </div>
      {isOpen && (
        <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-auto">
          {filteredOptions.map(option => (
            <li 
              key={option} 
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const InputField: React.FC<{ placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ placeholder, value, onChange }) => {
  return (
    <input type="text" placeholder={placeholder} value={value} onChange={onChange} className="w-full p-2 border rounded-md" />
  );
};

export default function SampleDataInput({ points, refreshPoints }: SampleDataInputProps) {
  const [address, setAddress] = useState(''); // This will be the referred user's address
  const [spendingAmount, setSpendingAmount] = useState(''); // Renamed from usedDollars
  const [referrerAddress, setReferrerAddress] = useState('');
  const [airdropAmount, setAirdropAmount] = useState(''); // Renamed from airdrop

  useEffect(() => {
    if (points && points.length > 0) {
      setAddress(points[0].address);
    } else {
      setAddress('');
    }
  }, [points]);

  const addresses = points.map(p => p.address);

  const handleAddLoyaltyPoint = async () => {
    try {
      const response = await fetch('/api/spending-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address: address, amount: spendingAmount }),
      });
      if (!response.ok) {
        throw new Error('Failed to add loyalty point');
      }
      // Handle success (e.g., show a notification, clear inputs)
      console.log('Loyalty point added successfully');
      setAddress('');
      setSpendingAmount('');
      refreshPoints();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddReferral = async () => {
    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referrer_wallet_address: referrerAddress, referred_wallet_address: address }),
      });
      if (!response.ok) {
        throw new Error('Failed to add referral');
      }
      console.log('Referral added successfully');
      setAddress('');
      setReferrerAddress(''); // Clear referrer address
      refreshPoints();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddAirdrop = async () => {
    try {
      const response = await fetch('/api/airdrop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address: address, amount: airdropAmount }),
      });
      if (!response.ok) {
        throw new Error('Failed to add airdrop');
      }
      console.log('Airdrop added successfully');
      setAddress('');
      setAirdropAmount('');
      refreshPoints();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-[#fafafb] p-6">
      <h1 className="text-2xl font-bold mb-4">Sample Data Input</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
        <ComboBox options={addresses} value={address} onChange={setAddress} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Spending Amount (USD)</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter spending amount" value={spendingAmount} onChange={(e) => setSpendingAmount(e.target.value)} />
          <button onClick={handleAddLoyaltyPoint} className="bg-[#605bff] text-white px-4 py-2 rounded-lg whitespace-nowrap">Add Spending Reward</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Wallet Address</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter referrer wallet address" value={referrerAddress} onChange={(e) => setReferrerAddress(e.target.value)} />
          <button onClick={handleAddReferral} className="bg-[#605bff] text-white px-4 py-2 rounded-lg whitespace-nowrap w-48 justify-center">Add Referral</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Airdrop Amount (AMD)</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter airdrop amount" value={airdropAmount} onChange={(e) => setAirdropAmount(e.target.value)} />
          <button onClick={handleAddAirdrop} className="bg-[#605bff] text-white px-4 py-2 rounded-lg whitespace-nowrap w-48 justify-center">Add Airdrop</button>
        </div>
      </div>

    </div>
  );
}