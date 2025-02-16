import React, { useCallback, useRef, useState, useMemo } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import FlowNode from "./FlowNode";
import CustomEdge from "./CustomEdge";

// Define these outside the component
const AVAILABLE_NODES = [
  {
    id: "gdrive",
    name: "Google Drive",
    description: "Manage files and folders",
    icon: "/icons/gdrive.svg",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Email operations",
    icon: "/icons/gmail.svg",
  }
] as const;

// Define nodeTypes outside the component
const nodeTypes = {
  gdrive: FlowNode,
  gmail: FlowNode,
};

// Define edgeTypes outside the component
const edgeTypes = {
  custom: CustomEdge,
};

let id = 0;
const getId = () => `node_${id++}`;

const FlowBuilder = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = 
    React.useState<ReactFlowInstance | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNodes = useMemo(() => 
    AVAILABLE_NODES.filter(
      (node) =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Set custom type for new edges
      const edge = { ...params, type: 'custom' };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  const createNode = useCallback(
    (position: { x: number; y: number }, nodeType: string) => {
      const defaultActions = {
        gdrive: "READ_FILE",
        gmail: "READ_UNREAD"
      };

      const newNode = {
        id: getId(),
        type: nodeType,
        position,
        data: {
          config: { 
            type: nodeType,
            action: defaultActions[nodeType as keyof typeof defaultActions]
          },
          isConfigured: false,
          onDelete: handleDeleteNode,
        },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, handleDeleteNode]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('nodeType');

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      createNode(position, nodeType);
    },
    [reactFlowInstance, createNode]
  );

  const onNodeClick = useCallback((node: any) => {
    if (!reactFlowInstance || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const center = reactFlowInstance.project({
      x: (bounds.width / 2) - 200,
      y: bounds.height / 2,
    });

    const position = {
      x: center.x + Math.random() * 100 - 25,
      y: center.y + Math.random() * 100 - 25,
    };

    createNode(position, node.id);
  }, [reactFlowInstance, createNode]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    if (typeof window !== 'undefined') {
      (window as any).flowInstance = instance;
    }
  }, []);
  return (
    <div className="h-full relative">
      <Button
        className="absolute top-8 left-8 z-50 rounded-full w-14 h-14 p-0 bg-blue-900 hover:bg-blue-1000 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110"
        onClick={() => setShowSidebar(true)}
      >
        <Plus className="h-8 w-8 text-white" />
      </Button>

      {showSidebar && (
        <div className="absolute left-8 top-20 z-50 bg-white rounded-lg shadow-[0_4px_24px_0_rgba(0,0,0,0.12)] w-96">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Add Node</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Input
              type="search"
              placeholder="Search nodes..."
              className="mb-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="space-y-2">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-6 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                  draggable
                  onClick={() => onNodeClick(node)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "true");
                    e.dataTransfer.setData("nodeType", node.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <img src={node.icon} alt="" className="w-12 h-12" />
                    <div>
                      <div className="font-medium">{node.name}</div>
                      <div className="text-sm text-gray-500">
                        {node.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'custom' }}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background 
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowBuilder;