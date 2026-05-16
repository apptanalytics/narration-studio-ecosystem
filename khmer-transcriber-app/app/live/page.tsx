'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Languages, MessageSquare, Zap } from 'lucide-react';

export default function KhmerLive() {
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<{ khmer: string; english: string }[]>([]);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start/Stop Listening
  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      setIsListening(true);
      setCurrentStatus('Listening...');

      // Process in bursts
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) processAudioBurst(e.data);
      };

      recorder.start();

      // Every 4 seconds, we "slice" the audio and send it
      intervalRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          recorder.start();
        }
      }, 4000);

    } catch (err) {
      console.error('Mic Error:', err);
      setCurrentStatus('Mic Error');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setCurrentStatus('Ready');
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const processAudioBurst = async (audioBlob: Blob) => {
    setCurrentStatus('Translating...');
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'burst.webm');

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      // If it's a "silent" burst or empty, data might be malformed or empty array
      if (Array.isArray(data) && data.length > 0) {
        // We take the first meaningful segment
        const segment = data[0];
        if (segment.khmer.trim()) {
          setHistory(prev => [{ khmer: segment.khmer, english: segment.english }, ...prev]);
        }
      }
      
      setCurrentStatus('Listening...');
    } catch (err) {
      console.error('Live Error:', err);
    }
  };

  return (
    <main className="main-container">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p className="tagline">Live Translation Mode</p>
        <h1 className="logo">KHMER.LIVE</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        {/* Pulse Button */}
        <button 
          onClick={toggleListening}
          className={`upload-card ${isListening ? 'listening' : ''}`}
          style={{ 
            width: '200px', 
            height: '200px', 
            borderRadius: '50%', 
            padding: 0,
            justifyContent: 'center',
            position: 'relative',
            border: isListening ? '2px solid var(--accent)' : '1px solid var(--border)'
          }}
        >
          {isListening ? (
            <div className="pulse-ring"></div>
          ) : null}
          {isListening ? <MicOff size={48} color="#ef4444" /> : <Mic size={48} color="#8DA399" />}
          <p style={{ 
            position: 'absolute', 
            bottom: '-40px', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: isListening ? '#ef4444' : '#8C847C' 
          }}>
            {isListening ? 'STOP RECORDING' : 'START LIVE MODE'}
          </p>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8DA399', fontSize: '0.875rem' }}>
          <Zap size={14} fill="currentColor" />
          {currentStatus}
        </div>

        {/* Live Feed */}
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((item, i) => (
            <div key={i} className="panel" style={{ padding: '1.5rem', animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <p className="player-label" style={{ marginBottom: '0.5rem' }}>Khmer</p>
                  <p style={{ fontSize: '1.25rem', color: '#3D3834' }}>{item.khmer}</p>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                  <p className="player-label" style={{ marginBottom: '0.5rem' }}>English</p>
                  <p style={{ color: '#4A443F' }}>{item.english}</p>
                </div>
              </div>
            </div>
          ))}

          {history.length === 0 && !isListening && (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '4rem' }}>
              Speak now to see real-time translations...
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .listening {
          background: #fff !important;
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.1) !important;
        }
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid var(--accent);
          animation: pulse 2s infinite;
          opacity: 0;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </main>
  );
}
