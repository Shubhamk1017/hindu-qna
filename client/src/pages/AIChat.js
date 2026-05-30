import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AIChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [sessions, setSessions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/ai/sessions');
      setSessions(res.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage, sessionId });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.message,
        relatedQuestions: res.data.relatedQuestions
      }]);
    } catch (error) {
      toast.error('Error getting response from AI');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }
    setLoading(false);
  };

  const renderMarkdown = (content) => (
    <ReactMarkdown
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }
          return <code className={className} {...props}>{children}</code>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold mb-4">AI Hindu Assistant</h1>
        <p className="text-gray-600 mb-6">Please login to use the AI chat feature.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Hindu Assistant</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-3">Sessions</h3>
            <div className="space-y-2">
              {sessions.map(session => (
                <div key={session.sessionId} className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer">
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <FiMessageSquare size={48} className="mx-auto mb-4 text-orange-300" />
                  <p>Ask me anything about Hinduism, scriptures, or practices.</p>
                  <p className="text-sm mt-2">I can cite verses from Bhagavad Gita, Upanishads, Puranas, and more.</p>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        {renderMarkdown(msg.content)}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    
                    {msg.relatedQuestions?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Related questions:</p>
                        <ul className="text-xs space-y-1">
                          {msg.relatedQuestions.map(q => (
                            <li key={q._id}>
                              <a href={`/questions/${q._id}`} className="text-orange-600 hover:underline">
                                {q.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 border rounded-lg px-4 py-2"
                  placeholder="Ask about Hinduism..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <FiSend />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
