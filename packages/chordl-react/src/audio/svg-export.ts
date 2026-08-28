/**
 * Export SVG element as SVG or PNG file download.
 * Injects HTML annotations (note names, degrees, fingering) back into
 * the SVG as <text> elements using position data stored in data-annotations.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, "_").slice(0, 100);
}

/**
 * Inject annotation text elements into a cloned SVG.
 * Reads the data-annotations JSON, creates <text> elements at the exact
 * key positions, and expands the viewBox to fit.
 */
function injectAnnotations(clone: SVGSVGElement, vb: DOMRect): void {
  const raw = clone.getAttribute("data-annotations");
  if (!raw) return;

  // Remove the data attribute from the export
  clone.removeAttribute("data-annotations");

  let data: {
    heading?: string;
    items: Array<{
      x: number;
      note?: string;
      degree?: string;
      finger?: string;
      isAccidental: boolean;
    }>;
    fontSize: number;
    /** Degree row size. Older payloads have none; fall back to the old derivation. */
    degreeFontSize?: number;
    fingerFontSize: number;
    hasStagger: boolean;
    staggerHeight: number;
    textColor: string;
    mutedColor: string;
    keyboardHeight: number;
    controlsHeight: number;
  };

  try { data = JSON.parse(raw); } catch { return; }

  const { items, fontSize, fingerFontSize, hasStagger, staggerHeight, textColor, mutedColor, keyboardHeight, controlsHeight } = data;
  if (!items || items.length === 0) return;

  // Degrees carry their own size now. Deriving it here made the export disagree
  // with the screen for any chord that sized its degrees separately.
  const degFontSize = data.degreeFontSize ?? fontSize * 0.85;

  // Calculate annotation area height
  const nameRowH = fontSize + 3;
  const staggerH = hasStagger ? staggerHeight : 0;
  const hasAnyDegree = items.some((it) => it.degree);
  const degreeRowH = hasAnyDegree ? degFontSize + 3 : 0;
  const hasAnyFinger = items.some((it) => it.finger);
  const fingerRowH = hasAnyFinger ? fingerFontSize + 3 : 0;
  const annotationTotalH = staggerH + nameRowH + degreeRowH + fingerRowH + 4;

  // Heading above the keyboard
  const headingH = data.heading ? fontSize * 1.4 + 4 : 0;

  // Expand viewBox: shift content down for heading, add annotation space below
  const newHeight = vb.height + annotationTotalH + headingH;
  clone.setAttribute("viewBox", `${vb.x} ${vb.y - headingH} ${vb.width} ${newHeight}`);

  // Add heading
  if (data.heading) {
    const headingText = document.createElementNS(SVG_NS, "text");
    headingText.setAttribute("x", String(vb.x + vb.width / 2));
    headingText.setAttribute("y", String(vb.y - 4));
    headingText.setAttribute("text-anchor", "middle");
    headingText.setAttribute("font-size", String(fontSize * 1.2));
    headingText.setAttribute("font-weight", "600");
    headingText.setAttribute("fill", textColor);
    headingText.setAttribute("font-family", "system-ui, sans-serif");
    headingText.textContent = data.heading;
    clone.appendChild(headingText);
  }

  // Base Y for annotations (below keyboard, accounting for viewBox y-offset)
  const baseY = vb.y + vb.height + 2;

  for (const item of items) {
    const x = item.x;
    let rowY = baseY;

    // Note name / degree-only label
    if (item.note) {
      const yOffset = hasStagger && !item.isAccidental ? staggerH : 0;
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(rowY + fontSize + yOffset));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", String(fontSize));
      text.setAttribute("font-weight", "600");
      text.setAttribute("fill", textColor);
      text.setAttribute("font-family", "system-ui, sans-serif");
      text.textContent = item.note;
      clone.appendChild(text);
    }

    // Degree label (combo mode — separate row below note name)
    if (item.degree) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(rowY + staggerH + nameRowH + degFontSize));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", String(degFontSize));
      text.setAttribute("font-weight", "500");
      text.setAttribute("fill", mutedColor);
      text.setAttribute("font-family", "system-ui, sans-serif");
      text.textContent = item.degree;
      clone.appendChild(text);
    }

    // Fingering
    if (item.finger) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(rowY + staggerH + nameRowH + degreeRowH + fingerFontSize));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", String(fingerFontSize));
      text.setAttribute("font-weight", "500");
      text.setAttribute("fill", mutedColor);
      text.setAttribute("font-family", "system-ui, sans-serif");
      text.textContent = item.finger;
      clone.appendChild(text);
    }
  }
}

/**
 * Prepare a clone of the SVG for export: remove controls, inject annotations.
 */
export function prepareExportClone(svgElement: SVGSVGElement): { clone: SVGSVGElement; offsetY: number } {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const controls = clone.querySelector("[data-controls]");
  let offsetY = 0;
  if (controls) {
    offsetY = 30;
    controls.remove();
  }

  const vb = svgElement.viewBox.baseVal;
  // Adjust viewBox to skip controls area
  clone.setAttribute("viewBox", `${vb.x} ${offsetY} ${vb.width} ${vb.height - offsetY}`);

  // Inject annotations into the SVG
  const adjustedVb = { x: vb.x, y: offsetY, width: vb.width, height: vb.height - offsetY } as DOMRect;
  injectAnnotations(clone, adjustedVb);

  return { clone, offsetY };
}

export function downloadSvg(svgElement: SVGSVGElement, filename: string): void {
  const { clone } = prepareExportClone(svgElement);

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(filename)}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPng(svgElement: SVGSVGElement, filename: string, pixelRatio = 2): void {
  const { clone } = prepareExportClone(svgElement);

  // Read the final viewBox after annotation injection
  const finalVb = clone.viewBox.baseVal;
  const w = finalVb.width;
  const h = finalVb.height;
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * pixelRatio;
    canvas.height = h * pixelRatio;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      console.error("PNG export: could not get canvas 2d context");
      return;
    }
    ctx.scale(pixelRatio, pixelRatio);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("PNG export: canvas.toBlob returned null");
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${sanitizeFilename(filename)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    console.error("PNG export: failed to load SVG as image");
  };
  img.src = url;
}
