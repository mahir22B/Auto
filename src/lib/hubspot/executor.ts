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


  private async executeContactReader(context: ExecutorContext, config: HubspotConfig): Promise<ExecutionResult> {
    try {
      // Validate configuration
      if (!config.properties || config.properties.length === 0) {
        throw new Error("No contact properties selected");
      }
      
      // Ensure we always have email property for log output
      let requestProperties = [...config.properties];
      if (!requestProperties.includes('email')) {
        requestProperties.push('email');
      }
      if (!requestProperties.includes('createdate')) {
        requestProperties.push('createdate');
      }
      
      // Prepare API request parameters
      const properties = requestProperties.join(',');
      
      // Construct the API URL with query parameters
      // Sort by creation date to ensure consistent ordering
      const sortParams = 'sort=-createdate&sortBy=createdate&direction=DESCENDING';
      const endpoint = `crm/v3/objects/contacts?properties=${properties}&${sortParams}`;
      
      console.log(`Executing HubSpot Contact Reader with ${requestProperties.length} properties`);
      
      // Call the HubSpot API with our enhanced request function
      const response = await this.makeHubspotRequest(endpoint, { method: "GET" }, context) as HubspotContactsResponse;
      
      if (!response.results || !Array.isArray(response.results)) {
        throw new Error("No contacts found in response");
      }
      
      let contacts = response.results;
      
      // Log the number of contacts received
      console.log(`Raw API response received ${contacts.length} contacts`);
      
      // Log the first few contacts and their creation dates for debugging
      contacts.slice(0, 5).forEach((contact, index) => {
        console.log(`Contact ${index + 1}: ${contact.properties.email || 'Unknown'}, Created: ${contact.properties.createdate || 'Unknown date'}`);
      });
      
      // Sort contacts by createdate in descending order (newest first)
      contacts.sort((a, b) => {
        const dateA = a.properties.createdate ? new Date(a.properties.createdate).getTime() : 0;
        const dateB = b.properties.createdate ? new Date(b.properties.createdate).getTime() : 0;
        return dateB - dateA; // descending order (newest first)
      });
      
      // Log the contacts after sorting to verify
      console.log("After sorting (newest first):");
      contacts.slice(0, 5).forEach((contact, index) => {
        console.log(`Contact ${index + 1}: ${contact.properties.email || 'Unknown'}, Created: ${contact.properties.createdate || 'Unknown date'}`);
      });
      
      // Generate outputs
      const outputs: Record<string, any> = {
        _output_types: {}
      };
      
      // Extract properties the user selected - always as lists
      for (const property of config.properties) {
        const propertyKey = `output_${property}`;
        
        // Extract the property from each contact into an array
        outputs[propertyKey] = contacts.map(contact => contact.properties[property] || null);
        outputs._output_types[propertyKey] = 'string_array';
      }
      
      // Add metadata for display purposes only
      outputs.contactCount = contacts.length;
      
      return {
        success: true,
        data: outputs
      };
    } catch (error) {
      console.error("Error reading HubSpot contacts:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read contacts",
          details: error
        }
      };
    }
  }


  private normalizeDomain(domain: string): string {
    if (!domain) return '';
    
    // Remove protocol if present (http://, https://)
    let normalizedDomain = domain.replace(/^https?:\/\//, '');
    
    // Remove www. prefix if present
    normalizedDomain = normalizedDomain.replace(/^www\./, '');
    
    // Remove trailing path, query parameters, etc.
    normalizedDomain = normalizedDomain.split('/')[0];
    
    // Remove port number if present
    normalizedDomain = normalizedDomain.split(':')[0];
    
    // Trim whitespace and convert to lowercase
    normalizedDomain = normalizedDomain.trim().toLowerCase();
    
    return normalizedDomain;
  }
  
  private async executeEngagementReader(context: ExecutorContext, config: HubspotConfig): Promise<ExecutionResult> {
    try {
      // Get domain from input or config
      let companyDomain = this.getInputValueOrConfig(context, 'input_company_domain', config, 'companyDomain');
      
      if (!companyDomain) {
        throw new Error("Company domain is required either via input port or configuration");
      }
      
      // Normalize the domain
      const normalizedDomain = this.normalizeDomain(companyDomain);
      console.log(`Original domain: ${companyDomain}, Normalized: ${normalizedDomain}`);
      
      // Generate variants for searching
      const domainVariants = [
        normalizedDomain,
        `www.${normalizedDomain}`,
        normalizedDomain.replace(/\./g, '-')
      ];
      
      console.log("Will try searching with these domain variants:", domainVariants);
      
      // Get selected engagement types
      const selectedTypes = config.engagementTypes || [];
      if (!selectedTypes.length) {
        throw new Error("At least one engagement type must be selected");
      }
      
      // Step 1: Try to find the company using a more flexible approach
      let company = null;
      
      // First try: direct domain property search
      for (const variant of domainVariants) {
        if (company) break;
        
        console.log(`Trying to find company with domain: ${variant}`);
        const searchPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "domain",
                  operator: "EQ",
                  value: variant
                }
              ]
            }
          ],
          properties: ["domain", "name", "hs_object_id"],
          limit: 1
        };
        
        const response = await this.makeHubspotRequest(
          "crm/v3/objects/companies/search",
          {
            method: "POST",
            body: JSON.stringify(searchPayload)
          },
          context
        );
        
        if (response.results && response.results.length > 0) {
          company = response.results[0];
          console.log(`Found company with variant "${variant}": ${company.properties.name}`);
        }
      }
      
      // Second try: use a CONTAINS search if exact match didn't work
      if (!company) {
        console.log("No exact match found, trying CONTAINS search...");
        
        const containsPayload = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "domain",
                  operator: "CONTAINS",
                  value: normalizedDomain
                }
              ]
            }
          ],
          properties: ["domain", "name", "hs_object_id"],
          limit: 10
        };
        
        const response = await this.makeHubspotRequest(
          "crm/v3/objects/companies/search",
          {
            method: "POST",
            body: JSON.stringify(containsPayload)
          },
          context
        );
        
        if (response.results && response.results.length > 0) {
          // Find the best match by comparing normalized domains
          for (const result of response.results) {
            const resultDomain = this.normalizeDomain(result.properties.domain);
            console.log(`Checking result domain: "${result.properties.domain}" (normalized: "${resultDomain}")`);
            
            if (resultDomain === normalizedDomain) {
              company = result;
              console.log(`Found best match by normalized domain: ${company.properties.name}`);
              break;
            }
          }
          
          // If no exact normalized match found, use the first result
          if (!company) {
            company = response.results[0];
            console.log(`Using first result as fallback: ${company.properties.name}`);
          }
        }
      }
      
      // If we still don't have a company, return an error
      if (!company) {
        return {
          success: false,
          error: {
            message: `No company found with domain: ${companyDomain} (normalized: ${normalizedDomain})`,
            details: {
              originalDomain: companyDomain,
              normalizedDomain: normalizedDomain,
              variants: domainVariants
            }
          }
        };
      }
      
      // Continue with company found
      const companyId = company.id;
      console.log(`Using company: ${company.properties.name} (ID: ${companyId})`);
      
      // Initialize containers for engagements
      const results: Record<string, any[]> = {};
      
      // Array of promises for parallel execution
      const fetchPromises: Promise<void>[] = [];
      
      // Only fetch the selected engagement types
      if (selectedTypes.includes('emails')) {
        const emailsPromise = (async () => {
          console.log("Fetching emails for company:", companyId);
          const emailsEndpoint = `crm/v3/objects/emails/search`;
          const emailsPayload = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "associations.company",
                    operator: "EQ",
                    value: companyId
                  }
                ]
              }
            ],
            properties: ["hs_email_direction", "hs_email_text", "hs_timestamp", "hs_email_to_email", "hs_email_from_email"],
            limit: 100
          };
          
          try {
            const emailsResponse = await this.makeHubspotRequest(
              emailsEndpoint,
              {
                method: "POST",
                body: JSON.stringify(emailsPayload)
              },
              context
            );
            
            // Process emails
            if (emailsResponse.results && emailsResponse.results.length > 0) {
              results.emails = emailsResponse.results.map(email => ({
                from: email.properties.hs_email_from_email,
                to: email.properties.hs_email_to_email,
                body: email.properties.hs_email_text
              }));
            } else {
              results.emails = [];
            }
          } catch (error) {
            console.error("Error fetching emails:", error);
            results.emails = [];
          }
        })();
        
        fetchPromises.push(emailsPromise);
      }
      
      if (selectedTypes.includes('notes')) {
        const notesPromise = (async () => {
          console.log("Fetching notes for company:", companyId);
          const notesEndpoint = `crm/v3/objects/notes/search`;
          const notesPayload = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "associations.company",
                    operator: "EQ",
                    value: companyId
                  }
                ]
              }
            ],
            properties: ["hs_note_body", "hs_created_by", "hs_createdate", "hs_lastmodifieddate", "hs_attachment_ids"],
            limit: 100
          };
          
          try {
            const notesResponse = await this.makeHubspotRequest(
              notesEndpoint,
              {
                method: "POST",
                body: JSON.stringify(notesPayload)
              },
              context
            );
            
            // Process notes
            if (notesResponse.results && notesResponse.results.length > 0) {
              results.notes = notesResponse.results.map(note => ({
                content: note.properties.hs_note_body,
                createdBy: note.properties.hs_created_by,
                createdDate: note.properties.hs_createdate,
                associationType: "company",
                lastUpdated: note.properties.hs_lastmodifieddate
              }));
            } else {
              results.notes = [];
            }
          } catch (error) {
            console.error("Error fetching notes:", error);
            results.notes = [];
          }
        })();
        
        fetchPromises.push(notesPromise);
      }
      
      if (selectedTypes.includes('meetings')) {
        const meetingsPromise = (async () => {
          console.log("Fetching meetings for company:", companyId);
          const meetingsEndpoint = `crm/v3/objects/meetings/search`;
          const meetingsPayload = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "associations.company",
                    operator: "EQ",
                    value: companyId
                  }
                ]
              }
            ],
            properties: ["hs_meeting_title", "hs_meeting_body", "hs_meeting_start_time", "hs_meeting_end_time", "hs_meeting_location", "hs_meeting_outcome"],
            limit: 100
          };
          
          try {
            const meetingsResponse = await this.makeHubspotRequest(
              meetingsEndpoint,
              {
                method: "POST",
                body: JSON.stringify(meetingsPayload)
              },
              context
            );
            
            // Process meetings
            if (meetingsResponse.results && meetingsResponse.results.length > 0) {
              results.meetings = meetingsResponse.results.map(meeting => ({
                title: meeting.properties.hs_meeting_title,
                startTime: meeting.properties.hs_meeting_start_time,
                endTime: meeting.properties.hs_meeting_end_time,
                description: meeting.properties.hs_meeting_body,
                attendees: [], // Would require additional API calls to get attendees
                status: meeting.properties.hs_meeting_outcome,
                location: meeting.properties.hs_meeting_location
              }));
            } else {
              results.meetings = [];
            }
          } catch (error) {
            console.error("Error fetching meetings:", error);
            results.meetings = [];
          }
        })();
        
        fetchPromises.push(meetingsPromise);
      }
      
      if (selectedTypes.includes('other_communications')) {
        const callsPromise = (async () => {
          console.log("Fetching calls for company:", companyId);
          const callsEndpoint = `crm/v3/objects/calls/search`;
          const callsPayload = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "associations.company",
                    operator: "EQ",
                    value: companyId
                  }
                ]
              }
            ],
            properties: ["hs_call_title", "hs_call_body", "hs_call_direction", "hs_call_disposition", "hs_call_duration", "hs_timestamp"],
            limit: 100
          };
          
          try {
            const callsResponse = await this.makeHubspotRequest(
              callsEndpoint,
              {
                method: "POST",
                body: JSON.stringify(callsPayload)
              },
              context
            );
            
            // Process calls as part of "other communications"
            if (callsResponse.results && callsResponse.results.length > 0) {
              results.otherCommunications = callsResponse.results.map(call => ({
                type: "call",
                timestamp: call.properties.hs_timestamp,
                duration: call.properties.hs_call_duration,
                participants: [], // Would require additional API calls
                outcome: call.properties.hs_call_disposition,
                notes: call.properties.hs_call_body
              }));
            } else {
              results.otherCommunications = [];
            }
          } catch (error) {
            console.error("Error fetching calls:", error);
            results.otherCommunications = [];
          }
        })();
        
        fetchPromises.push(callsPromise);
      }
      
      // Wait for all selected engagement types to be fetched
      await Promise.all(fetchPromises);
      
      // Build response data based on selected types
      const responseData: Record<string, any> = {
        companyName: company.properties.name,
        companyDomain: company.properties.domain,
        companyId: companyId,
        _output_types: {}
      };
      
      // Only include selected types in the response
      if (selectedTypes.includes('emails')) {
        responseData.output_emails = results.emails || [];
        responseData._output_types.output_emails = 'array';
      }
      
      if (selectedTypes.includes('notes')) {
        responseData.output_notes = results.notes || [];
        responseData._output_types.output_notes = 'array';
      }
      
      if (selectedTypes.includes('meetings')) {
        responseData.output_meetings = results.meetings || [];
        responseData._output_types.output_meetings = 'array';
      }
      
      if (selectedTypes.includes('other_communications')) {
        responseData.output_other_communications = results.otherCommunications || [];
        responseData._output_types.output_other_communications = 'array';
      }
      
      return {
        success: true,
        data: responseData
      };
      
    } catch (error) {
      console.error("Error executing HubSpot Engagement Reader:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read engagements",
          details: error
        }
      };
    }
  }

  // Add this method to src/lib/hubspot/executor.ts inside the HubspotExecutor class

