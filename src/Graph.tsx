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
import MainNode from "./MainNode";
import SatelliteNode from "./SatelliteNode";
import extractVariablesFromCode from "./parser";
import dagre from "@dagrejs/dagre";
import twitter_sentiment from './data/twitter-sentiment-extaction-analysis-eda-and-model.json';
import bookings_cancellations from './data/eda-of-bookings-and-ml-to-predict-cancelations.json';
import lkin27js09bspace from './data/lkin27js09bspace.json';
import bjs827ee1uhappiness from './data/bjs827ee1uhappiness.json';
import fitbit_fitness_tracker_data from './data/fitbit_fitness_tracker_data.json';
import titanic_top_4_with_ensemble_modeling from './data/titanic_top_4_with_ensemble_modeling.json';

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
const nodeTypes = { MainNode: MainNode, SatelliteNode: SatelliteNode };

// dummy data
const initialNodes: Node<NodeData>[] = [
    {
        id: "1",
        type: "MainNode",
        position: { x: 100, y: 100 },
        data: { label: '[1] print("hi!")' },
    },
    {
        id: "2",
        type: "MainNode",
        position: { x: 100, y: 250 },
        data: { label: "[2] x = 8" },
    },
    {
        id: "3",
        type: "MainNode",
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
    //             const response = await fetch('/titanic-top-4-with-ensemble-modeling.ipynb');
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
                // console.log('source', params.sourceHandle);
                // console.log('target', params.targetHandle);
                setEdges((eds) => addEdge({ ...params, animated: true }, eds));
            } else {
                console.log("edges can only be created from the bottom of the source to the top of the target!");
            }
        },
        []
    );

    useEffect(() => {
        // console.log(traceJson);
        const fetchNotebookCells = async () => {
            // directly read in notebook in json format -> TODO: needs to dynamically convert ipynb to json in actual system
            
            ///////////////////////
            // TWITTER SENTIMENT //
            //////////////////////
            // console.log('notebook', twitter_sentiment);
            // const notebookCells = twitter_sentiment.cells.filter(
            //     (cell: { cell_type: string }) => cell.cell_type === "code"
            // );

            /////////////////////////////
            // BOOKINGS CANCELLATIONS //
            ////////////////////////////
            // const notebookCells = bookings_cancellations.cells.filter(
            //     (cell: { cell_type: string }) => cell.cell_type === "code"
            // );

            //////////////////////
            //  FITBIT TRACKER //
            /////////////////////
            // const notebookCells = fitbit_fitness_tracker_data.cells.filter(
            //     (cell: { cell_type: string }) => cell.cell_type === "code"
            // );

            ////////////////////////
            //  TITANIC MODELING //
            ///////////////////////
            const notebookCells = titanic_top_4_with_ensemble_modeling.cells.filter(
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
                console.log('cell', cell);

                // (1) TRACKING THE OUTPUT ARTIFACTS OF A CELL
                let artifacts: Array<string> = [];
                if (cell.outputs) {
                    const outputs = cell.outputs;
                    for (const output of outputs) {
                        console.log('output', output)
                        // grabbing the outputs data object in json
                        if ('data' in output) { 
                            if (output.data) {
                                // checking for visualization artifacts
                                if (output.output_type === "display_data") {
                                    artifacts.push("vis");
                                }
                                // checking for df artifacts 
                                else if (output.output_type === "execute_result") {
                                    if ('text/html' in output.data) {
                                        for (const line of output.data['text/html']) {
                                            if (line.includes('<table')) {
                                                artifacts.push("df");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // (2) INITIALIZING CELLS BASED ON VARIABLES ASSIGNED OR USED FOR EDGE CREATION
                const { assigned, used } = extractVariablesFromCode(code);
                console.log('code', i+1, code);
                // console.log('assigned', assigned);
                // console.log('used', used);
                
                for (let variable of assigned) {
                    lastAssignedTracker[variable] = (i+1);
                }

                for (let variable of used) {
                    // console.log('tracker', lastAssignedTracker);
                    const source = lastAssignedTracker[variable];
                    // console.log('source', variable, source);
                    if (source != null) {
                        // console.log('source exists', source);
                        prelimEdges.push({
                            source: source.toString(),
                            target: (i+1).toString(),
                        });
                        // console.log('edges', prelimEdges);
                    }
                }

                // (3) MAIN NODE CREATION
                    // for each notebook cell,
                    // extract cellId
                    // extract uuid (unique for each run of cell?)
                    // extract all variables created in it
                    // extract all variables that are updated in it
                    // code in source : string[]
                    // pushing these nodes before they have positions
                prelimNodes.push({
                    id: (i+1).toString(),
                    data: { label: (i+1).toString() },
                });

                // (3) SATELLITE NODE CREATION
                artifacts.forEach((artifact, index) => {
                    console.log('artifact', i+1, artifact)
                    const satelliteNodeId = `${i+1}-artifact-${index}`;
                    prelimNodes.push({
                        id: satelliteNodeId,
                        data: { label: artifact },
                    });
                    
                    // NOTE: don't need to create an edge actually?
                    // creating edge from main node to satellite node
                    // prelimEdges.push({
                    //     source: i.toString(),
                    //     target: satelliteNodeId,
                    //     style: satelliteEdgeStyle
                    // });
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
        nodesep: 60, // smaller horizontal distance between nodes
        ranksep: 200, // greater vertical distance between nodes
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
    const positionedNodes: Node[] = nodes.flatMap((node: any) => {
        const nodeWithPosition = g.node(node.id);
        // check if the node is a satellite node
        if (node.id.includes("-artifact-")) {
            // get the main node ID from the satellite node's ID
            const mainNodeId = node.id.split("-artifact-")[0];
            const mainNodePosition = g.node(mainNodeId);
            // set position for the satellite node in radial distr
            const angle = (parseInt(node.id.split("-artifact-")[1], 10) / 15) * 2 * Math.PI;
            const radius = 90; // distance from the main node
    
            return {
                id: node.id,
                type: "SatelliteNode", // custom type for satellite nodes
                position: {
                    x: mainNodePosition.x + radius * Math.cos(angle),
                    y: mainNodePosition.y + radius * Math.sin(angle),
                },
                data: {
                    label: node.data.label,
                },
            };
        }
    
        // Main node positioning
        return {
            id: node.id,
            type: "MainNode",
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
