import React, { useState, useEffect } from 'react';
import LoyaltyPointBasic from './components/LoyaltyPointBasic';
import './App.css';

interface Point {
  address: string;
  referralAmount: number;
  paidPointAmount: number;
  airdropAmount: number;
  status: string;
}

function App() {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const response = await fetch('/points');
        const data = await response.json();
        setPoints(data);
      } catch (error) {
        console.error("Error fetching points:", error);
      }
    };

    fetchPoints();
  }, []);

  return (
    <div className="App">
      <LoyaltyPointBasic points={points} />
    </div>
  );
}

export default App;
