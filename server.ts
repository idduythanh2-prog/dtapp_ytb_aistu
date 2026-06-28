import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const defaultAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function getGeminiClient(customKey?: string) {
  if (customKey && customKey.trim() !== '') {
    return new GoogleGenAI({ 
      apiKey: customKey.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return defaultAi;
}

// Generic helper to call OpenAI-compatible APIs (like Fireworks.ai, GLM via custom endpoints, etc.)
async function callOpenAICompatibleAPI(baseUrl: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string, isJson: boolean = false) {
  const messages = systemPrompt 
    ? [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ]
    : [ { role: 'user', content: userPrompt } ];
    
  const payload: any = {
    model: model,
    messages: messages,
    temperature: 0.7
  };

  if (isJson) {
    // Attempt to use JSON mode. If an endpoint doesn't support it, it might fail,
    // but most modern OpenAI-compatible endpoints support this.
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJsonFromAi(text: string) {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && start < end) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e) {
        throw new Error('AI trả về JSON không hợp lệ.');
      }
    }
    throw new Error('Phản hồi AI không chứa JSON.');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Brainstorming
  app.post("/api/brainstorm", async (req, res) => {
    try {
      const { idea, aiConfig } = req.body;
      const prompt = `Người dùng có một ý tưởng video và nhạc: "${idea}". Hãy đóng vai một trợ lý sáng tạo chuyên nghiệp (Creative Assistant). Gợi ý cho họ 3 góc nhìn/phong cách sáng tạo để phát triển ý tưởng này (camera angle, ánh sáng, mood, tempo nhạc, v.v.). Trình bày 3 gợi ý dưới dạng 3 gạch đầu dòng bắt đầu bằng dấu "- ". Chỉ trả lời bằng tiếng Việt, ngắn gọn, súc tích và truyền cảm hứng. Không viết prompt ở bước này, chỉ mở rộng ý tưởng.`;
      
      let textResult = "";
      if (aiConfig?.provider === 'custom') {
        textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, "", prompt);
      } else {
        const client = getGeminiClient(aiConfig?.apiKey);
        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        textResult = response.text || "";
      }
      
      res.json({ result: textResult });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Generate Prompts
  app.post("/api/generate-prompts", async (req, res) => {
    try {
      const { idea, settings, aiConfig } = req.body;
      
      const loopConstraint = settings?.isLoop ? `\n\n[CRITICAL REQUIREMENT: SEAMLESS LOOP]\nVideo BẮT BUỘC phải là một vòng lặp hoàn hảo (seamless loop). Khung hình đầu tiên và cuối cùng phải khớp nhau chính xác 100%. Bắt buộc thêm các từ khóa: "seamless loop, perfect loop, identical start and end frames, cinemagraph, continuous smooth motion". Giữ chuyển động camera ở mức tĩnh (Static) hoặc cực kỳ tinh tế để tránh phá vỡ vòng lặp.` : '';
      const noFaceConstraint = settings?.avoidFaces ? `\n\n[CRITICAL REQUIREMENT: NO HUMAN FACES / ANONYMOUS]\nTuyệt đối không được mô tả chi tiết khuôn mặt người để tránh vi phạm chính sách của YouTube. Nhân vật phải được quay từ phía sau, đội mũ bảo hiểm/mặt nạ, hoặc khuôn mặt bị che khuất. Thêm các từ khóa như "shot from behind, wearing mask, faceless, obscured face, anonymous" vào Video Prompt. Đồng thời CHẮC CHẮN thêm "face, facial features, portrait, smiling, eyes, human face" vào Negative Video Prompt.` : '';
      const multiShotConstraint = settings?.multiShot ? `\n\n[CRITICAL REQUIREMENT: STORYBOARD / MULTI-SHOT]\nNgười dùng muốn một kịch bản gồm 3-4 cảnh quay (shots) nối tiếp nhau để tạo video dài. Các shot BẮT BUỘC phải liên kết logic thành một câu chuyện (Ví dụ: Shot 1: Toàn cảnh thiết lập bối cảnh -> Shot 2: Trung cảnh nhân vật hành động -> Shot 3: Cận cảnh chi tiết/cảm xúc). Phải GIỮ NGUYÊN tính nhất quán (consistency) của nhân vật và bối cảnh giữa các shot. Trả về mảng chuỗi tiếng Anh trong trường "shotPrompts".` : '';
      const sfxConstraint = settings?.generateSFX ? `\n\n[CRITICAL REQUIREMENT: SOUND EFFECTS]\nNgười dùng muốn tạo các hiệu ứng âm thanh (SFX) riêng lẻ để lồng ghép vào video (ví dụ: tiếng mưa, gió, tiếng bước chân, whoosh, riser, impact). Hãy tạo ra 3-5 prompt âm thanh thật chi tiết bằng tiếng Anh (tập trung vào Textures và Tonal characteristics) và trả về mảng chuỗi trong trường "sfxPrompts".` : '';
      const platformConstraint = settings?.platformTarget ? `\n\n[PLATFORM TARGET: ${settings.platformTarget}]\nĐịnh dạng và phong cách phải phù hợp tối đa với nền tảng này. Nếu là Shorts/TikTok: Nhịp độ nhanh, hook mạnh ngay từ đầu. Nếu là YouTube Long-form: Nhịp độ kể chuyện từ tốn, chi tiết. Nếu là Cinematic Trailer: Kịch tính, epic.` : '';
      const seoConstraint = settings?.generateSEO ? `\n\n[CRITICAL REQUIREMENT: YOUTUBE 2026 SEO, COMPLIANCE & METADATA]\nNgười dùng cần bộ siêu dữ liệu (Metadata) chuẩn SEO YouTube. Hãy tạo:\n- youtubeTitle: Tiêu đề tối ưu CTR, có Hook gây tò mò, tối đa 70 ký tự.\n- youtubeDescription: Mô tả chuẩn SEO 2026. BẮT BUỘC có Timestamps (Chương video).\n- youtubeTags: Mảng các từ khóa (long-tail keywords).\n- aiDisclaimer: Tuyên bố từ chối trách nhiệm về AI (AI generated content disclosure) BẮT BUỘC DÁN VÀO MÔ TẢ (tiếng Việt), ghi chú thêm cho người dùng nhớ tick vào ô "Altered content" (Nội dung được thay đổi) trong YouTube Studio khi publish video (nếu video chân thực).\n- thumbnailIdeas: Tạo 2-3 gợi ý (ideas) cho ảnh Thumbnail cực kỳ thu hút. Trả về mảng object gồm 'ideaVi' (mô tả ý tưởng tiếng Việt) và 'exactPromptEn' (prompt chính xác bằng tiếng Anh để dán vào Midjourney/DALL-E).` : '';
      const voiceoverConstraint = settings?.generateVoiceover ? `\n\n[CRITICAL REQUIREMENT: VOICEOVER SCRIPT]\nNgười dùng muốn tạo kịch bản lời bình/thuyết minh (Voiceover - Voice AI) khớp với nhịp điệu của video. Hãy viết một đoạn lời bình ngắn gọn, cảm xúc, đúng trọng tâm (Tiếng Việt). Trả về chuỗi trong trường "voiceoverScript".` : '';

      const systemInstruction = `Bạn là một Đạo diễn Nghệ thuật (Art Director) và Kỹ sư Prompt (Master Prompt Engineer) cấp cao cho các hệ thống AI tạo Video (Google Veo, Sora) và AI tạo Nhạc (Flowmusic, Suno).
Mục tiêu tối thượng của bạn là biến ý tưởng của người dùng thành MỘT TÁC PHẨM ĐỒNG NHẤT. Hình ảnh và Âm thanh phải hòa quyện tuyệt đối để tạo ra một câu chuyện (Storytelling) có chiều sâu, KHÔNG ĐƯỢC rời rạc hay chắp vá.

Tham số đầu vào:
Ý tưởng: "${idea}"
Nền tảng mục tiêu (Platform): ${settings?.platformTarget || 'Tự do'}
Trọng tâm kể chuyện (Storytelling): ${settings?.storyTelling || 'Balanced'}

Video Style: ${settings?.videoStyle || 'Cinematic'}
Video Camera: ${settings?.videoCamera || 'Cinematic Tracking'}
Video Lighting: ${settings?.videoLighting || 'Dramatic'}
Video Aspect Ratio: ${settings?.videoAspectRatio || '16:9'}

Music Genre: ${settings?.musicGenre || 'Cinematic Orchestral'}
Music Mood: ${settings?.musicMood || 'Epic'}
Music Tempo: ${settings?.musicTempo || 'Medium'}
Music Vocals: ${settings?.musicVocals || 'Instrumental'}

YÊU CẦU CỐT LÕI VỀ SỰ LIÊN KẾT (AUDIO-VISUAL COHESION):
- Hình ảnh và Âm thanh phải phản chiếu lẫn nhau. Nếu video có hành động dồn dập, âm nhạc phải có nhịp điệu tương ứng. Nếu video bay bổng, nhạc phải mượt mà.
- Không liệt kê từ khóa một cách máy móc. Hãy viết prompt như đang miêu tả một phân cảnh điện ảnh có hồn. Hành động phải có mục đích.${platformConstraint}${seoConstraint}${voiceoverConstraint}

Quy tắc viết Video Prompt (Google Veo):
- Miêu tả RÕ RÀNG VÀ XUYÊN SUỐT một nhân vật/đối tượng chính.
- Cấu trúc: [Thiết lập không gian/Atmosphere] + [Mô tả chi tiết Đối tượng/Subject] + [Hành động diễn ra cụ thể, có mục đích] + [Chuyển động Camera: ${settings?.videoCamera}] + [Ánh sáng & Render: ${settings?.videoLighting}, ${settings?.videoStyle}].
- Viết bằng tiếng Anh, sử dụng từ vựng điện ảnh chuyên sâu (Ví dụ: deep depth of field, anamorphic lens flare, rich color grading).${loopConstraint}${noFaceConstraint}${multiShotConstraint}
- BẮT BUỘC cung cấp "videoPromptVi" để dịch và giải thích ngắn gọn Prompt này sang tiếng Việt cho người dùng hiểu.

Quy tắc viết Negative Video Prompt:
- Liệt kê các yếu tố KHÔNG mong muốn để bảo vệ sự toàn vẹn của nội dung (ví dụ: blurry, low resolution, bad anatomy, mutated, text, watermark, ugly, deformed, jitter, morphing, disjointed cuts${settings?.avoidFaces ? ', face, eyes, facial features' : ''}).

Quy tắc viết Music Prompt (Flowmusic):
- Đảm bảo "Vibe" của bài hát khớp 100% với cảm giác của Video. Nhạc phải bám sát diễn biến tâm lý hoặc hành động.
- Cấu trúc: [Genre: ${settings?.musicGenre}] + [Mood: ${settings?.musicMood}] + [Tempo: ${settings?.musicTempo}] + [Vocals: ${settings?.musicVocals}] + [Đặc điểm nhạc cụ / Sound Design] + [Cấu trúc bài hát: Intro, Build-up, Climax, Outro - QUAN TRỌNG ĐỂ KHỚP VIDEO].
- Thêm các từ khóa mô tả âm thanh chuyên nghiệp (ví dụ: deep sub-bass, crisp hi-hats, atmospheric pads, cinematic impacts, 44.1kHz, professional mastering).${sfxConstraint}
- BẮT BUỘC cung cấp "musicPromptVi" để dịch và giải thích ngắn gọn Prompt nhạc sang tiếng Việt cho người dùng hiểu.

TRẢ VỀ JSON DUY NHẤT VỚI CẤU TRÚC SAU. KHÔNG BỌC TRONG MARKDOWN (\`\`\`json), KHÔNG CÓ TEXT GIẢI THÍCH:
{
  "videoPrompt": "...",
  "videoPromptVi": "...",
  "negativeVideoPrompt": "..."${settings?.multiShot ? `,\n  "shotPrompts": ["...", "..."]` : ""}${settings?.generateSFX ? `,\n  "sfxPrompts": ["...", "..."]` : ""}${settings?.generateSEO ? `,\n  "youtubeTitle": "...",\n  "youtubeDescription": "...",\n  "youtubeTags": ["...", "..."],\n  "thumbnailIdeas": [{"ideaVi": "...", "exactPromptEn": "..."}],\n  "aiDisclaimer": "..."` : ""}${settings?.generateVoiceover ? `,\n  "voiceoverScript": "..."` : ""},
  "musicPrompt": "...",
  "musicPromptVi": "..."
}`;

      let textResult = "";

      if (aiConfig?.provider === 'custom') {
        textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, idea, true);
      } else {
        const client = getGeminiClient(aiConfig?.apiKey);
        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: idea,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                videoPrompt: { type: "STRING" },
                videoPromptVi: { type: "STRING" },
                negativeVideoPrompt: { type: "STRING" },
                musicPrompt: { type: "STRING" },
                musicPromptVi: { type: "STRING" },
                shotPrompts: { type: "ARRAY", items: { type: "STRING" } },
                sfxPrompts: { type: "ARRAY", items: { type: "STRING" } },
                youtubeTitle: { type: "STRING" },
                youtubeDescription: { type: "STRING" },
                youtubeTags: { type: "ARRAY", items: { type: "STRING" } },
                thumbnailPrompt: { type: "STRING" },
                thumbnailIdeas: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      ideaVi: { type: "STRING" },
                      exactPromptEn: { type: "STRING" }
                    },
                    required: ["ideaVi", "exactPromptEn"]
                  }
                },
                aiDisclaimer: { type: "STRING" },
                voiceoverScript: { type: "STRING" }
              },
              required: ["videoPrompt", "videoPromptVi", "negativeVideoPrompt", "musicPrompt", "musicPromptVi"]
            }
          }
        });
        textResult = response.text || "{}";
      }

      const parsed = parseJsonFromAi(textResult);

      res.json(parsed);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-trends", async (req, res) => {
    try {
      const { filters, config, aiConfig } = req.body;
      
      if (!config.youtubeApiKey) {
        return res.status(400).json({ error: 'Vui lòng cung cấp YouTube API Key.' });
      }

      let publishedAfter = new Date();
      if (filters.timeframe === '24h') publishedAfter.setDate(publishedAfter.getDate() - 1);
      else if (filters.timeframe === '7d') publishedAfter.setDate(publishedAfter.getDate() - 7);
      else if (filters.timeframe === '30d') publishedAfter.setDate(publishedAfter.getDate() - 30);
      else if (filters.timeframe === '90d') publishedAfter.setDate(publishedAfter.getDate() - 90);

      const regionCode = filters.targetAudience === 'high_rpm' ? 'US' : 'US';
      const videoDuration = filters.videoType === 'short' ? 'short' : (filters.videoType === 'long' ? 'long' : 'any');
      
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&order=viewCount&publishedAfter=${publishedAfter.toISOString()}&regionCode=${regionCode}&type=video&key=${config.youtubeApiKey}`;
      
      if (filters.category && filters.category !== '0') {
          searchUrl += `&videoCategoryId=${filters.category}`;
      }
      if (filters.keyword) {
          searchUrl += `&q=${encodeURIComponent(filters.keyword)}`;
      }
      if (videoDuration !== 'any') {
          searchUrl += `&videoDuration=${videoDuration}`;
      }

      const ytRes = await fetch(searchUrl);
      const ytData = await ytRes.json();

      if (!ytRes.ok) {
          return res.status(ytRes.status).json({ error: `YouTube API Error: ${ytData.error?.message || 'Unknown error'}` });
      }

      const items = ytData.items || [];
      if (items.length === 0) {
          return res.json({ trends: [], summary: "Không tìm thấy video nào phù hợp với bộ lọc trong khoảng thời gian này." });
      }

      // Filter only video results (skip channels)
      const videoIds = items
        .filter((item: any) => item.id.kind === 'youtube#video' && item.id.videoId)
        .map((item: any) => item.id.videoId)
        .join(',');
      
      let videoSnippets: any[] = [];
      
      if (videoIds) {
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${config.youtubeApiKey}`;
        const statsRes = await fetch(statsUrl);
        const statsData = await statsRes.json();
        
        if (statsData.items) {
          const minViewsNum = filters.minViews ? parseInt(filters.minViews, 10) : 0;
          
          videoSnippets = statsData.items
            .filter((item: any) => {
              const views = parseInt(item.statistics?.viewCount || '0', 10);
              return views >= minViewsNum;
            })
            .map((item: any) => ({
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              publishTime: item.snippet.publishedAt,
              viewCount: item.statistics?.viewCount || '0',
              likeCount: item.statistics?.likeCount || '0',
              commentCount: item.statistics?.commentCount || '0'
            }));
        }
      }

      if (videoSnippets.length === 0) {
          return res.json({ trends: [], summary: `Không tìm thấy video nào đạt tối thiểu ${filters.minViews} views trong khoảng thời gian này.` });
      }

      const prompt = `Dưới đây là danh sách các video top view trên YouTube gần đây (Region: ${regionCode}, Type: ${filters.videoType}).
Bạn hãy phân tích và tìm ra các XU HƯỚNG (Trends), TỪ KHÓA tiềm năng nhất.
LOẠI BỎ: rác, spam, view ảo, giật gân, rẻ tiền.
TẬP TRUNG: Nội dung High RPM (Mỹ/Global), evergreen hoặc trend đang lên mạnh.

Dữ liệu Video (Bao gồm View/Like thật):
${JSON.stringify(videoSnippets, null, 2)}

Trả về JSON ĐÚNG cấu trúc sau (không format markdown):
{
  "summary": "Đánh giá tổng quan thị trường...",
  "trends": [
    {
      "keyword": "Từ khóa chính",
      "score": 95,
      "reason": "Lý do trend tốt",
      "examples": ["Ví dụ 1", "Ví dụ 2"],
      "suggestedPrompt": "Gợi ý prompt ngắn làm video"
    }
  ]
}`;

      const systemInstruction = "Bạn là chuyên gia phân tích dữ liệu YouTube. Chỉ trả về chuỗi JSON hợp lệ.";
      let textResult = "";

      if (aiConfig?.provider === 'custom') {
        textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, prompt, true);
      } else {
        const client = getGeminiClient(aiConfig?.apiKey);
        const response = await client.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
        textResult = response.text || "{}";
      }

      const parsed = parseJsonFromAi(textResult);

      res.json(parsed);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-video", async (req, res) => {
    try {
      const { url, config, aiConfig } = req.body;
      
      if (!config.youtubeApiKey) {
        return res.status(400).json({ error: 'Vui lòng cung cấp YouTube API Key.' });
      }

      if (!url) {
        return res.status(400).json({ error: 'URL không được để trống.' });
      }

      // Extract Video ID
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      const videoId = match ? match[1] : null;
      
      if (!videoId) {
        return res.status(400).json({ error: 'Không thể nhận diện Video ID từ đường dẫn này.' });
      }

      // Fetch Video Stats
      const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${config.youtubeApiKey}`;
      const ytRes = await fetch(ytUrl);
      const ytData = await ytRes.json();
      
      if (!ytRes.ok) {
        return res.status(ytRes.status).json({ error: `YouTube API Error: ${ytData.error?.message || 'Unknown error'}` });
      }

      if (!ytData.items || ytData.items.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy video hoặc video đang ở chế độ riêng tư.' });
      }

      const video = ytData.items[0];
      const snippet = video.snippet;
      const stats = video.statistics;

      const prompt = `Phân tích video YouTube thành công sau đây để "cày view":
Tiêu đề: ${snippet.title}
Mô tả: ${snippet.description ? snippet.description.substring(0, 1000) : ''}
Tags: ${snippet.tags ? snippet.tags.join(', ') : 'Không có'}
View: ${stats.viewCount || '0'}
Like: ${stats.likeCount || '0'}

Yêu cầu:
1. Tạo 5 tiêu đề (Titles) mới dựa trên chủ đề này nhưng có tính click-bait cao hơn (CTR cao, gợi sự tò mò mạnh).
2. Tạo 3 đoạn Hook (Kịch bản 3-5 giây đầu tiên) để giữ chân người xem (Retain users) cho các tiêu đề trên.
3. Đánh giá chiến lược SEO/Từ khóa (Tags) của video này và gợi ý các Key ngách tốt hơn.

Trả về chuẩn JSON format ĐÚNG NHƯ SAU (không markdown):
{
  "suggestedTitles": ["Tiêu đề 1", "Tiêu đề 2"],
  "hooks": [
    { "type": "Tò mò / Shock", "script": "Câu nói hook...", "reason": "Lý do hook này hiệu quả" }
  ],
  "seoStrategy": "Đánh giá và chiến lược keyword..."
}`;

      const systemInstruction = "Bạn là chuyên gia marketing YouTube và kịch bản video. Chỉ trả về chuỗi JSON hợp lệ.";
      let textResult = "";

      if (aiConfig?.provider === 'custom') {
        textResult = await callOpenAICompatibleAPI(aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model, systemInstruction, prompt, true);
      } else {
        const client = getGeminiClient(aiConfig?.apiKey);
        const response = await client.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            responseMimeType: "application/json",
            temperature: 0.7
          }
        });
        textResult = response.text || "{}";
      }

      const parsed = parseJsonFromAi(textResult);

      parsed.originalStats = {
        title: snippet.title,
        views: stats.viewCount || '0',
        likes: stats.likeCount || '0',
        tags: snippet.tags || []
      };

      res.json(parsed);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

