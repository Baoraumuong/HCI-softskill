"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ArrowRight, BarChart3 } from 'lucide-react';
import './configuration.css';

interface InterviewConfig {
  interviewType: 'behavioral' | 'technical' | 'domain' | '';
  difficulty: 'easy' | 'intermediate' | 'hard' | '';
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  recordingEnabled: boolean;
}

interface InterviewStats {
  completedInterviews: number;
  averageScore: number;
  currentStreak: number;
}

export default function ConfigurationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<InterviewConfig>({
    interviewType: '',
    difficulty: '',
    cameraEnabled: true,
    microphoneEnabled: true,
    recordingEnabled: false,
  });

  const [stats] = useState<InterviewStats>({
    completedInterviews: 5,
    averageScore: 7.4,
    currentStreak: 2,
  });

  const interviewTypes = [
    {
      id: 'behavioral',
      name: 'Behavioral',
      description: 'Questions about your experiences and soft skills',
      icon: '💬',
    },
    {
      id: 'technical',
      name: 'Technical',
      description: 'Questions about technical knowledge and problem-solving',
      icon: '💻',
    },
    {
      id: 'domain',
      name: 'Domain-Specific',
      description: 'Questions specific to your industry or role',
      icon: '🎯',
    },
  ];

  const difficultyLevels = [
    { id: 'easy', name: 'Easy', description: 'Beginner level questions' },
    { id: 'intermediate', name: 'Intermediate', description: 'Moderate difficulty' },
    { id: 'hard', name: 'Hard', description: 'Advanced challenges' },
  ];

  const handleStartInterview = () => {
    if (!config.interviewType || !config.difficulty) {
      alert('Please select interview type and difficulty level');
      return;
    }

    // Save configuration to session storage
    sessionStorage.setItem('interviewConfig', JSON.stringify(config));
    router.push('/interview');
  };

  const handleTypeSelect = (typeId: string) => {
    setConfig(prev => ({
      ...prev,
      interviewType: typeId as 'behavioral' | 'technical' | 'domain',
    }));
  };

  const handleDifficultySelect = (diffId: string) => {
    setConfig(prev => ({
      ...prev,
      difficulty: diffId as 'easy' | 'intermediate' | 'hard',
    }));
  };

  const toggleSetting = (key: keyof InterviewConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="configuration-container">
      {/* Header */}
      <div className="configuration-header">
        <div className="header-content">
          <h1>Interview Configuration</h1>
          <p className="subtitle">Customize your interview experience</p>
        </div>
        <Settings size={32} className="header-icon" />
      </div>

      <div className="configuration-content">
        {/* Left Column - Settings */}
        <div className="settings-section">
          {/* Interview Type Selection */}
          <div className="config-card">
            <div className="card-header">
              <h2>Interview Type</h2>
              <span className="card-description">Select the type of interview</span>
            </div>
            <div className="interview-types">
              {interviewTypes.map(type => (
                <button
                  key={type.id}
                  className={`type-option ${config.interviewType === type.id ? 'selected' : ''}`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <div className="type-icon">{type.icon}</div>
                  <div className="type-content">
                    <div className="type-name">{type.name}</div>
                    <div className="type-description">{type.description}</div>
                  </div>
                  {config.interviewType === type.id && <div className="checkmark">✓</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level Selection */}
          <div className="config-card">
            <div className="card-header">
              <h2>Difficulty Level</h2>
              <span className="card-description">Choose your challenge level</span>
            </div>
            <div className="difficulty-options">
              {difficultyLevels.map(level => (
                <button
                  key={level.id}
                  className={`difficulty-option ${config.difficulty === level.id ? 'selected' : ''}`}
                  onClick={() => handleDifficultySelect(level.id)}
                >
                  <div className="difficulty-content">
                    <div className="difficulty-name">{level.name}</div>
                    <div className="difficulty-description">{level.description}</div>
                  </div>
                  <div className={`difficulty-badge ${level.id}`}>
                    {level.id === 'easy' && '●'}
                    {level.id === 'intermediate' && '●●'}
                    {level.id === 'hard' && '●●●'}
                  </div>
                  {config.difficulty === level.id && <div className="checkmark">✓</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Device Settings */}
          <div className="config-card">
            <div className="card-header">
              <h2>Device Settings</h2>
              <span className="card-description">Configure your devices</span>
            </div>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Camera</div>
                  <div className="setting-description">Enable your webcam during interview</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.cameraEnabled}
                    onChange={() => toggleSetting('cameraEnabled')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Microphone</div>
                  <div className="setting-description">Enable microphone for voice input</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.microphoneEnabled}
                    onChange={() => toggleSetting('microphoneEnabled')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Recording</div>
                  <div className="setting-description">Save session for review later</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.recordingEnabled}
                    onChange={() => toggleSetting('recordingEnabled')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            className="btn-start-interview"
            onClick={handleStartInterview}
            disabled={!config.interviewType || !config.difficulty}
          >
            <span>Start Interview</span>
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Right Column - Statistics & Summary */}
        <div className="sidebar-section">
          {/* Statistics */}
          <div className="stats-card">
            <h3>Your Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.completedInterviews}</div>
                <div className="stat-label">Interviews</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.averageScore}</div>
                <div className="stat-label">Avg Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.currentStreak}</div>
                <div className="stat-label">Streak</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="summary-card">
            <h3>Current Configuration</h3>
            <div className="summary-list">
              <div className="summary-item">
                <span className="summary-label">Type:</span>
                <span className="summary-value">
                  {config.interviewType
                    ? interviewTypes.find(t => t.id === config.interviewType)?.name
                    : 'Not selected'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Difficulty:</span>
                <span className="summary-value">
                  {config.difficulty
                    ? config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)
                    : 'Not selected'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Camera:</span>
                <span className={`summary-value ${config.cameraEnabled ? 'enabled' : 'disabled'}`}>
                  {config.cameraEnabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Microphone:</span>
                <span className={`summary-value ${config.microphoneEnabled ? 'enabled' : 'disabled'}`}>
                  {config.microphoneEnabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Recording:</span>
                <span className={`summary-value ${config.recordingEnabled ? 'enabled' : 'disabled'}`}>
                  {config.recordingEnabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="tips-card">
            <h3>💡 Tips</h3>
            <ul className="tips-list">
              <li>Ensure good lighting for video</li>
              <li>Test your microphone beforehand</li>
              <li>Find a quiet environment</li>
              <li>Have a notepad nearby</li>
              <li>Take deep breaths before starting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
