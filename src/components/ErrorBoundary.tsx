import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` - ${this.props.name}` : ""}] Caught render error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 text-center dark:bg-[#111111] bg-white rounded-2xl border dark:border-neutral-800 border-slate-200 my-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-2">
            Algo inesperado aconteceu ao exibir esta seção
          </h2>
          <p className="text-sm dark:text-neutral-400 text-slate-500 max-w-md mb-6 leading-relaxed">
            Detectamos uma inconsistência na renderização visual. Seus dados estão seguros e não foram perdidos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Tentar novamente
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 border dark:border-neutral-700 border-slate-300 dark:text-neutral-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Recarregar página
            </button>
            <a
              href="/analyze"
              className="px-4 py-2.5 border dark:border-neutral-700 border-slate-300 dark:text-neutral-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Home size={14} />
              Voltar ao Upload
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
