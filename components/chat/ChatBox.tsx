'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from './ChatMessage';
import { useMenuStore } from '@/store/menu-store';

const quickReplies = [
  'Add more protein',
  'Less spicy',
  'Vegetarian option',
  'More vegetables',
];

export function ChatBox() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    chatMessages,
    isChatLoading,
    currentMenu,
    addChatMessage,
    setCurrentMenu,
    setChatLoading
  } = useMenuStore();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || !currentMenu?.id) return;

    const userMessage = input;
    setInput('');

    // Add user message to store immediately
    addChatMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    setChatLoading(true);

    try {
      const response = await fetch('/api/menu/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId: currentMenu.id,
          userMessage,
          currentMenu
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to modify menu');
      }

      // Add assistant response to chat
      addChatMessage({
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      });

      // Update menu with modifications
      setCurrentMenu(data.updatedMenu);

      // Show cohesion warning if present
      if (data.cohesionWarning) {
        addChatMessage({
          role: 'assistant',
          content: `⚠️ ${data.cohesionWarning}`,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error modifying menu:', error);
      addChatMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDF8] border border-[#E8E0D4] rounded-xl shadow-sm">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-[#E8E0D4]">
        <h3 className="text-base font-serif font-bold text-[#2B2B2B]">
          Chat
        </h3>
        <p className="text-xs font-sans text-[#5C5145] mt-1">
          Modify your menu with natural language
        </p>
      </div>

      {/* Message History */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-sans text-[#5C5145] text-center">
              No messages yet. Generate a menu to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#FFFDF8] border border-[#E8E0D4] rounded-lg px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#8B6D47] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#8B6D47] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#8B6D47] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Reply Suggestions */}
      <div className="px-5 py-3 border-t border-[#E8E0D4] flex flex-wrap gap-2">
        {quickReplies.map((reply) => (
          <Badge
            key={reply}
            variant="outline"
            className="cursor-pointer bg-[#F5F0E8] text-[#5C5145] border-[#E8E0D4] text-xs font-sans hover:bg-[#E8E0D4] transition-colors"
            onClick={() => handleQuickReply(reply)}
          >
            {reply}
          </Badge>
        ))}
      </div>

      {/* Input Area */}
      <div className="px-5 py-4 border-t border-[#E8E0D4]">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your request..."
            className="flex-1 min-h-[80px] resize-none text-sm font-sans bg-white border-[#E8E0D4] focus:ring-[#2D5016] focus:border-[#2D5016]"
            disabled={isChatLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
            className="self-end text-sm font-sans font-medium px-6"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #2D5016, #3D6B22)' : undefined,
              color: '#FFFDF8',
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
