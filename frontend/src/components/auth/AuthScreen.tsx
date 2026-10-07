import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAccount } from '../../context/AccountContext';
import { Button } from '../ui/Button';
import { ReedCharacter } from '../reed/ReedCharacter';

type AuthMode = 'login' | 'register' | 'recover';

// Fallback for the reed token when the stylesheet is not available yet (light theme value).
const REED_FALLBACK = '#2f5d46';

// Clerk needs a concrete color, so the token is read from the CSS variables of the active theme.
const readToken = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

const clerkAppearance = () => ({
  variables: {
    fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif',
    colorPrimary: readToken('--color-reed', REED_FALLBACK),
    borderRadius: '12px',
  },
});

export const AuthScreen: React.FC = () => {
  const { clerkEnabled, login, register, recover } = useAccount();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Coming from «Reed Pro» on the landing: R-019 resumes the checkout after login.
  const [wantsPro] = useState(() => new URLSearchParams(window.location.search).get('plan') === 'pro');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (mode !== 'login' && password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const message = mode === 'login'
      ? await login(email, password)
      : mode === 'register'
        ? await register({ name, email, password })
        : await recover(email, password);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    if (mode === 'recover') {
      setNotice('Contraseña actualizada. Ya puedes iniciar sesión.');
      setMode('login');
      setPassword('');
      setConfirm('');
    }
  };

  const clerkAccess = (
    <div className="flex flex-col items-center md:items-start">
      {mode === 'register'
        ? <SignUp routing="hash" signInUrl="#/sign-in" appearance={clerkAppearance()} />
        : <SignIn routing="hash" signUpUrl="#/sign-up" appearance={clerkAppearance()} />}
      <button
        type="button"
        onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
        className="mt-6 text-sm text-ink-muted hover:text-ink"
      >
        {mode === 'register' ? 'Ya tengo cuenta' : 'Crear cuenta'}
      </button>
    </div>
  );

  // Demo mode (no Clerk key): the local account form, unchanged.
  const demoAccess = (
    <div className="w-full max-w-md bg-paper-raised border border-line rounded-lg p-6 sm:p-8">
      <h2 className="font-serif text-heading text-ink mb-1">
        {mode === 'login' && 'Iniciar sesión'}
        {mode === 'register' && 'Crear cuenta'}
        {mode === 'recover' && 'Recuperar contraseña'}
      </h2>
      <p className="text-sm text-ink-muted mb-6">
        {mode === 'recover'
          ? 'Confirma el correo de tu cuenta y elige una nueva contraseña. Se guarda cifrada en este navegador.'
          : 'Tu biblioteca, tu progreso y tus logros quedan en tu cuenta.'}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <Field label="Nombre" value={name} onChange={setName} autoComplete="name" />
        )}
        <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode !== 'login' && (
          <Field label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-reed">{notice}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Guardar contraseña'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {mode !== 'login' && (
          <button type="button" className="text-ink-muted hover:text-ink" onClick={() => { setMode('login'); setError(null); }}>
            Iniciar sesión
          </button>
        )}
        {mode !== 'register' && (
          <button type="button" className="text-ink-muted hover:text-ink" onClick={() => { setMode('register'); setError(null); }}>
            Crear cuenta
          </button>
        )}
        {mode !== 'recover' && (
          <button type="button" className="text-ink-muted hover:text-ink" onClick={() => { setMode('recover'); setError(null); }}>
            Recuperar contraseña
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <a href="/" className="text-sm text-ink-muted hover:text-ink">
          ← Volver al inicio
        </a>

        <div className="mt-8 grid items-center gap-10 md:mt-12 md:grid-cols-2 md:gap-16">
          {/* Reed himself, no frame: the cut-out stands on the paper. */}
          <div className="flex flex-col items-center text-center">
            <ReedCharacter mode="companion" size="xl" animated />
            <p className="mt-4 font-serif text-small text-ink-muted">
              Reed, como <em>read</em>: leer.
            </p>
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <h1 className="font-serif text-title text-ink">Hola, soy Reed.</h1>
            <p className="mt-3 max-w-md text-body text-ink-muted">
              Ya leí el libro. Lo leemos juntos: te lo leo en voz alta, te lo resumo y respondo lo que no se entienda.
            </p>
            {wantsPro && (
              <p className="mt-6 text-sm font-bold text-reed">
                Entra o crea tu cuenta y seguimos con Reed Pro.
              </p>
            )}
            <div className="mt-6 w-full flex justify-center md:justify-start">
              {clerkEnabled ? clerkAccess : demoAccess}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}> = ({ label, value, onChange, type = 'text', autoComplete }) => (
  <label className="block">
    <span className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">{label}</span>
    <input
      type={type}
      value={value}
      required
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3.5 py-2.5 rounded-md bg-paper border border-line-strong text-ink text-sm focus:border-focus"
    />
  </label>
);
