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
    const { url, config, aiConfig } = req.body;
    if (!config.youtubeApiKey) return res.status(400).json({ error: 'Vui lòng cung cấp YouTube API Key.' });
    if (!url) return res.status(400).json({ error: 'URL không được để trống.' });

    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
    const videoId = match ? match[1] : null;
    if (!videoId) return res.status(400).json({ error: 'Không thể nhận diện Video ID.' });

    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${config.youtubeApiKey}`);
    const ytData = await ytRes.json();
    if (!ytRes.ok) return res.status(ytRes.status).json({ error: `YouTube API Error: ${ytData.error?.message}` });
    if (!ytData.items?.length) return res.status(404).json({ error: 'Không tìm thấy video hoặc video riêng tư.' });

    const { snippet, statistics } = ytData.items[0];
    const prompt = `Phân tích video YouTube sau để tối ưu "cày view":\nTiêu đề: ${snippet.title}\nMô tả: ${(snippet.description || '').substring(0, 1000)}\nTags: ${snippet.tags?.join(', ') || 'Không có'}\nView: ${statistics.viewCount || '0'} | Like: ${statistics.likeCount || '0'}\n\nYêu cầu:\n1. Tạo 5 tiêu đề click-bait cao (CTR cao, gợi tò mò mạnh).\n2. Tạo 3 đoạn Hook (3-5 giây đầu) để giữ chân người xem.\n3. Đánh giá chiến lược SEO và gợi ý keyword ngách tốt hơn.\n\nTrả về JSON:\n{"suggestedTitles":["..."],"hooks":[{"type":"...","script":"...","reason":"..."}],"seoStrategy":"..."}`;
    const systemInstruction = 'Bạn là chuyên gia marketing YouTube. Chỉ trả về JSON hợp lệ.';

    let textResult = '';
    if (aiConfig?.provider === 'custom') {
      textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, prompt, true);
    } else {
      const client = getGeminiClient(aiConfig?.apiKey);
      const response = await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { systemInstruction: { parts: [{ text: systemInstruction }] }, responseMimeType: 'application/json', temperature: 0.7 }
      });
      textResult = response.text || '{}';
    }
    const parsed = parseJsonFromAi(textResult);
    parsed.originalStats = { title: snippet.title, views: statistics.viewCount || '0', likes: statistics.likeCount || '0', tags: snippet.tags || [] };
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
