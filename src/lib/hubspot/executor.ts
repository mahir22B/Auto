// src/lib/hubspot/executor.ts
import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { HubspotConfig, HubspotCompaniesResponse } from "./types";
import { TokenManager } from "../auth/TokenManager";

export class HubspotExecutor extends AbstractExecutor {
  private async makeHubspotRequest(
    endpoint: string,
    options: RequestInit = {},
    context: ExecutorContext
  ): Promise<any> {
    try {
      // First ensure we have a valid token by explicitly requesting one
      // This will trigger the refresh flow if needed
      const accessToken = await TokenManager.getValidToken('hubspot');
      console.log("Retrieved valid HubSpot token before making request");
      
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
            'Authorization': `Bearer ${accessToken}` // Use the fresh token we just got
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
      
      // Ensure we always have name property for log output
      let requestProperties = [...config.properties];
      if (!requestProperties.includes('name')) {
        requestProperties.push('name');
      }
      if (!requestProperties.includes('createdate')) {
        requestProperties.push('createdate');
      }
      
      // Prepare API request parameters
      const limit = config.limit ? parseInt(config.limit.toString()) : 100; // Default to 100 if not specified
      const properties = requestProperties.join(',');
      
      // Construct the API URL with query parameters
      // Using both sort parameter options to ensure correct sorting
      const sortParams = 'sort=-createdate&sortBy=createdate&direction=DESCENDING';
      const endpoint = `crm/v3/objects/companies?limit=${limit}&properties=${properties}&${sortParams}`;
      
      console.log(`Executing HubSpot Company Reader with ${requestProperties.length} properties, limit=${limit}`);
      
      // Call the HubSpot API with our enhanced request function
      const response = await this.makeHubspotRequest(endpoint, { method: "GET" }, context) as HubspotCompaniesResponse;
      
      if (!response.results || !Array.isArray(response.results)) {
        throw new Error("No companies found in response");
      }
      
      let companies = response.results;
      
      // Ensure we have all the companies from the API response before sorting or filtering
      console.log(`Raw API response received ${companies.length} companies`);
      
      // Log the first few companies and their creation dates for debugging
      companies.slice(0, 5).forEach((company, index) => {
        console.log(`Company ${index + 1}: ${company.properties.name || 'Unknown'}, Created: ${company.properties.createdate || 'Unknown date'}`);
      });
      
      // Sort companies by createdate in descending order (newest first)
      companies.sort((a, b) => {
        const dateA = a.properties.createdate ? new Date(a.properties.createdate).getTime() : 0;
        const dateB = b.properties.createdate ? new Date(b.properties.createdate).getTime() : 0;
        return dateB - dateA; // descending order (newest first)
      });
      
      // Log the companies after sorting to verify
      console.log("After sorting (newest first):");
      companies.slice(0, 5).forEach((company, index) => {
        console.log(`Company ${index + 1}: ${company.properties.name || 'Unknown'}, Created: ${company.properties.createdate || 'Unknown date'}`);
      });
      
      // Apply limit after sorting to ensure we get the right companies
      if (limit > 0 && companies.length > limit) {
        companies = companies.slice(0, limit);
        console.log(`Limited to ${companies.length} companies`);
      }
      
      // Generate outputs based on the number of companies
      const outputs: Record<string, any> = {
        _output_types: {}
      };
      
      // Determine if results should be lists based on companies count and limit setting
      const isMultipleCompanies = companies.length > 1 || (config.limit && parseInt(config.limit.toString()) > 1);
      
      // Extract only the properties the user selected
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
      
      // Add metadata for display purposes only
      outputs.companyCount = companies.length;
      
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