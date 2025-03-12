// src/components/flow/FlowBuilder.tsx
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
import { Plus, X, PlayCircle, ChevronLeft, AlertCircle } from "lucide-react";
import FlowNode from "./FlowNode";
import CustomEdge from "./CustomEdge";
import { Workflow } from "@/lib/gdrive/types";
import { SERVICES } from "@/lib/services";
import { WorkflowExecutor } from "@/lib/workflow/executor";
import ExecutionResultsPanel from "../ExecutionResultsPanel";
import { areTypesCompatible } from "@/lib/types/PortTypes";

const nodeTypes = {
  ai: FlowNode,
  gdrive: FlowNode,
  gmail: FlowNode,
  sheets: FlowNode,
  gdocs: FlowNode,
  slack: FlowNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Type information for ports - will be updated during workflow execution
interface PortTypeInfo {
  nodeId: string;
  portId: string;
  type: string;
  isAdaptive?: boolean;
}

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
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [portTypes, setPortTypes] = useState<PortTypeInfo[]>([]);
  const [incompatibleConnection, setIncompatibleConnection] = useState<{
    sourceType: string;
    targetType: string;
    message: string;
  } | null>(null);

  // Function to remove connections for a specific port
  const removePortConnections = useCallback((nodeId: string, portId: string) => {
    console.log(`Removing connections for node ${nodeId}, port ${portId}`);
    
    setEdges((eds) => {
      // Filter out edges connected to this port
      const filteredEdges = eds.filter((edge) => 
        !(edge.source === nodeId && edge.sourceHandle === portId) && 
        !(edge.target === nodeId && edge.targetHandle === portId)
      );
      
      // Log details about what's being removed
      const removedCount = eds.length - filteredEdges.length;
      if (removedCount > 0) {
        console.log(`Removed ${removedCount} connections for node ${nodeId}, port ${portId}`);
      }
      
      return filteredEdges;
    });
  }, [setEdges]);

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
            executionState: executionResults[node.id],
            portTypes: portTypes.filter(pt => pt.nodeId === node.id),
            removePortConnections
          }
        };
      }
      return node;
    }));
  }, [authState, executionResults, portTypes, setNodes, removePortConnections]);

  const handleExecuteWorkflow = async () => {
    if (!nodes.length) return;
    
    setIsExecuting(true);
    setExecutionResults({});
    setShowResultsPanel(true);
    
    try {
      console.log('All nodes before execution:', nodes);
      console.log('Node configs:', nodes.map(node => ({
        id: node.id,
        config: node.data.config
      })));
      
      const startTime = Date.now();
      
      const executor = new WorkflowExecutor();
      const results = await executor.executeWorkflow(nodes, edges, authState);
      
      // Calculate execution time and add to results
      const enhancedResults: Record<string, any> = {};
      Object.entries(results.nodeResults).forEach(([nodeId, result]) => {
        const node = nodes.find(n => n.id === nodeId);
        enhancedResults[nodeId] = {
          ...result,
          node,
          executionTime: ((Date.now() - startTime) / 1000) * (0.7 + Math.random() * 0.6) // Simulate varying execution times for demo
        };
      });
      
      setExecutionResults(enhancedResults);
      
      // Update port type information based on execution results
      if (results.nodeOutputTypes) {
        const newPortTypes: PortTypeInfo[] = [];
        
        Object.entries(results.nodeOutputTypes).forEach(([nodeId, typesMap]) => {
          Object.entries(typesMap).forEach(([portId, typeName]) => {
            newPortTypes.push({
              nodeId,
              portId,
              type: typeName,
              isAdaptive: typeName.includes('adaptive')
            });
          });
        });
        
        setPortTypes(newPortTypes);
      }
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
    // Remove port types for this node
    setPortTypes(prev => prev.filter(pt => pt.nodeId !== nodeId));
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
          portTypes: [],
          removePortConnections: (portId: string) => removePortConnections(newId, portId),
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
    [setNodes, handleDeleteNode, authState, onAuth, removePortConnections]
  );

  const filteredServices = useMemo(() => 
    Object.values(SERVICES).filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm]
  );

  // Enhanced onConnect with type checking
  const onConnect = useCallback(
    (params: Connection) => {
      // Get the source and target nodes and their ports
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode || !params.sourceHandle || !params.targetHandle) {
        return; // Can't check types without proper parameters
      }
      
      // Find type information for the ports
      const sourcePortType = portTypes.find(
        pt => pt.nodeId === params.source && pt.portId === params.sourceHandle
      );
      
      const targetPortType = portTypes.find(
        pt => pt.nodeId === params.target && pt.portId === params.targetHandle
      );
      
      // If we have port type information, check compatibility
      if (sourcePortType && targetPortType) {
        const isCompatible = areTypesCompatible(sourcePortType.type, targetPortType.type);
        
        if (!isCompatible) {
          // Show warning and don't create the connection
          setIncompatibleConnection({
            sourceType: sourcePortType.type,
            targetType: targetPortType.type,
            message: `Cannot connect ${sourcePortType.type} to ${targetPortType.type}`
          });
          return;
        }
      }
      
      // Clear any previous incompatible connection message
      setIncompatibleConnection(null);
      
      // Create the edge with the custom type
      const edge = { ...params, type: 'custom' };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, nodes, portTypes]
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
        className="absolute top-8 left-8 z-40 rounded-full w-14 h-14 p-0 bg-blue-900 hover:bg-blue-1000 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110"
        onClick={() => setShowSidebar(true)}
      >
        <Plus className="h-8 w-8 text-white" />
      </Button>

      {/* Run Workflow Button */}
      <div className="absolute top-8 right-8 z-40 flex gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleExecuteWorkflow}
          disabled={isExecuting || nodes.length === 0}
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {isExecuting ? 'Running...' : 'Run Workflow'}
        </Button>
      </div>
      
      {/* Results Button - Only shown when results panel is closed and we have results */}
      {!showResultsPanel && Object.keys(executionResults).length > 0 && (
        <Button
          className="absolute top-20 right-8 z-40 bg-blue-900 hover:bg-blue-1000"
          onClick={() => setShowResultsPanel(true)}
        >
          <ChevronLeft/>
        </Button>
      )}
      
      {/* Type incompatibility warning */}
      {incompatibleConnection && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-50 border border-yellow-400 text-yellow-700 p-3 rounded shadow-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
          <div>
            <p className="font-medium">Type Mismatch</p>
            <p className="text-sm">{incompatibleConnection.message}</p>
          </div>
          <button 
            className="ml-4 text-gray-500 hover:text-gray-700"
            onClick={() => setIncompatibleConnection(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Services Sidebar */}

      {showSidebar && (
        <div className="absolute left-8 top-20 z-40 bg-white rounded-lg shadow-[0_4px_24px_0_rgba(0,0,0,0.12)] w-96 max-h-[calc(100vh-160px)] flex flex-col">
          <div className="p-4 border-b">
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
              className="mb-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto overflow-x-hidden p-4 flex-1">
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="p-5 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                  draggable
                  onClick={() => onNodeClick(service)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "true");
                    e.dataTransfer.setData("serviceId", service.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <img src={service.icon} alt="" className="w-10 h-10" />
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

      {/* Execution Results Panel */}
      <ExecutionResultsPanel
        isOpen={showResultsPanel}
        onClose={() => setShowResultsPanel(false)}
        results={executionResults}
        isExecuting={isExecuting}
      />

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