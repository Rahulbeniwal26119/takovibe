export async function GET() {
  try {
    // For now, return static AI news data
    // In production, this would fetch from your AI news collection or external API
    const aiNews = [
      {
        id: 'openai-gpt4-turbo-vision',
        title: 'OpenAI Releases GPT-4 Turbo with Enhanced Vision',
        summary: 'Latest model shows improved multimodal capabilities and reduced pricing for developers worldwide.',
        publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        author: 'AI News Team',
        source: 'OpenAI',
        sourceUrl: 'https://openai.com/blog/gpt-4-turbo',
        category: 'llms',
        tags: ['GPT-4', 'OpenAI', 'Multimodal', 'Vision'],
        breaking: true,
        trending: true,
        featured: true,
        readingTime: '3 min read',
        slug: 'openai-gpt4-turbo-vision'
      },
      {
        id: 'google-gemini-ultra-2',
        title: 'Google\'s Gemini Ultra 2.0 Advances Multimodal AI',
        summary: 'New benchmark results show competitive performance across multiple tasks and domains.',
        publishedAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        author: 'AI News Team',
        source: 'Google DeepMind',
        sourceUrl: 'https://deepmind.google/technologies/gemini/',
        category: 'research',
        tags: ['Gemini', 'Google', 'Multimodal', 'Research'],
        featured: true,
        trending: false,
        breaking: false,
        readingTime: '4 min read',
        slug: 'google-gemini-ultra-2'
      },
      {
        id: 'meta-code-llama-3',
        title: 'Meta\'s Code Llama 3 Transforms Programming',
        summary: 'Advanced code generation capabilities designed specifically for software developers.',
        publishedAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
        author: 'AI News Team',
        source: 'Meta AI',
        sourceUrl: 'https://ai.meta.com/blog/code-llama-large-language-model-coding/',
        category: 'releases',
        tags: ['Code Llama', 'Meta', 'Programming', 'Development'],
        trending: true,
        featured: false,
        breaking: false,
        readingTime: '5 min read',
        slug: 'meta-code-llama-3'
      },
      {
        id: 'ai-startup-funding-q4',
        title: 'AI Startup Funding Reaches Record $50B in Q4',
        summary: 'Investment in AI companies continues to surge with record-breaking funding rounds across all sectors.',
        publishedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        author: 'AI News Team',
        source: 'TechCrunch',
        sourceUrl: 'https://techcrunch.com/ai/',
        category: 'funding',
        tags: ['Funding', 'Startups', 'Investment', 'AI'],
        trending: false,
        featured: false,
        breaking: false,
        readingTime: '3 min read',
        slug: 'ai-startup-funding-q4'
      },
      {
        id: 'anthropic-claude-3-enterprise',
        title: 'Anthropic Launches Claude 3 for Enterprise',
        summary: 'Enhanced safety features and enterprise-grade security for business applications.',
        publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        author: 'AI News Team',
        source: 'Anthropic',
        sourceUrl: 'https://www.anthropic.com/',
        category: 'enterprise',
        tags: ['Claude', 'Anthropic', 'Enterprise', 'Safety'],
        trending: false,
        featured: true,
        breaking: false,
        readingTime: '4 min read',
        slug: 'anthropic-claude-3-enterprise'
      },
      {
        id: 'ai-regulation-eu-act',
        title: 'EU AI Act Implementation Guidelines Released',
        summary: 'Comprehensive framework for AI governance and compliance requirements for businesses.',
        publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        author: 'AI News Team',
        source: 'European Commission',
        sourceUrl: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
        category: 'regulation',
        tags: ['EU', 'Regulation', 'Policy', 'Compliance'],
        trending: false,
        featured: false,
        breaking: false,
        readingTime: '6 min read',
        slug: 'ai-regulation-eu-act'
      }
    ];

    return new Response(JSON.stringify(aiNews), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error fetching AI news:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to fetch AI news' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}