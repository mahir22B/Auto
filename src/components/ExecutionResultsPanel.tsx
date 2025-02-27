import React from 'react';
import { CheckCircle, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';

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
  isExecuting
}) => {
  // Removed tabs state as we're only showing current run
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = React.useState<Record<string, boolean>>({});

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Toggle details expansion
  const toggleDetailsExpansion = (nodeId: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const renderGmailReaderResults = (nodeId: string, result: any) => {
    if (!result.success || !result.data || !result.data.messages) {
      return (
        <div className="text-red-500">
          {result.error?.message || 'Failed to read emails'}
        </div>
      );
    }

    const { messages, summary } = result.data;

    return (
      <div className="space-y-4">
        {messages.map((message: any, index: number) => (
          <div key={index} className="p-2">
            <div className="text-blue-600">
              Reading email → Subject: {message.subject || 'No Subject'},
              From: {message.sender?.name || ''} &lt;{message.sender?.email || 'unknown'}&gt;
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="p-2 text-gray-500 italic">
            No unread emails found in {summary?.label || 'inbox'}
          </div>
        )}
      </div>
    );
  };

  const renderNodeResults = (nodeId: string, node: any, result: any) => {
    switch (node.type) {
      case 'gmail':
        if (node.data.config.action === 'READ_UNREAD') {
          return renderGmailReaderResults(nodeId, result);
        } else if (node.data.config.action === 'SEND_EMAIL') {
          return (
            <div className="p-2">
              <div className="text-blue-600">
                {result.success 
                  ? result.data.details?.displayText || `Email sent → To: ${result.data.details?.to}, Subject: ${result.data.details?.subject}`
                  : result.data.attempted?.displayText || 'Failed to send email'}
              </div>
            </div>
          );
        }
        break;
      
      case 'sheets':
        // Add sheets specific renderer
        return (
          <div className="p-2">
            <div className="text-blue-600">
              {result.success 
                ? `Sheets operation completed: ${result.data?.message || 'Successfully'}`
                : `Sheets operation failed: ${result.error?.message || 'Unknown error'}`}
            </div>
            {result.data?.sheetLink && (
              <div className="mt-2">
                <a href={result.data.sheetLink} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-500 underline">
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

    const executionSuccess = nodes.every(nodeId => results[nodeId]?.success);

    return (
      <div className="space-y-4">
        {nodes.map(nodeId => {
          const result = results[nodeId];
          const node = result.node;
          const isExpanded = expandedNodes[nodeId] !== false; // Default to expanded
          
          return (
            <div key={nodeId} className="bg-white rounded-lg shadow">
              <div className="p-4 flex items-start justify-between">
                <div className="flex items-center">
                  {node.type === 'gmail' && (
                    <div className="mr-3 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8L12 13L20 8V18ZM12 11L4 6H20L12 11Z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium">
                      {node.type === 'gmail' && node.data.config.action === 'READ_UNREAD' ? 'Gmail Reader' : node.id}
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
          <div className={`flex items-center ${executionSuccess ? 'text-green-600' : 'text-red-600'}`}>
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
        isOpen ? 'translate-x-0' : 'translate-x-full'
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