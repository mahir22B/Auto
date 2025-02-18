import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { SERVICES } from '@/lib/services';

interface FlowNodeProps {
  data: {
    config: any;
    isConfigured: boolean;
    onDelete: (id: string) => void;
    service: string;
    authState: {
      isAuthenticated: boolean;
      tokens?: any;
    };
    onAuth: () => void;
  };
  id: string;
  isConnectable: boolean;
  selected?: boolean;
  updateNode: (id: string, config: any) => void;
}

const FlowNode = ({ id, data, isConnectable, selected, updateNode }: FlowNodeProps) => {
  const [isConfiguring, setIsConfiguring] = React.useState(false);
  const [config, setConfig] = React.useState(data.config);
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  
  const serviceConfig = SERVICES[data.service];
  const { name, icon, actions } = serviceConfig;

  // Effect to handle post-auth configuration
  React.useEffect(() => {
    console.log('Auth state changed:', {
      service: data.service,
      isAuthenticated: data.authState.isAuthenticated,
      showAuthPrompt
    });

    if (data.authState.isAuthenticated && showAuthPrompt) {
      const pendingAction = localStorage.getItem(`${data.service}_pending_action`);
      console.log('Checking pending action:', pendingAction);

      if (pendingAction) {
        try {
          const { nodeId, action } = JSON.parse(pendingAction);
          console.log('Parsed action:', { nodeId, action, currentId: id });

          if (nodeId === id) {
            localStorage.removeItem(`${data.service}_pending_action`);
            setConfig(prev => ({ ...prev, action }));
            setIsConfiguring(true);
            setShowAuthPrompt(false);
          }
        } catch (error) {
          console.error('Error parsing pending action:', error);
        }
      }
    }
  }, [data.authState.isAuthenticated, data.service, id, showAuthPrompt]);

  const handleActionSelect = async (action: string) => {
    console.log('Action selected:', action);
    
    if (!data.authState.isAuthenticated) {
      console.log('Storing pending action');
      localStorage.setItem(`${data.service}_pending_action`, JSON.stringify({
        nodeId: id,
        action
      }));
      setShowAuthPrompt(true);
      return;
    }
    
    setConfig(prev => ({ ...prev, action }));
    setIsConfiguring(true);
  };

  const handleSave = () => {
    updateNode(id, config);
    setIsConfiguring(false);
  };

  // Common header with close button
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

  // Show authentication prompt if needed
  if (showAuthPrompt) {
    return (
      <Card className="p-4 w-80">
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
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

        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </Card>
    );
  }

  // Show configuration form if an action is selected and we're configuring
  if (isConfiguring && config.action) {
    const action = actions[config.action];
    
    return (
      <Card className="p-4 w-80">
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
        {renderHeader(action.name)}

        <div className="space-y-4">
          {action.configFields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === 'text' ? (
                <Textarea
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    [field.name]: e.target.value 
                  })}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <Input
                  type={field.type}
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    [field.name]: e.target.value 
                  })}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button 
              variant="outline" 
              onClick={() => setIsConfiguring(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </Card>
    );
  }

  // If already configured, show the configuration summary
  if (data.isConfigured && config.action) {
    const action = actions[config.action];
    
    return (
      <Card className={`p-4 w-80 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
        {renderHeader(action.name)}

        <div className="space-y-2 mb-4">
          {action.configFields.map(field => (
            <div key={field.name} className="text-sm">
              <span className="font-medium">{field.label}:</span>{' '}
              {config[field.name] || 'Not set'}
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setIsConfiguring(true)}
        >
          Edit Configuration
        </Button>

        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </Card>
    );
  }

  // Show action selection buttons by default
  return (
    <Card className="p-4 w-80">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
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

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </Card>
  );
};

export default FlowNode;