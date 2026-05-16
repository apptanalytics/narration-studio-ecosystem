'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Languages, CheckCircle, AlertCircle, Download, FileText, Table } from 'lucide-react';

interface Segment {
  time: number;
  khmer: string;
  english: string;
  tone?: string;
}

export default function KhmerTranscriber() {
  const [isUploading, setIsUploading] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const khmerPanelRef = useRef<HTMLDivElement>(null);
  const englishPanelRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSegments([]);
    setActiveSegmentIndex(-1);
    
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Expecting an array from the new Gemini prompt
      setSegments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  // Sync Logic: Watch the playhead
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || segments.length === 0) return;

    const onTimeUpdate = () => {
      // Add a small 0.5s buffer so the highlight doesn't feel "ahead" of the audio
      const currentTime = Math.max(0, audio.currentTime - 0.5);
      
      // Find the segment that matches the current time
      const index = segments.findIndex((s, i) => {
        const nextTime = segments[i + 1]?.time || Infinity;
        return currentTime >= s.time && currentTime < nextTime;
      });

      if (index !== -1 && index !== activeSegmentIndex) {
        setActiveSegmentIndex(index);
        // Sync scroll
        scrollToIndex(index);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [segments, activeSegmentIndex]);

  const scrollToIndex = (index: number) => {
    const khmerSegment = khmerPanelRef.current?.querySelector(`[data-index="${index}"]`);
    const englishSegment = englishPanelRef.current?.querySelector(`[data-index="${index}"]`);
    
    if (khmerSegment) khmerSegment.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (englishSegment) englishSegment.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const downloadFile = (format: 'json' | 'txt' | 'csv') => {
    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'json') {
      content = JSON.stringify(segments, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'csv') {
      const csvHeader = 'Time,Khmer,English\n';
      const csvRows = segments.map(s => `"${s.time}","${s.khmer.replace(/"/g, '""')}","${s.english.replace(/"/g, '""')}"`).join('\n');
      content = '\uFEFF' + csvHeader + csvRows; // Add BOM for Excel UTF-8 support
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else {
      content = segments.map(s => `[${s.time}s]\nKHMER: ${s.khmer}\nENGLISH: ${s.english}\n---`).join('\n\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `khmer_transcription_${Date.now()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <main className="main-container">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p className="tagline">Transcription Studio</p>
        <h1 className="logo">KHMER.STUDIO</h1>
        <p style={{ color: '#8C847C', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Powered by Gemini 3.1 Flash
        </p>
      </div>

      {segments.length === 0 && !isUploading && (
        <div 
          className="upload-card" 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
          }}
        >
          <div style={{ background: '#F5F1E9', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Upload color="#8DA399" size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'serif', color: '#3D3834' }}>Upload your recording</h2>
          <p style={{ color: '#8C847C', textAlign: 'center', maxWidth: '300px' }}>Drop your Khmer audio file here to begin the transcription and translation process.</p>
          <input type="file" ref={fileInputRef} onChange={onFileChange} accept="audio/*" style={{ display: 'none' }} />
        </div>
      )}

      {isUploading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p style={{ fontSize: '1.25rem', fontFamily: 'serif', color: '#3D3834', marginTop: '1rem' }}>Analyzing Khmer Dialogue...</p>
          <p style={{ color: '#8C847C' }}>Our AI is listening and translating your recording.</p>
        </div>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1.25rem', borderRadius: '16px', display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#B91C1C', marginBottom: '2rem' }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {audioUrl && (
        <div className="player-container">
          <p className="player-label">Audio Reference</p>
          <audio ref={audioRef} controls src={audioUrl}></audio>
        </div>
      )}

      {segments.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => downloadFile('txt')} className="export-btn">
            <FileText size={16} /> Export TXT
          </button>
          <button onClick={() => downloadFile('csv')} className="export-btn">
            <Table size={16} /> Export CSV
          </button>
          <button onClick={() => downloadFile('json')} className="export-btn">
            <Download size={16} /> Full JSON
          </button>
        </div>
      )}

      {segments.length > 0 && (
        <div className="viewer-grid">
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Khmer Transcript</span></div>
            <div className="panel-content khmer-text" ref={khmerPanelRef}>
              {segments.map((s, i) => (
                <div 
                  key={i} 
                  data-index={i}
                  className={`segment ${activeSegmentIndex === i ? 'active' : ''}`}
                  onClick={() => { if (audioRef.current) audioRef.current.currentTime = s.time; }}
                >
                  {s.tone && <div className="tone-badge">{s.tone}</div>}
                  <div className="khmer-text">{s.khmer}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="panel-title">English Translation</span></div>
            <div className="panel-content english-text" ref={englishPanelRef}>
              {segments.map((s, i) => (
                <div 
                  key={i} 
                  data-index={i}
                  className={`segment ${activeSegmentIndex === i ? 'active' : ''}`}
                  onClick={() => { if (audioRef.current) audioRef.current.currentTime = s.time; }}
                >
                  {s.tone && <div className="tone-badge">{s.tone}</div>}
                  <div className="english-text">{s.english}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(segments.length > 0 || error) && !isUploading && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button 
            onClick={() => { setSegments([]); setError(null); setAudioUrl(null); }}
            style={{ padding: '1rem 2.5rem', background: '#3D3834', color: 'white', border: 'none', borderRadius: '100px', fontWeight: 600, cursor: 'pointer' }}
          >
            New Transcription
          </button>
        </div>
      )}
    </main>
  );
}
