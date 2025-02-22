import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { SERVICES } from '@/lib/services';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GooglePicker from '../GooglePickerComponent';

interface FlowNodeProps {
  data: {
    config: any;
    onDelete: (id: string) => void;
    service: string;
    authState: {
      isAuthenticated: boolean;
      tokens?: any;
    };
    onAuth: () => void;
    updateNodeConfig: (config: any) => void;
    executionState?: {
      success: boolean;
      error?: string;
      data?: any;
    };
  };
  id: string;
  isConnectable: boolean;
  selected?: boolean;
}

const FlowNode = ({ id, data, isConnectable, selected }: FlowNodeProps) => {
  const [config, setConfig] = React.useState(data.config);
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  const [showExecutionData, setShowExecutionData] = React.useState(false);
  
  const serviceConfig = SERVICES[data.service];
  const { name, icon, actions } = serviceConfig;

  // Update local config when data.config changes
  React.useEffect(() => {
    console.log('Data config changed:', data.config);
    setConfig(data.config);
  }, [data.config]);

  const handleConfigChange = (updates: Partial<any>) => {
    const newConfig = { ...config, ...updates };
    console.log('Updating config:', newConfig);
    setConfig(newConfig);
    data.updateNodeConfig(newConfig);
  };

  const handleActionSelect = async (action: string) => {
    if (!data.authState.isAuthenticated) {
      localStorage.setItem(`${data.service}_pending_action`, JSON.stringify({
        nodeId: id,
        action
      }));
      setShowAuthPrompt(true);
      return;
    }
    
    handleConfigChange({ action });
  };

  // Handle post-auth configuration
  React.useEffect(() => {
    if (data.authState.isAuthenticated && showAuthPrompt) {
      const pendingAction = localStorage.getItem(`${data.service}_pending_action`);

      if (pendingAction) {
        try {
          const { nodeId, action } = JSON.parse(pendingAction);
          if (nodeId === id) {
            localStorage.removeItem(`${data.service}_pending_action`);
            handleConfigChange({ action });
            setShowAuthPrompt(false);
          }
        } catch (error) {
          console.error('Error parsing pending action:', error);
        }
      }
    }
  }, [data.authState.isAuthenticated, data.service, id, showAuthPrompt]);

  const renderExecutionState = () => {
    if (!data.executionState) return null;

    return (
      <div 
        className={cn(
          "mt-4 p-3 rounded-md text-sm",
          data.executionState.success 
            ? "bg-green-50 border border-green-200" 
            : "bg-red-50 border border-red-200"
        )}
      >
        <div className="flex items-center gap-2">
          {data.executionState.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className={data.executionState.success ? "text-green-700" : "text-red-700"}>
            {data.executionState.success ? "Execution successful" : "Execution failed"}
          </span>
        </div>
        
        {data.executionState.error && (
          <div className="mt-2 text-red-600">
            Error: {data.executionState.error}
          </div>
        )}
        
        {data.executionState.success && data.executionState.data && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowExecutionData(!showExecutionData)}
            >
              {showExecutionData ? "Hide" : "Show"} Results
            </Button>
            {showExecutionData && (
              <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(data.executionState.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPorts = () => {
    if (!config.action || !actions[config.action]?.ports) return null;
    
    const { inputs = [], outputs = [] } = actions[config.action].ports;

    return (
      <>
        {/* Input Ports */}
        <div className="absolute -top-3 left-0 right-0 flex justify-around px-4">
          {inputs.map((port) => (
            <div key={port.id} className="relative group">
              <Handle
                type="target"
                position={Position.Top}
                id={port.id}
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-white rounded-full border-2 !border-gray-400"
              />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity">
                {port.label}
              </div>
            </div>
          ))}
        </div>

        {/* Output Ports */}
        <div className="absolute -bottom-3 left-0 right-0 flex justify-around px-4">
          {outputs.map((port) => (
            <div key={port.id} className="relative group">
              <Handle
                type="source"
                position={Position.Bottom}
                id={port.id}
                isConnectable={isConnectable}
                className="w-3 h-3 !bg-white rounded-full border-2 !border-gray-400"
              />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity">
                {port.label}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderHeader = (actionName?: string) => (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <img src={icon} alt={name} className="w-6 h-6" />
        <div>
          <div className="font-medium">{name}</div>
          {actionName && <div className="text-sm text-gray-500">{actionName}</div>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 absolute -top-2 -right-2 hover:bg-gray-100 rounded-full"
        onClick={() => data.onDelete(id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (showAuthPrompt) {
    return (
      <Card className="p-4 w-80">
        {renderHeader()}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Authentication required to use {name} actions
            </p>
            <Button 
              className="w-full bg-black"
              onClick={data.onAuth}
            >
              Login with {name}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (config.action) {
    const action = actions[config.action];
    
    return (
      <Card className={`p-4 w-80 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        {renderPorts()}
        {renderHeader(action.name)}

        <div className="space-y-4">
          {action.configFields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label><strong>{field.label}</strong></Label>
              {field.type === 'text' ? (
                <Textarea
                  value={config[field.name] || ''}
                  onChange={(e) => handleConfigChange({ [field.name]: e.target.value })}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                />
                ) : field.type === 'select' ? (
                <Select
                  value={config[field.name] || ''}
                  onValueChange={(value) => handleConfigChange({ [field.name]: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option: { value: string; label: string } | string) => (
                      <SelectItem 
                        key={typeof option === 'string' ? option : option.value}
                        value={typeof option === 'string' ? option : option.value}
                      >
                        {typeof option === 'string' ? option : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                ) : field.type === 'google-picker' ? (
                  <GooglePicker
                    onFileSelect={(fileDetails) => {
                      handleConfigChange({ 
                        [field.name]: fileDetails.id,
                        fileDetails: fileDetails
                      });
                    }}
                    selectedFile={config.fileDetails}
                    {...field.pickerOptions}
                  />
                ) :
                
                field.type === 'multiselect' ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(config[field.name] || []).map((value: string) => (
                      <div 
                        key={value}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        {value}
                        <button
                          onClick={() => {
                            const newValues = (config[field.name] || []).filter((v: string) => v !== value);
                            handleConfigChange({ [field.name]: newValues });
                          }}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const currentValues = config[field.name] || [];
                      if (!currentValues.includes(value)) {
                        handleConfigChange({
                          [field.name]: [...currentValues, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option: string) => (
                        <SelectItem 
                          key={option}
                          value={option}
                          disabled={(config[field.name] || []).includes(option)}
                        >
                          {option.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                ) : (
                <Input
                  type={field.type}
                  value={config[field.name] || ''}
                  onChange={(e) => handleConfigChange({ [field.name]: e.target.value })}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>

        {renderExecutionState()}
      </Card>
    );
  }

  return (
    <Card className="p-4 w-80">
      {renderHeader()}
      <div className="space-y-2">
        {Object.entries(actions).map(([actionKey, action]) => (
          <Button
            key={actionKey}
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleActionSelect(actionKey)}
          >
            {action.name}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default FlowNode;