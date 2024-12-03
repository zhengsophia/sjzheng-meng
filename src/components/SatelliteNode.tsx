import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

const SatelliteNode: React.FC<NodeProps> = ({ data }) => {
  // console.log('node data', data)
  const nodeStyle = () => {
    switch (data.label) {
      case 'df':
        return { background: '#c5d0d3', border: '1px solid black' }; 
      case 'vis':
        return { background: '#efe095', border: '1px solid black' };
      default:
        return { background: '#ecf0f1', border: '1px solid black' }; 
    }
  };

  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        color: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        textAlign: 'center',
        ...nodeStyle(), // Apply dynamic style based on artifactType
      }}
    >
      {data.label}
      {/* <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Top} id="top" /> */}
    </div>
  );
};

export default SatelliteNode;
