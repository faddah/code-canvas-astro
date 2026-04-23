import React from "react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("App crashed:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div role="alert" style={{
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0a0a0a",
                    color: "#e5e5e5",
                    fontFamily: "monospace",
                }}>
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: "#999", marginBottom: "1.5rem" }}>
                        The app encountered an error during loading.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "0.5rem 1.5rem",
                            backgroundColor: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
