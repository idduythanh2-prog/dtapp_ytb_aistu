const { GoogleGenAI } = require("@google/genai");

function getGeminiClient(customKey) {
  const key = customKey && customKey.trim() !== '' ? customKey.trim() : null;
  if (!key) throw new Error('Vui lòng nhập Gemini API Key.');
  return new GoogleGenAI({ apiKey: key });
}

async function callOpenAICompatibleAPI(baseUrl, apiKey, model, systemPrompt, userPrompt, isJson = false) {
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const payload = { model, messages, temperature: 0.7 };
  if (isJson) payload.response_format = { type: 'json_object' };
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`AI API Error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJsonFromAi(text) {
  try {
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s !== -1 && e !== -1 && s < e) return JSON.parse(text.substring(s, e + 1));
    throw new Error('AI trả về JSON không hợp lệ.');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { filters, config, aiConfig } = req.body;
    if (!config.youtubeApiKey) return res.status(400).json({ error: 'Vui lòng cung cấp YouTube API Key.' });

    let publishedAfter = new Date();
    if (filters.timeframe === '24h') publishedAfter.setDate(publishedAfter.getDate() - 1);
    else if (filters.timeframe === '7d') publishedAfter.setDate(publishedAfter.getDate() - 7);
    else if (filters.timeframe === '30d') publishedAfter.setDate(publishedAfter.getDate() - 30);
    else if (filters.timeframe === '90d') publishedAfter.setDate(publishedAfter.getDate() - 90);

    const videoDuration = filters.videoType === 'short' ? 'short' : filters.videoType === 'long' ? 'long' : 'any';
    let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&order=viewCount&publishedAfter=${publishedAfter.toISOString()}&regionCode=US&type=video&key=${config.youtubeApiKey}`;
    if (filters.category && filters.category !== '0') searchUrl += `&videoCategoryId=${filters.category}`;
    if (filters.keyword) searchUrl += `&q=${encodeURIComponent(filters.keyword)}`;
    if (videoDuration !== 'any') searchUrl += `&videoDuration=${videoDuration}`;

    const ytRes = await fetch(searchUrl);
    const ytData = await ytRes.json();
    if (!ytRes.ok) return res.status(ytRes.status).json({ error: `YouTube API Error: ${ytData.error?.message || 'Unknown'}` });

    const items = ytData.items || [];
    if (items.length === 0) return res.json({ trends: [], summary: 'Không tìm thấy video nào phù hợp.' });

    const videoIds = items.map(i => i.id.videoId).filter(Boolean).join(',');
    let videoSnippets = [];
    if (videoIds) {
      const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${config.youtubeApiKey}`);
      const statsData = await statsRes.json();
      if (statsData.items) {
        const minViews = filters.minViews ? parseInt(filters.minViews, 10) : 0;
        videoSnippets = statsData.items
          .filter(i => parseInt(i.statistics?.viewCount || '0', 10) >= minViews)
          .map(i => ({ title: i.snippet.title, channelTitle: i.snippet.channelTitle, publishTime: i.snippet.publishedAt, viewCount: i.statistics?.viewCount || '0', likeCount: i.statistics?.likeCount || '0', commentCount: i.statistics?.commentCount || '0' }));
      }
    }
    if (videoSnippets.length === 0) return res.json({ trends: [], summary: `Không có video đạt ${filters.minViews} views.` });

    const prompt = `Phân tích các video YouTube top view sau (Region: US). Tìm XU HƯỚNG tiềm năng nhất. Loại bỏ rác, spam. Tập trung High RPM, evergreen.\n\nDữ liệu:\n${JSON.stringify(videoSnippets, null, 2)}\n\nTrả về JSON:\n{"summary":"...","trends":[{"keyword":"...","score":95,"reason":"...","examples":["..."],"suggestedPrompt":"..."}]}`;
    const systemInstruction = 'Bạn là chuyên gia phân tích YouTube. Chỉ trả về JSON hợp lệ.';

    let textResult = '';
    if (aiConfig?.provider === 'custom') {
      textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, prompt, true);
    } else {
      const client = getGeminiClient(aiConfig?.apiKey);
      const response = await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { systemInstruction: { parts: [{ text: systemInstruction }] }, responseMimeType: 'application/json', temperature: 0.2 }
      });
      textResult = response.text || '{}';
    }
    res.json(parseJsonFromAi(textResult));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
