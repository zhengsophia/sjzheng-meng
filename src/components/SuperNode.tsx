import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

const SuperNode: React.FC<NodeProps> = ({ data }) => {
    const nodeStyle = () => {
        return {
            backgroundColor: data.backgroundColor || '#f9f6ed',
            border: "2px solid black",
            borderRadius: "50%",
            width: `${60 + data.size * 10}px`, // Adjust width dynamically
            height: `${60 + data.size * 10}px`, // Adjust height dynamically
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "14px",
            color: "#fff",
        }
    };


    return (
        <div style={nodeStyle()}>
            <strong>{data.label}</strong>
            <br />
            <span>{data.size} nodes</span>
            <Handle type="source" position={Position.Bottom} id="bottom" />
            <Handle type="target" position={Position.Top} id="top" />
        </div>
    );
};

export default SuperNode;
