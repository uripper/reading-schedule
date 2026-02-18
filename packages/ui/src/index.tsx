import type { PropsWithChildren } from "react";
import "./tokens.css";

export function Button(props: PropsWithChildren<{ onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }>) {
  const { onClick, type = "button", disabled, children } = props;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 44,
        borderRadius: "var(--rs-radius)",
        border: "1px solid var(--rs-border)",
        background: "var(--rs-surface)",
        color: "var(--rs-text)",
        padding: "var(--rs-space-2) var(--rs-space-3)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Card(props: PropsWithChildren<{ title: string }>) {
  return (
    <section
      style={{
        background: "var(--rs-surface)",
        border: "1px solid var(--rs-border)",
        borderRadius: "var(--rs-radius)",
        padding: "var(--rs-space-4)",
        display: "grid",
        gap: "var(--rs-space-3)",
      }}
    >
      <h2 style={{ margin: 0 }}>{props.title}</h2>
      {props.children}
    </section>
  );
}
