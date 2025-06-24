import React from 'react';
import { FractionGame } from './FractionGame';

interface BlockProps {
  title?: string;
  description?: string;
}

const Block: React.FC<BlockProps> = ({ title, description }) => {
  return <FractionGame />;
};

export default Block;