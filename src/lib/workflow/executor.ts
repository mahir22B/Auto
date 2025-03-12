// src/lib/workflow/executor.ts

import { Node, Edge } from "reactflow";
import { ExecutorRegistry } from "../executors/registry";
import { ExecutorContext } from "../executors/types";
import { transformValue, getTypeTransformation } from "../types/PortTypes";

export class WorkflowExecutor {
  private getNodeOrder(nodes: Node[], edges: Edge[]): string[] {
    const nodeOrder: string[] = [];
    const visited = new Set<string>();

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(
      (node) => !edges.some((edge) => edge.target === node.id)
    );

    // Simple DFS to get execution order
    const visit = (node: Node) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      nodeOrder.push(node.id);

      // Find child nodes
      const childEdges = edges.filter((edge) => edge.source === node.id);
      const childNodes = childEdges
        .map((edge) => nodes.find((n) => n.id === edge.target)!)
        .filter(Boolean); // Filter out undefined nodes

      childNodes.forEach(visit);
    };

    rootNodes.forEach(visit);
    return nodeOrder;
  }

  async executeWorkflow(
    nodes: Node[],
    edges: Edge[],
    authState: Record<string, { tokens?: any }>
  ) {
    const nodeOrder = this.getNodeOrder(nodes, edges);
    const nodeResults: Record<string, any> = {};
    const nodeOutputs: Record<string, Record<string, any>> = {};
    const nodeOutputTypes: Record<string, Record<string, string>> = {};

    console.log("Executing workflow with node order:", nodeOrder);

    for (const nodeId of nodeOrder) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        console.error(`Node ${nodeId} not found`);
        continue;
      }

      try {
        // Check if we have an action selected
        if (!node.data.config?.action) {
          throw new Error("Please select an action for the node");
        }

        // Get inputs from parent nodes through connections
        const inputEdges = edges.filter((edge) => edge.target === nodeId);
        const inputs: any[] = [];
        const inputData: Record<string, any> = {};

        // Process input edges to get data from source nodes
        for (const edge of inputEdges) {
          const sourceNodeId = edge.source;
          const sourceHandle = edge.sourceHandle;
          const targetHandle = edge.targetHandle;

          if (!sourceNodeId || !sourceHandle || !targetHandle) {
            continue; // Skip edges without proper handles
          }

          const sourceNode = nodes.find((n) => n.id === sourceNodeId);
          if (!sourceNode || !nodeOutputs[sourceNodeId]) {
            continue; // Skip if source node or its outputs don't exist
          }

          // Get data from the specific source handle
          const sourceData = nodeOutputs[sourceNodeId][sourceHandle];
          
          if (sourceData !== undefined) {
            // Get the source and target data types
            const sourceType = nodeOutputTypes[sourceNodeId]?.[sourceHandle] || 'any';
            const targetType = 'any'; // We'll need to define input types later
            
            // Determine what transformation is needed
            const transformation = getTypeTransformation(sourceType, targetType);
            
            // Apply transformation if needed
            const transformedData = transformation 
              ? transformValue(sourceData, transformation)
              : sourceData;
            
            // Store for executor context
            inputs.push({
              sourceNode: sourceNodeId,
              sourceHandle: sourceHandle,
              targetHandle: targetHandle,
              data: transformedData
            });
            
            // Store for direct access in the node
            inputData[targetHandle] = transformedData;
          }
        }

        // Get the appropriate executor
        const executor = ExecutorRegistry.getExecutor(node.type);

        // Get auth tokens
        const tokens = node.type === 'ai' ? {} : authState[node.type]?.tokens;
        if (!tokens && node.type !== 'ai') {
          throw new Error(`Please authenticate with ${node.type}`);
        }

        // Create the execution context with input data
        const context: ExecutorContext = {
          tokens,
          inputs,
          inputData // Add direct access to input data
        };

        // Execute the node
        console.log(`Executing node ${nodeId} with config:`, node.data.config);
        console.log(`Node ${nodeId} inputs:`, inputs);

        const startTime = Date.now();
        const result = await executor.execute(context, node.data.config);
        const executionTime = (Date.now() - startTime) / 1000;

        console.log(`Node ${nodeId} result:`, result);

        nodeResults[nodeId] = {
          ...result,
          executionTime,
          inputs,
        };

        // Store individual outputs with their handle IDs
        nodeOutputs[nodeId] = {};
        if (result.success && result.data) {
          // Extract types info for later use
          if (result.data._output_types) {
            nodeOutputTypes[nodeId] = result.data._output_types;
            // Don't include types in the output data
            delete result.data._output_types;
          }
          
          for (const [key, value] of Object.entries(result.data)) {
            nodeOutputs[nodeId][key] = value;
          }
        }

        if (!result.success) {
          console.error(`Node ${nodeId} failed:`, result.error);
        }
      } catch (error) {
        console.error(`Error executing node ${nodeId}:`, error);
        nodeResults[nodeId] = {
          success: false,
          error: error instanceof Error ? error.message : "Execution failed",
          executionTime: 0,
        };
      }
    }

    return { nodeResults, nodeOutputTypes };
  }
}