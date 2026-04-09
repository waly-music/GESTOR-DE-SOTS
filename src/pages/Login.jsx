import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isAuthDisabled } from '../config/authMode';
import { useAuth } from '../context/AuthContext';
import { loginEmailPassword } from '../services/authService';
import { Spinner } from '../components/Spinner';

export default function Login() {
  const { user, profile, loading } = useAuth();

  if (isAuthDisabled()) {
    return <Navigate to="/" replace />;
  }
  const navigate = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={from} replace />;
  }

  if (user && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-medium">Falta el documento de usuario en Firestore</p>
          <p className="mt-2 text-sm">
            Un administrador debe crear la colección <code className="rounded bg-amber-100 px-1">users</code> con su UID y campos{' '}
            <code className="rounded bg-amber-100 px-1">role</code> y{' '}
            <code className="rounded bg-amber-100 px-1">contratista</code>.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await loginEmailPassword(email.trim(), password);
      navigate(from, { replace: true });
    } catch (er) {
      setErr(
        er.code === 'auth/invalid-credential'
          ? 'Credenciales inválidas.'
          : er.message ?? String(er),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-semibold text-slate-900">
          Gestión SOT
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">
          Inicie sesión con su cuenta corporativa
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? <Spinner className="h-4 w-4 border-white border-r-transparent" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
