import React, { useEffect, useState } from 'react';
import { MessageSquare, Play } from 'lucide-react';
import { ConversationMessage, Paragraph } from '../../types';
import { ReaderPage } from '../../lib/reading';
import { explainParagraph } from '../../services/api';
import { AskField } from './AskField';

interface ReadingParagraphProps {
  paragraph: Paragraph;
  isReading: boolean;
  isSelected: boolean;
  textStyle?: React.CSSProperties;
  onSelect: (paragraph: Paragraph) => void;
  onAskAbout: (paragraph: Paragraph) => void;
  onListenFrom: (paragraph: Paragraph) => void;
}

const now = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

export const ReadingParagraph: React.FC<ReadingParagraphProps> = ({
  paragraph,
  isReading,
  isSelected,
  textStyle,
  onSelect,
  onAskAbout,
  onListenFrom,
}) => {
  const [asking, setAsking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const isActive = isReading || isSelected;

  useEffect(() => {
    if (!isSelected) setAsking(false);
  }, [isSelected]);

  const ask = async (text: string) => {
    const userMessage: ConversationMessage = { id: `${paragraph.id}-q-${Date.now()}`, sender: 'user', text, timestamp: now() };
    setConversation((items) => [...items, userMessage]);
    setIsThinking(true);
    // explainParagraph never throws: without a session or over the limit it returns a calm message.
    const answer = await explainParagraph(paragraph.text, text);
    setConversation((items) => [...items, { id: `${paragraph.id}-a-${Date.now()}`, sender: 'reed', text: answer, timestamp: now() }]);
    setIsThinking(false);
  };

  return (
    <div className="relative mb-6 group">
      {/* The reed: thin line on the left margin marks the paragraph being read or selected */}
      <span
        aria-hidden="true"
        className={`absolute -left-4 sm:-left-6 top-1 bottom-1 w-[2px] rounded-pill bg-reed transition-opacity duration-states ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-current={isReading ? 'true' : undefined}
        onClick={() => onSelect(paragraph)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(paragraph);
          }
        }}
        className={`focus-ring cursor-pointer rounded-sm px-2 py-1 -mx-2 -my-1 transition-colors duration-states select-text ${
          isActive ? 'bg-[color:color-mix(in_srgb,var(--color-highlight)_32%,transparent)]' : 'hover:bg-[color:color-mix(in_srgb,var(--color-highlight)_14%,transparent)]'
        }`}
      >
        <p className="max-w-[65ch]" style={textStyle}>
          {paragraph.text}
        </p>
      </div>

      {isSelected && (
        <div className="mt-3 flex flex-wrap items-center gap-2 animate-fadeIn">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAsking((open) => !open);
            }}
            aria-expanded={asking}
            className="focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-reed text-on-reed text-sm font-bold shadow-1 hover:bg-reed-strong transition-colors duration-states"
          >
            <MessageSquare size={16} strokeWidth={2} />
            <span>Preguntar sobre esto</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onListenFrom(paragraph);
            }}
            className="focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong bg-paper-raised text-ink text-sm font-bold hover:bg-paper-sunk transition-colors duration-states"
          >
            <Play size={16} strokeWidth={2} className="text-ambar-ink" />
            <span>Escuchar desde aquí</span>
          </button>
        </div>
      )}

      {isSelected && asking && (
        <AskField
          selectedParagraph={paragraph}
          conversation={conversation}
          onSendMessage={(text) => ask(text)}
          onClose={() => setAsking(false)}
          isThinking={isThinking}
          onContinueWithReed={() => onAskAbout(paragraph)}
        />
      )}
    </div>
  );
};

interface ReadingPageProps {
  page: ReaderPage;
  /** Shows the chapter title above the page (a chapter starts here mid-scroll). */
  chapterHeading: boolean;
  /** Paragraph index being read aloud on this page, or -1. */
  readingIndex: number;
  selectedId?: string;
  textStyle: React.CSSProperties;
  mutedColor: string;
  pageRef: (element: HTMLElement | null) => void;
  onSelect: (paragraph: Paragraph) => void;
  onAskAbout: (paragraph: Paragraph) => void;
  onListenFrom: (paragraph: Paragraph) => void;
}

/** One page of the infinite scroll: its paragraphs and the page number at the foot. */
export const ReadingPage: React.FC<ReadingPageProps> = ({
  page,
  chapterHeading,
  readingIndex,
  selectedId,
  textStyle,
  mutedColor,
  pageRef,
  ...handlers
}) => (
  <section data-page={page.index} ref={pageRef}>
    {chapterHeading && <h2 className="font-serif text-2xl text-center mt-6 mb-10">{page.chapterTitle}</h2>}
    {page.paragraphs.map((paragraph, index) => (
      <ReadingParagraph
        key={paragraph.id}
        paragraph={paragraph}
        textStyle={textStyle}
        isReading={readingIndex === index}
        isSelected={selectedId === paragraph.id}
        {...handlers}
      />
    ))}
    <p className="text-center font-serif text-sm my-10 tracking-widest" style={{ color: mutedColor }}>
      — {page.index + 1} —
    </p>
  </section>
);
