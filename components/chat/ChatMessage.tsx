import { ChatMessage as ChatMessageType } from '@/store/menu-store';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`mb-3 ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser
            ? 'bg-[#2D5016]/10 text-[#2B2B2B] border border-[#2D5016]/20'
            : 'bg-[#FFFDF8] text-[#2B2B2B] border border-[#E8E0D4]'
        }`}
      >
        <p className="text-[13.5px] font-sans leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
