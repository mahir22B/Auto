'use client';

import FlowBuilder from '@/components/flow/FlowBuilder';
import { Button } from '@/components/ui/button';
import { Workflow } from '@/lib/gdrive/types';
import { useState, useEffect } from 'react';

export default function WorkflowPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if we have tokens in localStorage
    const tokens = localStorage.getItem('gmail_tokens');
    console.log('Initial auth check:', !!tokens); // Debug log
    setIsAuthenticated(!!tokens);

    // Set up a message listener for auth popup
    const handleAuthMessage = (event: MessageEvent) => {
      // console.log('Received message:', event.data); // Debug log
      if (event.data.type === 'gmail_auth_success') {
        // console.log('Setting authenticated to true'); // Debug log
        setIsAuthenticated(true);
      }
    };

    window.addEventListener('message', handleAuthMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  // Debug log for state changes
  useEffect(() => {
    console.log('Authentication state changed:', isAuthenticated);
  }, [isAuthenticated]);

  const handleSave = (workflow: Workflow) => {
    console.log('Saving workflow:', workflow);
  };

  const handleGmailAuth = async () => {
    try {
      const response = await fetch('/api/auth/google/connect?service=gmail');
      const data = await response.json();
      
      if (data.url) {
        // Calculate popup position for center of screen
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        // Open auth in a popup window
        window.open(
          data.url,
          'Gmail Authorization',
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
          onSave={handleSave} 
          isGmailAuthenticated={isAuthenticated}
          onGmailAuth={handleGmailAuth}
        />
      </main>
    </div>
  );
}