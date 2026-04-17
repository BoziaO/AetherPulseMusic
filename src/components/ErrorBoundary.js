import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-8"
          style={{ backgroundColor: "var(--bg-main, #050816)", color: "var(--text-main, #fff)" }}
        >
          <div className="text-center" style={{ maxWidth: "420px" }}>
            <div
              className="w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 text-4xl"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              ⚠️
            </div>
            <h1
              className="text-2xl font-black tracking-tight mb-3"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Coś poszło nie tak
            </h1>
            <p
              className="text-sm leading-relaxed mb-8"
              style={{ color: "var(--text-muted, #a0a0a0)" }}
            >
              Wystąpił nieoczekiwany błąd w aplikacji. Spróbuj odświeżyć stronę.
            </p>
            {this.state.error && (
              <pre
                className="text-xs text-left p-4 rounded-2xl mb-6 overflow-auto max-h-32"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#ef4444" }}
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
