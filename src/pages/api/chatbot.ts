import type { APIRoute } from 'astro';

// Ensure this endpoint runs on the server
export const prerender = false;

// Simple in-memory rate limiting (resets on server restart)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

function getRateLimitKey(request: Request): string {
  // Use IP address if available, otherwise use a generic key
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (record.count >= RATE_LIMIT) {
    return true;
  }
  
  record.count++;
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please wait a moment before trying again.',
        retryAfter: 60
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }

    const { message, articleTitle, articleContent } = await request.json();

    // Validate input with additional security checks
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Message is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Additional input validation
    if (message.length > 500) {
      return new Response(JSON.stringify({ 
        error: 'Message too long. Please keep it under 500 characters.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sanitize inputs
    const sanitizedMessage = message.trim().slice(0, 500);
    const sanitizedTitle = articleTitle ? String(articleTitle).slice(0, 200) : '';
    const sanitizedContent = articleContent ? String(articleContent).slice(0, 3000) : '';

    let response;

    try {
      response = await callHostedLLM(sanitizedMessage, sanitizedTitle, sanitizedContent);
    } catch (error) {
      console.error('Hosted LLM error:', error);
      response = await getFallbackResponse(sanitizedMessage, sanitizedTitle, sanitizedContent);
    }

    return new Response(JSON.stringify({ 
      response,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      fallback: 'I apologize, but I\'m experiencing some technical difficulties. Please try again later or refer to the article content directly.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function callHostedLLM(message: string, articleTitle: string, articleContent: string) {
  const prompt = `You are a helpful assistant for the blog article "${articleTitle}". Your role is to help readers understand the article content better by answering questions, explaining concepts, and providing clarifications.

Article content context:
${articleContent ? articleContent.substring(0, 3000) : 'No content provided'}

Guidelines:
- Be concise but informative
- Reference specific parts of the article when relevant
- If asked about topics not in the article, politely redirect to the article content
- Use a friendly, helpful tone
- Provide practical examples when possible

User question: ${message}

Assistant:`;

  const response = await fetch('http://54.38.65.238:1234/api/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic YXBpdXNlcjpteWFwaWtleW15YXBpa2V5bXlhcGlrZXlteWFwaWtleW15YXBpa2V5bXlhcGlrZXlteWFwaWtleW15YXBpa2V5bXlhcGlrZXlteWFwaWtleW15YXBpa2V5bXlhcGlrZXlteWFwaWtleW15YXBpa2V5bXlhcGlrZXk=',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-coder:6.7b-instruct',
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hosted LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || 'I apologize, but I couldn\'t generate a response. Please try rephrasing your question.';
}

// Enhanced fallback responses when no API keys are available
async function getFallbackResponse(message: string, articleTitle: string, articleContent: string) {
  const lowerMessage = message.toLowerCase();
  const lowerContent = articleContent ? articleContent.toLowerCase() : '';
  
  // Enhanced pattern matching for better responses
  if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
    if (lowerContent.includes('python')) {
      return `This article "${articleTitle}" focuses on Python programming concepts. It covers practical implementations and best practices. The key points include the main Python features discussed, their practical applications, and actionable insights you can apply in your own projects.`;
    } else if (lowerContent.includes('django')) {
      return `This article about "${articleTitle}" covers Django framework concepts including models, views, and implementation patterns. It provides practical examples you can use in your Django projects.`;
    } else if (lowerContent.includes('algorithm')) {
      return `This article "${articleTitle}" explains algorithmic concepts with practical examples. It breaks down complex algorithms into understandable steps and shows real-world applications.`;
    }
    return `This article "${articleTitle}" covers important concepts with practical examples and actionable insights. It's structured to help you understand the topic and apply the knowledge effectively.`;
  }
  
  if (lowerMessage.includes('explain') && lowerMessage.includes('code')) {
    return `The code examples in "${articleTitle}" demonstrate practical implementations. Each code snippet is designed to illustrate specific concepts. I recommend reading through the code comments and trying to run the examples yourself to better understand how they work.`;
  }
  
  if (lowerMessage.includes('beginner') || lowerMessage.includes('start')) {
    return `Great question! "${articleTitle}" is structured to help beginners understand the concepts. Start by reading through the introduction, then work through each example step by step. Don't worry if everything doesn't click immediately - practice is key!`;
  }
  
  if (lowerMessage.includes('example') || lowerMessage.includes('demo')) {
    return `The article "${articleTitle}" includes several practical examples that demonstrate the concepts in action. These examples are designed to be clear and actionable. Try implementing them in your own environment to get hands-on experience.`;
  }
  
  // Generic helpful response
  return `I'd be happy to help you understand "${articleTitle}" better! While I don't have access to advanced AI right now, the article contains detailed explanations and examples. Could you point to a specific section or concept you'd like me to help clarify?`;
}