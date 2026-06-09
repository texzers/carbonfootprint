import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useCarbonData } from '../../hooks/useCarbonData';
import { checkAndIncrementAIQuery } from '../../services/firestore';
import { streamGeminiResponse, buildSystemPrompt, getRuleBasedSuggestions, getCachedTip } from '../../services/gemini';
import { Card, Button, Badge, SectionHeader, LoadingSpinner, ScoreRing, EmptyState } from '../shared';
import { formatCO2, getScoreColor } from '../../utils/carbonCalc';
import { getNationalAverage } from '../../utils/carbonCalc';
import type { ChatMessage, SuggestedAction } from '../../types';

export function EcoCoachPanel({ compact = false }: { compact?: boolean }) {
  const { user, profile, chatMessages, addChatMessage, updateLastMessage, isAIStreaming, setAIStreaming, addNotification } = useAppStore();
  const { score, topCategory, categoryBreakdown } = useCarbonData(30);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const QUICK_REPLIES = [
    'How can I reduce my food emissions?',
    "What's my commute's carbon cost?",
    'Give me 3 quick wins this week',
    'Compare me to the average person',
  ];

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Generate rule-based suggestions
  useEffect(() => {
    if (!profile || !score) return;
    const ctx = buildAIContext();
    setSuggestions(getRuleBasedSuggestions(ctx));
  }, [profile, score, topCategory]);

  function buildAIContext() {
    const nationalAvg = profile ? getNationalAverage(profile.country) : 7000;
    return {
      userName: profile?.displayName?.split(' ')[0] ?? 'there',
      country: profile?.country ?? 'the UK',
      city: profile?.city ?? '',
      weeklyTotal: score?.weekly ?? 0,
      topCategory: topCategory,
      topCategoryKg: categoryBreakdown.find((c) => c.category === topCategory)?.kgCO2e ?? 0,
      trend: score?.trend ?? 'stable',
      goals: [],
      dietType: profile?.dietType ?? 'medium_meat',
      primaryTransport: profile?.primaryTransport ?? 'petrol_car',
      nationalAvg,
    };
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isAIStreaming || !user) return;

    // Check rate limit
    const allowed = await checkAndIncrementAIQuery(user.uid);
    if (!allowed) {
      addNotification({ type: 'warning', message: 'Daily AI query limit reached (20/day). Come back tomorrow!' });
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addChatMessage(userMsg);
    setInput('');

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    addChatMessage(aiMsg);
    setAIStreaming(true);

    abortRef.current = new AbortController();

    try {
      const ctx = buildAIContext();
      const systemPrompt = buildSystemPrompt(ctx);

      const history: Array<{ role: 'user' | 'model'; text: string }> = chatMessages
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.content }));

      let fullContent = '';

      for await (const chunk of streamGeminiResponse(
        [...history, { role: 'user', text }],
        systemPrompt,
        abortRef.current.signal
      )) {
        fullContent += chunk;
        updateLastMessage(fullContent);
      }

      // Mark streaming complete
      updateLastMessage(fullContent || getCachedTip(topCategory));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to cached tip
        updateLastMessage(getCachedTip(topCategory));
        addNotification({ type: 'info', message: 'AI unavailable — showing a cached tip instead.' });
      }
    } finally {
      setAIStreaming(false);
    }
  }, [isAIStreaming, user, chatMessages, topCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setAIStreaming(false);
  };

  if (compact) {
    return <CompactCoachPanel onSend={sendMessage} quickReplies={QUICK_REPLIES} messages={chatMessages} isStreaming={isAIStreaming} chatEndRef={chatEndRef} />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Score overview */}
      <div className="mb-2">
        <h1 className="font-display font-bold text-2xl text-eco-ink">AI Insights</h1>
        <p className="text-eco-slate text-sm mt-1">Your personal EcoCoach powered by Gemini</p>
      </div>

      {score && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 col-span-1 flex items-center gap-4">
            <ScoreRing value={Math.max(0, 100 - (score.daily / 20) * 100)} color={getScoreColor(score.rating)} size={80} strokeWidth={8}
              label={formatCO2(score.daily).split(' ')[0]} sublabel="kg/day" />
            <div>
              <p className="text-xs text-eco-slate uppercase tracking-wide font-medium">Your score</p>
              <p className="font-bold text-lg text-eco-ink capitalize mt-1">{score.rating.replace('_', ' ')}</p>
              <Badge variant={score.trend === 'improving' ? 'green' : score.trend === 'worsening' ? 'red' : 'gray'}>
                {score.trend === 'improving' ? '↓ Improving' : score.trend === 'worsening' ? '↑ Worsening' : '→ Stable'}
              </Badge>
            </div>
          </Card>

          <Card className="p-5 col-span-2">
            <p className="text-xs text-eco-slate uppercase tracking-wide font-medium mb-3">Priority actions</p>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
              {suggestions.length === 0 && (
                <p className="text-eco-slate text-sm">Chat with EcoCoach to get personalised suggestions!</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Chat interface */}
      <Card className="flex flex-col h-[500px]" elevated>
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-eco-forest rounded-xl flex items-center justify-center">
            <span className="text-lg" aria-hidden="true">🌿</span>
          </div>
          <div>
            <p className="font-semibold text-eco-ink text-sm">EcoCoach</p>
            <p className="text-eco-slate text-xs">Powered by Gemini • {isAIStreaming ? 'Thinking…' : 'Ready'}</p>
          </div>
          {isAIStreaming && (
            <Button size="sm" variant="ghost" onClick={handleAbort} className="ml-auto text-eco-slate">
              Stop
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite" aria-label="Chat messages">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3" aria-hidden="true">🌍</div>
              <p className="font-semibold text-eco-ink">Hi, I'm EcoCoach!</p>
              <p className="text-eco-slate text-sm mt-1 max-w-xs">
                Ask me anything about your carbon footprint or how to reduce your impact.
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick replies */}
        {chatMessages.length === 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="text-xs bg-eco-mist text-eco-forest px-3 py-1.5 rounded-full hover:bg-eco-mint/30 transition-colors border border-eco-mint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-leaf"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask EcoCoach anything… (Enter to send)"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-eco-ink resize-none focus:outline-none focus:ring-2 focus:ring-eco-leaf"
              aria-label="Message to EcoCoach"
              disabled={isAIStreaming}
            />
            <Button type="submit" disabled={!input.trim() || isAIStreaming} loading={isAIStreaming} size="md">
              Send
            </Button>
          </div>
          <p className="text-xs text-eco-slate mt-2 text-center">
            AI responses may not be 100% accurate. Always verify with authoritative sources.
          </p>
        </form>
      </Card>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 bg-eco-forest rounded-lg flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
          <span className="text-sm">🌿</span>
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-eco-forest text-white rounded-tr-sm'
          : 'bg-eco-mist text-eco-ink rounded-tl-sm'
      }`}>
        {message.isStreaming && message.content === '' ? (
          <div className="flex gap-1 items-center py-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-eco-leaf rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────

function SuggestionCard({ suggestion }: { suggestion: SuggestedAction }) {
  const { setActiveTab } = useAppStore();
  const effortColors = { low: 'green', medium: 'amber', high: 'red' } as const;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-eco-mist/50 hover:bg-eco-mist transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-eco-ink">{suggestion.title}</p>
        <p className="text-xs text-eco-slate mt-0.5 truncate">{suggestion.description}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-eco-leaf font-mono">−{formatCO2(suggestion.annualSavingKg)}/yr</p>
        <Badge variant={effortColors[suggestion.effort]} size="sm">{suggestion.effort} effort</Badge>
      </div>
      <Button size="sm" variant="outline" onClick={() => setActiveTab('goals')} aria-label={`Add "${suggestion.title}" as a goal`}>
        + Goal
      </Button>
    </div>
  );
}

// ─── Compact Panel (Dashboard sidebar) ───────────────────────────────────────

function CompactCoachPanel({ onSend, quickReplies, messages, isStreaming, chatEndRef }: any) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-eco-forest rounded-lg flex items-center justify-center">
            <span className="text-sm" aria-hidden="true">🌿</span>
          </div>
          <p className="font-semibold text-eco-ink text-sm">EcoCoach</p>
          {isStreaming && <LoadingSpinner size={14} className="text-eco-leaf ml-auto" />}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-eco-slate text-center py-2">Quick questions:</p>
            {quickReplies.map((r: string) => (
              <button key={r} onClick={() => onSend(r)}
                className="w-full text-left text-xs bg-eco-mist text-eco-forest px-3 py-2 rounded-xl hover:bg-eco-mint/30 transition-colors border border-eco-mint/20">
                {r}
              </button>
            ))}
          </div>
        ) : (
          messages.slice(-6).map((m: ChatMessage) => (
            <div key={m.id} className={`text-xs rounded-xl px-3 py-2 max-w-[90%] ${m.role === 'user' ? 'bg-eco-forest text-white ml-auto' : 'bg-eco-mist text-eco-ink'}`}>
              {m.content || (m.isStreaming ? '…' : '')}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSend(input); setInput(''); }} className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask EcoCoach…"
            className="flex-1 text-xs rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-eco-leaf"
            disabled={isStreaming} />
          <Button type="submit" size="sm" disabled={!input.trim() || isStreaming}>→</Button>
        </div>
      </form>
    </div>
  );
}
