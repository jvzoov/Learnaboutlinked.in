
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage } from '../types';
import { ICONS } from '../constants';

const ImageView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '3:4' | '4:3'>('1:1');

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImg: GeneratedImage = {
          id: Date.now().toString(),
          url: imageUrl,
          prompt,
          timestamp: Date.now(),
        };
        setImages(prev => [newImg, ...prev]);
        setPrompt('');
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 h-full flex flex-col">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ICONS.Image /> Create New Image
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>
          <div className="flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-2">
              {(['1:1', '16:9', '9:16', '3:4', '4:3'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                    aspectRatio === ratio 
                      ? 'bg-blue-600 border-blue-500' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? <><ICONS.Loader /> Generating...</> : <><ICONS.Plus /> Generate</>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {images.map(img => (
            <div key={img.id} className="group relative bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
              <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
              <div className="p-4">
                <p className="text-sm text-slate-300 line-clamp-2">{img.prompt}</p>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = img.url;
                    link.download = `gemini-gen-${img.id}.png`;
                    link.click();
                  }}
                  className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Download Image
                </button>
              </div>
            </div>
          ))}
          {images.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 opacity-30">
              <p>Your generated masterpieces will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageView;
