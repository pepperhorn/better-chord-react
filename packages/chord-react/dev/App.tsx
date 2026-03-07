import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PianoKeyboard, PianoChord, ProgressionView, isProgressionRequest, parseProgressionRequest, resolveProgressionRequest } from "../src";
import type { UIThemeMode } from "../src";

const SCALE_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "60%", value: 0.6 },
  { label: "70%", value: 0.7 },
  { label: "80%", value: 0.8 },
  { label: "90%", value: 0.9 },
  { label: "100%", value: 1.0 },
];

const THEME_OPTIONS = [
  { label: "Simple", value: "simple" },
  { label: "CRF", value: "crf" },
  { label: "Boom", value: "boomwhacker" },
];

function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="control-item">
      {label && <span className="control-label">{label}</span>}
      <div className="control-content">
        <div className="pill-group">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              className="pill-btn"
              data-active={value === opt.value}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InteractiveInput({ uiTheme }: { uiTheme: UIThemeMode }) {
  const [input, setInput] = useState("Cmaj7#5 starting on G#");
  const [theme, setTheme] = useState<string>("simple");
  const [keyFormat, setKeyFormat] = useState<"compact" | "exact">("compact");
  const [scale, setScale] = useState(0.7);
  const [highlightColor, setHighlightColor] = useState("#a0c6e8");
  const [error, setError] = useState<string | null>(null);

  const isProg = isProgressionRequest(input);

  let progressionResult = null;
  if (isProg) {
    try {
      const parsed = parseProgressionRequest(input);
      progressionResult = resolveProgressionRequest({
        progression: parsed.progression,
        key: parsed.key,
        numExamples: parsed.numExamples,
        styleHint: parsed.styleHint,
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
      {/* Hero input */}
      <div style={{ width: "100%", maxWidth: 640, position: "relative" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder='Tell me what chord(s) you&apos;d like to visualize..'
          style={{
            width: "100%",
            padding: "1rem 1.25rem",
            fontSize: "1.05rem",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 400,
            background: "var(--input-floating-bg)",
            border: "1px solid var(--input-floating-border)",
            borderRadius: 24,
            color: "var(--text)",
            outline: "none",
            transition: "border-color 0.25s ease, box-shadow 0.25s ease",
            boxShadow: "var(--input-floating-shadow)",
            letterSpacing: "-0.01em",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--input-focus)";
            e.currentTarget.style.boxShadow = "var(--input-floating-shadow-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--input-floating-border)";
            e.currentTarget.style.boxShadow = "var(--input-floating-shadow)";
          }}
        />
        {isProg && (
          <span style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: "var(--tag-bg)",
            color: "var(--tag-text)",
            padding: "3px 8px",
            borderRadius: 6,
          }}>
            Progression
          </span>
        )}
      </div>

      {/* Controls row — muted, secondary */}
      <div style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "stretch",
        flexWrap: "wrap",
        justifyContent: "center",
        opacity: 0.55,
        transition: "opacity 0.25s ease",
      }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.55"}
      >
        <PillGroup
          label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
        <PillGroup
          label="Layout"
          options={[
            { label: "Compact", value: "compact" as const },
            { label: "Full", value: "exact" as const },
          ]}
          value={keyFormat}
          onChange={setKeyFormat}
        />
        <div className="control-item">
          <span className="control-label">Size</span>
          <div className="control-content">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={50}
                max={100}
                step={10}
                value={scale * 100}
                onChange={(e) => setScale(parseInt(e.target.value, 10) / 100)}
                style={{
                  width: 100,
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--pill-active-text)", minWidth: 32 }}>
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>
        </div>
        {theme === "simple" && (
          <div className="control-item">
            <span className="control-label">Color</span>
            <div className="control-content">
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "transparent",
                  padding: 0,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{
          color: "var(--error)",
          fontSize: "0.85rem",
          fontWeight: 500,
          margin: 0,
          textAlign: "center",
        }}>
          {error}
        </p>
      )}

      {/* Chord output */}
      <div className="chord-output" style={{ width: "100%" }}>
        <ErrorBoundary key={input + theme + keyFormat + scale + highlightColor} onError={setError}>
          {isProg && progressionResult ? (
            <ProgressionView result={progressionResult} theme={theme} uiTheme={uiTheme} />
          ) : (
            <PianoChord chord={input} theme={theme} format={keyFormat} scale={scale} highlightColor={theme === "simple" ? highlightColor : undefined} uiTheme={uiTheme} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (msg: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { this.props.onError(err.message); }
  render() { return this.state.hasError ? null : this.props.children; }
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open]);

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        className="collapsible-header"
        onClick={() => setOpen(!open)}
      >
        <span
          className="collapsible-arrow"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          &#9654;
        </span>
        {title}
      </div>
      <div
        ref={contentRef}
        className="collapsible-body"
        style={{
          maxHeight: open ? height : 0,
          opacity: open ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  const [uiTheme, setUiTheme] = useState<UIThemeMode>("light");

  return (
    <div
      data-bc-theme={uiTheme}
      style={{
        minHeight: "100vh",
        padding: "2.5rem 1.5rem",
        maxWidth: 960,
        margin: "0 auto",
        transition: "color 0.4s ease",
      }}
    >
      {/* Header */}
      <div className="fade-in" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2.5rem",
      }}>
        <div>
          <h1 style={{
            fontSize: "1.6rem",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            lineHeight: 1.2,
          }}>
            better-chord
            <span style={{ color: "var(--accent)", fontWeight: 300 }}>.react</span>
          </h1>
          <p style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            marginTop: 4,
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}>
            Interactive piano chord visualization
          </p>
        </div>
        <PillGroup
          options={[
            { label: "Light", value: "light" as UIThemeMode },
            { label: "Dark", value: "dark" as UIThemeMode },
          ]}
          value={uiTheme}
          onChange={setUiTheme}
        />
      </div>

      {/* Hero — no card, input floats directly */}
      <div className="fade-in fade-in-delay-1" style={{
        padding: "1.5rem 0 2rem",
      }}>
        <InteractiveInput uiTheme={uiTheme} />
      </div>

      {/* Example sections */}
      <div className="fade-in fade-in-delay-2">
        <Collapsible title="Explicit Props">
          <div className="row" style={{ marginBottom: "1rem" }}>
            <div className="glass-card">
              <span className="example-label">highlightKeys=["C","E","G"]</span>
              <PianoKeyboard highlightKeys={["C", "E", "G"]} uiTheme={uiTheme} />
            </div>
            <div className="glass-card">
              <span className="example-label">F#m7 · startFrom="E" size={"{6}"}</span>
              <PianoKeyboard
                highlightKeys={["F#", "A", "C#", "E"]}
                startFrom="E"
                size={6}
                uiTheme={uiTheme}
              />
            </div>
            <div className="glass-card">
              <span className="example-label">startFrom="G" size={"{10}"} format="exact"</span>
              <PianoKeyboard startFrom="G" size={10} format="exact" uiTheme={uiTheme} />
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Chord Strings">
          <div className="row" style={{ marginBottom: "1rem" }}>
            <div className="glass-card">
              <span className="example-label">chord="Cmaj7"</span>
              <PianoChord chord="Cmaj7" uiTheme={uiTheme} />
            </div>
            <div className="glass-card">
              <span className="example-label">chord="Cmaj7#5 starting on G#"</span>
              <PianoChord chord="Cmaj7#5 starting on G#" uiTheme={uiTheme} />
            </div>
            <div className="glass-card">
              <span className="example-label">chord="D minor seventh 1st inversion"</span>
              <PianoChord chord="D minor seventh in first inversion" uiTheme={uiTheme} />
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Themes">
          <div className="row" style={{ marginBottom: "1rem" }}>
            <div className="glass-card">
              <span className="example-label">Boomwhacker · chord="C"</span>
              <PianoChord chord="C" theme="boomwhacker" uiTheme={uiTheme} />
            </div>
            <div className="glass-card">
              <span className="example-label">Simple · chord="C"</span>
              <PianoChord chord="C" theme="simple" uiTheme={uiTheme} />
            </div>
            <div className="glass-card">
              <span className="example-label">Custom · highlightColor="#ff6b6b"</span>
              <PianoChord chord="Am" highlightColor="#ff6b6b" uiTheme={uiTheme} />
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Progressions">
          <div className="glass-card" style={{ marginBottom: "1rem" }}>
            <span className="example-label">ii-V-I in G — 3 voicing styles</span>
            <ProgressionView
              result={resolveProgressionRequest({
                progression: "ii-V-I",
                key: "G",
                numExamples: 3,
              })}
              uiTheme={uiTheme}
            />
          </div>
          <div className="glass-card" style={{ marginBottom: "1rem" }}>
            <span className="example-label">Blues in Bb — Bill Evans style</span>
            <ProgressionView
              result={resolveProgressionRequest({
                progression: "blues",
                key: "Bb",
                numExamples: 1,
                styleHint: "Bill Evans",
              })}
              showPlayback={false}
              uiTheme={uiTheme}
            />
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
