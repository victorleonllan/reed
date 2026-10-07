import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ConversationMessage, Paragraph } from '../../types';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';
import { AskBubble } from './AskBubble';

const SUGGESTED_QUESTION = '¿Qué significa esto?';

interface AskFieldProps {
  selectedParagraph: Paragraph | null;
  conversation: ConversationMessage[];
  onSendMessage: (text: string, quote?: string) => void;
  onClose: () => void;
  isThinking?: boolean;
  /** Optional: carry the question over to Reed's panel (teacher mode). */
  onContinueWithReed?: () => void;
}

/** The space to ask, attached right under the paragraph that was tapped. */
export const AskField: React.FC<AskFieldProps> = ({
  selectedParagraph,
  conversation,
  onSendMessage,
  onClose,
  isThinking = false,
  onContinueWithReed,
}) => {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const send = (text: string) => {
    if (!text.trim() || isThinking) return;
    onSendMessage(text.trim(), selectedParagraph?.text);
    setQuestion('');
  };

  return (
    <Surface
      padding="sm"
      className="mt-3 text-ink font-sans animate-fadeIn"
      onClick={(event: React.MouseEvent) => event.stopPropagation()}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-ink-muted">Pregúntale a Reed</span>
        <IconButton aria-label="Cerrar pregunta" size="sm" className="-mr-1 text-ink-muted" onClick={onClose}>
          <X size={16} strokeWidth={1.75} />
        </IconButton>
      </div>

      {conversation.length > 0 && (
        <div className="space-y-3 mb-3" aria-live="polite">
          {conversation.map((msg) => (
            <AskBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}

      {isThinking && (
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-3" role="status">
          <span className="w-2 h-2 rounded-full bg-reed animate-pulse" aria-hidden="true" />
          <span>Reed está pensando…</span>
        </div>
      )}

      {conversation.length === 0 && !isThinking && (
        <button
          type="button"
          onClick={() => send(SUGGESTED_QUESTION)}
          className="focus-ring mb-3 text-left text-sm px-3 py-2 rounded-md bg-paper border border-line hover:border-line-strong transition-colors duration-states"
        >
          «{SUGGESTED_QUESTION}»
        </button>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(question);
        }}
        className="relative flex items-center"
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pregunta lo que quieras sobre este párrafo"
          aria-label="Tu pregunta sobre este párrafo"
          className="w-full pl-3.5 pr-12 py-2.5 rounded-md bg-paper border border-line-strong text-ink placeholder:text-ink-muted text-sm focus:border-focus focus-ring transition-colors"
        />
        <IconButton
          type="submit"
          aria-label="Enviar pregunta"
          variant="primary"
          size="sm"
          disabled={!question.trim() || isThinking}
          className="absolute right-1.5"
        >
          <ArrowRight size={16} strokeWidth={2} />
        </IconButton>
      </form>

      {onContinueWithReed && (
        <button
          type="button"
          onClick={onContinueWithReed}
          className="focus-ring mt-2 text-xs text-ink-muted hover:text-ink underline-offset-2 hover:underline rounded-sm"
        >
          Seguir la conversación con Reed
        </button>
      )}
    </Surface>
  );
};
