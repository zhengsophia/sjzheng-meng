import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CircleNode from './CircleNode';

interface NodeData {
  label: string;
}

const nodeTypes = { circleNode: CircleNode };

const initialNodes: Node<NodeData>[] = [
  {
    id: '1',
    type: 'circleNode',
    position: { x: 100, y: 100 },
    data: { label: '[1] print("hi!")' },
  },
  {
    id: '2',
    type: 'circleNode',
    position: { x: 100, y: 250 },
    data: { label: '[2] x = 8' },
  },
  {
    id: '3',
    type: 'circleNode',
    position: { x: 100, y: 400 },
    data: { label: '[3] print(x)' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', style: { stroke: '#000' } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: '#000' } },
];

const Graph: React.FC = () => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Function to handle edge creation
  const onConnect = useCallback(
    (params: Edge<any> | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  useEffect(() => {
    const fetchNotebook = async () => {
      try {
        const response = await fetch('/twitter-sentiment-extaction-analysis-eda-and-model.ipynb');
        if (!response.ok) throw new Error('Error in network response');
        const notebook = await response.json();
        const notebookCells = notebook.cells.filter((cell: { cell_type: string; }) => cell.cell_type === 'code');
        console.log(notebookCells);
      } catch (error) {
        console.error('Error fetching notebook:', error);
      }
    };
    fetchNotebook();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        fitView
        nodeTypes={nodeTypes}
        style={{ background: '#F3F4F6' }}
      >
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default Graph;
