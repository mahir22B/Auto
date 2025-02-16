'use client';

import FlowBuilder from '@/components/flow/FlowBuilder';
import { Workflow } from '@/lib/gdrive/types';

export default function WorkflowPage() {
  const handleSave = (workflow: Workflow) => {
    // Here you would typically save the workflow to your backend
    console.log('Saving workflow:', workflow);
  };

    // const handleAuth = async () => {
    //   try {
    //     // Call our connect endpoint
    //     const response = await fetch('/api/auth/gmail/connect');
    //     const data = await response.json();
        
    //     if (data.url) {
    //       // Redirect to Google's auth page
    //       window.location.href = data.url;
    //     } else {
    //       console.error('Failed to get auth URL');
    //     }
    //   } catch (error) {
    //     console.error('Auth error:', error);
    //   }
    // };

  return (
    <div className="h-screen flex flex-col">
      
      <main className="flex-1">
        <FlowBuilder onSave={handleSave} />
        
      </main>
    </div>
  );
}