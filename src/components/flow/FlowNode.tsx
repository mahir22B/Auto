import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { GDRIVE_ACTIONS } from '@/lib/gdrive/actions';
import { GMAIL_ACTIONS } from '@/lib/gmail/actions';
import { GDriveConfig } from '@/lib/gdrive/types';
import { GmailConfig } from '@/lib/gmail/types';

type NodeConfig = (GDriveConfig | GmailConfig) & { type: string };

interface FlowNodeProps {
  data: {
    config: NodeConfig;
    isConfigured: boolean;
    onDelete: (id: string) => void;
    isGmailAuthenticated?: boolean;
    onGmailAuth?: () => void;
  };
  id: string;
  isConnectable: boolean;
  selected?: boolean;
  updateNode: (id: string, config: NodeConfig) => void;
}

const NODE_TYPES = {
  gdrive: {
    name: 'Google Drive',
    icon: '/icons/gdrive.svg',
    actions: GDRIVE_ACTIONS
  },
  gmail: {
    name: 'Gmail',
    icon: '/icons/gmail.svg',
    actions: GMAIL_ACTIONS
  }
} as const;

const FlowNode = ({ id, data, isConnectable, selected, updateNode }: FlowNodeProps) => {
  const [isConfiguring, setIsConfiguring] = React.useState(false);
  const [config, setConfig] = React.useState<NodeConfig>(data.config);
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  
  const nodeType = config.type;
  const nodeData = NODE_TYPES[nodeType as keyof typeof NODE_TYPES];
  const actions = nodeData.actions;

  // Effect to watch for authentication changes
  React.useEffect(() => {
    console.log('Auth state changed in FlowNode:', {
      isAuthenticated: data.isGmailAuthenticated,
      showAuthPrompt,
      nodeId: id
    });

    // Only proceed if this is a Gmail node
    if (nodeType === 'gmail' && data.isGmailAuthenticated) {
      const pendingAction = localStorage.getItem('pending_gmail_action');
      console.log('Checking pending action:', pendingAction);
      
      if (pendingAction) {
        try {
          const { nodeId, action } = JSON.parse(pendingAction);
          console.log('Parsed pending action:', { nodeId, action, currentId: id });
          
          if (nodeId === id) {
            console.log('Moving to configuration screen for action:', action);
            localStorage.removeItem('pending_gmail_action');
            setConfig(prev => ({ ...prev, action }));
            setIsConfiguring(true);
            setShowAuthPrompt(false);
          }
        } catch (error) {
          console.error('Error parsing pending action:', error);
        }
      }
    }
  }, [data.isGmailAuthenticated, nodeType, id]);

  const handleActionSelect = async (action: string) => {
    console.log('Action selected:', action, 'Auth state:', data.isGmailAuthenticated);
    
    if (nodeType === 'gmail') {
      if (!data.isGmailAuthenticated) {
        console.log('Storing pending action:', { nodeId: id, action });
        localStorage.setItem('pending_gmail_action', JSON.stringify({
          nodeId: id,
          action: action
        }));
        
        setShowAuthPrompt(true);
        return;
      }
    }
    
    console.log('Moving directly to configuration');
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
        <img src={nodeData.icon} alt={nodeData.name} className="w-6 h-6" />
        <div>
          <div className="font-medium">{nodeData.name}</div>
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
              Authentication required to use Gmail actions
            </p>
            <Button 
              className="w-full bg-black"
              onClick={data.onGmailAuth}
            >
              Login with Gmail
            </Button>
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </Card>
    );
  }

  // Show configuration form if an action is selected and we're configuring
  if (isConfiguring && config.action) {
    const action = actions[config.action as keyof typeof actions];
    
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
                  value={config[field.name as keyof NodeConfig] || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    [field.name]: e.target.value 
                  })}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <Input
                  type={field.type}
                  value={config[field.name as keyof NodeConfig] || ''}
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
    const action = actions[config.action as keyof typeof actions];
    
    return (
      <Card className={`p-4 w-80 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        
        {renderHeader(action.name)}

        <div className="space-y-2 mb-4">
          {action.configFields.map(field => (
            <div key={field.name} className="text-sm">
              <span className="font-medium">{field.label}:</span>{' '}
              {config[field.name as keyof NodeConfig] || 'Not set'}
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