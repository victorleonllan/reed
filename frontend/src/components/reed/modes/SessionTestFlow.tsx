import React, { useEffect, useRef, useState } from 'react';
import { Book, QuizQuestion } from '../../../types';
import { Button } from '../../ui/Button';
import { Check } from 'lucide-react';

// Sub-componente para el Test de sesión (Requisito 4.2)
export const SessionTestFlow: React.FC<{
  sessionStats: any;
  book: Book;
  onQuizComplete?: () => void;
  onDone: () => void;
}> = ({ sessionStats, book, onQuizComplete, onDone }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answered, setAnswered] = useState(false);
  const quizReported = useRef(false);

  useEffect(() => {
    if (isFinished && !quizReported.current) {
      quizReported.current = true;
      onQuizComplete?.();
    }
  }, [isFinished, onQuizComplete]);

  // Preguntas generadas basadas estrictamente en la sesión
  const sessionQuestions: QuizQuestion[] = [
    {
      id: 'sq-1',
      question: `¿Qué instrumento presentaron los gitanos al inicio de la sesión en "${book.title}"?`,
      options: ['Un telescopio', 'Dos lingotes metálicos (imán)', 'Una lente gigante', 'Una brújula'],
      correctIndex: 1,
      explanation: 'Melquíades presentó el imán que hacía crujir las maderas y arrastraba calderos.',
      type: 'multiple'
    },
    {
      id: 'sq-2',
      question: 'Verdadero o Falso: En la aldea las casas estaban hechas de barro y cañabrava.',
      options: ['Verdadero', 'Falso'],
      correctIndex: 0,
      explanation: 'El texto menciona explícitamente veinte casas de barro y cañabrava a la orilla del río.',
      type: 'boolean'
    },
    {
      id: 'sq-3',
      question: '¿Por qué para mencionar muchas cosas había que señalarlas con el dedo?',
      options: ['Porque estaba prohibido hablar', 'Porque el mundo era tan reciente que carecían de nombre', 'Porque los ruidos del río no dejaban escuchar', 'Por una costumbre gitana'],
      correctIndex: 1,
      explanation: 'El texto enfatiza que "el mundo era tan reciente, que muchas cosas carecían de nombre".',
      type: 'comprehension'
    }
  ];

  const q = sessionQuestions[currentQIndex];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOpt(idx);
    setAnswered(true);
    if (idx === q.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQIndex + 1 < sessionQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOpt(null);
      setAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="p-4 text-center space-y-3 animate-fadeIn">
        <h5 className="font-serif font-bold text-lg text-ink">
          Comprensión de tu sesión
        </h5>
        <p className="text-xs text-ink-muted">
          Respondiste correctamente {score} de {sessionQuestions.length} preguntas sobre los párrafos leídos.
        </p>
        <div className="p-3 bg-reed-soft/60 rounded-md text-xs text-ink font-serif">
          «Comprendiste muy bien los puntos clave de lo que leíste hoy. No hay notas ni reprobados en Reed: solo acompañamiento.»
        </div>
        <Button variant="primary" size="sm" onClick={onDone} className="w-full">
          Volver a la lectura
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between text-[11px] text-ink-muted">
        <span>Pregunta {currentQIndex + 1} de {sessionQuestions.length}</span>
        <span>Basado en tu lectura de hoy</span>
      </div>

      <p className="font-serif text-sm font-semibold text-ink">
        {q.question}
      </p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let style = 'bg-paper border-line text-ink hover:border-line-strong';
          if (answered) {
            if (idx === q.correctIndex) style = 'bg-reed-soft border-reed text-ink font-bold';
            else if (idx === selectedOpt) style = 'bg-paper-sunk opacity-50';
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={`w-full text-left p-2.5 rounded-md border text-xs transition-all flex items-center justify-between ${style}`}
            >
              <span>{opt}</span>
              {answered && idx === q.correctIndex && <Check size={14} className="text-reed" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="p-2.5 bg-paper-sunk rounded text-xs text-ink-muted font-serif">
          {q.explanation}
        </div>
      )}

      {answered && (
        <Button variant="primary" size="sm" onClick={handleNext} className="w-full text-xs">
          {currentQIndex + 1 === sessionQuestions.length ? 'Finalizar comprobación' : 'Siguiente'}
        </Button>
      )}
    </div>
  );
};
