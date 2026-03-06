import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PianoKeyboard, PianoChord } from "../src";

function InteractiveInput() {
  const [input, setInput] = useState("Cmaj7#5 starting on G#");
  const [theme, setTheme] = useState<string>("simple");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="interactive">
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder='Try: "D minor seventh in first inversion"'
          style={{
            flex: 1,
            minWidth: 300,
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            background: "#0f3460",
            border: "1px solid #a0c6e8",
            borderRadius: 6,
            color: "#eee",
            fontFamily: "system-ui, sans-serif",
          }}
        />
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            padding: "0.75rem",
            fontSize: "1rem",
            background: "#0f3460",
            border: "1px solid #a0c6e8",
            borderRadius: 6,
            color: "#eee",
          }}
        >
          <option value="simple">Simple</option>
          <option value="crf">CRF</option>
          <option value="boomwhacker">Boomwhacker</option>
        </select>
      </div>
      {error && <p style={{ color: "#ff6b6b", margin: "0.5rem 0" }}>{error}</p>}
      <div style={{ marginTop: "1rem" }}>
        <ErrorBoundary key={input + theme} onError={setError}>
          <PianoChord chord={input} theme={theme} />
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

function App() {
  return (
    <div>
      <h1>better-chord-react</h1>

      <h2>Try it</h2>
      <div className="example">
        <label>Enter a chord description in natural language:</label>
        <InteractiveInput />
      </div>

      <h2>Explicit Props (PianoKeyboard)</h2>
      <div className="row">
        <div className="example">
          <label>C major triad: highlightKeys=["C","E","G"]</label>
          <PianoKeyboard highlightKeys={["C", "E", "G"]} />
        </div>
        <div className="example">
          <label>F#m7: highlightKeys=["F#","A","C#","E"] startFrom="E" size={6}</label>
          <PianoKeyboard
            highlightKeys={["F#", "A", "C#", "E"]}
            startFrom="E"
            size={6}
          />
        </div>
        <div className="example">
          <label>Custom size/start: startFrom="G" size={10} format="exact"</label>
          <PianoKeyboard startFrom="G" size={10} format="exact" />
        </div>
      </div>

      <h2>Chord Strings (PianoChord)</h2>
      <div className="row">
        <div className="example">
          <label>chord="Cmaj7"</label>
          <PianoChord chord="Cmaj7" />
        </div>
        <div className="example">
          <label>chord="Cmaj7#5 starting on G#"</label>
          <PianoChord chord="Cmaj7#5 starting on G#" />
        </div>
        <div className="example">
          <label>chord="D minor seventh in first inversion"</label>
          <PianoChord chord="D minor seventh in first inversion" />
        </div>
      </div>

      <h2>Themes</h2>
      <div className="row">
        <div className="example">
          <label>Boomwhacker theme: chord="C" (C major triad)</label>
          <PianoChord chord="C" theme="boomwhacker" />
        </div>
        <div className="example">
          <label>Simple theme (default): chord="C"</label>
          <PianoChord chord="C" theme="simple" />
        </div>
        <div className="example">
          <label>Custom highlight color: chord="Am" highlightColor="#ff6b6b"</label>
          <PianoChord chord="Am" highlightColor="#ff6b6b" />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
