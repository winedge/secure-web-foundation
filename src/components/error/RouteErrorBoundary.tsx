import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackRoute?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = this.props.fallbackRoute || '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                An unexpected error occurred. You can try again or return to the dashboard.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {this.state.error && (
                <pre className="text-xs text-left bg-muted rounded-lg p-3 overflow-auto max-h-32 text-muted-foreground">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
