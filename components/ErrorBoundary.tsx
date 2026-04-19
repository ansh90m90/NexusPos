import React, { Component, ErrorInfo, ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    let parsedErrorInfo = null;
    try {
      // Check if it's our custom Firestore error JSON
      if (error.message.startsWith('{') && error.message.endsWith('}')) {
        parsedErrorInfo = JSON.parse(error.message);
      }
    } catch (_e) {
      // Not a JSON error
    }

    this.setState({ errorInfo: parsedErrorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message.includes('Quota limit exceeded') || 
                          this.state.errorInfo?.error?.includes('Quota limit exceeded');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 text-center space-y-6">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${isQuotaError ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
              <Icon name={isQuotaError ? 'AlertTriangle' : 'XCircle'} size={32} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {isQuotaError ? 'Daily Limit Reached' : 'Something went wrong'}
              </h1>
              <p className="text-slate-500">
                {isQuotaError 
                  ? "The application has reached its free tier limit for today. Don't worry, your data is safe! The limit will reset automatically tomorrow."
                  : "An unexpected error occurred. We've been notified and are looking into it."}
              </p>
            </div>

            {isQuotaError && (
              <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs text-slate-600 space-y-2 border border-slate-100">
                <p className="font-bold flex items-center gap-2">
                  <Icon name="Info" size={14} />
                  What does this mean?
                </p>
                <p>
                  Firestore (our database) has a daily free quota for reads and writes. 
                  Once this limit is reached, the app cannot fetch or save new data until the next day.
                </p>
                <p>
                  Detailed quota information can be found under the Spark plan column in the Enterprise edition section of 
                  <a href="https://firebase.google.com/pricing#cloud-firestore" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">
                    Firebase Pricing
                  </a>.
                </p>
              </div>
            )}

            {!isQuotaError && this.state.error && (
               <div className="bg-rose-50/50 rounded-2xl p-4 text-left text-xs text-rose-700 font-mono overflow-auto max-h-32 border border-rose-100">
                 {this.state.error.message}
               </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                <Icon name="RefreshCw" size={18} />
                Try Refreshing
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 rounded-2xl bg-white text-slate-600 font-semibold border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
