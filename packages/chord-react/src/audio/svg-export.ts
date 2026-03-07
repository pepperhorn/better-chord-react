/**
 * Export SVG element as SVG or PNG file download.
 * No external libraries needed — uses native Canvas API for PNG conversion.
 */

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, "_").slice(0, 100);
}

export function downloadSvg(svgElement: SVGSVGElement, filename: string): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  // Remove playback/download controls from export
  const controls = clone.querySelector("[data-controls]");
  if (controls) {
    const controlsH = 30;
    controls.remove();
    const vb = svgElement.viewBox.baseVal;
    clone.setAttribute("viewBox", `0 ${controlsH} ${vb.width} ${vb.height - controlsH}`);
  }

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(filename)}.svg`;
  a.click();
  // Defer revocation so the browser has time to read the blob
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPng(svgElement: SVGSVGElement, filename: string, pixelRatio = 2): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const controls = clone.querySelector("[data-controls]");
  let offsetY = 0;
  if (controls) {
    offsetY = 30;
    controls.remove();
  }

  const vb = svgElement.viewBox.baseVal;
  const w = vb.width;
  const h = vb.height - offsetY;
  clone.setAttribute("viewBox", `0 ${offsetY} ${w} ${h}`);
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
