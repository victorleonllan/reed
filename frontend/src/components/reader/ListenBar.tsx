import React, { useCallback, useEffect, useRef } from 'react';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { Paragraph } from '../../types';
import { isBackendSession, synthesizeSpeech } from '../../services/api';
import type { ReaderVoice } from '../../services/readerVoices';
import { ReedBubble } from '../reed/ReedBubble';
import { IconButton } from '../ui/IconButton';

export const formatListenTime = (secs: number) => {
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

interface SpeakOptions {
  voice: ReaderVoice;
  rate: number;
  /** Next paragraph, pre-loaded while this one plays. Only when the caller passes it; nothing else is pre-loaded. */
  following?: Paragraph;
  onEnd: () => void;
  onError: () => void;
}

/**
 * The voice that reads one paragraph at a time. ElevenLabs when signed in (one audio per paragraph,
 * cached in the browser by voice + text; the next one pre-loaded only if the caller asks); if the
 * daily limit runs out or playback fails, the browser's voice.
 * Each new `speak` or `stop` invalidates the previous one, so stale callbacks never fire.
 */
export function useParagraphVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, Promise<string>>>(new Map());
  const useBrowserVoiceRef = useRef(false);
  const runRef = useRef(0);

  const stop = useCallback(() => {
    runRef.current++;
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  // Keyed by voice + paragraph so switching voices never replays the other voice's audio.
  const audioFor = (paragraph: Paragraph, voice: ReaderVoice) => {
    const key = `${voice}:${paragraph.id}`;
    let url = cacheRef.current.get(key);
    if (!url) {
      url = synthesizeSpeech(paragraph.text, voice);
      url.catch(() => cacheRef.current.delete(key));
      cacheRef.current.set(key, url);
    }
    return url;
  };

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      stop();
      cache.forEach((p) => p.then(URL.revokeObjectURL).catch(() => {}));
      cache.clear();
    };
  }, [stop]);

  const speak = async (paragraph: Paragraph, { voice, rate, following, onEnd, onError }: SpeakOptions) => {
    stop();
    const run = runRef.current;
    const ended = () => {
      if (run === runRef.current) onEnd();
    };

    if (isBackendSession() && !useBrowserVoiceRef.current) {
      try {
        const url = await audioFor(paragraph, voice);
        if (run !== runRef.current) return;
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audio.onended = ended;
        audioRef.current = audio;
        await audio.play();
        if (following) audioFor(following, voice).catch(() => {});
        return;
      } catch {
        if (run !== runRef.current) return;
        useBrowserVoiceRef.current = true;
      }
    }

    if (!('speechSynthesis' in window)) {
      onError();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(paragraph.text);
    utterance.lang = 'es-MX';
    utterance.rate = rate;
    utterance.onend = ended;
    utterance.onerror = () => {
      if (run === runRef.current) onError();
    };
    window.speechSynthesis.speak(utterance);
  };

  /** Changes the speed of the audio in progress; false when the voice must restart to apply it. */
  const setRate = (rate: number) => {
    if (!audioRef.current) return false;
    audioRef.current.playbackRate = rate;
    return true;
  };

  return { speak, stop, setRate };
}

interface ListenBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  chapterTitle: string;
  currentTimeFormatted: string;
  playbackRate: number;
  onChangePlaybackRate: () => void;
  onPrevParagraph?: () => void;
  onNextParagraph?: () => void;
  onOpenReedAction?: (actionType: string) => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

// Resting heights of the five bars when the voice is quiet.
const WAVE_REST = ['h-1.5', 'h-2.5', 'h-3.5', 'h-2.5', 'h-1.5'];

/** Voice wave: five amber bars that only move while Reed is speaking. */
const VoiceWave: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-center gap-[3px] h-5" aria-hidden="true">
    {WAVE_REST.map((rest, index) => (
      <span
        key={index}
        className={`w-[2px] rounded-pill bg-ambar transition-[height] duration-states ${active ? `animate-wave-${index + 1}` : rest}`}
      />
    ))}
  </div>
);

export const ListenBar: React.FC<ListenBarProps> = ({
  isPlaying,
  onTogglePlay,
  chapterTitle,
  currentTimeFormatted,
  playbackRate,
  onChangePlaybackRate,
  onPrevParagraph,
  onNextParagraph,
  onOpenReedAction,
  menuOpen,
  onMenuOpenChange,
  onClose,
}) => (
  <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl z-40 animate-slideUp">
    <div className="surface-raised shadow-3 bg-paper-raised/95 backdrop-blur-md p-2 sm:p-2.5 flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onTogglePlay}
        className="focus-ring w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-ambar text-on-ambar flex items-center justify-center flex-shrink-0 shadow-1 hover:brightness-105 active:scale-95 transition-[filter,transform] duration-states"
        aria-label={isPlaying ? 'Pausar lectura' : 'Escuchar lectura'}
      >
        {isPlaying ? <Pause size={22} strokeWidth={2.2} /> : <Play size={22} strokeWidth={2.2} className="ml-0.5" />}
      </button>

      {onPrevParagraph && (
        <IconButton aria-label="Párrafo anterior" size="sm" className="text-ink-muted hover:text-ink" onClick={onPrevParagraph}>
          <SkipBack size={16} strokeWidth={1.75} />
        </IconButton>
      )}
      {onNextParagraph && (
        <IconButton aria-label="Párrafo siguiente" size="sm" className="text-ink-muted hover:text-ink" onClick={onNextParagraph}>
          <SkipForward size={16} strokeWidth={1.75} />
        </IconButton>
      )}

      <div className="min-w-0 flex-1 flex items-center gap-3">
        <VoiceWave active={isPlaying} />
        <div className="min-w-0">
          <span className="block text-[11px] font-bold text-ambar-ink uppercase tracking-wider" aria-live="polite">
            {isPlaying ? 'Escuchando' : 'En pausa'}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-ink truncate">{chapterTitle}</p>
        </div>
      </div>

      <span className="text-xs font-medium text-ink-muted tabular-nums hidden sm:inline">{currentTimeFormatted}</span>

      <button
        type="button"
        onClick={onChangePlaybackRate}
        className="focus-ring h-8 min-w-[3rem] px-2 text-xs font-bold rounded-pill border border-line-strong hover:bg-paper-sunk text-ink transition-colors duration-states tabular-nums"
        aria-label={`Velocidad ${playbackRate}×. Cambiar velocidad`}
      >
        {playbackRate}×
      </button>

      <div className="h-6 w-px bg-line hidden sm:block" aria-hidden="true" />

      <ReedBubble menuOpen={menuOpen} onMenuOpenChange={onMenuOpenChange} onOpenModeAction={onOpenReedAction} />

      {onClose && (
        <IconButton aria-label="Ocultar barra de escucha" size="sm" className="text-ink-muted hover:text-ink" onClick={onClose}>
          <X size={15} strokeWidth={1.75} />
        </IconButton>
      )}
    </div>
  </div>
);
