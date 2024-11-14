import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
    MiniMap,
    Controls,
    addEdge,
    Connection,
    Edge,
    Node,
} from "reactflow";
import "reactflow/dist/style.css";
import CircleNode from "./CircleNode";
import extractVariablesFromCode from "./parser";
import dagre from "@dagrejs/dagre";
import twitter_sentiment from './data/twitter-sentiment-extaction-analysis-eda-and-model.json';
import bookings_cancellations from './data/eda-of-bookings-and-ml-to-predict-cancelations.json';
import lkin27js09bspace from './data/lkin27js09bspace.json';
import bjs827ee1uhappiness from './data/bjs827ee1uhappiness.json';
import { traceJson } from "./tracer";


interface NodeData {
    label: string;
}
interface PreliminaryNode {
    id: string;
    data: any;
}
interface PreliminaryEdges {
    source: string;
    target: string;
}
interface IGraph {
    nodes: PreliminaryNode[];
    edges: PreliminaryEdges[];
}
const nodeTypes = { circleNode: CircleNode };

// dummy data
const initialNodes: Node<NodeData>[] = [
    {
        id: "1",
        type: "circleNode",
        position: { x: 100, y: 100 },
        data: { label: '[1] print("hi!")' },
    },
    {
        id: "2",
        type: "circleNode",
        position: { x: 100, y: 250 },
        data: { label: "[2] x = 8" },
    },
    {
        id: "3",
        type: "circleNode",
        position: { x: 100, y: 400 },
        data: { label: "[3] print(x)" },
    },
];

const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2", style: { stroke: "#000" } },
    { id: "e2-3", source: "2", target: "3", style: { stroke: "#000" } },
];


const Graph: React.FC = () => {
    // initialize graph with dummy data
    const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

    // show notebook info in console -> ONLY FOR PROCESSING IPYNB FILE
    // useEffect(() => {
    //     const convertNotebookToJSON = async () => {
    //         try {
    //             const response = await fetch('/eda-of-bookings-and-ml-to-predict-cancelations.ipynb');
    //             console.log('response', response);
    //             if (!response.ok) throw new Error('Error in network response');
    //             const notebook = await response.json();
    //             console.log('notebook json', notebook);
    //             const notebookCells = notebook.cells.filter((cell: { cell_type: string; }) => cell.cell_type === 'code');
    //             console.log(notebookCells);
    //         } catch (error) {
    //             console.error('Error fetching notebook:', error);
    //         }
    //         };
    //     convertNotebookToJSON();
    // }, []);

    // handles edge creation
    const onConnect = useCallback(
        (params: Edge<any> | Connection) => {
            console.log("params:", params); 
            if (params.sourceHandle === 'bottom' && params.targetHandle === 'top') {
                console.log('source', params.sourceHandle);
                console.log('target', params.targetHandle);
                setEdges((eds) => addEdge({ ...params, animated: true }, eds));
            } else {
                console.log("edges can only be created from the bottom of the source to the top of the target!");
            }
        },
        []
    );

    useEffect(() => {
        console.log(traceJson);
        const fetchNotebookCells = async () => {
            // directly read in notebook in json format -> TODO: needs to dynamically convert ipynb to json in actual system
            console.log(twitter_sentiment);
            const notebookCells = twitter_sentiment.cells.filter(
                (cell: { cell_type: string }) => cell.cell_type === "code"
            );
            return notebookCells;
        };

        intializeGraph().then((result) => {
            console.log("result", result);
            // set nodes and edges
        });

        // returns nodes and edges based on notebook cells
        async function intializeGraph(): Promise<any> {
            // previous parameters: inputArray: Array<any>, getNodeData: (item: any) => Node
            let prelimNodes: PreliminaryNode[] = [];
            let prelimEdges: PreliminaryEdges[] = [];
            const lastAssignedTracker: Record<string, number> = {};

            const notebookCells = await fetchNotebookCells();
            for (let i = 0; i < notebookCells.length; i++) {
                const cell = notebookCells[i];
                const code = cell.source.join("\n");

                const { assigned, used } = extractVariablesFromCode(code);
                console.log('code', i, code);
                console.log('assigned', assigned);
                console.log('used', used);
                
                for (let variable of assigned) {
                    lastAssignedTracker[variable] = i;
                }

                for (let variable of used) {
                    console.log(lastAssignedTracker);
                    const source = lastAssignedTracker[variable];
                    console.log('source', variable, source);
                    if (source != null) {
                        console.log('source exists', source);
                        prelimEdges.push({
                            source: source.toString(),
                            target: i.toString(),
                        });
                        console.log('edges', prelimEdges);
                    }
                }

                // for each notebook cell,
                // extract cellId
                // extract uuid (unique for each run of cell?)
                // extract all variables created in it
                // extract all variables that are updated in it
                // code in source : string[]
                // pushing these nodes before they have positions
                prelimNodes.push({
                    id: i.toString(),
                    data: { label: i.toString() },
                });
            }

            // process nodes given layout to add position 
            const { edges, nodes } = calculateGraphLayout(
                prelimNodes,
                prelimEdges
            );

            return { edges, nodes };
        }

        // call at end of use effect
        intializeGraph().then((result) => {
            console.log("result", result);
            setNodes(result.nodes);
            setEdges(result.edges);
        });

    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onConnect={onConnect}
                fitView
                nodeTypes={nodeTypes}
                style={{ background: "#F3F4F6" }}
            >
                <MiniMap />
                <Controls />
            </ReactFlow>
        </div>
    );
};

// helper function to add posiitons to preliminary nodes
function calculateGraphLayout(nodes: any, edges: any): any {
    const g = new dagre.graphlib.Graph();

    // Set graph properties
    g.setGraph({
        rankdir: "TB", // Top to bottom layout
        align: "UL", // Align upper left
        nodesep: 10, // smaller horizontal distance between nodes
        ranksep: 180, // greater vertical distance between nodes
        marginx: 20, // Pixels of margin around the graph
        marginy: 20,
    });

    // Default to assign object as edge label
    g.setDefaultEdgeLabel(() => ({}));

    // adding nodes to the graph
    nodes.forEach((node: any) => {
        g.setNode(node.id, {
            label: node.label,
            width: 100, // Node width in pixels
            height: 60, // Node height in pixels
        });
    });

    // adding edges to the graph
    edges.forEach((edge: any) => {
        g.setEdge(edge.source, edge.target);
    });

    // layout the graph
    dagre.layout(g);

    // creating new node array and add calculated positions
    // position is autolayout calculated by dagre 
    const positionedNodes: Node[] = nodes.map((node: any) => {
        const nodeWithPosition = g.node(node.id);
        return {
            id: node.id,
            type: "circleNode",
            position: {
                x: nodeWithPosition.x,
                y: nodeWithPosition.y,
            },
            data: {
                label: node.data.label,
            },
        };
    });
    const wrangledNodes = positionedNodes;

    // make edges schema compatible 
    const wrangledEdges = edges.map((edge: any, i: number) => {
        return {
            id: i,
            target: edge.target,
            source: edge.source,
        };
    });

    // returning compatible nodes, edges
    return { nodes: wrangledNodes, edges: wrangledEdges };
}

export default Graph;
