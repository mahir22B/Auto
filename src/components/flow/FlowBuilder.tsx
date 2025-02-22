import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import '@/lib/executors';
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
import { Plus, X, PlayCircle } from "lucide-react";
import FlowNode from "./FlowNode";
import CustomEdge from "./CustomEdge";
import { Workflow } from "@/lib/gdrive/types";
import { SERVICES } from "@/lib/services";
import { WorkflowExecutor } from "@/lib/workflow/executor";

const nodeTypes = {
  gdrive: FlowNode,
  gmail: FlowNode,
  sheets: FlowNode
};

const edgeTypes = {
  custom: CustomEdge,
};

const generateId = () => `node_${uuidv4()}`;

interface FlowBuilderProps {
  onSave: (workflow: Workflow) => void;
  authState: Record<string, { isAuthenticated: boolean; tokens?: any }>;
  onAuth: (service: string) => void;
}

const FlowBuilder = ({ 
  onSave, 
  authState, 
  onAuth 
}: FlowBuilderProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = 
    React.useState<ReactFlowInstance | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});

  // Debug logging for state changes
  // useEffect(() => {
  //   console.log('Nodes updated:', nodes);
  // }, [nodes]);

  // useEffect(() => {
  //   console.log('Edges updated:', edges);
  // }, [edges]);

  // Update nodes when auth state or execution results change
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (authState[node.type]) {
        return {
          ...node,
          data: {
            ...node.data,
            key: `${node.type}-${authState[node.type].isAuthenticated}`,
            authState: authState[node.type],
            executionState: executionResults[node.id]
          }
        };
      }
      return node;
    }));
  }, [authState, executionResults, setNodes]);

  const handleExecuteWorkflow = async () => {
    if (!nodes.length) return;
    
    setIsExecuting(true);
    setExecutionResults({});
    
    try {
      console.log('All nodes before execution:', nodes);
      console.log('Node configs:', nodes.map(node => ({
        id: node.id,
        config: node.data.config
      })));
      
      const executor = new WorkflowExecutor();
      const results = await executor.executeWorkflow(nodes, edges, authState);
      setExecutionResults(results.nodeResults);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    setExecutionResults((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  }, [setNodes, setEdges]);

  const createNode = useCallback(
    (position: { x: number; y: number }, serviceId: string) => {
      const newId = generateId();
      
      console.log('Creating new node...');
      
      const newNode = {
        id: newId,
        type: serviceId,
        position,
        data: {
          config: { 
            type: serviceId,
            action: null
          },
          onDelete: handleDeleteNode,
          service: serviceId,
          authState: authState[serviceId] || { isAuthenticated: false },
          onAuth: () => onAuth(serviceId),
          updateNodeConfig: (newConfig: any) => {
            console.log('Updating node config:', { id: newId, newConfig });
            setNodes(nds => 
              nds.map(node => 
                node.id === newId
                  ? { ...node, data: { ...node.data, config: newConfig } }
                  : node
              )
            );
          },
        },
        sourcePosition: 'bottom',
        targetPosition: 'top',
      };
  
      console.log('Created node:', newNode);
      
      setNodes(currentNodes => {
        console.log('Current nodes:', currentNodes);
        return [...currentNodes, newNode];
      });
    },
    [setNodes, handleDeleteNode, authState, onAuth]
  );

  const filteredServices = useMemo(() => 
    Object.values(SERVICES).filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = { ...params, type: 'custom' };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const serviceId = event.dataTransfer.getData('serviceId');

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      createNode(position, serviceId);
    },
    [reactFlowInstance, createNode]
  );

  const onNodeClick = useCallback((service: any) => {
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

    createNode(position, service.id);
  }, [reactFlowInstance, createNode]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  return (
    <div className="h-full relative">
      {/* Add Node Button */}
      <Button
        className="absolute top-8 left-8 z-50 rounded-full w-14 h-14 p-0 bg-blue-900 hover:bg-blue-1000 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110"
        onClick={() => setShowSidebar(true)}
      >
        <Plus className="h-8 w-8 text-white" />
      </Button>

      {/* Run Workflow Button */}
      <Button
        className="absolute top-8 right-8 z-50 bg-green-600 hover:bg-green-700"
        onClick={handleExecuteWorkflow}
        disabled={isExecuting || nodes.length === 0}
      >
        <PlayCircle className="mr-2 h-4 w-4" />
        {isExecuting ? 'Running...' : 'Run Workflow'}
      </Button>

      {/* Services Sidebar */}
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
              placeholder="Search services..."
              className="mb-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="space-y-2">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="p-6 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                  draggable
                  onClick={() => onNodeClick(service)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "true");
                    e.dataTransfer.setData("serviceId", service.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <img src={service.icon} alt="" className="w-12 h-12" />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flow Canvas */}
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
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowBuilder;