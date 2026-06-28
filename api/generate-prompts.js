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
    const { idea, settings, aiConfig } = req.body;
    const loopConstraint = settings?.isLoop ? `\n\n[CRITICAL REQUIREMENT: SEAMLESS LOOP]\nVideo BẮT BUỘC phải là một vòng lặp hoàn hảo (seamless loop). Khung hình đầu tiên và cuối cùng phải khớp nhau chính xác 100%. Bắt buộc thêm các từ khóa: "seamless loop, perfect loop, identical start and end frames, cinemagraph, continuous smooth motion". Giữ chuyển động camera ở mức tĩnh (Static) hoặc cực kỳ tinh tế để tránh phá vỡ vòng lặp.` : '';
    const noFaceConstraint = settings?.avoidFaces ? `\n\n[CRITICAL REQUIREMENT: NO HUMAN FACES / ANONYMOUS]\nTuyệt đối không được mô tả chi tiết khuôn mặt người. Nhân vật phải được quay từ phía sau, đội mũ bảo hiểm/mặt nạ, hoặc khuôn mặt bị che khuất. Thêm "shot from behind, wearing mask, faceless, obscured face, anonymous". Thêm "face, facial features, portrait, smiling, eyes, human face" vào Negative Prompt.` : '';
    const multiShotConstraint = settings?.multiShot ? `\n\n[CRITICAL REQUIREMENT: STORYBOARD / MULTI-SHOT]\nTạo kịch bản 3-4 cảnh quay nối tiếp nhau. Trả về mảng chuỗi tiếng Anh trong trường "shotPrompts".` : '';
    const sfxConstraint = settings?.generateSFX ? `\n\n[CRITICAL REQUIREMENT: SOUND EFFECTS]\nTạo 3-5 prompt âm thanh chi tiết bằng tiếng Anh, trả về mảng chuỗi trong trường "sfxPrompts".` : '';
    const platformConstraint = settings?.platformTarget ? `\n\n[PLATFORM TARGET: ${settings.platformTarget}]` : '';
    const seoConstraint = settings?.generateSEO ? `\n\n[CRITICAL REQUIREMENT: YOUTUBE 2026 SEO & METADATA]\nTạo: youtubeTitle, youtubeDescription (có Timestamps), youtubeTags (mảng), aiDisclaimer, thumbnailIdeas (mảng object gồm ideaVi và exactPromptEn).` : '';
    const voiceoverConstraint = settings?.generateVoiceover ? `\n\n[CRITICAL REQUIREMENT: VOICEOVER SCRIPT]\nViết lời bình ngắn gọn tiếng Việt. Trả về chuỗi trong trường "voiceoverScript".` : '';

    const systemInstruction = `Bạn là một Đạo diễn Nghệ thuật và Kỹ sư Prompt cấp cao cho AI Video (Google Veo) và AI Nhạc (Flowmusic, Suno).\n\nTham số:\nÝ tưởng: "${idea}"\nNền tảng: ${settings?.platformTarget || 'Tự do'}\nStorytelling: ${settings?.storyTelling || 'Balanced'}\nVideo Style: ${settings?.videoStyle || 'Cinematic'}\nVideo Camera: ${settings?.videoCamera || 'Cinematic Tracking'}\nVideo Lighting: ${settings?.videoLighting || 'Dramatic'}\nAspect Ratio: ${settings?.videoAspectRatio || '16:9'}\nMusic Genre: ${settings?.musicGenre || 'Cinematic Orchestral'}\nMusic Mood: ${settings?.musicMood || 'Epic'}\nMusic Tempo: ${settings?.musicTempo || 'Medium'}\nMusic Vocals: ${settings?.musicVocals || 'Instrumental'}${platformConstraint}${seoConstraint}${voiceoverConstraint}${loopConstraint}${noFaceConstraint}${multiShotConstraint}${sfxConstraint}\n\nTRẢ VỀ JSON DUY NHẤT. KHÔNG BỌC TRONG MARKDOWN. KHÔNG CÓ TEXT GIẢI THÍCH:\n{"videoPrompt":"...","videoPromptVi":"...","negativeVideoPrompt":"...","musicPrompt":"...","musicPromptVi":"..."${settings?.multiShot ? ',"shotPrompts":["..."]' : ''}${settings?.generateSFX ? ',"sfxPrompts":["..."]' : ''}${settings?.generateSEO ? ',"youtubeTitle":"...","youtubeDescription":"...","youtubeTags":["..."],"thumbnailIdeas":[{"ideaVi":"...","exactPromptEn":"..."}],"aiDisclaimer":"..."' : ''}${settings?.generateVoiceover ? ',"voiceoverScript":"..."' : ''}}`;

    let textResult = '';
    if (aiConfig?.provider === 'custom') {
      textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, idea, true);
    } else {
      const client = getGeminiClient(aiConfig?.apiKey);
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: idea,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              videoPrompt: { type: 'STRING' }, videoPromptVi: { type: 'STRING' },
              negativeVideoPrompt: { type: 'STRING' }, musicPrompt: { type: 'STRING' },
              musicPromptVi: { type: 'STRING' }, shotPrompts: { type: 'ARRAY', items: { type: 'STRING' } },
              sfxPrompts: { type: 'ARRAY', items: { type: 'STRING' } },
              youtubeTitle: { type: 'STRING' }, youtubeDescription: { type: 'STRING' },
              youtubeTags: { type: 'ARRAY', items: { type: 'STRING' } },
              thumbnailIdeas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ideaVi: { type: 'STRING' }, exactPromptEn: { type: 'STRING' } }, required: ['ideaVi', 'exactPromptEn'] } },
              aiDisclaimer: { type: 'STRING' }, voiceoverScript: { type: 'STRING' }
            },
            required: ['videoPrompt', 'videoPromptVi', 'negativeVideoPrompt', 'musicPrompt', 'musicPromptVi']
          }
        }
      });
      textResult = response.text || '{}';
    }
    res.json(parseJsonFromAi(textResult));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
