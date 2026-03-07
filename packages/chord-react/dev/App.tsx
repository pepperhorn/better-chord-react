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

function InteractiveInput({ uiTheme }: { uiTheme: UIThemeMode }) {
  const isDark = uiTheme === "dark";
  const [input, setInput] = useState("Cmaj7#5 starting on G#");
  const [theme, setTheme] = useState<string>("simple");
  const [keyFormat, setKeyFormat] = useState<"compact" | "exact">("compact");
  const [scale, setScale] = useState(0.5);
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

  const selectStyle = {
    padding: "0.75rem",
    fontSize: "1rem",
    background: isDark ? "#0f3460" : "#fff",
    border: `1px solid ${isDark ? "#a0c6e8" : "#ccc"}`,
    borderRadius: 6,
    color: isDark ? "#eee" : "#333",
  };

  return (
    <div className="interactive">
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder='Try: "ii-V-I in G" or "D minor seventh in first inversion"'
          style={{
            flex: 1,
            minWidth: 300,
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            background: isDark ? "#0f3460" : "#fff",
            border: `1px solid ${isDark ? "#a0c6e8" : "#ccc"}`,
            borderRadius: 6,
            color: isDark ? "#eee" : "#333",
            fontFamily: "system-ui, sans-serif",
          }}
        />
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={selectStyle}
        >
          <option value="simple">Simple</option>
          <option value="crf">CRF</option>
          <option value="boomwhacker">Boomwhacker</option>
        </select>
        <div style={{ display: "flex", gap: 2 }}>
          {(["compact", "exact"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setKeyFormat(f)}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                background: keyFormat === f
                  ? (isDark ? "#fff" : "#333")
                  : (isDark ? "#0f3460" : "#e8e8e8"),
                color: keyFormat === f
                  ? (isDark ? "#333" : "#fff")
                  : (isDark ? "#eee" : "#333"),
                border: `1px solid ${isDark ? "#a0c6e8" : "#ccc"}`,
                borderRadius: f === "compact" ? "6px 0 0 6px" : "0 6px 6px 0",
                cursor: "pointer",
              }}
            >
              {f === "compact" ? "Compact" : "Full"}
            </button>
          ))}
        </div>
        <select
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          style={selectStyle}
          aria-label="Chord size"
        >
          {SCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {isProg && (
        <div style={{ fontSize: 12, color: isDark ? "#a0c6e8" : "#4a90d9", marginTop: 4 }}>
          Detected as progression
        </div>
      )}
      {error && <p style={{ color: "#ff6b6b", margin: "0.5rem 0" }}>{error}</p>}
      <div style={{ marginTop: "1rem" }}>
        <ErrorBoundary key={input + theme + keyFormat + scale} onError={setError}>
          {isProg && progressionResult ? (
            <ProgressionView result={progressionResult} theme={theme} uiTheme={uiTheme} />
          ) : (
            <PianoChord chord={input} theme={theme} format={keyFormat} scale={scale} uiTheme={uiTheme} />
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
    <div style={{ marginBottom: 8 }}>
      <h2
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease",
            fontSize: "0.8em",
          }}
        >
          &#9654;
        </span>
        {title}
      </h2>
      <div
        ref={contentRef}
        style={{
          maxHeight: open ? height : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease, opacity 0.25s ease",
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
  const isDark = uiTheme === "dark";

  return (
    <div
      data-bc-theme={uiTheme}
      style={{
        background: isDark ? "#1a1a2e" : "#f8f8fa",
        color: isDark ? "#eee" : "#1a1a1a",
        minHeight: "100vh",
        padding: "2rem 1rem",
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: isDark ? "#a0c6e8" : "#2a6496" }}>better-chord-react</h1>
        <select
          value={uiTheme}
          onChange={(e) => setUiTheme(e.target.value as UIThemeMode)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.9rem",
            background: isDark ? "#0f3460" : "#fff",
            border: `1px solid ${isDark ? "#a0c6e8" : "#ccc"}`,
            borderRadius: 6,
            color: isDark ? "#eee" : "#333",
          }}
        >
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
        </select>
      </div>

      <h2 style={{ color: isDark ? "#ccc" : "#555", marginTop: "2rem" }}>Try it</h2>
      <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
        <label style={{ color: isDark ? "#888" : "#777" }}>Enter a chord description in natural language:</label>
        <InteractiveInput uiTheme={uiTheme} />
      </div>

      <Collapsible title="Explicit Props (PianoKeyboard)">
        <div className="row">
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>C major triad: highlightKeys=["C","E","G"]</label>
            <PianoKeyboard highlightKeys={["C", "E", "G"]} uiTheme={uiTheme} />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>F#m7: highlightKeys=["F#","A","C#","E"] startFrom="E" size={"{6}"}</label>
            <PianoKeyboard
              highlightKeys={["F#", "A", "C#", "E"]}
              startFrom="E"
              size={6}
              uiTheme={uiTheme}
            />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>Custom size/start: startFrom="G" size={"{10}"} format="exact"</label>
            <PianoKeyboard startFrom="G" size={10} format="exact" uiTheme={uiTheme} />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Chord Strings (PianoChord)">
        <div className="row">
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>chord="Cmaj7"</label>
            <PianoChord chord="Cmaj7" uiTheme={uiTheme} />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>chord="Cmaj7#5 starting on G#"</label>
            <PianoChord chord="Cmaj7#5 starting on G#" uiTheme={uiTheme} />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>chord="D minor seventh in first inversion"</label>
            <PianoChord chord="D minor seventh in first inversion" uiTheme={uiTheme} />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Themes">
        <div className="row">
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>Boomwhacker theme: chord="C" (C major triad)</label>
            <PianoChord chord="C" theme="boomwhacker" uiTheme={uiTheme} />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>Simple theme (default): chord="C"</label>
            <PianoChord chord="C" theme="simple" uiTheme={uiTheme} />
          </div>
          <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
            <label style={{ color: isDark ? "#888" : "#777" }}>Custom highlight color: chord="Am" highlightColor="#ff6b6b"</label>
            <PianoChord chord="Am" highlightColor="#ff6b6b" uiTheme={uiTheme} />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Progressions">
        <div className="example" style={{ background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
          <label style={{ color: isDark ? "#888" : "#777" }}>ii-V-I in G — 3 contrasting voicing styles</label>
          <ProgressionView
            result={resolveProgressionRequest({
              progression: "ii-V-I",
              key: "G",
              numExamples: 3,
            })}
            uiTheme={uiTheme}
          />
        </div>
        <div className="example" style={{ marginTop: "2rem", background: isDark ? "#16213e" : "#fff", border: isDark ? "none" : "1px solid #e0e0e0" }}>
          <label style={{ color: isDark ? "#888" : "#777" }}>Blues in Bb — Bill Evans style</label>
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
  );
}

createRoot(document.getElementById("root")!).render(<App />);
