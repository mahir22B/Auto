// src/lib/workflow/executor.ts

import { Node, Edge } from 'reactflow';
import { ExecutorRegistry } from '../executors/registry';
import { ExecutorContext } from '../executors/types';


export class WorkflowExecutor {
  private getNodeOrder(nodes: Node[], edges: Edge[]): string[] {
    const nodeOrder: string[] = [];
    const visited = new Set<string>();

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    // Simple DFS to get execution order
    const visit = (node: Node) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      nodeOrder.push(node.id);

      // Find child nodes
      const childEdges = edges.filter(edge => edge.source === node.id);
      const childNodes = childEdges.map(edge => 
        nodes.find(n => n.id === edge.target)!
      );

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

    for (const nodeId of nodeOrder) {
      const node = nodes.find(n => n.id === nodeId)!;
      
      try {
        // Simply check if we have an action selected
        if (!node.data.config?.action) {
          throw new Error('Please select an action for the node');
        }

        // Get inputs from parent nodes
        const inputEdges = edges.filter(edge => edge.target === nodeId);
        const inputs = inputEdges.map(edge => nodeOutputs[edge.source]);

        // Get the appropriate executor
        const executor = ExecutorRegistry.getExecutor(node.type);
        
        // Get auth tokens
        const tokens = authState[node.type]?.tokens;
        if (!tokens) {
          throw new Error(`Please authenticate with ${node.type}`);
        }

        const context: ExecutorContext = { 
          tokens,
          inputs
        };
        
        // Execute the node
        console.log(`Executing node ${nodeId} with config:`, node.data.config);
        const result = await executor.execute(context, node.data.config);
        console.log(`Node ${nodeId} result:`, result);

        nodeResults[nodeId] = result;
        nodeOutputs[nodeId] = result.data;

        if (!result.success) {
          console.error(`Node ${nodeId} failed:`, result.error);
          break;
        }
      } catch (error) {
        console.error(`Error executing node ${nodeId}:`, error);
        nodeResults[nodeId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Execution failed'
        };
        break;
      }
    }

    return { nodeResults };
  }
}