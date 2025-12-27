import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FaPaperPlane, FaUserTie, FaBriefcase, FaMagic, FaSpinner, FaCopy, FaCheck, FaFileUpload } from 'react-icons/fa';
import { MdContentCopy } from "react-icons/md";
import pdfToText from 'react-pdftotext';

const JobAssistant = () => {
  const model = 'gemini-2.5-flash';
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const calculateMatchScore = (resume, jd) => {
    const resumeWords = new Set(resume.toLowerCase().match(/\b(\w+)\b/g));
    const jdWords = jd.toLowerCase().match(/\b(\w+)\b/g);

    const importantKeywords = [...new Set(jdWords.filter(word => word.length > 4))];
    const matches = importantKeywords.filter(word => resumeWords.has(word));

    const score = Math.round((matches.length / importantKeywords.length) * 100);
    return { score, matches: matches.slice(0, 5) };
  };

  const checkForEmial = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const hasEmail = emailRegex.test(text);
    return hasEmail;
  }

  const scrollToBottom = () => {
    if (!messagesEndRef.current) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      pdfToText(file)
        .then(text => {
          setResume(text);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to extract text from pdf", error);
          alert("Failed to read PDF. Please try copying the text manually.");
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) return;

    // Add user message to UI immediately
    const userMessage = {
      role: 'user',
      content: "Here are my details. Please analyze them.",
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const prompt = `
        You are an expert Career Consultant.
        
        TASK:
        Analyze the following Resume against the Job Description (JD).
        
        OUTPUT FORMAT:
        Return a clean, structured response using Markdown headers (#, ##) and bullet points.
        Include these 4 sections:
        1. **Missing Critical Skills** (What is in JD but not in Resume?)
        2. **Strong Matches** (What matches well?)
        3. **Resume Suggestions** (Specific actionable tips)
        4. **Interview Prep** (3 technical questions based on the gaps)

        RESUME:
        ${resume}

        JOB DESCRIPTION:
        ${jobDescription}
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt
      });

      const aiResponseText = response.text || "I couldn't generate an analysis. Please try again.";

      const aiMessage = {
        role: 'ai',
        content: aiResponseText,
        type: 'analysis'
      };

      setMessages(prev => [...prev, aiMessage]);

      const matchScore = calculateMatchScore(resume, jobDescription);

      if (matchScore.score > 0.4 && matchScore.score < 0.6) {
        const message = {
          role: 'ai',
          content: "You have limited number of keywords match in your cv with your job description , consider adding more similar words so the evaluation pannel understands that you went through the JD carefully",
          type: 'analysis'
        };

        setMessages(prev => [...prev, message]);

      } else if (matchScore.score <= 0.4) {
        const message = {
          role: 'ai',
          content: "You have very few number of keywords match in your cv with your job description , Please add more similar words so the evaluation pannel understands that you went through the JD carefully",
          type: 'analysis'
        };

        setMessages(prev => [...prev, message]);
      } else {
        const message = {
          role: 'ai',
          content: "You have good amount of keywords match in your cv with your job description.",
          type: 'analysis'
        };

        setMessages(prev => [...prev, message]);
      }

      if(!checkForEmial(resume)){
        const message = {
          role: 'ai',
          content: "You've missed to include your email in your resume, consider adding it so the interview panel can follow up.",
          type: 'analysis'
        };

        setMessages(prev => [...prev, message]);
      }

      setResume('');
      setJobDescription('');

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Something went wrong with the API.", type: 'error' }]);
    }
    setLoading(false);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">


      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <FaMagic className="text-xl" />
          <span className="text-xl font-medium tracking-tight">JobAI Assistant</span>
        </div>
        <div className="text-xs text-gray-400">Powered by {model}</div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-60">
            <FaUserTie className="text-6xl mb-4" />
            <p className="text-lg">Paste your Resume and Job Description below to start.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>


            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-1">
                <FaMagic size={14} />
              </div>
            )}


            <div className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-sm leading-relaxed ${msg.role === 'user'
              ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
              }`}>


              <div className="whitespace-pre-wrap text-sm md:text-base">
                {msg.content}
              </div>

              {msg.role === 'ai' && (
                <button
                  onClick={() => copyToClipboard(msg.content, idx)}
                  className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-black transition-colors"
                  title="Copy Analysis"
                >
                  {copiedIndex === idx ? <FaCheck size={14} /> : <MdContentCopy size={14} />}
                </button>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                <FaUserTie size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
              <FaMagic size={14} />
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
              <FaSpinner className="animate-spin text-blue-400" />
              {resume && !jobDescription ? "Extracting PDF text..." : "Analyzing your profile..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>


      <footer className="p-4 bg-white">
        <div className="max-w-4xl mx-auto border border-gray-300 rounded-3xl p-2 shadow-lg hover:shadow-xl transition-shadow duration-300 focus-within:ring-2 focus-within:ring-black/5 relative bg-gray-50">

          <div className="flex flex-col md:flex-row gap-2 p-2">

            <div className="flex-1 relative group">
              <div className="absolute top-3 left-3 z-10 flex gap-2">
                <FaUserTie className="text-gray-400 group-focus-within:text-black mt-1" />
              </div>

              <button
                onClick={() => { if (fileInputRef.current) fileInputRef.current.click() }}
                className="absolute top-2 right-2 z-20 p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 text-gray-500 text-xs flex items-center gap-1 shadow-sm"
                title="Upload PDF Resume"
              >
                <FaFileUpload /> <span className="hidden sm:inline">Upload PDF</span>
              </button>
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className='hidden'
              />

              <textarea
                className="w-full bg-transparent p-3 pl-10 pt-10 md:pt-3 text-sm outline-none resize-none h-20 md:h-24 placeholder:text-gray-400"
                placeholder="Paste Resume text OR Upload PDF ->"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-2"></div>

            {/* JD Input */}
            <div className="flex-1 relative group">
              <FaBriefcase className="absolute top-3 left-3 text-gray-400 group-focus-within:text-black" />
              <textarea
                className="w-full bg-transparent p-3 pl-10 text-sm outline-none resize-none h-20 md:h-24 placeholder:text-gray-400"
                placeholder="Paste Job Description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="absolute bottom-4 right-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !resume || !jobDescription}
              className={`p-3 rounded-full transition-all duration-200 ${loading || !resume || !jobDescription
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 hover:scale-105 shadow-md'
                }`}
            >
              <FaPaperPlane size={16} />
            </button>
          </div>

        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </footer>
    </div>
  );
};

export default JobAssistant;
