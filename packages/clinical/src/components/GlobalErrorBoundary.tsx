import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OptoMed ErrorBoundary] Erro capturado na árvore de componentes:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    try {
      // Limpa dados de sessão e caches temporários que possam estar corrompidos
      localStorage.removeItem('optotipo_clinical_auth_user_v2');
      localStorage.removeItem('optotipo_clinical_auth_token_v2');
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  private handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  OptoMed Clínica
                </h1>
                <p className="text-xs text-slate-400">
                  Recuperação Automática de Interface
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
              <div className="font-semibold text-rose-400">
                {this.state.error?.name || 'Erro de Inicialização'}:
              </div>
              <div className="text-slate-200 break-words leading-relaxed font-semibold">
                {this.state.error?.message || 'Ocorreu uma falha inesperada durante a renderização do módulo clínico.'}
              </div>
              {this.state.error?.stack && (
                <div className="mt-2 text-[10px] text-slate-400 max-h-40 overflow-y-auto whitespace-pre-wrap bg-slate-900/80 p-2 rounded border border-slate-800/80">
                  {this.state.error.stack}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 text-[10px] text-cyan-300 max-h-40 overflow-y-auto whitespace-pre-wrap bg-slate-900/80 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 font-bold block mb-1">Component Stack:</span>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              O sistema evitou que a tela ficasse branca. Você pode recarregar a página normalmente ou restaurar a sessão para corrigir dados incompatíveis de versões anteriores.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Sistema</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-600/50 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Restaurar Sessão (Ir para o Login)</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full py-2 px-4 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Todo o Armazenamento Local</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
