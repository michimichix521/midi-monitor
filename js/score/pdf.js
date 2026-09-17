// Pin the renderer and worker to the same version. PDF contents stay on this device.
const BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/';
let libraryPromise;
async function library() {
  if (!libraryPromise) libraryPromise = import(`${BASE}build/pdf.min.mjs`).then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}build/pdf.worker.min.mjs`;
    return pdfjs;
  }).catch(error => { libraryPromise = null; throw error; });
  return libraryPromise;
}

export class ScorePDF {
  task = null;
  document = null;
  async open(bytes) {
    await this.close();
    const pdfjs = await library();
    this.task = pdfjs.getDocument({data: bytes, cMapUrl: `${BASE}cmaps/`, cMapPacked: true,
      standardFontDataUrl: `${BASE}standard_fonts/`, wasmUrl: `${BASE}wasm/`, isEvalSupported: false});
    this.document = await this.task.promise;
    return this.document.numPages;
  }
  async render(pageNumber) {
    const page = await this.document.getPage(pageNumber), natural = page.getViewport({scale: 1});
    const scale = Math.min(1600 / natural.width, 2400 / natural.height, Math.sqrt(3500000 / (natural.width * natural.height)), 4);
    const viewport = page.getViewport({scale});
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', {willReadFrequently: true});
    try { await page.render({canvasContext: context, viewport, background: 'rgb(255,255,255)'}).promise; }
    finally { page.cleanup(); }
    return canvas;
  }
  async close() {
    if (this.task) await this.task.destroy();
    this.task = null; this.document = null;
  }
}
