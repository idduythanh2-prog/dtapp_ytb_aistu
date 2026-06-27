import React, { useState, useEffect } from 'react';
import { Search, Loader2, Youtube, AlertCircle, Eye, Settings, HelpCircle, Crosshair, Type, FileText } from 'lucide-react';
import { AIProviderSettings, VideoAnalysisResult } from '../types';

interface Props {
  aiConfig: AIProviderSettings;
}

export function VideoAnalyzer({ aiConfig }: Props) {
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('flowprompt-yt-key');
    if (savedKey) setYoutubeApiKey(savedKey);
    else setShowSettings(true);
  }, []);

  const saveYoutubeKey = (key: string) => {
    setYoutubeApiKey(key);
    localStorage.setItem('flowprompt-yt-key', key);
  };

  const handleAnalyze = async () => {
    if (!youtubeApiKey) {
      setError('Vui lòng cung cấp YouTube API Key để tiếp tục.');
      setShowSettings(true);
      return;
    }
    
    if (!url.trim()) {
      setError('Vui lòng nhập Link YouTube của đối thủ.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          config: { youtubeApiKey },
          aiConfig
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định từ server');
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-red-400" />
          Gián điệp & Tạo Hook Triệu View
        </h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-red-500/20 text-red-300' : 'text-zinc-400 hover:bg-zinc-800'}`}
          title="Cài đặt API"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-zinc-200 font-medium">
            <Youtube className="w-5 h-5 text-red-500" />
            Cấu hình YouTube Data API v3
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Nhập YouTube API Key của bạn..."
              value={youtubeApiKey}
              onChange={e => saveYoutubeKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-red-500/50 focus:outline-none transition-colors"
            />
            <div className="flex gap-2 items-start text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
              <HelpCircle className="w-4 h-4 shrink-0 text-zinc-500 mt-0.5" />
              <p>
                Dùng chung API key với mục "Trend". Hệ thống sẽ bóc tách dữ liệu gốc của video để AI học hỏi và tạo ra Hook chất lượng hơn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <p className="text-sm text-zinc-400 mb-4">
          Nhập link một video đang viral trong ngách của bạn. AI sẽ "mổ xẻ" video đó, lấy cấu trúc tiêu đề và tạo kịch bản 3 giây đầu tiên (Hook) cực cuốn để bạn làm video ăn theo trend.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="VD: https://www.youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-sm text-zinc-200 focus:border-red-500/50 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !url.trim()}
            className={`py-3.5 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              isAnalyzing || !url.trim()
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang mổ xẻ...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Phân tích Đối thủ
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          {/* Video Original Stats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-100 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              Thông tin Video Gốc
            </h3>
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">{result.originalStats.title}</p>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-zinc-500" /> {parseInt(result.originalStats.views).toLocaleString()} Views</span>
                <span className="text-zinc-600">•</span>
                <span>{parseInt(result.originalStats.likes).toLocaleString()} Likes</span>
              </div>
              <div className="pt-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Từ khóa (Tags)</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.originalStats.tags.slice(0, 10).map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-400">
                      {tag}
                    </span>
                  ))}
                  {result.originalStats.tags.length > 10 && <span className="px-2 py-1 text-xs text-zinc-500">+{result.originalStats.tags.length - 10}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suggested Titles */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Tiêu đề Giật Tit (High CTR)
              </h3>
              <ul className="space-y-3">
                {result.suggestedTitles.map((title, i) => (
                  <li key={i} className="bg-zinc-950 border border-zinc-800/50 p-3 rounded-xl flex items-start gap-3">
                    <span className="text-red-500/50 font-mono text-sm mt-0.5">{i+1}.</span>
                    <span className="text-sm text-zinc-200 leading-relaxed font-medium">{title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Hooks */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                Kịch bản Hook (3-5 giây đầu)
              </h3>
              <div className="space-y-4">
                {result.hooks.map((hook, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl">
                    <div className="inline-block px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider rounded mb-2">
                      {hook.type}
                    </div>
                    <p className="text-sm text-zinc-100 font-medium leading-relaxed mb-3">"{hook.script}"</p>
                    <p className="text-xs text-zinc-500 leading-relaxed italic">{hook.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SEO Evaluation */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-100 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400" />
              Chiến lược Cạnh tranh
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {result.seoStrategy}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
