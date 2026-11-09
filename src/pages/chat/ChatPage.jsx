import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

export const ChatPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28">
      <div className="p-5 rounded-3xl bg-pinpic-coral/15 text-pinpic-coral mb-4 shadow-sm animate-pulse">
        <MessageSquare className="w-10 h-10" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pinpic-teal/10 text-pinpic-teal dark:text-pinpic-teal-dark text-xs font-bold mb-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>In Development</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">Chat Coming Soon</h1>
      <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark max-w-sm leading-relaxed">
        Send pinned moments directly to your friends through built-in chat without ever switching apps.
      </p>
    </div>
  );
};

export default ChatPage;

