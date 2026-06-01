import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) setError(error.message);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setError(error.message);
      else setSuccessMsg('Cadastro realizado! Se o Supabase exigir, verifique o seu e-mail.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else navigate('/minha-conta');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col justify-center items-center p-4 text-[#1A332B]">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif mb-2">{isSignUp ? 'Criar Conta' : 'Bem-vindo(a)'}</h1>
          <p className="text-sm tracking-widest uppercase opacity-60">
            {isSignUp ? 'Junte-se ao nosso garimpo' : 'Acesse sua conta'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 text-sm text-center">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-100 text-green-700 p-3 text-sm text-center">
              {successMsg}
            </div>
          )}
          
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-[#1A332B] bg-transparent py-2 focus:outline-none focus:border-opacity-100 border-opacity-30 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-[#1A332B] bg-transparent py-2 focus:outline-none focus:border-opacity-100 border-opacity-30 transition-colors"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#1A332B] text-[#FDF6F0] py-4 text-xs uppercase tracking-widest hover:opacity-90 transition-opacity mt-8 disabled:opacity-50"
          >
            {loading ? 'Processando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-[#C06A35]/30">
          <p className="text-center text-sm text-[#423226] mb-4">Ou acesse com:</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center gap-2 border border-[#C06A35]/50 p-3 rounded text-sm text-[#1A332B] hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/>
              </svg>
              Google
            </button>
            <button 
              onClick={() => handleOAuthLogin('microsoft')}
              className="w-full flex items-center justify-center gap-2 border border-[#C06A35]/50 p-3 rounded text-sm text-[#1A332B] hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.462 0H0v7.462h7.462V0zM16 0H8.538v7.462H16V0zM7.462 8.538H0V16h7.462V8.538zM16 8.538H8.538V16H16V8.538z"/>
              </svg>
              Microsoft
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
            className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity"
          >
            {isSignUp ? 'Já tem conta? Faça Login' : 'Criar uma conta'}
          </button>
        </div>
      </div>
    </div>
  );
}