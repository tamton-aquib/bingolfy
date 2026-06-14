import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="win-overlay active" role="alert">
                    <div className="win-card">
                        <h1 style={{ color: "var(--accent)", marginBottom: "var(--space-md)" }}>!</h1>
                        <h2 style={{ marginBottom: "var(--space-sm)" }}>Something went wrong</h2>
                        <p style={{ marginBottom: "var(--space-lg)" }}>
                            {this.state.error?.message || "An unexpected error occurred."}
                        </p>
                        <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center" }}>
                            <button className="btn" onClick={this.handleReset}>
                                TRY AGAIN
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={this.handleReload}>
                                RELOAD PAGE
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
