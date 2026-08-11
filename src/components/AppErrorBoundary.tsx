import React from 'react';
import { captureOperationalError } from '../services/monitoring';

interface State { failed: boolean }

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void captureOperationalError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-[#FDF6F0] flex items-center justify-center p-6 text-center text-[#1A332B]">
          <div>
            <h1 className="text-3xl font-serif mb-4">Não foi possível abrir esta página.</h1>
            <p className="text-sm text-[#423226] mb-6">Atualize a página para tentar novamente.</p>
            <button type="button" onClick={() => window.location.reload()} className="bg-[#1A332B] text-white px-6 py-3 text-xs uppercase tracking-widest">
              Atualizar página
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
