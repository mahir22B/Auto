import React from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { SERVICES } from "@/lib/services";

// Import this utility function to get node display names
const getNodeDisplayName = (node: any): string => {
  if (!node) return "Unknown Node";

  // If the node has a type and action, try to get the name from services config
  if (node.type && node.data?.config?.action) {
    const serviceConfig = SERVICES[node.type];
    if (serviceConfig && serviceConfig.actions[node.data.config.action]) {
      return serviceConfig.actions[node.data.config.action].name;
    }
  }

  // Fallback to node ID if we can't find a proper name
  return node.id || "Unknown Node";
};

interface ExecutionResultsProps {
  isOpen: boolean;
  onClose: () => void;
  results: Record<string, any>;
  isExecuting: boolean;
}

const ExecutionResultsPanel: React.FC<ExecutionResultsProps> = ({
  isOpen,
  onClose,
  results,
  isExecuting,
}) => {
  // Removed tabs state as we're only showing current run
  const [expandedNodes, setExpandedNodes] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedDetails, setExpandedDetails] = React.useState<
    Record<string, boolean>
  >({});

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Toggle details expansion
  const toggleDetailsExpansion = (nodeId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Helper function to determine provider from model name
  const getProviderDetails = (modelString) => {
    if (!modelString) return { name: 'AI', color: 'gray' };
    
    if (modelString.includes('openai')) {
      return { name: 'OpenAI', color: 'green', icon: '/icons/openai.svg' };
    } else if (modelString.includes('anthropic')) {
      return { name: 'Anthropic', color: 'purple', icon: '/icons/anthropic.svg' };
    } else if (modelString.includes('google')) {
      return { name: 'Google', color: 'blue', icon: '/icons/google.svg' };
    } else if (modelString.includes('perplexity')) {
      return { name: 'Perplexity', color: 'indigo', icon: '/icons/ai.svg' };
    } else if (modelString.includes('deepseek')) {
      return { name: 'DeepSeek', color: 'orange', icon: '/icons/ai.svg' };
    }
    
    return { name: modelString.split('/')[0], color: 'gray', icon: '/icons/ai.svg' };
  };
  
  const renderGmailReaderResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data || !result.data.messages) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to read emails"}
        </div>
      );
    }

    const { messages, summary } = result.data;

    return (
      <div className="space-y-4">
        {messages.map((message: any, index: number) => (
          <div key={index} className="p-2">
            <div className="text-blue-600">
              Reading email → Subject: {message.subject || "No Subject"}, From:{" "}
              {message.sender?.name || ""} &lt;
              {message.sender?.email || "unknown"}&gt;
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="p-2 text-gray-500 italic">
            No unread emails found in {summary?.label || "inbox"}
          </div>
        )}
      </div>
    );
  };

  const renderGDocsResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to read document"}
        </div>
      );
    }

    const { title, content } = result.data;

    return (
      <div className="space-y-4">
        <div className="p-2">
          <div className="text-lg font-medium text-blue-600 mb-2">
            {title || "Untitled Document"}
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-auto">
            <div className="whitespace-pre-wrap">
              {content || "No content found"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSlackResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to send message to Slack"}
        </div>
      );
    }
  
    return (
      <div className="p-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-600">Success</span>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">Message sent successfully</span>
          </div>
          
          {result.data.message && (
            <div className="border-l-4 border-gray-300 pl-3 py-1 mt-2 text-gray-700">
              {result.data.message}
            </div>
          )}
          
          {result.data.fileIds && result.data.fileIds.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-gray-500 mb-1">
                Attachments: {result.data.fileIds.length} file(s) uploaded
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span className="text-blue-500">{result.data.fileIds.length} attachment(s)</span>
              </div>
            </div>
          )}
          
          <div className="mt-3 text-sm">
            <div className="flex items-center text-gray-500">
              <span className="font-medium mr-1">Thread ID:</span> 
              {result.data.output_threadId}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSlackReadResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to read Slack messages"}
        </div>
      );
    }
  
    const { messages, messageCount, channelName } = result.data;
  
    if (!messages || messages.length === 0) {
      return (
        <div className="p-2 text-gray-500 italic">
          No messages found in channel {channelName || "unknown"}
        </div>
      );
    }
  
    return (
      <div className="space-y-4">
        <div className="p-2">
          <div className="text-lg font-medium mb-2">
            Retrieved {messageCount} messages from #{channelName}
          </div>
          
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
            <div className="mb-2 text-sm text-gray-500">Message preview:</div>
            
            <div className="space-y-3 max-h-96 overflow-auto p-2">
              {messages.slice(0, 50).map((message: any, index: number) => (
                <div key={index} className="border-b border-gray-200 pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.username || message.user}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(Number(message.ts) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                  
                  {message.files && message.files.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      {message.files.length} attachment(s)
                    </div>
                  )}
                  
                  {message.threadTs && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Thread reply
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Output summary */}
          <div className="mt-4 space-y-2">
            {result.data.output_messages && (
              <div className="text-sm">
                <span className="font-medium">Message texts:</span> {result.data.output_messages.length} extracted
              </div>
            )}
            
            {result.data.output_sender_names && (
              <div className="text-sm">
                <span className="font-medium">Sender names:</span> {result.data.output_sender_names.length} extracted
              </div>
            )}
            
            {result.data.output_thread_ids && (
              <div className="text-sm">
                <span className="font-medium">Thread IDs:</span> {result.data.output_thread_ids.length} extracted
              </div>
            )}
            
            {result.data.output_attachment_names && (
              <div className="text-sm">
                <span className="font-medium">Attachment names:</span> {result.data.output_attachment_names.length} extracted
              </div>
            )}
            
            {result.data.output_thread_links && (
              <div className="text-sm">
                <span className="font-medium">Thread links:</span> {result.data.output_thread_links.length} extracted
              </div>
            )}
            
            {result.data.output_channel_names && (
              <div className="text-sm">
                <span className="font-medium">Channel names:</span> {result.data.output_channel_names.length} extracted
              </div>
            )}
            
            {result.data.output_channel_ids && (
              <div className="text-sm">
                <span className="font-medium">Channel IDs:</span> {result.data.output_channel_ids.length} extracted
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSlackCanvasResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to create canvas"}
        </div>
      );
    }
  
    // Get the URL from the result
    const canvasUrl = result.data.output_canvasLink;
    const canvasTitle = result.data.title;
  
    return (
      <div className="p-4">
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex flex-col items-center">
          <div className="text-green-700 font-medium text-center mb-2">
            Canvas created and shared successfully:
          </div>
          <a 
            href={canvasUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {canvasUrl}
          </a>
        </div>
      </div>
    );
  };
  
  const renderAIResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to get AI response"}
        </div>
      );
    }
    
    const aiResponse = result.data.output_response;
    const tokensUsed = result.data.output_tokens;
    const model = result.data.model;
    
    const provider = getProviderDetails(model);
    
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-${provider.color}-600 font-medium flex items-center gap-1`}>
              <div className={`w-2 h-2 bg-${provider.color}-500 rounded-full`}></div>
              {provider.name}
            </span>
            <span className="text-sm text-gray-500">
              {model ? model.split('/')[1] : 'Unknown model'}
            </span>
          </div>
          
          <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100 mb-3 max-h-96 overflow-y-auto">
            {aiResponse}
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            {/* <div>Tokens used: {tokensUsed || 'Unknown'}</div> */}
          </div>
        </div>
      </div>
    );
  };
  const renderExtractInformationResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to extract information"}
        </div>
      );
    }
  
    // Get all output fields (those that start with "output_")
    const outputFields = Object.keys(result.data)
      .filter(key => key.startsWith('output_') && key !== 'output_data')
      .sort();
  
    return (
      <div className="p-4">
        <div className="bg-gray-50 p-3 rounded">
          {/* Model stats if available */}
          {/* {result.data.model && (
            <div className="text-sm text-green-600 mb-4">
              LLM Call Count: 1 Cache Hit Count: 0
            </div>
          )} */}
          
          {/* Display each extracted field cleanly */}
          <div className="space-y-6">
            {outputFields.map(key => {
              const fieldName = key.replace('output_', '');
              const value = result.data[key];
              
              // Format the value based on type
              const formattedValue = typeof value === 'boolean'
                ? (value ? 'Yes' : 'No')
                : typeof value === 'number' && fieldName.toLowerCase().includes('price')
                ? `$${value.toLocaleString()}`
                : String(value);
              
              return (
                <div key={key} className="text-gray-800">
                  <p className="text-lg">
                    '{fieldName}' : {formattedValue}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderScorerResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to generate score"}
        </div>
      );
    }
    
    const score = result.data.output_score;
    const justification = result.data.output_justification;
    const model = result.data.model;
    
    const provider = getProviderDetails(model);
    
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-${provider.color}-600 font-medium flex items-center gap-1`}>
              <div className={`w-2 h-2 bg-${provider.color}-500 rounded-full`}></div>
              {provider.name}
            </span>
            <span className="text-sm text-gray-500">
              {model ? model.split('/')[1] : 'Unknown model'}
            </span>
          </div>
          
          {/* Score Display */}
          <div className="flex flex-col items-center mb-6">
            <div className="text-lg font-semibold mb-2">Score Result</div>
            <div className="w-full max-w-sm bg-gray-200 rounded-full h-6 mb-2">
              <div 
                className="h-6 rounded-full bg-blue-600 text-white text-center text-sm font-medium leading-6"
                style={{ width: `${score}%` }}
              >
                {score}/100
              </div>
            </div>
            <div className="flex justify-between w-full max-w-sm text-xs text-gray-500">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
          
          {/* Justification if available */}
          {justification && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Justification:</div>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100 max-h-64 overflow-y-auto text-sm">
                {justification}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHubspotResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to fetch HubSpot data"}
        </div>
      );
    }
  
    // Get all output fields (those that start with "output_")
    const outputFields = Object.keys(result.data)
      .filter(key => key.startsWith('output_') && !key.includes('_types'))
      .sort();
    
    if (outputFields.length === 0) {
      return (
        <div className="p-2 text-gray-500 italic">
          No data found or no properties selected
        </div>
      );
    }
  
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white rounded-lg border p-4">
          {outputFields.map(fieldKey => {
            const fieldName = fieldKey.replace('output_', '');
            const fieldValue = result.data[fieldKey];
            
            // Format the field display name to be more readable
            const displayName = fieldName
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            
            // Check if value is an array
            const isArray = Array.isArray(fieldValue);
            
            return (
              <div key={fieldKey} className="mb-4 last:mb-0">
                <div className="font-medium text-gray-700 mb-1">{displayName}</div>
                {isArray ? (
                  <div className="bg-gray-50 rounded border border-gray-200 p-2">
                    {fieldValue.length > 0 ? (
                      <div className="space-y-2">
                        {fieldValue.map((item: any, index: number) => (
                          <div key={index} className="p-2 bg-white border rounded">
                            {typeof item === 'object' ? 
                              JSON.stringify(item) : 
                              String(item ?? 'N/A')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">No data available</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded border border-gray-200 p-2">
                    {fieldValue !== null && fieldValue !== undefined ? 
                      (typeof fieldValue === 'object' ? 
                        JSON.stringify(fieldValue) : 
                        String(fieldValue)) : 
                      'N/A'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummarizerResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data) {
      return (
        <div className="text-red-500">
          {result.error?.message || "Failed to generate summary"}
        </div>
      );
    }
    
    const summary = result.data.output_summary;
    const tokensUsed = result.data.output_tokens;
    const model = result.data.model;
    
    const provider = getProviderDetails(model);
    
    return (
      <div className="space-y-4 p-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-${provider.color}-600 font-medium flex items-center gap-1`}>
                <div className={`w-2 h-2 bg-${provider.color}-500 rounded-full`}></div>
                {provider.name}
              </span>
              <span className="text-sm text-gray-500">
                {model ? model.split('/')[1] : 'Unknown model'}
              </span>
            </div>
          </div>
          
          <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100 mb-3 max-h-96 overflow-y-auto">
            {summary}
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            {/* <div>Tokens used: {tokensUsed || 'Unknown'}</div> */}
          </div>
        </div>
      </div>
    );
  };


  const renderNodeResults = (nodeId: string, node: any, result: any) => {
    switch (node.type) {
      case "gmail":
        if (node.data.config.action === "READ_UNREAD") {
          return renderGmailReaderResults(nodeId, result);
        } else if (node.data.config.action === "SEND_EMAIL") {
          return (
            <div className="p-2">
              <div className="text-blue-600">
                {result.success
                  ? result.data.details?.displayText ||
                    `Email sent → To: ${result.data.details?.to}, Subject: ${result.data.details?.subject}`
                  : result.data.attempted?.displayText ||
                    "Failed to send email"}
              </div>
            </div>
          );
        }
        break;

      case "gdrive":
        // Add Google Drive specific renderer
        if (node.data.config.action === "WRITE_FILE") {
          return (
            <div className="p-2">
              {result.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600">Success</span>
                  </div>
                  {result.data?.output_fileUrl ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard
                            .writeText(result.data.output_fileUrl)
                            .then(() => {
                              // Optionally show a brief "Copied!" message
                              const button = document.getElementById(
                                `copy-btn-${nodeId}`
                              );
                              if (button) {
                                const originalText = button.textContent;
                                button.textContent = "Copied!";
                                setTimeout(() => {
                                  button.textContent = originalText;
                                }, 2000);
                              }
                            })
                            .catch((err) => {
                              console.error("Could not copy text: ", err);
                            });
                        }}
                        id={`copy-btn-${nodeId}`}
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-copy"
                        >
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        Copy URL
                      </button>
                      <a
                        href={result.data.output_fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-500 hover:text-blue-700"
                      >
                        <span>Open in Google Drive</span>
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-yellow-600">
                      Unable to generate file URL
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-500">
                  {result.error?.message || "Failed to write file"}
                </div>
              )}
            </div>
          );
        } else if (node.data.config.action === "READ_FILE") {
          return (
            <div className="p-2">
              <div className="text-blue-600">
                {result.success
                  ? `Read file: ${
                      result.data.output_fileName || "Unknown file"
                    }`
                  : `Failed to read file: ${result.error?.message}`}
              </div>
              {result.success && result.data.output_fileContents && (
                <div className="mt-2 bg-gray-50 p-3 rounded max-h-40 overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {typeof result.data.output_fileContents === "string" &&
                    result.data.output_fileContents.length > 500
                      ? result.data.output_fileContents.substring(0, 500) +
                        "..."
                      : result.data.output_fileContents}
                  </pre>
                </div>
              )}
            </div>
          );
        } else if (node.data.config.action === "READ_FOLDER") {
          return (
            <div className="p-2">
              <div className="text-blue-600">
                {result.success
                  ? `Read folder: ${
                      result.data.folderName || "Unknown folder"
                    } (${result.data.fileCount || 0} files)`
                  : `Failed to read folder: ${result.error?.message}`}
              </div>
              {result.success &&
                result.data.output_files &&
                result.data.output_files.length > 0 && (
                  <div className="mt-2 bg-gray-50 p-3 rounded max-h-40 overflow-auto">
                    <div className="text-sm">Files:</div>
                    <ul className="list-disc pl-5 text-sm">
                      {result.data.output_files
                        .slice(0, 50)
                        .map((file: any, index: number) => (
                          <li key={index} className="text-gray-700">
                            {file.name}
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline ml-2 text-xs"
                              >
                                Open
                              </a>
                            )}
                          </li>
                        ))}
                      {result.data.output_files.length > 50 && (
                        <li className="text-gray-500 italic">
                          ...and {result.data.output_files.length - 50} more
                          files
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          );
        }
        break;

      case "sheets":
        // Add sheets specific renderer
        return (
          <div className="p-2">
            <div className="text-blue-600">
              {result.success
                ? `Sheets operation completed: ${
                    result.data?.message || "Successfully"
                  }`
                : `Sheets operation failed: ${
                    result.error?.message || "Unknown error"
                  }`}
            </div>
            {result.data?.sheetLink && (
              <div className="mt-2">
                <a
                  href={result.data.sheetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  Open in Google Sheets
                </a>
              </div>
            )}
          </div>
        );

      case "gdocs":
        if (node.data.config.action === "WRITE_DOCUMENT") {
          return (
            <div className="p-2">
              {result.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600">Success</span>
                  </div>
                  {result.data?.output_docUrl || result.data?.output_fileUrl ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard
                            .writeText(
                              result.data.output_docUrl ||
                                result.data.output_fileUrl
                            )
                            .then(() => {
                              // Optionally show a brief "Copied!" message
                              const button = document.getElementById(
                                `copy-btn-${nodeId}`
                              );
                              if (button) {
                                const originalText = button.textContent;
                                button.textContent = "Copied!";
                                setTimeout(() => {
                                  button.textContent = originalText;
                                }, 2000);
                              }
                            })
                            .catch((err) => {
                              console.error("Could not copy text: ", err);
                            });
                        }}
                        id={`copy-btn-${nodeId}`}
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-copy"
                        >
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        Copy URL
                      </button>

                      <a
                        href={
                          result.data.output_docUrl ||
                          result.data.output_fileUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-500 hover:text-blue-700"
                      >
                       <span>Open in Google Docs</span>
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-yellow-600">
                      Unable to generate document URL
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-500">
                  {result.error?.message || "Failed to create document"}
                </div>
              )}
            </div>
          );
        } else {
          return renderGDocsResults(nodeId, result);
        }
        case "slack":
          if (node.data.config.action === "SEND_MESSAGE") {
            return renderSlackResults(nodeId, result);
          } else if (node.data.config.action === "READ_MESSAGES") {
            return renderSlackReadResults(nodeId, result);
          } else if (node.data.config.action === "CANVAS_WRITER") {
            return renderSlackCanvasResults(nodeId, result);
          }
          break;
          
          case "ai":
            if (node.data.config.action === "ASK_AI") {
              return renderAIResults(nodeId, result);
            } else if (node.data.config.action === "SUMMARIZE") {
              return renderSummarizerResults(nodeId, result);
            } else if (node.data.config.action === "EXTRACT_INFORMATION") {  
              return renderExtractInformationResults(nodeId, result);
            } else if (node.data.config.action === "SCORER") {
              return renderScorerResults(nodeId, result);
            }
            break;

          case "hubspot":
        if (node.data.config.action === "COMPANY_READER") {
          return renderHubspotResults(nodeId, result);
        }
        break;
    }

    // Default fallback renderer
    return (
      <div>
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      </div>
    );
  };

  const renderResultsContent = () => {
    if (isExecuting) {
      return (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
          <span className="ml-2">Executing workflow...</span>
        </div>
      );
    }

    const nodes = Object.keys(results);

    if (nodes.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500">
          No execution results yet. Run your workflow to see results here.
        </div>
      );
    }

    const executionSuccess = nodes.every((nodeId) => results[nodeId]?.success);

    return (
      <div className="space-y-4">
        {nodes.map((nodeId) => {
          const result = results[nodeId];
          const node = result.node;
          const isExpanded = expandedNodes[nodeId] !== false; // Default to expanded

          return (
            <div key={nodeId} className="bg-white rounded-lg shadow">
              <div className="p-4 flex items-start justify-between cursor-pointer select-none"
               onClick={() => toggleNodeExpansion(nodeId)}
              >
                <div className="flex items-center">
                  {/* Service-specific icons */}
                  {node.type === "gmail" && (
                    <div className="mr-3 text-red-500">
                      <img
                        src="/icons/gmail.svg"
                        alt="Gmail"
                        width="24"
                        height="24"
                      />
                    </div>
                  )}
                  {node.type === "gdrive" && (
                    <div className="mr-3 text-blue-600">
                      <img
                        src="/icons/gdrive.svg"
                        alt="Google Drive"
                        width="24"
                        height="24"
                      />
                    </div>
                  )}
                  {node.type === "sheets" && (
                    <div className="mr-3 text-green-600">
                      <img
                        src="/icons/gsheets.svg"
                        alt="Google Sheets"
                        width="24"
                        height="24"
                      />
                    </div>
                  )}
                  {node.type === "gdocs" && (
                    <div className="mr-3 text-blue-600">
                      <img
                        src="/icons/gdocs.svg"
                        alt="Google Docs"
                        width="24"
                        height="24"
                      />
                    </div>
                  )}
                  {node.type === "slack" && (
                     <div className="mr-3 text-blue-600">
                     <img
                       src="/icons/slack.svg"
                       alt="Slack"
                       width="24"
                       height="24"
                     />
                   </div>
                  )}
                  {node.type === "ai" && (
                     <div className="mr-3 text-purple-600">
                     <img
                       src="/icons/ai.svg"
                       alt="AI"
                       width="24"
                       height="24"
                     />
                   </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium">
                      {getNodeDisplayName(node)}
                    </h3>
                  </div>
                </div>

                <div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <div className="p-4">
                    <button
                      className="text-gray-500 flex items-center text-sm w-full justify-center border rounded-md py-2 mb-4"
                      onClick={() => toggleDetailsExpansion(nodeId)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      See all inputs and outputs
                    </button>

                    {expandedDetails[nodeId] && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <h4 className="font-medium mb-2">Raw data:</h4>
                        <pre className="text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {renderNodeResults(nodeId, node, result)}
                  </div>

                  <div className="bg-gray-50 p-3 flex items-center rounded-b-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-500 flex items-center">
                        <span className="inline-block h-4 w-4 mr-1">⏱️</span>
                        {(result.executionTime || 0.8).toFixed(2)}s
                      </div>
                      {result.success ? (
                        <div className="text-green-500 bg-green-50 px-3 py-1 rounded-full flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Success
                        </div>
                      ) : (
                        <div className="text-red-500 bg-red-50 px-3 py-1 rounded-full flex items-center">
                          <X className="h-4 w-4 mr-1" />
                          Error
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-8 flex justify-center">
          <div
            className={`flex items-center ${
              executionSuccess ? "text-green-600" : "text-red-600"
            }`}
          >
            {executionSuccess ? (
              <>
                <CheckCircle className="h-6 w-6 mr-2" />
                Run completed successfully
              </>
            ) : (
              <>
                <X className="h-6 w-6 mr-2" />
                Run completed with errors
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed right-0 top-20 h-[calc(100%-6rem)] w-1/3 bg-gray-50 shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b bg-white p-4">
          <div className="flex items-center">
            <button
              className="mr-4 h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
              onClick={onClose}
            >
              <ChevronDown className="h-5 w-5 -rotate-90" />
            </button>
            <div className="flex">
              <h2 className="text-purple-600 border-b-2 border-purple-600 font-medium px-4 py-2">
                Current Run
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {renderResultsContent()}
        </div>
      </div>
    </div>
  );
};

export default ExecutionResultsPanel;