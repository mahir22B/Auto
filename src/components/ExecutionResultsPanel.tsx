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
                          navigator.clipboard.writeText(result.data.output_fileUrl)
                            .then(() => {
                              // Optionally show a brief "Copied!" message
                              const button = document.getElementById(`copy-btn-${nodeId}`);
                              if (button) {
                                const originalText = button.textContent;
                                button.textContent = "Copied!";
                                setTimeout(() => {
                                  button.textContent = originalText;
                                }, 2000);
                              }
                            })
                            .catch(err => {
                              console.error('Could not copy text: ', err);
                            });
                        }}
                        id={`copy-btn-${nodeId}`}
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
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
          )
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
                        .slice(0, 10)
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
                      {result.data.output_files.length > 10 && (
                        <li className="text-gray-500 italic">
                          ...and {result.data.output_files.length - 10} more
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

      // Add cases for other node types as needed
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
              <div className="p-4 flex items-start justify-between">
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
                  <div>
                    <h3 className="text-lg font-medium">
                      {getNodeDisplayName(node)}
                    </h3>
                  </div>
                </div>

                <button onClick={() => toggleNodeExpansion(nodeId)}>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
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
