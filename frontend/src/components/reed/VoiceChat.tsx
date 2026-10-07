import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { Mic, MicOff } from 'lucide-react';
import { Book } from '../../types';
import { Button } from '../ui/Button';
import {
  VOICE_FAILED_MESSAGE,
  VOICE_MIC_MESSAGE,
  canUseMicrophone,
  getVoiceSignedUrl,
  isMicrophoneError,
} from '../../services/voice';

/** The passage goes into the agent's prompt as a dynamic variable: keep it short. */
export const MAX_PASSAGE_CHARS = 1500;

interface VoiceChatProps {
  book: Book;
  /** Text of the paragraph the reader is on, already trimmed to MAX_PASSAGE_CHARS. */
  passage: string;
  /** Called after "Terminar": the parent hides the panel, which unmounts it and ends the session. */
  onClose: () => void;
}

// Resting heights of the five bars when nobody is talking.
const WAVE_REST = ['h-1.5', 'h-2.5', 'h-3.5', 'h-2.5', 'h-1.5'];

/** Voice wave: reed green while Reed listens, amber while Reed speaks. */
const VoiceWave: React.FC<{ speaking: boolean; active: boolean }> = ({ speaking, active }) => (
  <div className="flex items-center gap-[3px] h-5 shrink-0" aria-hidden="true">
    {WAVE_REST.map((rest, index) => (
      <span
        key={index}
        className={`w-[2px] rounded-pill transition-[height] duration-states ${speaking ? 'bg-ambar' : 'bg-reed'} ${
          active ? `animate-wave-${index + 1}` : rest
        }`}
      />
    ))}
  </div>
);

const VoiceChatSession: React.FC<VoiceChatProps> = ({ book, passage, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const mountedRef = useRef(false);
  const startedRef = useRef(false);
  const passageRef = useRef(passage);
  // Last passage the agent knows about (sent at start or as a contextual update).
  const lastPassageRef = useRef('');

  const { status, isSpeaking, isMuted, setMuted, startSession, endSession, sendContextualUpdate } = useConversation({
    onError: (_message, context) => setError((prev) => prev ?? (isMicrophoneError(context) ? VOICE_MIC_MESSAGE : VOICE_FAILED_MESSAGE)),
    onDisconnect: (details) => {
      if (details.reason === 'error') setError((prev) => prev ?? VOICE_FAILED_MESSAGE);
      else if (details.reason === 'agent') setEnded(true);
    },
  });

  // The microphone is only requested here, inside startSession, which runs after the reader's click.
  const start = useCallback(async () => {
    setError(null);
    setEnded(false);
    if (!canUseMicrophone()) {
      setError(VOICE_MIC_MESSAGE);
      return;
    }
    let signedUrl: string;
    try {
      signedUrl = await getVoiceSignedUrl(book);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : VOICE_FAILED_MESSAGE);
      return;
    }
    if (!mountedRef.current) return;
    lastPassageRef.current = passageRef.current;
    startSession({ signedUrl, dynamicVariables: { passage: passageRef.current, book_title: book.title } });
  }, [book, startSession]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    passageRef.current = passage;
  }, [passage]);

  // Mounted by the "Hablar con Reed" click: start right away, once (StrictMode re-runs effects).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);

  // The reader moved to another paragraph mid-conversation: tell the agent (its prompt expects it).
  useEffect(() => {
    if (status !== 'connected' || !passage || passage === lastPassageRef.current) return;
    lastPassageRef.current = passage;
    sendContextualUpdate(`The reader moved to a new passage. Switch to it:\n\n${passage}`);
  }, [status, passage, sendContextualUpdate]);

  const finish = () => {
    endSession();
    onClose();
  };

  const live = status === 'connected';
  const connecting = !live && !error && !ended;

  let label: string;
  if (connecting) label = 'Despertando a Reed…';
  else if (live && isMuted) label = 'Tu micrófono está en silencio. Actívalo cuando quieras hablar.';
  else if (live && isSpeaking) label = 'Reed está hablando.';
  else if (live) label = 'Te escucho. Pregúntame lo que quieras sobre este pasaje.';
  else if (error) label = error;
  else label = 'La conversación terminó. Cuando quieras, seguimos.';

  return (
    <section aria-label="Conversación con Reed" className="p-4 rounded-md bg-paper border border-line space-y-4">
      <div className="flex items-center gap-3 min-h-8">
        <VoiceWave speaking={live && isSpeaking} active={live && (isSpeaking || !isMuted)} />
        <p role="status" aria-live="polite" className="font-serif text-sm text-ink leading-relaxed">
          {label}
        </p>
      </div>

      {live && error && <p className="text-xs text-ink-muted leading-relaxed">{error}</p>}

      {live && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          aria-pressed={isMuted}
          onClick={() => setMuted(!isMuted)}
          icon={isMuted ? <MicOff size={16} strokeWidth={2} /> : <Mic size={16} strokeWidth={2} />}
        >
          {isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        </Button>
      )}

      {!live && !connecting && (
        <Button variant="voice" size="sm" className="w-full" onClick={() => void start()}>
          {ended && !error ? 'Hablar otra vez' : 'Intentar de nuevo'}
        </Button>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={finish}>
        Terminar
      </Button>
    </section>
  );
};

/**
 * Live voice conversation with the open book's ElevenLabs agent. Mount it only after the reader asks:
 * mounting starts the session (and the microphone prompt); unmounting ends it.
 */
export const VoiceChat: React.FC<VoiceChatProps> = (props) => (
  <ConversationProvider>
    <VoiceChatSession {...props} />
  </ConversationProvider>
);
