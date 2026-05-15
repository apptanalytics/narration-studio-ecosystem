'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Languages, CheckCircle, AlertCircle } from 'lucide-react';

export default function KhmerTranscriber() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ khmer: string; english: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <main className="main-container">
      <header className="header">
        <div className="logo">KHMER.STUDIO</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Powered by Gemini 3.1 Flash</div>
      </header>

      {!result && !isUploading && (
        <div 
          className="upload-card" 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
          }}
        >
          <Upload className="upload-icon" />
          <h2 style={{ fontSize: '1.5rem' }}>Drop your Khmer audio here</h2>
          <p style={{ color: '#94a3b8' }}>MP3, WAV, or M4A (Up to 30MB)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileChange} 
            accept="audio/*" 
            style={{ display: 'none' }} 
          />
        </div>
      )}

      {isUploading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>Analyzing Dialogue...</p>
          <p style={{ color: '#64748b' }}>This takes about a minute for long recordings</p>
        </div>
      )}

      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444', 
          padding: '1rem', 
          borderRadius: '12px',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          color: '#ef4444'
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {result && (
        <div className="viewer-grid">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Khmer Transcription</span>
              <CheckCircle size={16} color="#10b981" />
            </div>
            <div className="panel-content khmer-text">
              {result.khmer}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">English Translation</span>
              <Languages size={16} color="#3b82f6" />
            </div>
            <div className="panel-content english-text">
              {result.english}
            </div>
          </div>
        </div>
      )}

      {result && (
        <button 
          onClick={() => { setResult(null); setError(null); }}
          style={{
            alignSelf: 'center',
            padding: '0.75rem 2rem',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginTop: '1rem'
          }}
        >
          Transcribe another file
        </button>
      )}
    </main>
  );
}
