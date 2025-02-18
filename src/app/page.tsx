'use client';

import FlowBuilder from '@/components/flow/FlowBuilder';
// import { Workflow } from '@/lib/gdrive/types';
import { useState, useEffect } from 'react';
import { SERVICES } from '@/lib/services';

interface AuthState {
  [service: string]: {
    isAuthenticated: boolean;
    tokens?: any;
  }
}

export default function WorkflowPage() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize auth state for all services
    return Object.keys(SERVICES).reduce((acc, service) => ({
      ...acc,
      [service]: { isAuthenticated: false }
    }), {});
  });

  useEffect(() => {
    // Check localStorage for tokens for each service
    Object.keys(SERVICES).forEach(service => {
      const tokens = localStorage.getItem(`${service}_tokens`);
      if (tokens) {
        setAuthState(prev => ({
          ...prev,
          [service]: { 
            isAuthenticated: true,
            tokens: JSON.parse(tokens)
          }
        }));
      }
    });

    // Set up message listener for auth popup
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data.type?.endsWith('_auth_success')) {
        const service = event.data.type.split('_')[0];
        setAuthState(prev => ({
          ...prev,
          [service]: {
            isAuthenticated: true,
            tokens: event.data.tokens
          }
        }));
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleAuth = async (service: string) => {
    try {
      const response = await fetch(`/api/auth/${service}/connect`);
      const data = await response.json();
      
      if (data.url) {
        // Calculate popup position
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        window.open(
          data.url,
          `${service.charAt(0).toUpperCase() + service.slice(1)} Authorization`,
          `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0,scrollbars=1,resizable=1`
        );
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <main className="flex-1">
        <FlowBuilder 
          onSave={console.log} 
          authState={authState}
          onAuth={handleAuth}
        />
      </main>
    </div>
  );
}