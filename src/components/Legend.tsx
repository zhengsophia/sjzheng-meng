import React from 'react';
import './Legend.css';

interface LegendItemProps {
    label: string;
    color: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ label, color }) => {
    return (
        <div className="legend-item">
        <div
          className="color-box"
          style={{ backgroundColor: color }} // Dynamically set the background color
        />
        <div className="label-text">{label}</div>
      </div>
    );
  };
  
  const Legend: React.FC<{ colorMap: Record<string, string> }> = ({ colorMap }) => {
    console.log('legend is mounted')
    return (
      <div className="legend-container">
        {Object.entries(colorMap).map(([label, color]) => (
          <LegendItem key={label} label={label} color={color} />
        ))}
      </div>
    );
  };
  
  export default Legend;