import type { UIThemeTokens } from "../config";

export interface CardHeadingProps {
  /** User-supplied descriptive label. Leads when present. */
  title?: string;
  /** Resolved chord/scale name. Renders beneath `title`, or leads without one. */
  chordName?: string;
  /** Muted line below the name. */
  subheading?: string;
  tokens: UIThemeTokens;
  /** Prefix for the emitted class names, e.g. "keyboard" → `bc-keyboard-heading`. */
  variant: string;
}

/**
 * The text stack above a chord diagram, shared by every renderer so a keyboard,
 * a staff and a fretboard sitting side by side on a board agree on type.
 *
 * `title` describes the card ("bar 1 — turnaround"); the chord name is the
 * card's identity and is never replaced by it. With no title the name leads.
 */
export function CardHeading({ title, chordName, subheading, tokens, variant }: CardHeadingProps) {
  const lead = title ?? chordName;
  const nameLine = title ? chordName : undefined;
  if (!lead && !subheading) return null;

  return (
    <>
      {lead && (
        <div className={`bc-${variant}-heading`} style={{
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          color: tokens.text,
          fontFamily: "system-ui, sans-serif",
          marginBottom: nameLine || subheading ? 0 : 4,
        }}>
          {lead}
        </div>
      )}
      {nameLine && (
        <div className={`bc-${variant}-chord-name`} style={{
          textAlign: "center",
          fontSize: 11,
          fontWeight: 400,
          color: tokens.textMuted,
          fontFamily: "system-ui, sans-serif",
          marginBottom: subheading ? 0 : 4,
        }}>
          {nameLine}
        </div>
      )}
      {subheading && (
        <div className={`bc-${variant}-subheading`} style={{
          textAlign: "center",
          fontSize: 11,
          fontWeight: 400,
          color: tokens.textMuted,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 4,
        }}>
          {subheading}
        </div>
      )}
    </>
  );
}

/** Footer line below a card's diagram, matching `CardHeading`'s muted type. */
export function CardFooter({ text, tokens, variant }: { text?: string; tokens: UIThemeTokens; variant: string }) {
  if (!text) return null;
  return (
    <div className={`bc-${variant}-footer`} style={{
      textAlign: "center",
      fontSize: 11,
      fontWeight: 400,
      color: tokens.textMuted,
      fontFamily: "system-ui, sans-serif",
      marginTop: 4,
    }}>
      {text}
    </div>
  );
}
