import React, { useState } from 'react';
import { Book, Paragraph } from '../../../types';
import { useReed } from '../../../context/ReedContext';
import { Button } from '../../ui/Button';
import { Clock, CheckCircle } from 'lucide-react';
import { SessionTestFlow } from './SessionTestFlow';

interface TeacherModeProps {
  book: Book;
  currentParagraph: Paragraph | null;
  chapterCompleted: boolean;
  onQuizComplete?: () => void;
}

// Formato mm:ss
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export const TeacherMode: React.FC<TeacherModeProps> = ({
  book,
  currentParagraph,
  chapterCompleted,
  onQuizComplete,
}) => {
  const { sessionStats, habits } = useReed();

  // Estado para el modo profesor (Socrático)
  const [socraticStep, setSocraticStep] = useState<number>(1);
  const [showSessionTest, setShowSessionTest] = useState(false);

  return (
    <div className="space-y-4">
      {!showSessionTest ? (
        <>
          {/* 4.3 Guía de lectura personalizada */}
          {chapterCompleted && (
            <p className="font-serif text-sm text-ink leading-relaxed">
              Terminaste este capítulo. ¿Quieres comprobar qué recuerdas?
            </p>
          )}
          <div className="p-3.5 rounded-md bg-paper border border-line flex items-center gap-3">
            <Clock size={20} className="text-reed flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-ink block">
                Ritmo sugerido de hoy
              </span>
              <p className="text-xs text-ink-muted mt-0.5">
                {habits.recommendationNote}
              </p>
            </div>
          </div>

          {/* 4.1 Ayudar a comprender con método Socrático */}
          <div className="p-4 rounded-md bg-paper-raised border border-line space-y-3">
            <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              COMPRENSIÓN SOCRÁTICA
            </span>
            <p className="text-xs text-ink-muted">
              Reed no te dará la respuesta directa de inmediato; te ayudará a pensar por ti mismo.
            </p>

            {currentParagraph && (
              <div className="p-2.5 bg-paper rounded border border-line text-xs italic font-serif text-ink line-clamp-2">
                «{currentParagraph.text}»
              </div>
            )}

            {/* Pasos socráticos */}
            <div className="p-3 rounded-md bg-reed-soft/40 border border-line text-sm text-ink space-y-2">
              {socraticStep === 1 && (
                <div>
                  <span className="font-bold text-xs text-reed block mb-1">
                    💡 Pista 1 de razonamiento:
                  </span>
                  <p className="font-serif">
                    «Fíjate en las palabras que usa el autor para describir los objetos: "como huevos prehistóricos", "manos de gorrión". ¿Qué emoción intenta transmitir respecto al entorno?»
                  </p>
                </div>
              )}
              {socraticStep === 2 && (
                <div>
                  <span className="font-bold text-xs text-reed block mb-1">
                    🤔 Pregunta para pensar:
                  </span>
                  <p className="font-serif">
                    «Si Macondo era tan nuevo que las cosas no tenían nombre, ¿por qué los imanes causaron tanta revolución entre las casas de madera?»
                  </p>
                </div>
              )}
              {socraticStep === 3 && (
                <div>
                  <span className="font-bold text-xs text-reed block mb-1">
                    📖 Explicación directa:
                  </span>
                  <p className="font-serif">
                    «Los imanes representan el primer choque entre el aislamiento primitivo de la aldea y la ciencia del mundo exterior. José Arcadio no ve un simple truco, sino una oportunidad para transformar su realidad.»
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {socraticStep < 3 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSocraticStep(prev => prev + 1)}
                  className="text-xs flex-1"
                >
                  {socraticStep === 1 ? '¿Quieres otra pista?' : 'Explícamelo directamente'}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSocraticStep(1)}
                  className="text-xs flex-1"
                >
                  Reiniciar pregunta socrática
                </Button>
              )}
            </div>
          </div>

          {/* 4.2 Test después de la sesión */}
          <div className="pt-2 border-t border-line">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowSessionTest(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              <span>Realizar test de esta sesión ({formatTime(sessionStats.secondsReading)})</span>
            </Button>
          </div>
        </>
      ) : (
        /* Componente de Test de sesión */
        <SessionTestFlow
          sessionStats={sessionStats}
          book={book}
          onQuizComplete={onQuizComplete}
          onDone={() => setShowSessionTest(false)}
        />
      )}
    </div>
  );
};
