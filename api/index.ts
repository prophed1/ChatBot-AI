import express from 'express';

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/api/models', async (req, res) => {
  try {
    const apiKey = process.env.PAXSENIX_API_KEY;
    if (!apiKey) return res.json({ data: [] });
    const apiUrl = process.env.PAXSENIX_API_URL || 'https://api.paxsenix.biz.id/v1/chat/completions';
    const baseUrl = apiUrl.replace(/\/chat\/completions\/?$/, '/models');
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.PAXSENIX_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PAXSENIX_API_KEY environment variable is not set. Please add it to the settings.' });
    }

    const { messages } = req.body;
    let apiUrl = process.env.PAXSENIX_API_URL || 'https://api.paxsenix.biz.id/v1/chat/completions';
    
    if (!apiUrl.includes('/v1/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
    }

    let modelId = 'claude-sonnet-4-5';
    if (req.body.model) {
      modelId = req.body.model;
    }
    
    const payload = {
      model: modelId,
      messages,
      stream: true,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API Error: ${response.status} ${errorText}` });
    }

    const upstreamContentType = response.headers.get('content-type') || '';
    if (upstreamContentType.includes('application/json')) {
      const data = await response.json();
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let content = '';
      if (data.choices && data.choices[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (data.content && data.content[0]?.text) {
        content = data.content[0].text;
      } else {
        content = JSON.stringify(data);
      }
      
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.status(500).json({ error: 'No response body stream provided by API.' });
    }

  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while processing chat stream.' });
  }
});

export default app;
