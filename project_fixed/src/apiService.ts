import { AIProviderSettings, PromptSettings, TrendFilters } from './types';

// ==========================================
// HELPERS
// ==========================================

function getGeminiKey(aiConfig: AIProviderSettings): string {
  return aiConfig.apiKey?.trim() || '';
}

async function callGemini(apiKey: string, model: string, contents: any, config?: any): Promise<string> {
  if (!apiKey) throw new Error('Vui lòng nhập Gemini API Key vào ô "Nguồn AI" bên dưới.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: any = { contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }] };
  if (config) body.generationConfig = config;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini API lỗi: ${data.error?.message || JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AI API lỗi (${res.status}): ${data.error?.message || JSON.stringify(data)}`);
  return data.choices[0].message.content;
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s !== -1 && e !== -1) return JSON.parse(text.substring(s, e + 1));
    throw new Error('AI trả về dữ liệu không hợp lệ.');
  }
}

// ==========================================
// API: BRAINSTORM
// ==========================================
export async function apiBrainstorm(idea: string, aiConfig: AIProviderSettings): Promise<string> {
  const prompt = `Người dùng có một ý tưởng video và nhạc: "${idea}". Hãy đóng vai một trợ lý sáng tạo chuyên nghiệp (Creative Assistant). Gợi ý cho họ 3 góc nhìn/phong cách sáng tạo để phát triển ý tưởng này (camera angle, ánh sáng, mood, tempo nhạc, v.v.). Trình bày 3 gợi ý dưới dạng 3 gạch đầu dòng bắt đầu bằng dấu "- ". Chỉ trả lời bằng tiếng Việt, ngắn gọn, súc tích và truyền cảm hứng. Không viết prompt ở bước này, chỉ mở rộng ý tưởng.`;

  if (aiConfig.provider === 'custom') {
    return callOpenAICompatible(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, '', prompt);
  }
  return callGemini(getGeminiKey(aiConfig), 'gemini-2.0-flash', prompt);
}

// ==========================================
// API: GENERATE PROMPTS
// ==========================================
export async function apiGeneratePrompts(idea: string, settings: PromptSettings, aiConfig: AIProviderSettings): Promise<any> {
  const loopConstraint = settings?.isLoop ? `\n\n[CRITICAL REQUIREMENT: SEAMLESS LOOP]\nVideo BẮT BUỘC phải là một vòng lặp hoàn hảo (seamless loop). Khung hình đầu tiên và cuối cùng phải khớp nhau chính xác 100%. Bắt buộc thêm các từ khóa: "seamless loop, perfect loop, identical start and end frames, cinemagraph, continuous smooth motion". Giữ chuyển động camera ở mức tĩnh (Static) hoặc cực kỳ tinh tế để tránh phá vỡ vòng lặp.` : '';
  const noFaceConstraint = settings?.avoidFaces ? `\n\n[CRITICAL REQUIREMENT: NO HUMAN FACES / ANONYMOUS]\nTuyệt đối không được mô tả chi tiết khuôn mặt người. Nhân vật phải được quay từ phía sau, đội mũ bảo hiểm/mặt nạ, hoặc khuôn mặt bị che khuất. Thêm các từ khóa như "shot from behind, wearing mask, faceless, obscured face, anonymous". Thêm "face, facial features, portrait, smiling, eyes, human face" vào Negative Prompt.` : '';
  const multiShotConstraint = settings?.multiShot ? `\n\n[CRITICAL REQUIREMENT: STORYBOARD / MULTI-SHOT]\nTạo kịch bản 3-4 cảnh quay nối tiếp nhau. Trả về mảng chuỗi tiếng Anh trong trường "shotPrompts".` : '';
  const sfxConstraint = settings?.generateSFX ? `\n\n[CRITICAL REQUIREMENT: SOUND EFFECTS]\nTạo ra 3-5 prompt âm thanh chi tiết bằng tiếng Anh, trả về mảng chuỗi trong trường "sfxPrompts".` : '';
  const seoConstraint = settings?.generateSEO ? `\n\n[CRITICAL REQUIREMENT: YOUTUBE SEO & METADATA]\nTạo: youtubeTitle, youtubeDescription (có Timestamps), youtubeTags (mảng), aiDisclaimer, thumbnailIdeas (mảng object gồm ideaVi và exactPromptEn).` : '';
  const voiceoverConstraint = settings?.generateVoiceover ? `\n\n[CRITICAL REQUIREMENT: VOICEOVER SCRIPT]\nViết lời bình ngắn gọn, cảm xúc tiếng Việt. Trả về chuỗi trong trường "voiceoverScript".` : '';

  const systemInstruction = `Bạn là Đạo diễn Nghệ thuật và Kỹ sư Prompt cấp cao cho AI Video (Google Veo) và AI Nhạc (Flowmusic/Suno).

Tham số đầu vào:
Ý tưởng: "${idea}"
Nền tảng: ${settings?.platformTarget || 'Tự do'}
Storytelling: ${settings?.storyTelling || 'Balanced'}
Video Style: ${settings?.videoStyle || 'Cinematic'}
Video Camera: ${settings?.videoCamera || 'Cinematic Tracking'}
Video Lighting: ${settings?.videoLighting || 'Dramatic'}
Aspect Ratio: ${settings?.videoAspectRatio || '16:9'}
Music Genre: ${settings?.musicGenre || 'Cinematic Orchestral'}
Music Mood: ${settings?.musicMood || 'Epic'}
Music Tempo: ${settings?.musicTempo || 'Medium'}
Music Vocals: ${settings?.musicVocals || 'Instrumental'}
${seoConstraint}${voiceoverConstraint}${loopConstraint}${noFaceConstraint}${multiShotConstraint}${sfxConstraint}

TRẢ VỀ JSON HỢP LỆ DUY NHẤT, KHÔNG BỌC TRONG MARKDOWN. Cấu trúc:
{
  "videoPrompt": "...",
  "videoPromptVi": "...",
  "negativeVideoPrompt": "...",
  "musicPrompt": "...",
  "musicPromptVi": "..."${settings?.multiShot ? ',\n  "shotPrompts": ["...", "..."]' : ''}${settings?.generateSFX ? ',\n  "sfxPrompts": ["...", "..."]' : ''}${settings?.generateSEO ? ',\n  "youtubeTitle": "...",\n  "youtubeDescription": "...",\n  "youtubeTags": ["...", "..."],\n  "thumbnailIdeas": [{"ideaVi": "...", "exactPromptEn": "..."}],\n  "aiDisclaimer": "..."' : ''}${settings?.generateVoiceover ? ',\n  "voiceoverScript": "..."' : ''}
}`;

  let text = '';
  if (aiConfig.provider === 'custom') {
    text = await callOpenAICompatible(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, idea);
  } else {
    text = await callGemini(
      getGeminiKey(aiConfig),
      'gemini-2.0-flash',
      [{ parts: [{ text: idea }] }],
      { responseMimeType: 'application/json' }
    );
    // If responseMimeType not supported, fallback to regular call with system in prompt
    if (!text || text.trim() === '') {
      text = await callGemini(getGeminiKey(aiConfig), 'gemini-2.0-flash', systemInstruction + '\n\nÝ tưởng: ' + idea);
    }
  }
  return parseJson(text);
}

// ==========================================
// API: ANALYZE TRENDS
// ==========================================
export async function apiAnalyzeTrends(filters: TrendFilters, youtubeApiKey: string, aiConfig: AIProviderSettings): Promise<any> {
  if (!youtubeApiKey) throw new Error('Vui lòng cung cấp YouTube API Key.');

  let publishedAfter = new Date();
  if (filters.timeframe === '24h') publishedAfter.setDate(publishedAfter.getDate() - 1);
  else if (filters.timeframe === '7d') publishedAfter.setDate(publishedAfter.getDate() - 7);
  else if (filters.timeframe === '30d') publishedAfter.setDate(publishedAfter.getDate() - 30);
  else if (filters.timeframe === '90d') publishedAfter.setDate(publishedAfter.getDate() - 90);

  const videoDuration = filters.videoType === 'short' ? 'short' : filters.videoType === 'long' ? 'long' : 'any';
  let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&order=viewCount&publishedAfter=${publishedAfter.toISOString()}&regionCode=US&type=video&key=${youtubeApiKey}`;
  if (filters.category && filters.category !== '0') searchUrl += `&videoCategoryId=${filters.category}`;
  if (filters.keyword) searchUrl += `&q=${encodeURIComponent(filters.keyword)}`;
  if (videoDuration !== 'any') searchUrl += `&videoDuration=${videoDuration}`;

  const ytRes = await fetch(searchUrl);
  const ytData = await ytRes.json();
  if (!ytRes.ok) throw new Error(`YouTube API lỗi: ${ytData.error?.message || 'Unknown'}`);

  const items = ytData.items || [];
  if (items.length === 0) return { trends: [], summary: 'Không tìm thấy video phù hợp.' };

  const videoIds = items.map((i: any) => i.id.videoId).filter(Boolean).join(',');
  let videoSnippets: any[] = [];
  if (videoIds) {
    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${youtubeApiKey}`);
    const statsData = await statsRes.json();
    if (statsData.items) {
      const minViews = filters.minViews ? parseInt(filters.minViews, 10) : 0;
      videoSnippets = statsData.items
        .filter((i: any) => parseInt(i.statistics?.viewCount || '0', 10) >= minViews)
        .map((i: any) => ({
          title: i.snippet.title,
          channelTitle: i.snippet.channelTitle,
          publishTime: i.snippet.publishedAt,
          viewCount: i.statistics?.viewCount || '0',
          likeCount: i.statistics?.likeCount || '0',
        }));
    }
  }
  if (videoSnippets.length === 0) return { trends: [], summary: `Không có video đạt ${filters.minViews} views.` };

  const prompt = `Phân tích các video YouTube top view sau và tìm xu hướng tiềm năng nhất. Loại bỏ nội dung rác, spam. Tập trung nội dung High RPM, evergreen.

Dữ liệu:
${JSON.stringify(videoSnippets, null, 2)}

Trả về JSON hợp lệ:
{
  "summary": "Đánh giá tổng quan...",
  "trends": [
    { "keyword": "...", "score": 95, "reason": "...", "examples": ["..."], "suggestedPrompt": "..." }
  ]
}`;

  let text = '';
  if (aiConfig.provider === 'custom') {
    text = await callOpenAICompatible(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, 'Bạn là chuyên gia phân tích YouTube. Chỉ trả về JSON hợp lệ.', prompt);
  } else {
    text = await callGemini(getGeminiKey(aiConfig), 'gemini-2.0-flash', prompt, { responseMimeType: 'application/json' });
  }
  return parseJson(text);
}

// ==========================================
// API: ANALYZE VIDEO
// ==========================================
export async function apiAnalyzeVideo(url: string, youtubeApiKey: string, aiConfig: AIProviderSettings): Promise<any> {
  if (!youtubeApiKey) throw new Error('Vui lòng cung cấp YouTube API Key.');
  if (!url) throw new Error('URL không được để trống.');

  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  const videoId = match ? match[1] : null;
  if (!videoId) throw new Error('Không thể nhận diện Video ID từ đường dẫn này.');

  const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${youtubeApiKey}`);
  const ytData = await ytRes.json();
  if (!ytRes.ok) throw new Error(`YouTube API lỗi: ${ytData.error?.message || 'Unknown'}`);
  if (!ytData.items?.length) throw new Error('Không tìm thấy video hoặc video ở chế độ riêng tư.');

  const { snippet, statistics } = ytData.items[0];
  const prompt = `Phân tích video YouTube sau để tối ưu "cày view":
Tiêu đề: ${snippet.title}
Mô tả: ${(snippet.description || '').substring(0, 1000)}
Tags: ${snippet.tags?.join(', ') || 'Không có'}
View: ${statistics.viewCount || '0'} | Like: ${statistics.likeCount || '0'}

Yêu cầu:
1. Tạo 5 tiêu đề mới click-bait cao hơn (CTR cao, gợi tò mò mạnh).
2. Tạo 3 đoạn Hook (3-5 giây đầu) để giữ chân người xem.
3. Đánh giá chiến lược SEO và gợi ý keyword ngách tốt hơn.

Trả về JSON hợp lệ:
{
  "suggestedTitles": ["..."],
  "hooks": [{ "type": "...", "script": "...", "reason": "..." }],
  "seoStrategy": "..."
}`;

  let text = '';
  if (aiConfig.provider === 'custom') {
    text = await callOpenAICompatible(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, 'Bạn là chuyên gia marketing YouTube. Chỉ trả về JSON hợp lệ.', prompt);
  } else {
    text = await callGemini(getGeminiKey(aiConfig), 'gemini-2.0-flash', prompt, { responseMimeType: 'application/json' });
  }
  const parsed = parseJson(text);
  parsed.originalStats = { title: snippet.title, views: statistics.viewCount || '0', likes: statistics.likeCount || '0', tags: snippet.tags || [] };
  return parsed;
}
