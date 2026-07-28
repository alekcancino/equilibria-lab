import { Component, type ReactNode } from 'react';

interface RecoverableErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
  message: string;
  retryLabel: string;
}

interface RecoverableErrorBoundaryState {
  failed: boolean;
}

/** Keeps a failed lazy chunk or chart renderer from stranding the user on a loading state. */
export default class RecoverableErrorBoundary extends Component<
  RecoverableErrorBoundaryProps,
  RecoverableErrorBoundaryState
> {
  state: RecoverableErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RecoverableErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    // The fallback intentionally stays local: this client-only simulator has no error endpoint.
  }

  componentDidUpdate(previousProps: RecoverableErrorBoundaryProps): void {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="recoverable-error" role="alert">
          <p>{this.props.message}</p>
          <button type="button" onClick={() => this.setState({ failed: false })}>
            {this.props.retryLabel}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