private async executeCompanyUpdater(context: ExecutorContext, config: HubspotConfig): Promise<ExecutionResult> {
  try {
    // Get company name from input or config
    let companyName = this.getInputValueOrConfig(context, 'input_company_name', config, 'companyName');
    
    if (!companyName) {
      throw new Error("Company name is required either via input port or configuration");
    }
    
    if (!config.properties || config.properties.length === 0) {
      throw new Error("At least one property must be selected for updating");
    }
    
    console.log(`Executing HubSpot Company Updater for company: ${companyName}`);
    
    // Step 1: Search for the company by name
    const searchPayload = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "name",
              operator: "EQ",
              value: companyName
            }
          ]
        }
      ],
      properties: ["name", "hs_object_id", "domain"],
      limit: 1
    };
    
    console.log("Searching for company with name:", companyName);
    
    const searchResponse = await this.makeHubspotRequest(
      "crm/v3/objects/companies/search",
      {
        method: "POST",
        body: JSON.stringify(searchPayload)
      },
      context
    );
    
    if (!searchResponse.results || searchResponse.results.length === 0) {
      return {
        success: false,
        error: {
          message: `No company found with name: ${companyName}`,
          details: {
            searchTerm: companyName
          }
        }
      };
    }
    
    // Get the company ID and other details
    const company = searchResponse.results[0];
    const companyId = company.id;
    
    console.log(`Found company with ID: ${companyId}, preparing to update properties`);
    
    // Step 2: Gather the property values to update
    const propertiesToUpdate: Record<string, any> = {};
    
    // For each selected property, check if there's a value from the input port
    for (const propertyId of config.properties) {
      const inputPortId = `input_${propertyId}`;
      
      // Only include properties that have connected input data
      if (context.inputData && context.inputData[inputPortId] !== undefined) {
        const value = context.inputData[inputPortId];
        propertiesToUpdate[propertyId] = value;
        console.log(`Setting property ${propertyId} to:`, value);
      }
    }
    
    // If no properties have values, return success but indicate nothing was updated
    if (Object.keys(propertiesToUpdate).length === 0) {
      return {
        success: true,
        data: {
          output_updated: false,
          output_company_id: companyId,
          companyName: companyName,
          propertiesUpdated: [],
          message: "No property values provided for update",
          _output_types: {
            output_updated: 'boolean',
            output_company_id: 'string'
          }
        }
      };
    }
    
    // Step 3: Send the update request to HubSpot
    const updatePayload = {
      properties: propertiesToUpdate
    };
    
    console.log(`Sending update request for company ${companyId} with properties:`, propertiesToUpdate);
    
    const updateResponse = await this.makeHubspotRequest(
      `crm/v3/objects/companies/${companyId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      },
      context
    );
    
    console.log("Update response received:", updateResponse);
    
    return {
      success: true,
      data: {
        output_updated: true,
        output_company_id: companyId,
        companyName: companyName,
        companyId: companyId,
        propertiesUpdated: Object.keys(propertiesToUpdate),
        updatedValues: propertiesToUpdate,
        message: `Successfully updated ${Object.keys(propertiesToUpdate).length} properties for company "${companyName}"`,
        _output_types: {
          output_updated: 'boolean',
          output_company_id: 'string'
        }
      }
    };
  } catch (error) {
    console.error("Error updating HubSpot company:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to update company",
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
      case 'CONTACT_READER':
        return this.executeContactReader(context, config);
      case 'ENGAGEMENT_READER':
        return this.executeEngagementReader(context, config);
      case 'COMPANY_UPDATER':
          return this.executeCompanyUpdater(context, config);  
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