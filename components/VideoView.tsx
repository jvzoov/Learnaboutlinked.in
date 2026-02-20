
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedVideo } from '../types';
import { ICONS } from '../constants';

const VideoView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleSelectKey = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions to avoid race conditions
      setHasApiKey(true);
    }
  };

  const generateVideo = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);

      const newVideo: GeneratedVideo = {
        id: Date.now().toString(),
        url: videoUrl,
        prompt,
        status: 'completed',
        timestamp: Date.now(),
      };
      setVideos(prev => [newVideo, ...prev]);
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert("Failed to generate video.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ICONS.Settings />
          </div>
          <h2 className="text-2xl font-bold mb-4">Paid API Key Required</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Video generation with Veo requires a paid API key from a Google Cloud Project. 
            Please link your project to continue.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="block mb-6 text-sm text-blue-400 hover:underline"
          >
            Learn about billing →
          </a>
          <button
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 h-full flex flex-col">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ICONS.Video /> Generate Video (Veo)
        </h2>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A drone shot of a futuristic cyberpunk city at night with neon lights..."
            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
          <button
            onClick={generateVideo}
            disabled={!prompt.trim() || isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {isGenerating ? <><ICONS.Loader /> Processing (May take a few minutes)...</> : <><ICONS.Plus /> Create Video</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
          {videos.map(video => (
            <div key={video.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <video 
                src={video.url} 
                controls 
                className="w-full aspect-video bg-black"
                poster="https://picsum.photos/800/450"
              />
              <div className="p-4">
                <p className="text-slate-200">{video.prompt}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-slate-500">{new Date(video.timestamp).toLocaleString()}</span>
                  <a 
                    href={video.url} 
                    download={`veo-gen-${video.id}.mp4`}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Download MP4
                  </a>
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && !isGenerating && (
            <div className="col-span-full text-center py-20 opacity-30">
              <p>Your cinematic creations will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoView;
