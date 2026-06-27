import React, { useState, useEffect } from 'react';
import { Search, Loader2, Youtube, TrendingUp, AlertCircle, Play, FileText, Settings, HelpCircle, Wand2 } from 'lucide-react';
import { AIProviderSettings, TrendFilters, TrendAnalysisResult } from '../types';
import { apiAnalyzeTrends } from '../apiService';

interface Props {
  aiConfig: AIProviderSettings;
  onSelectTrend?: (prompt: string) => void;
}

export function TrendAnalyzer({ aiConfig, onSelectTrend }: Props) {
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filters, setFilters] = useState<TrendFilters>({
    timeframe: '7d',
    videoType: 'any',
    category: '0',
    targetAudience: 'high_rpm',
    keyword: '',
    minViews: '100000'
  });
  const [result, setResult] = useState<TrendAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('flowprompt-yt-key');
    if (savedKey) setYoutubeApiKey(savedKey);
    else setShowSettings(true); // Show settings if no key
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

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiAnalyzeTrends(filters, youtubeApiKey, aiConfig);
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
      {/* Header & Settings Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Phân tích Xu hướng YouTube
        </h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800'}`}
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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            />
            <div className="flex gap-2 items-start text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
              <HelpCircle className="w-4 h-4 shrink-0 text-zinc-500 mt-0.5" />
              <p>
                Công cụ này sử dụng API chính thức của YouTube để tìm kiếm dữ liệu thật. 
                Bạn cần tạo dự án trên <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Google Cloud Console</a>, 
                kích hoạt <strong>YouTube Data API v3</strong> và tạo API Key (miễn phí 10,000 query/ngày).
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

      {/* Filter Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Thời gian</label>
            <select
              value={filters.timeframe}
              onChange={e => setFilters({ ...filters, timeframe: e.target.value as any })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="24h">24 giờ qua (Hot Trend)</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">3 tháng qua (Bền vững)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Định dạng</label>
            <select
              value={filters.videoType}
              onChange={e => setFilters({ ...filters, videoType: e.target.value as any })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="any">Tất cả định dạng</option>
              <option value="short">Shorts (Dưới 4 phút)</option>
              <option value="long">Video dài (Trên 20 phút)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Chủ đề</label>
            <select
              value={filters.category}
              onChange={e => setFilters({ ...filters, category: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="0">Mọi chủ đề</option>
              <option value="24">Giải trí</option>
              <option value="10">Âm nhạc</option>
              <option value="20">Gaming</option>
              <option value="27">Giáo dục</option>
              <option value="28">Khoa học & Công nghệ</option>
              <option value="22">Mọi người & Blog</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Khán giả / Quốc gia</label>
            <select
              value={filters.targetAudience}
              onChange={e => setFilters({ ...filters, targetAudience: e.target.value as any })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="high_rpm">High RPM (Âu/Mỹ/Global)</option>
              <option value="global">Toàn cầu (Trending chung)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Từ khóa hạt giống (Tùy chọn)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Nhập chủ đề (VD: AI automation, lofi music...)"
                value={filters.keyword}
                onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Lọc View Tối Thiểu</label>
            <select
              value={filters.minViews}
              onChange={e => setFilters({ ...filters, minViews: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:border-purple-500/50 focus:outline-none transition-colors"
            >
              <option value="0">Không giới hạn</option>
              <option value="10000">Trên 10.000 views</option>
              <option value="50000">Trên 50.000 views</option>
              <option value="100000">Trên 100.000 views</option>
              <option value="500000">Trên 500.000 views</option>
              <option value="1000000">Trên 1.000.000 views</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`w-full py-3.5 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            isAnalyzing
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang phân tích dữ liệu & lọc rác...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Săn lùng xu hướng
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Tổng quan Thị trường
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {result.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.trends?.map((trend, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-purple-500/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-zinc-100 text-lg leading-tight">{trend.keyword}</h4>
                  <div className="flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-medium text-purple-400">Điểm: {trend.score}/100</span>
                  </div>
                </div>
                
                <p className="text-sm text-zinc-400 mb-4">{trend.reason}</p>
                
                {trend.examples?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Ví dụ nổi bật</div>
                    <ul className="space-y-1.5">
                      {trend.examples.map((ex, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                          <Play className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl mt-auto mb-3">
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">Gợi ý làm Video</div>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">"{trend.suggestedPrompt}"</p>
                </div>

                {onSelectTrend && (
                  <button
                    onClick={() => onSelectTrend(trend.suggestedPrompt)}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    Tạo Prompt từ Trend này
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
