'use client';

import FlowBuilder from '@/components/flow/FlowBuilder';
import { Button } from '@/components/ui/button';
import { Workflow } from '@/lib/gdrive/types';

export default function WorkflowPage() {
  const handleSave = (workflow: Workflow) => {
    // Here you would typically save the workflow to your backend
    console.log('Saving workflow:', workflow);
  };

  // const handleGmailAuth = async () => {
  //   try {
  //     const response = await fetch('/api/auth/google/connect?service=gmail');
  //     const data = await response.json();
  //     if (data.url) {
  //       window.location.href = data.url;
  //     }
  //   } catch (error) {
  //     console.error('Auth error:', error);
  //   }
  // };

  // const handleDriveAuth = async () => {
  //   try {
  //     const response = await fetch('/api/auth/google/connect?service=drive');
  //     const data = await response.json();
  //     if (data.url) {
  //       window.location.href = data.url;
  //     }
  //   } catch (error) {
  //     console.error('Auth error:', error);
  //   }
  // };

  return (
    <div className="h-screen flex flex-col">
      
      <main className="flex-1">
        <FlowBuilder onSave={handleSave} />

        {/* <Button onClick={handleGmailAuth}>Login with Gmail</Button>
        <Button onClick={handleDriveAuth}>Login with Drive</Button>
         */}
      </main>
    </div>
  );
}