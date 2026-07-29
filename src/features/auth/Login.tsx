import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { isValidCPF } from '../../utils/validators';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get('redirect') || '/minha-conta';

  const isMinLengthAndAlphaNumeric = password.length >= 6 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSpecialChar = /[?\-#$!]/.test(password);

  const lowerPwd = password.toLowerCase();
  const nameParts = [firstName, lastName, email.split('@')[0]].filter(Boolean).map(p => p.toLowerCase());

  const containsNameOrEmail = nameParts.length > 0 && nameParts.some(part => part.length >= 3 && lowerPwd.includes(part));
  const hasSequentialEquals = /(.)\1\1\1/.test(password);

  const isPasswordValid = isMinLengthAndAlphaNumeric && hasUpperCase && hasLowerCase && hasSpecialChar && !containsNameOrEmail && !hasSequentialEquals;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(value);
    setCpfError(null);
  };

  const handleCpfBlur = async () => {
    if (cpf.length > 0) {
      if (!isValidCPF(cpf)) {
        setCpfError('CPF inválido. Verifique os dígitos digitados.');
        return;
      }
      try {
        const { data, error } = await supabase.rpc('check_cpf_exists', { p_cpf: cpf });
        if (error) throw error;
        if (data) {
          setCpfError('Este CPF já está cadastrado.');
        }
      } catch (err) {
        console.error('Erro ao verificar CPF:', err);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    setPhone(value);
  };

  const handleOAuthLogin = async (provider: 'google') => {
    const redirectToUrl = `${window.location.origin}${redirect}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectToUrl,
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
      if (!isValidCPF(cpf)) {
        setError('O CPF informado é inválido.');
        setCpfError('CPF inválido. Verifique os dígitos digitados.');
        setLoading(false);
        return;
      }
      if (cpfError) {
        setError('O CPF informado já está cadastrado.');
        setLoading(false);
        return;
      }
      if (!isPasswordValid) {
        setError('A senha não cumpre todos os requisitos de segurança.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
      }
      if (!acceptedTerms) {
        setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            cpf,
            phone,
            birth_date: birthDate,
          }
        }
      });
      if (error) {
        if (error.message.includes('Database error saving new user')) {
          setError('Este CPF já está cadastrado ou os dados informados são inválidos.');
        } else {
          setError(error.message);
        }
      } else {
        if (data?.session) {
          navigate(redirect);
        } else {
          setSuccessMsg('Cadastro realizado! Por favor, verifique o seu e-mail para confirmar sua conta.');
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data?.user) {
        try {
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          const isUserAdmin = !!adminData || data.user.user_metadata?.role === 'admin' || data.user.app_metadata?.role === 'admin';
          if (isUserAdmin) {
            navigate('/admin');
          } else {
            navigate(redirect);
          }
        } catch (err) {
          navigate(redirect);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] pt-24 pb-16 px-4 md:px-8 bg-[#FDF6F0] flex flex-col items-center justify-start text-[#1A332B] animate-fade-in-up">
      <div className="max-w-lg w-full bg-white p-6 md:p-10 rounded shadow-md border border-[#C06A35]/15">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">{isSignUp ? 'Criar Conta' : 'Bem-vindo(a)'}</h1>
          <p className="text-xs tracking-widest uppercase opacity-60">
            {isSignUp ? 'Junte-se à Palm CO.' : 'Acesse sua conta'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 text-sm text-center border border-red-200">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 text-sm text-center border border-green-200">
              {successMsg}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="firstName">Nome *</label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 focus:outline-none focus:border-[#1A332B] transition-colors"
                    placeholder="Maria"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="lastName">Sobrenome *</label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 focus:outline-none focus:border-[#1A332B] transition-colors"
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="cpf">CPF *</label>
                  <input
                    id="cpf"
                    type="text"
                    required
                    value={cpf}
                    onChange={handleCpfChange}
                    onBlur={handleCpfBlur}
                    className={`w-full border-b bg-transparent py-2 focus:outline-none transition-colors ${cpfError ? 'border-red-500' : 'border-[#1A332B]/30 focus:border-[#1A332B]'}`}
                    placeholder="000.000.000-00"
                  />
                  {cpfError && <span className="text-red-500 text-xs mt-1 block">{cpfError}</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="phone">Telefone *</label>
                  <input
                    id="phone"
                    type="text"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 focus:outline-none focus:border-[#1A332B] transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="birthDate">Data de Nascimento *</label>
                <input
                  id="birthDate"
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 focus:outline-none focus:border-[#1A332B] transition-colors"
                />
              </div>


            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="email">E-mail *</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 focus:outline-none focus:border-[#1A332B] transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="password">Senha *</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-[#1A332B]/30 bg-transparent py-2 pr-10 focus:outline-none focus:border-[#1A332B] transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#1A332B] transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="confirmPassword">Confirmar Senha *</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full border-b bg-transparent py-2 pr-10 focus:outline-none transition-colors ${confirmPassword && password !== confirmPassword ? 'border-red-500 text-red-500' : 'border-[#1A332B]/30 focus:border-[#1A332B]'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#1A332B] transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="text-red-500 text-xs mt-1 block">As senhas não coincidem.</span>
              )}
            </div>
          )}

          {isSignUp && password.length > 0 && (
            <div className="bg-[#FDF6F0] p-4 rounded border border-[#C06A35]/10 space-y-3 text-xs">
              <div className="font-bold text-[#1A332B] mb-1">Requisitos de Segurança:</div>
              <div className="flex items-center gap-2">
                <span className={isMinLengthAndAlphaNumeric ? 'text-green-600' : 'text-gray-400'}>
                  {isMinLengthAndAlphaNumeric ? '✓' : '○'}
                </span>
                <span>Ao menos 6 caracteres com letras e números</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasUpperCase ? 'text-green-600' : 'text-gray-400'}>
                  {hasUpperCase ? '✓' : '○'}
                </span>
                <span>Ao menos 1 letra maiúscula</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasLowerCase ? 'text-green-600' : 'text-gray-400'}>
                  {hasLowerCase ? '✓' : '○'}
                </span>
                <span>Ao menos 1 letra minúscula</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasSpecialChar ? 'text-green-600' : 'text-gray-400'}>
                  {hasSpecialChar ? '✓' : '○'}
                </span>
                <span>Ao menos 1 caractere especial (? - # $ !)</span>
              </div>

              <div className="pt-2 border-t border-[#C06A35]/10 font-bold text-[#1A332B] mb-1">Dicas de segurança:</div>
              <div className="flex items-center gap-2">
                <span className={!containsNameOrEmail ? 'text-green-600' : 'text-red-500'}>
                  {!containsNameOrEmail ? '✓' : '✗'}
                </span>
                <span>Não use seu nome, sobrenome ou e-mail</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={!hasSequentialEquals ? 'text-green-600' : 'text-red-500'}>
                  {!hasSequentialEquals ? '✓' : '✗'}
                </span>
                <span>Não use caracteres iguais em sequência (ex: AAAA)</span>
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="flex items-start gap-2 pt-2">
              <input
                id="acceptedTerms"
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 cursor-pointer accent-[#1A332B]"
              />
              <label htmlFor="acceptedTerms" className="text-xs text-gray-600 cursor-pointer select-none">
                Li, aceito os <Link to="/termos" target="_blank" className="text-[#C06A35] underline hover:text-[#1A332B]">Termos de Uso</Link> e estou ciente da <Link to="/privacidade" target="_blank" className="text-[#C06A35] underline hover:text-[#1A332B]">Política de Privacidade</Link> *
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && (!isPasswordValid || !acceptedTerms))}
            className="w-full bg-[#1A332B] text-[#FDF6F0] py-4 text-xs uppercase tracking-widest hover:opacity-90 transition-opacity mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" />
              </svg>
              Google
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