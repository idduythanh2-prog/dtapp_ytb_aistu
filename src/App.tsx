import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wand2, Video, Music, Copy, Check, History, Loader2, Lightbulb, MessageSquare, SlidersHorizontal, Settings2, Server, Download, Film, Volume2, Youtube, Mic, Trash2, X, TrendingUp, Crosshair } from 'lucide-react';
import { GeneratedPrompts, HistoryItem, PromptSettings, AIProviderSettings } from './types';
import { TrendAnalyzer } from './components/TrendAnalyzer';
import { VideoAnalyzer } from './components/VideoAnalyzer';

export default function App() {
  const [idea, setIdea] = useState('');
  const [mainTab, setMainTab] = useState<'prompt' | 'trend' | 'spy'>('prompt');
  const [settings, setSettings] = useState<PromptSettings>({
    videoStyle: 'Cinematic',
    videoCamera: 'Cinematic Tracking',
    videoLighting: 'Dramatic',
    videoAspectRatio: '16:9',
    isLoop: true,
    avoidFaces: true,
    musicGenre: 'Cinematic Orchestral',
    musicMood: 'Epic',
    musicTempo: 'Medium (90-110 BPM)',
    musicVocals: 'Instrumental (No Vocals)',
    multiShot: false,
    generateSFX: false,
    generateSEO: true,
    generateVoiceover: false,
    storyTelling: 'Balanced (Hài hòa)',
    platformTarget: 'Tự do',
  });

  const [aiConfig, setAiConfig] = useState<AIProviderSettings>({
    provider: 'gemini',
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompts | null>(null);
  const [brainstormResult, setBrainstormResult] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'seo'>('video');

  useEffect(() => {
    const saved = localStorage.getItem('flowprompt-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
    const savedConfig = localStorage.getItem('flowprompt-aiconfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.provider === 'fireworks') {
          parsedConfig.provider = 'custom';
        }
        setAiConfig(parsedConfig);
      } catch (e) {}
    }
  }, []);

  const saveAiConfig = (newConfig: AIProviderSettings) => {
    setAiConfig(newConfig);
    localStorage.setItem('flowprompt-aiconfig', JSON.stringify(newConfig));
  };

  const exportToTxt = () => {
    if (!prompts) return;
    let text = `=== FLOWPROMPT STUDIO EXPORT ===\nÝ tưởng: ${idea}\n\n`;
    
    if (prompts.youtubeTitle) {
      text += `=== YOUTUBE SEO METADATA ===\n`;
      text += `Tiêu đề (Title): ${prompts.youtubeTitle}\n`;
      text += `Mô tả (Description): \n${prompts.youtubeDescription}\n`;
      if (prompts.aiDisclaimer) {
        text += `\n[KHAI BÁO AI - YOUTUBE POLICY]\n${prompts.aiDisclaimer}\n`;
      }
      text += `Tags: ${prompts.youtubeTags?.join(', ')}\n\n`;
      
      if (prompts.thumbnailIdeas?.length) {
        text += `=== THUMBNAIL IDEAS ===\n`;
        prompts.thumbnailIdeas.forEach((thumb, i) => {
          text += `Idea ${i + 1}: ${thumb.ideaVi}\nPrompt: ${thumb.exactPromptEn}\n\n`;
        });
      } else if (prompts.thumbnailPrompt) {
        text += `Thumbnail Prompt: ${prompts.thumbnailPrompt}\n\n`;
      }
    }

    if (prompts.voiceoverScript) {
      text += `=== KỊCH BẢN LỜI BÌNH (VOICEOVER) ===\n${prompts.voiceoverScript}\n\n`;
    }

    text += `[MAIN VIDEO PROMPT (Google Veo)]\n${prompts.videoPrompt}\n\n`;
    if (prompts.videoPromptVi) text += `[Giải thích Video Prompt]\n${prompts.videoPromptVi}\n\n`;
    if (prompts.negativeVideoPrompt) text += `[NEGATIVE VIDEO PROMPT]\n${prompts.negativeVideoPrompt}\n\n`;
    if (prompts.shotPrompts?.length) {
      text += `=== STORYBOARD SHOTS ===\n\n`;
      prompts.shotPrompts.forEach((shot, i) => {
        text += `[SHOT ${i + 1} PROMPT]\n${shot}\n\n`;
      });
    }
    text += `[MAIN MUSIC PROMPT (Flowmusic)]\n${prompts.musicPrompt}\n\n`;
    if (prompts.musicPromptVi) text += `[Giải thích Music Prompt]\n${prompts.musicPromptVi}\n\n`;
    if (prompts.sfxPrompts?.length) {
      text += `=== SOUND EFFECTS (SFX) ===\n\n`;
      prompts.sfxPrompts.forEach((sfx, i) => {
        text += `[SFX ${i + 1} PROMPT]\n${sfx}\n\n`;
      });
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowPrompt_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToHistory = (newPrompts: GeneratedPrompts, originalIdea: string, currentSettings: PromptSettings) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(7),
      originalIdea,
      settings: currentSettings,
      prompts: newPrompts,
      timestamp: Date.now(),
    };
    const newHistory = [newItem, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('flowprompt-history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('flowprompt-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('flowprompt-history');
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setIsGenerating(true);
    setPrompts(null);
    try {
      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, settings, aiConfig }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định từ server');
      }
      setPrompts(data);
      saveToHistory(data, idea, settings);
    } catch (error: any) {
      console.error(error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBrainstorm = async () => {
    if (!idea.trim()) return;
    setIsBrainstorming(true);
    setBrainstormResult(null);
    try {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, aiConfig }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định từ server');
      }
      setBrainstormResult(data.result);
    } catch (error: any) {
      console.error(error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      {/* Background ambient light */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 hidden sm:block">FlowPrompt Studio</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setMainTab('prompt')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mainTab === 'prompt' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden md:inline">Tạo Prompt</span>
            </button>
            <button
              onClick={() => setMainTab('trend')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mainTab === 'trend' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Nghiên cứu Trend</span>
            </button>
            <button
              onClick={() => setMainTab('spy')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mainTab === 'spy' ? 'bg-red-900/40 text-red-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            >
              <Crosshair className="w-4 h-4" />
              <span className="hidden md:inline">Phân tích Đối thủ</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 uppercase tracking-wider hidden lg:flex">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800"><Video className="w-3.5 h-3.5 text-blue-400" /> Google Veo</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 relative z-10">
        
        {mainTab === 'trend' ? (
          <TrendAnalyzer 
            aiConfig={aiConfig} 
            onSelectTrend={(prompt) => {
              setIdea(prompt);
              setMainTab('prompt');
            }} 
          />
        ) : mainTab === 'spy' ? (
          <VideoAnalyzer aiConfig={aiConfig} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Input & Actions */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <div>
                <h2 className="text-4xl font-display font-black mb-4 tracking-tight leading-tight">
                  Biến ý tưởng thành <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">siêu phẩm</span>
                </h2>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  Mô tả ý tưởng video và nhạc của bạn bằng tiếng Việt. AI sẽ tự động tối ưu thành các câu lệnh (prompts) chuyên nghiệp bằng tiếng Anh.
                </p>
              </div>

          <div className="flex flex-col gap-4">
            
            {/* Settings Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="bg-zinc-950/50 border-b border-zinc-800 px-2 py-2 flex items-center justify-between">
                <div className="flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'video' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                  >
                    <Video className="w-4 h-4" /> Video (Veo)
                  </button>
                  <button
                    onClick={() => setActiveTab('audio')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'audio' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                  >
                    <Music className="w-4 h-4" /> Audio (Flowmusic)
                  </button>
                  <button
                    onClick={() => setActiveTab('seo')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'seo' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                  >
                    <Youtube className="w-4 h-4" /> Story & SEO
                  </button>
                </div>
                <button
                  onClick={() => setSettings({
                    videoStyle: 'Cinematic',
                    videoCamera: 'Cinematic Tracking',
                    videoLighting: 'Dramatic',
                    videoAspectRatio: '16:9',
                    isLoop: true,
                    avoidFaces: true,
                    musicGenre: 'Cinematic Orchestral',
                    musicMood: 'Epic',
                    musicTempo: 'Medium (90-110 BPM)',
                    musicVocals: 'Instrumental (No Vocals)',
                    multiShot: false,
                    generateSFX: false,
                    generateSEO: true,
                    generateVoiceover: false,
                    storyTelling: 'Balanced (Hài hòa)',
                    platformTarget: 'Tự do',
                  })}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ml-2"
                  title="Khôi phục mặc định"
                >
                  <X className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              <div className="p-5">
                {activeTab === 'seo' && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" /> Nền tảng (Platform Target)
                        </div>
                        <select value={settings.platformTarget} onChange={e => setSettings({...settings, platformTarget: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                          <option value="Tự do">Tự do (Freeform)</option>
                          <option value="YouTube Long-form">YouTube Long-form (Kể chuyện chi tiết)</option>
                          <option value="Shorts / TikTok">Shorts / TikTok (Nhanh, cuốn hút)</option>
                          <option value="Cinematic Trailer">Cinematic Trailer (Kịch tính, điện ảnh)</option>
                          <option value="Music Video">Music Video (Nhịp điệu âm nhạc)</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" /> Kể chuyện (Storytelling Focus)
                        </div>
                        <select value={settings.storyTelling} onChange={e => setSettings({...settings, storyTelling: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                          <option value="Balanced (Hài hòa)">Hài hòa (Mọi yếu tố cân bằng)</option>
                          <option value="Narrative-Driven (Cốt truyện sâu sắc)">Cốt truyện sâu sắc (Tập trung diễn biến, sự kiện)</option>
                          <option value="Action/Rhythm (Nhịp điệu và Hành động)">Nhịp điệu dồn dập & Hành động (Đồng bộ nhịp điệu mạnh)</option>
                          <option value="Atmospheric (Trọng tâm không khí, tĩnh lặng)">Không khí & Cảm xúc (Tĩnh lặng, có chiều sâu)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.generateSEO}
                            onChange={e => setSettings({...settings, generateSEO: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                        </div>
                        <span className="text-sm text-zinc-300 font-medium">Tạo Meta SEO (Tiêu đề, Tags, Thumbnail)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.multiShot}
                            onChange={e => setSettings({...settings, multiShot: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                        </div>
                        <span className="text-sm text-zinc-300 font-medium">Tạo Kịch bản nhiều cảnh (3-4 Shots)</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'video' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select value={settings.videoStyle} onChange={e => setSettings({...settings, videoStyle: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Cinematic">Phim điện ảnh (Cinematic)</option>
                      <option value="Cyberpunk">Cyberpunk</option>
                      <option value="Anime">Anime / Animation</option>
                      <option value="3D Render">3D Render (Unreal/Octane)</option>
                      <option value="Realism">Chân thực (Realism)</option>
                      <option value="Abstract">Trừu tượng (Abstract)</option>
                    </select>

                    <select value={settings.videoCamera} onChange={e => setSettings({...settings, videoCamera: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Cinematic Tracking">Tracking (Điểm nhìn di chuyển)</option>
                      <option value="Static">Static (Cố định)</option>
                      <option value="Drone">Drone (Bay cao)</option>
                      <option value="Handheld">Handheld (Cầm tay)</option>
                      <option value="Slow Pan">Slow Pan (Lướt chậm)</option>
                      <option value="Zoom">Zoom In/Out (Thu phóng)</option>
                    </select>
                    
                    <select value={settings.videoLighting} onChange={e => setSettings({...settings, videoLighting: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Dramatic">Dramatic (Kịch tính)</option>
                      <option value="Neon">Neon/Cyberpunk</option>
                      <option value="Natural Light">Ánh sáng tự nhiên</option>
                      <option value="Studio Lighting">Studio Lighting</option>
                      <option value="Golden Hour">Giờ vàng (Golden Hour)</option>
                      <option value="Dark/Moody">Dark & Moody</option>
                    </select>

                    <select value={settings.videoAspectRatio} onChange={e => setSettings({...settings, videoAspectRatio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="16:9">16:9 (Ngang)</option>
                      <option value="9:16">9:16 (Dọc - Shorts/Reels)</option>
                      <option value="1:1">1:1 (Vuông)</option>
                    </select>

                    <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors col-span-1">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.isLoop}
                          onChange={e => setSettings({...settings, isLoop: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </div>
                      <span className="text-sm text-zinc-300 font-medium">Video Loop (Lặp lại vô tận)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors col-span-1">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.avoidFaces}
                          onChange={e => setSettings({...settings, avoidFaces: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </div>
                      <span className="text-sm text-zinc-300 font-medium">Ẩn mặt (Tránh policy)</span>
                    </label>
                  </div>
                )}

                {activeTab === 'audio' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select value={settings.musicGenre} onChange={e => setSettings({...settings, musicGenre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Cinematic Orchestral">Giao hưởng điện ảnh (Cinematic)</option>
                      <option value="EDM">EDM / Nhạc điện tử</option>
                      <option value="Synthwave">Synthwave / Retrowave</option>
                      <option value="Lo-Fi">Lo-Fi Chill</option>
                      <option value="Pop">Nhạc Pop</option>
                      <option value="Ambient">Ambient / Không gian</option>
                    </select>

                    <select value={settings.musicMood} onChange={e => setSettings({...settings, musicMood: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Epic">Hùng tráng (Epic)</option>
                      <option value="Energetic">Năng lượng (Energetic)</option>
                      <option value="Chill">Thư giãn (Chill/Relaxing)</option>
                      <option value="Dark">Bí ẩn / Tối tăm (Dark)</option>
                      <option value="Happy">Vui vẻ (Happy/Upbeat)</option>
                      <option value="Emotional">Cảm xúc (Emotional)</option>
                    </select>

                    <select value={settings.musicTempo} onChange={e => setSettings({...settings, musicTempo: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Medium (90-110 BPM)">Vừa (Medium: 90-110 BPM)</option>
                      <option value="Slow (60-80 BPM)">Chậm (Slow: 60-80 BPM)</option>
                      <option value="Fast (120+ BPM)">Nhanh (Fast: 120+ BPM)</option>
                    </select>

                    <select value={settings.musicVocals} onChange={e => setSettings({...settings, musicVocals: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none">
                      <option value="Instrumental (No Vocals)">Không lời (Instrumental)</option>
                      <option value="Female Vocals (Ethereal)">Giọng nữ (Bay bổng/Ethereal)</option>
                      <option value="Male Vocals (Deep)">Giọng nam (Trầm/Deep)</option>
                      <option value="Choir (Epic)">Dàn đồng ca (Epic Choir)</option>
                      <option value="Whispers">Tiếng thì thầm (Whispers)</option>
                    </select>

                    <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors col-span-1">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.generateSFX}
                          onChange={e => setSettings({...settings, generateSFX: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </div>
                      <span className="text-sm text-zinc-300 font-medium">Tạo SFX (Hiệu ứng âm thanh)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-purple-500/30 transition-colors col-span-1">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.generateVoiceover}
                          onChange={e => setSettings({...settings, generateVoiceover: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </div>
                      <span className="text-sm text-zinc-300 font-medium">Tạo Kịch bản Lời bình (Voiceover)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Preset Ideas */}
            <div className="flex flex-wrap gap-2">
              {[
                "Nữ chiến binh Cyberpunk dưới mưa neon",
                "Tàu vũ trụ ngang qua hố đen",
                "Giọt sương vỡ tan chậm trên lá"
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setIdea(template)}
                  className="text-xs bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 py-1.5 px-3 rounded-full transition-all duration-300 backdrop-blur-sm"
                >
                  {template}
                </button>
              ))}
            </div>

            <div className="relative group mt-2">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-blue-600/30 rounded-3xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
              <div className="relative bg-zinc-900 border border-zinc-800 group-focus-within:border-zinc-700 rounded-3xl p-1 overflow-hidden transition-colors duration-500">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Mô tả ý tưởng cực cháy của bạn... (VD: Nhân vật nữ chiến binh bước đi giữa thành phố Cyberpunk đổ nát...)"
                  className="w-full h-36 bg-zinc-950/50 rounded-2xl p-5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none font-sans leading-relaxed shadow-inner"
                />
              </div>
            </div>

            {/* Assistant Response (Brainstorm) */}
            <AnimatePresence>
              {brainstormResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden origin-top"
                >
                  <div className="bg-purple-900/10 border border-purple-500/30 rounded-3xl p-5 mt-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4 text-purple-400 text-sm font-medium">
                      <Lightbulb className="w-4 h-4 animate-pulse" />
                      AI Gợi ý cực cuốn (Chạm để thêm vào kịch bản)
                    </div>
                    <div className="flex flex-col gap-2">
                      {brainstormResult.split('\n').filter(line => line.trim() !== '').map((line, i) => {
                        const cleanLine = line.replace(/^- /, '').trim();
                        if (!cleanLine) return null;
                        return (
                          <button
                            key={i}
                            onClick={() => setIdea(prev => prev ? prev + ' - ' + cleanLine : cleanLine)}
                            className="text-left text-sm text-zinc-300 bg-zinc-950/50 hover:bg-purple-500/10 border border-zinc-800 hover:border-purple-500/50 p-3.5 rounded-2xl transition-all duration-300 hover:translate-x-1"
                          >
                            {cleanLine}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-xl mt-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                <Settings2 className="w-4 h-4" />
                <span>Nguồn AI (API Provider)</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <select
                  value={aiConfig.provider}
                  onChange={e => saveAiConfig({ ...aiConfig, provider: e.target.value as any })}
                  className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
                >
                  <option value="gemini">Google Gemini (Khuyên dùng)</option>
                  <option value="custom">OpenAI-Compatible (Tùy chỉnh)</option>
                </select>

                <input
                  type="password"
                  placeholder={aiConfig.provider === 'gemini' ? "Gemini API Key (Bỏ trống để dùng mặc định hệ thống)" : "Nhập API Key (Bắt buộc)..."}
                  value={aiConfig.apiKey}
                  onChange={e => saveAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
                />
              </div>
              
              {aiConfig.provider === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wider">Base URL</label>
                    <input
                      type="text"
                      placeholder="VD: https://api.openai.com/v1/chat/completions"
                      value={aiConfig.baseUrl}
                      onChange={e => saveAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1.5 block font-medium uppercase tracking-wider">Model ID</label>
                    <input
                      type="text"
                      placeholder="VD: gpt-4o, llama-3-8b..."
                      value={aiConfig.model}
                      onChange={e => saveAiConfig({ ...aiConfig, model: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleBrainstorm}
                disabled={!idea.trim() || isBrainstorming || isGenerating}
                className="group relative flex-1 flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 text-zinc-300 py-4 px-6 rounded-2xl font-display text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center gap-2">
                  {isBrainstorming ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <Lightbulb className="w-5 h-5 text-purple-400 group-hover:animate-pulse" />}
                  Brainstorm Ý Tưởng
                </span>
              </button>
              
              <button
                onClick={handleGenerate}
                disabled={!idea.trim() || isBrainstorming || isGenerating}
                className="group relative flex-[2] flex items-center justify-center gap-2 bg-zinc-100 text-zinc-950 py-4 px-6 rounded-2xl font-display text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />}
                  GENERATE BẢN THIẾT KẾ
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!prompts && !isGenerating && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-zinc-800/80 rounded-3xl bg-zinc-900/30 min-h-[500px] backdrop-blur-xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="w-20 h-20 bg-zinc-950/80 rounded-3xl flex items-center justify-center mb-8 border border-zinc-800/80 shadow-[0_0_50px_-12px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-500">
                  <Wand2 className="w-10 h-10 text-zinc-500 group-hover:text-purple-400 transition-colors duration-500" />
                </div>
                <h3 className="text-2xl font-display font-bold text-zinc-200 mb-3 tracking-tight">Chưa có Prompt nào</h3>
                <p className="text-zinc-500 max-w-sm font-medium leading-relaxed">
                  Nhập ý tưởng của bạn và nhấn nút để AI viết các câu lệnh chuyên sâu cho hệ thống Video & Audio.
                </p>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 border border-zinc-800 rounded-3xl bg-zinc-900/50 min-h-[400px]"
              >
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-6" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2 animate-pulse">Đang phân tích ý tưởng...</h3>
                <p className="text-sm text-zinc-500">Viết prompt chuyên sâu cho Video và Music</p>
              </motion.div>
            )}

            {prompts && !isGenerating && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Check className="w-5 h-5" />
                    <span>Đã tạo Prompt thành công!</span>
                  </div>
                  <button
                    onClick={exportToTxt}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Xuất file .txt
                  </button>
                </div>

                {/* SEO Metadata Card */}
                {prompts.youtubeTitle && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-red-400" />
                        </div>
                        <h3 className="font-display font-medium text-zinc-200">YouTube SEO & Metadata</h3>
                      </div>
                      <button
                        onClick={() => {
                          let seoText = `Tiêu đề:\n${prompts.youtubeTitle}\n\nMô tả:\n${prompts.youtubeDescription}\n`;
                          if (prompts.aiDisclaimer) {
                            seoText += `\n[Khai báo AI]\n${prompts.aiDisclaimer}\n`;
                          }
                          seoText += `\nTags:\n${prompts.youtubeTags?.join(', ')}\n\n`;
                          if (prompts.thumbnailIdeas?.length) {
                            seoText += `Thumbnail Ideas:\n`;
                            prompts.thumbnailIdeas.forEach((t, i) => {
                              seoText += `Idea ${i+1}: ${t.ideaVi}\nPrompt: ${t.exactPromptEn}\n\n`;
                            });
                          } else {
                            seoText += `Thumbnail Prompt:\n${prompts.thumbnailPrompt}`;
                          }
                          copyToClipboard(seoText, 'seo');
                        }}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                        title="Copy toàn bộ SEO"
                      >
                        {copiedType === 'seo' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tiêu đề (Title)</div>
                        <div className="text-sm font-medium text-zinc-200 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                          {prompts.youtubeTitle}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Mô tả (Description)</div>
                        <pre className="font-sans text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 whitespace-pre-wrap leading-relaxed">
                          {prompts.youtubeDescription}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tags / Keywords</div>
                        <div className="flex flex-wrap gap-2">
                          {prompts.youtubeTags?.map((tag, idx) => (
                            <span key={idx} className="text-xs font-medium text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/50">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {prompts.aiDisclaimer && (
                        <div>
                          <div className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                            Khai báo AI (YouTube Policy)
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                            <p className="text-xs text-orange-400 mb-2 font-medium">⚠️ Nhớ tick chọn "Altered content" (Nội dung được thay đổi/AI tạo ra) trong lúc tải video lên YouTube Studio nếu video có hình ảnh con người chân thực.</p>
                            <pre className="font-sans text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {prompts.aiDisclaimer}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Thumbnail Ideas (Midjourney / DALL-E)</div>
                        {prompts.thumbnailIdeas?.length ? (
                          <div className="space-y-3">
                            {prompts.thumbnailIdeas.map((thumb, idx) => (
                              <div key={idx} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                                <div className="text-sm font-medium text-zinc-200 mb-2">💡 Ý tưởng {idx + 1}: {thumb.ideaVi}</div>
                                <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap leading-relaxed p-3 bg-zinc-900 rounded-lg border border-red-900/30">
                                  {thumb.exactPromptEn}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="font-mono text-sm text-red-200 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 whitespace-pre-wrap leading-relaxed">
                            {prompts.thumbnailPrompt}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Prompt Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Video className="w-4 h-4 text-blue-400" />
                      </div>
                      <h3 className="font-display font-medium text-zinc-200">Video Prompt (Google Veo)</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(prompts.videoPrompt, 'video')}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedType === 'video' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-6">
                    <pre className="font-mono text-sm text-blue-100 whitespace-pre-wrap leading-relaxed mb-4">
                      {prompts.videoPrompt}
                    </pre>
                    {prompts.videoPromptVi && (
                      <div className="mt-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">💡 Giải thích (Tiếng Việt)</div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{prompts.videoPromptVi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Negative Video Prompt Card */}
                {prompts.negativeVideoPrompt && (
                  <div className="bg-zinc-900 border border-red-900/30 rounded-3xl overflow-hidden group">
                    <div className="px-6 py-4 border-b border-red-900/30 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                          <Settings2 className="w-4 h-4 text-red-400" />
                        </div>
                        <h3 className="font-display font-medium text-zinc-200">Negative Video Prompt (Loại trừ)</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(prompts.negativeVideoPrompt!, 'negative')}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                      >
                        {copiedType === 'negative' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="p-6">
                      <pre className="font-mono text-sm text-red-200/70 whitespace-pre-wrap leading-relaxed">
                        {prompts.negativeVideoPrompt}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Storyboard Prompts */}
                {prompts.shotPrompts && prompts.shotPrompts.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Film className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="font-display font-medium text-zinc-200">Kịch bản chi tiết (Storyboard)</h3>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      {prompts.shotPrompts.map((shot, idx) => (
                        <div key={idx} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50 relative group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shot {idx + 1}</span>
                            <button
                              onClick={() => copyToClipboard(shot, `shot-${idx}`)}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {copiedType === `shot-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <pre className="font-mono text-sm text-blue-100/80 whitespace-pre-wrap leading-relaxed">{shot}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voiceover Script Card */}
                {prompts.voiceoverScript && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Mic className="w-4 h-4 text-orange-400" />
                        </div>
                        <h3 className="font-display font-medium text-zinc-200">Kịch bản Lời bình (Voiceover)</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(prompts.voiceoverScript!, 'voiceover')}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                        title="Copy Lời bình"
                      >
                        {copiedType === 'voiceover' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="p-6">
                      <pre className="font-sans text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed text-lg font-medium">
                        "{prompts.voiceoverScript}"
                      </pre>
                    </div>
                  </div>
                )}

                {/* Music Prompt Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Music className="w-4 h-4 text-purple-400" />
                      </div>
                      <h3 className="font-display font-medium text-zinc-200">Music Prompt (Flowmusic)</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(prompts.musicPrompt, 'music')}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedType === 'music' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-6">
                    <pre className="font-mono text-sm text-purple-100 whitespace-pre-wrap leading-relaxed mb-4">
                      {prompts.musicPrompt}
                    </pre>
                    {prompts.musicPromptVi && (
                      <div className="mt-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">💡 Giải thích (Tiếng Việt)</div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{prompts.musicPromptVi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SFX Prompts */}
                {prompts.sfxPrompts && prompts.sfxPrompts.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="font-display font-medium text-zinc-200">Hiệu ứng Âm thanh (SFX)</h3>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      {prompts.sfxPrompts.map((sfx, idx) => (
                        <div key={idx} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50 relative group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">SFX {idx + 1}</span>
                            <button
                              onClick={() => copyToClipboard(sfx, `sfx-${idx}`)}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {copiedType === `sfx-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <pre className="font-mono text-sm text-purple-100/80 whitespace-pre-wrap leading-relaxed">{sfx}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
        )}
      </main>

      {/* History Section */}
      {history.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-6 py-16 relative z-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <History className="w-5 h-5 text-zinc-400" />
              </div>
              <h2 className="text-2xl font-display font-bold text-zinc-200 tracking-tight">Lịch sử Prompt</h2>
            </div>
            <button
              onClick={clearHistory}
              className="text-sm font-medium text-zinc-500 hover:text-red-400 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Xóa tất cả
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div
                key={item.id}
                className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 cursor-pointer overflow-hidden transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_0_40px_-15px_rgba(168,85,247,0.2)] hover:-translate-y-1"
                onClick={() => {
                  setIdea(item.originalIdea);
                  if (item.settings) setSettings(item.settings);
                  setPrompts(item.prompts);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 pr-8">
                  <p className="text-base text-zinc-300 line-clamp-3 mb-5 font-medium leading-relaxed group-hover:text-zinc-100 transition-colors">"{item.originalIdea}"</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-blue-500/20">
                      <Video className="w-3.5 h-3.5" /> Veo
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-purple-500/20">
                      <Music className="w-3.5 h-3.5" /> Flow
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteHistoryItem(item.id, e)}
                  className="absolute top-5 right-5 p-2.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl hover:bg-red-500/10 bg-zinc-950/50 backdrop-blur-md z-20"
                  title="Xóa mục này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
