import { ReedMode } from '../../types';
import sleeping from '../../assets/reed/sleeping.webp';
import companion from '../../assets/reed/companion.webp';
import teacher from '../../assets/reed/teacher.webp';
import librarian from '../../assets/reed/librarian.webp';
import reader from '../../assets/reed/reader.webp';

// Single source for Reed's character art and mode names.
export const modePortraits: Record<ReedMode, string> = {
  sleeping,
  companion,
  teacher,
  librarian,
  reader,
};

export const modeLabels: Record<ReedMode, { label: string; phrase: string }> = {
  sleeping: { label: 'Dormido', phrase: 'Déjame solo' },
  companion: { label: 'Compañero', phrase: 'Acompáñame' },
  teacher: { label: 'Profesor', phrase: 'Enséñame' },
  librarian: { label: 'Bibliotecario', phrase: 'Ayúdame con mis libros' },
  reader: { label: 'Lector', phrase: 'Léemelo' },
};
