import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const metric = await request.json();
    
    // Log metrics (in production, you'd save to database or send to analytics service)
    console.log('Web Vital Collected:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    });

    // Here you could:
    // 1. Save to database
    // 2. Send to external analytics service
    // 3. Aggregate metrics for performance monitoring
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Web Vitals API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process metric' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};