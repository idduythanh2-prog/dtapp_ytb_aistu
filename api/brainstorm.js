const { GoogleGenAI } = require("@google/genai");

function getGeminiClient(customKey) {
  const key = customKey && customKey.trim() !== '' ? customKey.trim() : null;
  if (!key) throw new Error('Vui lòng nhập Gemini API Key.');
  return new GoogleGenAI({ apiKey: key });
}

async function callOpenAICompatibleAPI(baseUrl, apiKey, model, systemPrompt, userPrompt) {
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7 })
  });
  if (!response.ok) throw new Error(`AI API Error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { idea, aiConfig } = req.body;
    const prompt = `Người dùng có một ý tưởng video và nhạc: "${idea}". Hãy đóng vai một trợ lý sáng tạo chuyên nghiệp (Creative Assistant). Gợi ý cho họ 3 góc nhìn/phong cách sáng tạo để phát triển ý tưởng này (camera angle, ánh sáng, mood, tempo nhạc, v.v.). Trình bày 3 gợi ý dưới dạng 3 gạch đầu dòng bắt đầu bằng dấu "- ". Chỉ trả lời bằng tiếng Việt, ngắn gọn, súc tích và truyền cảm hứng. Không viết prompt ở bước này, chỉ mở rộng ý tưởng.`;
    let textResult = '';
    if (aiConfig?.provider === 'custom') {
      textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, '', prompt);
    } else {
      const client = getGeminiClient(aiConfig?.apiKey);
      const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      textResult = response.text || '';
    }
    res.json({ result: textResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
