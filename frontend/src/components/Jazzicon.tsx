import React, { useEffect, useRef } from 'react';
import jazzicon from '@metamask/jazzicon';

interface JazziconProps {
  address: string;
  size: number;
}

const Jazzicon: React.FC<JazziconProps> = ({ address, size }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      ref.current.appendChild(jazzicon(size, parseInt(address.slice(2, 10), 16)));
    }
  }, [address, size]);

  return <div ref={ref} style={{ width: size, height: size, borderRadius: '50%' }} />;
};

export default Jazzicon;