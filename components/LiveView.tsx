
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ICONS } from '../constants';
import { createBlob, decode, decodeAudioData } from '../services/audioUtils';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<number | null>(null);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsCameraOn(false);
  }, []);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCameraOn });
      if (videoRef.current && isCameraOn) {
        videoRef.current.srcObject = stream;
      }

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a helpful and charismatic AI assistant capable of seeing and hearing the user in real-time. Respond naturally and keep it conversational.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            if (isCameraOn && canvasRef.current && videoRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              intervalRef.current = window.setInterval(() => {
                if (ctx && videoRef.current && canvasRef.current) {
                  canvasRef.current.width = videoRef.current.videoWidth;
                  canvasRef.current.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                  canvasRef.current.toBlob(async (blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        sessionPromise.then(session => {
                          session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                        });
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', 0.6);
                }
              }, 1000);
            }
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setTranscriptions(prev => [...prev.slice(-10), `Gemini: ${message.serverContent.outputTranscription.text}`]);
            } else if (message.serverContent?.inputTranscription) {
              setTranscriptions(prev => [...prev.slice(-10), `You: ${message.serverContent.inputTranscription.text}`]);
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Session error:', e);
            stopSession();
          },
          onclose: () => stopSession()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Access error:', err);
      alert('Microphone and Camera permissions are needed for the Live experience.');
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-4 overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden mb-6">
        {/* Video / Visual Feedback Area */}
        <div className="flex-[2] bg-slate-900 border border-slate-700 rounded-3xl relative overflow-hidden shadow-2xl flex items-center justify-center">
          {isCameraOn ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[20%]" />
          ) : (
            <div className="text-center space-y-4">
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${isActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-800 border border-slate-700'}`}>
                <ICONS.Live />
              </div>
              <p className="text-slate-400 font-medium">{isActive ? 'Gemini is listening...' : 'Start a live conversation'}</p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {isActive && (
            <div className="absolute bottom-4 left-4 flex gap-1 items-end h-8">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-blue-500 rounded-full animate-bounce" 
                  style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Transcription Area */}
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-3xl p-6 flex flex-col shadow-xl overflow-hidden">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Live Transcription</h3>
          <div className="flex-1 overflow-y-auto space-y-4 scroll-smooth">
            {transcriptions.map((t, i) => (
              <p key={i} className={`text-sm ${t.startsWith('You:') ? 'text-blue-400' : 'text-slate-200'}`}>{t}</p>
            ))}
            {transcriptions.length === 0 && <p className="text-sm text-slate-500 italic">Conversation logs will appear here...</p>}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-6 pb-8">
        <button
          onClick={() => setIsCameraOn(!isCameraOn)}
          disabled={isActive}
          className={`p-5 rounded-full transition-all border-2 ${
            isCameraOn 
              ? 'bg-blue-600/20 border-blue-500 text-blue-500' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
          } disabled:opacity-30`}
          title="Toggle Camera"
        >
          <ICONS.Plus />
        </button>

        <button
          onClick={isActive ? stopSession : startSession}
          className={`px-12 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center gap-3 ${
            isActive 
              ? 'bg-red-600 hover:bg-red-500 text-white' 
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isActive ? 'End Live Session' : 'Go Live Now'}
          {isActive ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> : <ICONS.Live />}
        </button>

        <div className="p-5 opacity-0 pointer-events-none">
           <ICONS.Plus />
        </div>
      </div>
    </div>
  );
};

export default LiveView;
