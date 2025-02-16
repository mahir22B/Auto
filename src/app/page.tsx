'use client';

import FlowBuilder from '@/components/flow/FlowBuilder';
import { Workflow } from '@/lib/gdrive/types';

export default function WorkflowPage() {
  const handleSave = (workflow: Workflow) => {
    // Here you would typically save the workflow to your backend
    console.log('Saving workflow:', workflow);
  };

  return (
    <div className="h-screen flex flex-col">
      
      <main className="flex-1">
        <FlowBuilder onSave={handleSave} />
      </main>
    </div>
  );
}