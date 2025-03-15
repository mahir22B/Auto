// src/lib/hubspot/executor.ts
import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { HubspotConfig, HubspotCompaniesResponse } from "./types";

export class HubspotExecutor extends AbstractExecutor {
  private async makeHubspotRequest(
    endpoint: string,
    options: RequestInit = {},
    context: ExecutorContext
  ): Promise<any> {
    try {
      // Use the proxy to make requests to HubSpot
      const response = await fetch('/api/hubspot/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${context.tokens.access_token}`
          },
          body: options.body ? JSON.parse(options.body as string) : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making HubSpot request:', error);
      throw error;
    }
  }

  private async executeCompanyReader(context: ExecutorContext, config: HubspotConfig): Promise<ExecutionResult> {
    try {
      // Validate configuration
      if (!config.properties || config.properties.length === 0) {
        throw new Error("No company properties selected");
      }
      
      // Prepare API request parameters
      const limit = config.limit ? parseInt(config.limit.toString()) : 100; // Default to 100 if not specified
      const properties = config.properties.join(',');
      
      // Construct the API URL with query parameters
      const endpoint = `crm/v3/objects/companies?limit=${limit}&properties=${properties}&sort=createdate`;
      
      // Call the HubSpot API
      const response = await this.makeHubspotRequest(endpoint, { method: "GET" }, context) as HubspotCompaniesResponse;
      
      if (!response.results || !Array.isArray(response.results)) {
        throw new Error("No companies found in response");
      }
      
      const companies = response.results;
      
      // Generate outputs based on the number of companies
      const outputs: Record<string, any> = {
        output_companies: companies,
        _output_types: {
          output_companies: 'array'
        }
      };
      
      // Determine if results should be lists based on companies count and limit setting
      const isMultipleCompanies = companies.length > 1 || (config.limit && parseInt(config.limit.toString()) > 1);
      
      // Extract properties into outputs
      for (const property of config.properties) {
        const propertyKey = `output_${property}`;
        
        if (isMultipleCompanies) {
          // Return as list for multiple companies
          outputs[propertyKey] = companies.map(company => company.properties[property] || null);
          outputs._output_types[propertyKey] = 'string_array';
        } else if (companies.length === 1) {
          // Return single value if only one company
          outputs[propertyKey] = companies[0].properties[property] || null;
          outputs._output_types[propertyKey] = 'string';
        } else {
          // No companies found
          outputs[propertyKey] = null;
          outputs._output_types[propertyKey] = 'null';
        }
      }
      
      return {
        success: true,
        data: outputs
      };
    } catch (error) {
      console.error("Error reading HubSpot companies:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read companies",
          details: error
        }
      };
    }
  }

  async execute(context: ExecutorContext, config: HubspotConfig): Promise<ExecutionResult> {
    try {
      console.log("Executing HubSpot action:", config.action);

      switch (config.action) {
        case 'COMPANY_READER':
          return this.executeCompanyReader(context, config);
        // Add cases for other actions when implemented
        default:
          return {
            success: false,
            error: {
              message: `Unsupported HubSpot action: ${config.action}`
            }
          };
      }
    } catch (error) {
      console.error("HubSpot executor error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "An error occurred during execution",
          details: error
        }
      };
    }
  }
}