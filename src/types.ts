export interface PromptSettings {
  videoStyle: string;
  videoCamera: string;
  videoLighting: string;
  videoAspectRatio: string;
  isLoop: boolean;
  avoidFaces: boolean;
  musicGenre: string;
  musicMood: string;
  musicTempo: string;
  musicVocals: string;
  multiShot: boolean;
  generateSFX: boolean;
  generateSEO: boolean;
  generateVoiceover: boolean;
  storyTelling: string;
  platformTarget: string;
}

export interface AIProviderSettings {
  provider: 'gemini' | 'fireworks' | 'custom';
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GeneratedPrompts {
  videoPrompt: string;
  videoPromptVi?: string;
  negativeVideoPrompt?: string;
  musicPrompt: string;
  musicPromptVi?: string;
  shotPrompts?: string[];
  sfxPrompts?: string[];
  youtubeTitle?: string;
  youtubeDescription?: string;
  youtubeTags?: string[];
  thumbnailPrompt?: string;
  thumbnailIdeas?: { ideaVi: string; exactPromptEn: string }[];
  aiDisclaimer?: string;
  voiceoverScript?: string;
}

export interface HistoryItem {
  id: string;
  originalIdea: string;
  settings?: PromptSettings;
  prompts: GeneratedPrompts;
  timestamp: number;
}

export interface TrendFilters {
  timeframe: '24h' | '7d' | '30d' | '90d';
  videoType: 'any' | 'short' | 'long';
  category: string;
  targetAudience: 'high_rpm' | 'global';
  keyword: string;
  minViews: string;
}

export interface TrendItem {
  keyword: string;
  score: number;
  reason: string;
  examples: string[];
  suggestedPrompt: string;
}

export interface TrendAnalysisResult {
  trends: TrendItem[];
  summary: string;
}

export interface VideoAnalysisResult {
  originalStats: {
    title: string;
    views: string;
    likes: string;
    tags: string[];
  };
  suggestedTitles: string[];
  hooks: {
    type: string;
    script: string;
    reason: string;
  }[];
  seoStrategy: string;
}

