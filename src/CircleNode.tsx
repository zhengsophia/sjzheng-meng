import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

const CircleNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div style={{
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'lightgrey',
      color: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid',
      fontSize: '12px',
      textAlign: 'center'
    }}>
      {data.label}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default CircleNode;