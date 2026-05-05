"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Settings, Phone, Send } from 'lucide-react';
import './interview.css';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function InterviewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [interviewTime, setInterviewTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Start camera on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: isMicOn,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
      }
    };

    if (isCameraOn) {
      startCamera();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isCameraOn, isMicOn]);

  // Interview timer
  useEffect(() => {
    if (!isInterviewStarted) return;

    const timer = setInterval(() => {
      setInterviewTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isInterviewStarted]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const toggleMicrophone = () => {
    setIsMicOn(!isMicOn);
  };

  const startInterview = () => {
    setIsInterviewStarted(true);
    const aiGreeting: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text: "Hello! Welcome to your AI interview session. I'm your interviewer today. Let's start with an introductory question. Can you tell me about yourself and your professional background?",
      timestamp: new Date(),
    };
    setMessages([aiGreeting]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponses = [
        "That's great! Can you elaborate on your experience with relevant skills?",
        "Interesting perspective. How did you approach that particular challenge?",
        "Thank you for sharing. Could you explain your thought process in more detail?",
        "Excellent answer. Let's move on to the next question about this topic.",
        "I see. Can you provide a specific example of when you used this skill?"
      ];

      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: randomResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const endInterview = () => {
    // Save interview data to session storage
    sessionStorage.setItem('interviewData', JSON.stringify({
      duration: interviewTime,
      messagesCount: messages.length,
      completedAt: new Date().toISOString(),
    }));
    router.push('/performance');
  };

  return (
    <div className="interview-container">
      {/* Header */}
      <div className="interview-header">
        <div className="header-left">
          <h1>AI Interview Session</h1>
          <span className="interview-timer">⏱️ {formatTime(interviewTime)}</span>
        </div>
        <button 
          className="btn-end-interview"
          onClick={endInterview}
          disabled={!isInterviewStarted}
        >
          <Phone size={18} />
          End Interview
        </button>
      </div>

      {/* Main Interview Area */}
      <div className="interview-content">
        {/* AI Interviewer Panel (Left) */}
        <div className="ai-panel">
          <div className="ai-header">
            <h2>AI Interviewer</h2>
          </div>
          <div className="ai-video-placeholder">
            <div className="ai-avatar">
              <span>AI</span>
            </div>
            <p className="ai-status">
              {isInterviewStarted ? 'Listening...' : 'Ready to start'}
            </p>
          </div>
        </div>

        {/* User Camera Panel (Right) */}
        <div className="user-panel">
          <div className="user-header">
            <h2>Your Camera</h2>
            <div className="camera-indicators">
              <span className={`indicator ${isCameraOn ? 'on' : 'off'}`}>
                {isCameraOn ? '🟢' : '🔴'} Camera
              </span>
              <span className={`indicator ${isMicOn ? 'on' : 'off'}`}>
                {isMicOn ? '🟢' : '🔴'} Microphone
              </span>
            </div>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="user-video"
          />
          <div className="camera-controls">
            <button
              className={`control-btn ${!isCameraOn ? 'disabled' : ''}`}
              onClick={toggleCamera}
              title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              className={`control-btn ${!isMicOn ? 'disabled' : ''}`}
              onClick={toggleMicrophone}
              title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              className="control-btn settings-btn"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="interview-chat">
        <div className="chat-header">
          <h3>Interview Chat</h3>
        </div>
        <div className="chat-messages">
          {!isInterviewStarted ? (
            <div className="welcome-message">
              <h3>Welcome to Your Interview</h3>
              <p>Click "Start Interview" to begin your session with the AI interviewer.</p>
              <button 
                className="btn-start-interview"
                onClick={startInterview}
              >
                Start Interview
              </button>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div className="message-content">
                  <strong>{msg.sender === 'ai' ? '🤖 AI Interviewer' : '👤 You'}</strong>
                  <p>{msg.text}</p>
                  <small>{msg.timestamp.toLocaleTimeString()}</small>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="chat-message ai loading">
              <div className="message-content">
                <strong>🤖 AI Interviewer</strong>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isInterviewStarted && (
          <div className="chat-input-area">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your response..."
              className="chat-input"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="btn-send"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
