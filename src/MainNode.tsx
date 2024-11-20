import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

const CircleNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#f9f6ed',
      color: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid',
      fontSize: '12px',
      textAlign: 'center'
    }}>
      {data.label}
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Top} id="top" />
    </div>
  );
};

export default CircleNode;