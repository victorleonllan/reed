import React, { useRef, useState } from 'react';
import { useAccount } from '../../context/AccountContext';
import { UserAvatar } from '../auth/UserAvatar';
import { BADGES, badgeStats } from '../../lib/badges';
import { Button } from '../ui/Button';
import { PlanCard } from '../billing/PlanCard';

export const ProfileView: React.FC = () => {
  const { user, entries, activity, logout, setAvatar } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const finished = entries.filter((entry) => entry.record.status === 'finished').length;
  const reading = entries.filter((entry) => entry.record.status === 'reading').length;
  const stats = badgeStats(entries.map((entry) => entry.record), activity);
  const average = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.record.progress, 0) / entries.length)
    : null;
  const minutes = Math.floor(activity.readingSeconds / 60);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Elige una imagen.');
      return;
    }
    setError(null);
    const dataUrl = await resizeAvatar(file);
    setAvatar(dataUrl);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex flex-col items-center text-center border-b border-line pb-8">
        <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="lg" />
        <h1 className="font-serif text-3xl text-ink mt-4">{user.name}</h1>
        <p className="text-sm text-ink-muted mt-1">Lector</p>
        <p className="text-sm text-ink mt-4">
          <span className="font-semibold">{finished}</span> {finished === 1 ? 'libro leído' : 'libros leídos'}
          <span className="text-ink-muted"> · </span>
          <span className="font-semibold">{reading}</span> {reading === 1 ? 'libro leyendo' : 'libros leyendo'}
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {user.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {user.avatarUrl && (
            <Button variant="quiet" size="sm" onClick={() => setAvatar(null)}>Quitar foto</Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>

      <PlanCard />

      <section className="py-8 border-b border-line">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4">Lectura</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Libros leídos" value={String(finished)} />
          <Stat label="Leyendo" value={String(reading)} />
          {average !== null && <Stat label="Progreso medio" value={`${average}%`} />}
          {minutes >= 1 && <Stat label="Tiempo de lectura" value={minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`} />}
          {stats.streak >= 2 && <Stat label="Días seguidos" value={String(stats.streak)} />}
        </dl>
      </section>

      <section className="py-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4">Logros</h2>
        <ul className="space-y-3">
          {BADGES.map((badge) => {
            const earned = activity.unlocked.includes(badge.id);
            return (
              <li key={badge.id} className={`flex gap-3 ${earned ? '' : 'opacity-45'}`}>
                <span className="text-xl leading-none mt-0.5" aria-hidden>{badge.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{badge.name}</p>
                  <p className="text-sm text-ink-muted">{earned ? badge.description : badge.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Button variant="quiet" onClick={logout}>Cerrar sesión</Button>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-ink-muted">{label}</dt>
    <dd className="font-serif text-2xl text-ink">{value}</dd>
  </div>
);

async function resizeAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
