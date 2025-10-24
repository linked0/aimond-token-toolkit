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

interface NewPointAirdropProps {
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

export default function NewPointAirdrop({ points, refreshPoints }: NewPointAirdropProps) {
  const [address, setAddress] = useState(''); // This will be the referred user's address
  const [spendingAmount, setSpendingAmount] = useState(''); // Renamed from usedDollars
  const [referrerAddress, setReferrerAddress] = useState('');
  const [airdropAmount, setAirdropAmount] = useState(''); // Renamed from airdrop
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<{ spending: boolean, referral: boolean, airdrop: boolean }>({
    spending: false,
    referral: false,
    airdrop: false
  });

  useEffect(() => {
    if (points && points.length > 0) {
      setAddress(points[0].address);
    } else {
      setAddress('');
    }
  }, [points]);

  const addresses = points.map(p => p.address);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000); // Auto-hide after 5 seconds
  };

  const handleAddLoyaltyPoint = async () => {
    if (!spendingAmount || !address) {
      showMessage('error', 'Please enter both wallet address and spending amount');
      return;
    }

    setIsLoading(prev => ({ ...prev, spending: true }));
    try {
      const response = await fetch('/api/spending-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address: address, amount: spendingAmount }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add spending reward');
      }
      
      showMessage('success', `Successfully added $${spendingAmount} spending reward for ${address.slice(0, 6)}...${address.slice(-4)}`);
      setSpendingAmount('');
      refreshPoints();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to add spending reward');
    } finally {
      setIsLoading(prev => ({ ...prev, spending: false }));
    }
  };

  const handleAddReferral = async () => {
    if (!referrerAddress || !address) {
      showMessage('error', 'Please enter both referrer and referred wallet addresses');
      return;
    }

    if (referrerAddress === address) {
      showMessage('error', 'Referrer and referred addresses cannot be the same');
      return;
    }

    setIsLoading(prev => ({ ...prev, referral: true }));
    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referrer_wallet_address: referrerAddress, referred_wallet_address: address }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add referral');
      }
      
      showMessage('success', `Successfully added referral: ${referrerAddress.slice(0, 6)}...${referrerAddress.slice(-4)} → ${address.slice(0, 6)}...${address.slice(-4)}`);
      setReferrerAddress('');
      refreshPoints();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to add referral');
    } finally {
      setIsLoading(prev => ({ ...prev, referral: false }));
    }
  };

  const handleAddAirdrop = async () => {
    if (!airdropAmount || !address) {
      showMessage('error', 'Please enter both wallet address and airdrop amount');
      return;
    }

    setIsLoading(prev => ({ ...prev, airdrop: true }));
    try {
      const response = await fetch('/api/airdrop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address: address, amount: airdropAmount }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add airdrop');
      }
      
      showMessage('success', `Successfully added ${airdropAmount} AMD airdrop for ${address.slice(0, 6)}...${address.slice(-4)}`);
      setAirdropAmount('');
      refreshPoints();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to add airdrop');
    } finally {
      setIsLoading(prev => ({ ...prev, airdrop: false }));
    }
  };

  return (
    <div className="bg-[#fafafb] p-6">
      <h1 className="text-2xl font-bold mb-4">Loyalty Point Input</h1>
      
      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message.text}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setMessage(null)}
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm mb-1">Wallet Address</label>
        <ComboBox options={addresses} value={address} onChange={setAddress} />
      </div>

      <div className="mb-4">
        <label className="block font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm mb-1">Spending Amount (USD)</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter spending amount" value={spendingAmount} onChange={(e) => setSpendingAmount(e.target.value)} />
          <button 
            onClick={handleAddLoyaltyPoint} 
            disabled={isLoading.spending}
            className={`py-2 rounded-lg whitespace-nowrap justify-center flex items-center ${
              isLoading.spending 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#605bff] hover:bg-[#4a47cc]'
            } text-white`} 
            style={{width: '200px', minWidth: '200px', maxWidth: '200px', paddingLeft: '16px', paddingRight: '16px'}}
          >
            {isLoading.spending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add Spending Reward'
            )}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm mb-1">Referrer Wallet Address</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter referrer wallet address" value={referrerAddress} onChange={(e) => setReferrerAddress(e.target.value)} />
          <button 
            onClick={handleAddReferral} 
            disabled={isLoading.referral}
            className={`py-2 rounded-lg whitespace-nowrap justify-center flex items-center ${
              isLoading.referral 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#605bff] hover:bg-[#4a47cc]'
            } text-white`} 
            style={{width: '200px', minWidth: '200px', maxWidth: '200px', paddingLeft: '16px', paddingRight: '16px'}}
          >
            {isLoading.referral ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add Referral'
            )}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-sm mb-1">Airdrop Amount (AMD)</label>
        <div className="flex items-center space-x-2">
          <InputField placeholder="Enter airdrop amount" value={airdropAmount} onChange={(e) => setAirdropAmount(e.target.value)} />
          <button 
            onClick={handleAddAirdrop} 
            disabled={isLoading.airdrop}
            className={`py-2 rounded-lg whitespace-nowrap justify-center flex items-center ${
              isLoading.airdrop 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#605bff] hover:bg-[#4a47cc]'
            } text-white`} 
            style={{width: '200px', minWidth: '200px', maxWidth: '200px', paddingLeft: '16px', paddingRight: '16px'}}
          >
            {isLoading.airdrop ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              'Add Airdrop'
            )}
          </button>
        </div>
      </div>

    </div>
  );
}