import React, { useState } from 'react';

const AirdropAdmin = () => {
  const [airdropData, setAirdropData] = useState([
    { address: '0xA661...d94c', referral: 0, paidPoint: 0, airdrop: 0, totalClaimed: 0, status: 'All Claimed', checked: false },
    { address: '0xf36b...dbac', referral: 0, paidPoint: 0, airdrop: 0, totalClaimed: 0, status: 'All Claimed', checked: false },
    { address: '0xfb15...1d31', referral: 0, paidPoint: 0, airdrop: 0, totalClaimed: 0, status: 'All Claimed', checked: false },
    { address: '0xDc16...3282', referral: 0, paidPoint: 0, airdrop: 0, totalClaimed: 0, status: 'All Claimed', checked: false },
    { address: '0xDfCB...33ff', referral: 0, paidPoint: 0, airdrop: 0, totalClaimed: 0, status: 'All Claimed', checked: false },
  ]);

  const handleCheckboxChange = (index: number) => {
    const newData = [...airdropData];
    newData[index].checked = !newData[index].checked;
    setAirdropData(newData);
  };

  return (
    <div className="bg-[#f7f7f8] relative size-full p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Point</h1>
          <p className="text-gray-500">Admin: 0xff76...13b1</p>
        </div>
        <div className="flex space-x-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">New Airdrop</button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">Release Batch</button>
        </div>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input id="checkbox-all-search" type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                  <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                </div>
              </th>
              <th scope="col" className="py-3 px-6">Address</th>
              <th scope="col" className="py-3 px-6">Referral</th>
              <th scope="col" className="py-3 px-6">Paid Point</th>
              <th scope="col" className="py-3 px-6">Airdrop</th>
              <th scope="col" className="py-3 px-6">Total Claimed</th>
              <th scope="col" className="py-3 px-6">Status</th>
            </tr>
          </thead>
          <tbody>
            {airdropData.map((item, index) => (
              <tr key={index} className="bg-white border-b hover:bg-gray-50">
                <td className="w-4 p-4">
                  <div className="flex items-center">
                    <input 
                      id={`checkbox-table-search-${index}`} 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={item.checked}
                      onChange={() => handleCheckboxChange(index)}
                    />
                    <label htmlFor={`checkbox-table-search-${index}`} className="sr-only">checkbox</label>
                  </div>
                </td>
                <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{item.address}</td>
                <td className="py-4 px-6">{item.referral}</td>
                <td className="py-4 px-6">{item.paidPoint}</td>
                <td className="py-4 px-6">{item.airdrop}</td>
                <td className="py-4 px-6">{item.totalClaimed}</td>
                <td className="py-4 px-6">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AirdropAdmin;