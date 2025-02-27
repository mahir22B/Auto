// src/lib/workflow/executor.ts

import { Node, Edge } from "reactflow";
import { ExecutorRegistry } from "../executors/registry";
import { ExecutorContext } from "../executors/types";

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
    const nodeOutputs: Record<string, any> = {};

    console.log("Executing workflow with node order:", nodeOrder);

    for (const nodeId of nodeOrder) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        console.error(`Node ${nodeId} not found`);
        continue;
      }

      try {
        // Simply check if we have an action selected
        if (!node.data.config?.action) {
          throw new Error("Please select an action for the node");
        }

        // Get inputs from parent nodes
        const inputEdges = edges.filter((edge) => edge.target === nodeId);
        const inputs: any[] = [];

        // Process input edges to get data from source nodes
        for (const edge of inputEdges) {
          const sourceNodeId = edge.source;
          const sourceNode = nodes.find((n) => n.id === sourceNodeId);

          if (sourceNode && nodeOutputs[sourceNodeId]) {
            // If the edge has specific source/target handles, try to get that specific data
            if (edge.sourceHandle && edge.targetHandle) {
              // Extract source handle ID (could have output_ prefix)
              const sourceField = edge.sourceHandle;

              // Get specific field data if available
              if (nodeOutputs[sourceNodeId][sourceField] !== undefined) {
                inputs.push({
                  sourceNode: sourceNode.id,
                  targetHandle: edge.targetHandle,
                  data: nodeOutputs[sourceNodeId][sourceField],
                });
              }
            } else {
              // Push the entire output
              inputs.push({
                sourceNode: sourceNode.id,
                data: nodeOutputs[sourceNodeId],
              });
            }
          }
        }
        // Get the appropriate executor
        const executor = ExecutorRegistry.getExecutor(node.type);

        // Get auth tokens
        const tokens = authState[node.type]?.tokens;
        if (!tokens) {
          throw new Error(`Please authenticate with ${node.type}`);
        }

        const context: ExecutorContext = {
          tokens,
          inputs,
        };

        // Execute the node
        console.log(`Executing node ${nodeId} with config:`, node.data.config);
        const startTime = Date.now();
        const result = await executor.execute(context, node.data.config);
        const executionTime = (Date.now() - startTime) / 1000;

        console.log(`Node ${nodeId} result:`, result);

        nodeResults[nodeId] = {
          ...result,
          executionTime,
          inputs,
        };
        nodeOutputs[nodeId] = result.data;

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

    return { nodeResults };
  }
}
