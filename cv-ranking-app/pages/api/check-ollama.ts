import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ollamaEndpoint = process.env.MISTRAL_LOCAL_ENDPOINT || 'http://localhost:11434/api/generate';
    const baseUrl = ollamaEndpoint.replace('/api/generate', '');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });

    // Try to check if Ollama is running by hitting the /api/tags endpoint
    const fetchPromise = fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (response.ok) {
      return res.status(200).json({ 
        running: true,
        status: 'online'
      });
    } else {
      return res.status(200).json({ 
        running: false,
        status: 'offline'
      });
    }
  } catch (error: any) {
    // If fetch fails, Ollama is not running
    return res.status(200).json({ 
      running: false,
      status: 'offline',
      error: error.message
    });
  }
}
