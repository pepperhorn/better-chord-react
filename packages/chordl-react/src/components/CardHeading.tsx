import type { UIThemeTokens } from "../config";

/** Joins the shared `bc-*` hook with a caller's optional one. */
function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

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
  /**
   * Extra class per line, appended to the `bc-*` class rather than replacing it.
   * `variant` only renames the shared hook; a consumer that already has DOM
   * hooks of its own keeps them here instead of forking the type scale to get
   * them. Per line rather than one class for all three, because the lines are
   * different things and a single class on all of them would name none of them.
   */
  classNames?: { heading?: string; chordName?: string; subheading?: string };
}

/**
 * The text stack above a chord diagram, shared by every renderer so a keyboard,
 * a staff and a fretboard sitting side by side on a board agree on type.
 *
 * `title` describes the card ("bar 1 — turnaround"); the chord name is the
 * card's identity and is never replaced by it. With no title the name leads.
 */
export function CardHeading({ title, chordName, subheading, tokens, variant, classNames }: CardHeadingProps) {
  const lead = title ?? chordName;
  const nameLine = title ? chordName : undefined;
  if (!lead && !subheading) return null;

  return (
    <>
      {lead && (
        <div className={cx(`bc-${variant}-heading`, classNames?.heading)} style={{
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
        <div className={cx(`bc-${variant}-chord-name`, classNames?.chordName)} style={{
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
        <div className={cx(`bc-${variant}-subheading`, classNames?.subheading)} style={{
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

export interface CardFooterProps {
  text?: string;
  tokens: UIThemeTokens;
  /** Prefix for the emitted class name, e.g. "guitar" → `bc-guitar-footer`. */
  variant: string;
  /** Extra class appended to the `bc-*` one. See `CardHeadingProps.classNames`. */
  className?: string;
}

/** Footer line below a card's diagram, matching `CardHeading`'s muted type. */
export function CardFooter({ text, tokens, variant, className }: CardFooterProps) {
  if (!text) return null;
  return (
    <div className={cx(`bc-${variant}-footer`, className)} style={{
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
