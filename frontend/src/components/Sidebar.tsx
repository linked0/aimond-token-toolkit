import { useState } from "react";

const imgImage1 = "/assets/loyalty-card.png";
const imgTicket = "/assets/ticket.svg";
const imgChart = "/assets/chart.svg";
const imgDocument = "/assets/document.svg";
const imgActivity = "/assets/activity.svg";

interface MenuItem {
    name: string;
    icon: string;
    view: string;
}

const menuItems: MenuItem[] = [
    { name: 'Loyalty Point', icon: imgChart, view: 'loyalty' },
    { name: 'Investor Vesting', icon: imgTicket, view: 'investor' },
    { name: 'Founder Vesting', icon: imgDocument, view: 'founder' },
    { name: 'Employee Vesting', icon: imgActivity, view: 'employee' },
    { name: 'Sample Data', icon: imgDocument, view: 'sampleData' },
];

interface SidebarProps {
    activeItem: string;
    setActiveItem: (item: string) => void;
    setView: (view: string) => void;
}

export default function Sidebar({ activeItem, setActiveItem, setView }: SidebarProps) {
    return (
        <nav className="absolute top-0 left-0 bg-white w-[254px] flex flex-col shadow-lg">
            <div className="h-[120px] flex items-center justify-center p-4">
                <img alt="Logo" className="max-h-full" src={imgImage1} />
            </div>
            
            <ul className="flex flex-col space-y-2 px-4">
                {menuItems.map((item) => (
                    <li key={item.name}>
                        <a 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveItem(item.name);
                                setView(item.view);
                            }}
                            className={`flex items-center p-3 rounded-lg transition-colors ${
                                activeItem === item.name
                                ? 'text-[#605bff] font-semibold bg-gray-100' 
                                : 'text-[#030229] opacity-50 font-semibold hover:bg-gray-100'
                            }`}
                        >
                            {activeItem === item.name && (
                                <div className="absolute left-0 bg-gradient-to-r from-[#aca9ff] h-12 opacity-20 rounded-r-[5px] to-[#aca9ff00] to-[91.25%] w-[62px]" />
                            )}
                            <img src={item.icon} alt={`${item.name} icon`} className="w-5 h-5 mr-4" />
                            <span className="text-base">{item.name}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
