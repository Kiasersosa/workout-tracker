"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-4 rounded-full bg-red-500/10 p-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <p className="mb-2 text-sm font-medium text-red-400">
            {this.props.fallbackMessage || "Something went wrong"}
          </p>
          <p className="mb-6 text-xs text-slate-500">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700"
          >
            <RefreshCw size={14} />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
