// Catches render/runtime errors in a subtree so one bad component can't
// white-screen the whole SPA (the portal previously had no boundary at all).
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Surface it for debugging without taking down the app.
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="appErrorFallback" role="alert">
          <strong>Something went wrong.</strong>
          <p>Please reload — your saved training is safe.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
