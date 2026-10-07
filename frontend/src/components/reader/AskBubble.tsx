import React from 'react';
import { ConversationMessage } from '../../types';

interface AskBubbleProps {
  message: ConversationMessage;
}

export const AskBubble: React.FC<AskBubbleProps> = ({ message }) => {
  const isReed = message.sender === 'reed';

  return (
    <div className={`flex flex-col ${isReed ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[90%] rounded-md px-3.5 py-2.5 transition-colors duration-states ${
          isReed ? 'bg-paper text-ink border border-line flex gap-2.5' : 'bg-reed-soft text-ink'
        }`}
      >
        {isReed && <span className="reed-line" aria-hidden="true" />}
        <div className="min-w-0">
          {isReed && <span className="sr-only">Reed: </span>}
          {message.paragraphQuote && (
            <div className="border-l-2 border-line-strong pl-2.5 mb-2 text-xs italic text-ink-muted font-serif line-clamp-2">
              «{message.paragraphQuote}»
            </div>
          )}
          <p className="text-[15px] leading-[23px] font-sans whitespace-pre-line">{message.text}</p>
        </div>
      </div>
      {message.timestamp && <span className="text-[11px] text-ink-muted mt-1 px-1 font-sans">{message.timestamp}</span>}
    </div>
  );
};
