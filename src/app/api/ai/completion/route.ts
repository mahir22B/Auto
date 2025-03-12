// src/app/api/ai/completion/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { model, messages, temperature = 0.7, max_tokens } = await request.json();
    
    // Get API key from environment variable
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'AI service configuration error' },
        { status: 500 }
      );
    }
    
    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || '', // Required by OpenRouter
        'X-Title': 'Workflow Automation App' // Your app name
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false // Set to true for streaming responses
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      
      let errorMessage = 'Failed to get AI response';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // Use default error message if parsing fails
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}