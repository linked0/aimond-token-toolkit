interface CreateAirdropPopupProps {
    onClose: () => void;
}

export default function CreateAirdropPopup({ onClose }: CreateAirdropPopupProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Create Airdrop</h2>
                <form>
                    <div className="mb-4">
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                        <input type="text" id="amount" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="addresses" className="block text-sm font-medium text-gray-700">Recipient Addresses</label>
                        <textarea id="addresses" rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
