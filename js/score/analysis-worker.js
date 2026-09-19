import {grayscale, binarize, reduceNoise, removeStaffLines} from './image-processing.js';
import {detectStaves} from './staff-detection.js?v=2';
import {connectedComponents} from './components.js';
import {detectNoteHeads} from './note-detection.js?v=3';
import {enrichNoteRhythm} from './rhythm-detection.js?v=5';

self.onmessage = ({data: {rgba, width, height, settings}}) => {
  try {
    const progress = stage => self.postMessage({type: 'progress', stage});
    progress('preprocess');
    const gray = grayscale(new Uint8ClampedArray(rgba));
    let binary = binarize(gray, width, height, settings);
    if (settings.denoise) binary = reduceNoise(binary, width, height);
    progress('staves');
    const {projection, candidates: lines, staves} = detectStaves(binary, width, height, settings);
    const cleaned = removeStaffLines(binary, width, height, staves);
    progress('components');
    const {components, truncated} = connectedComponents(cleaned, width, height, settings.minArea);
    progress('heads');
    const heads = enrichNoteRhythm(binary, width, height, detectNoteHeads(cleaned, width, height, staves, settings.minConfidence, binary), staves);
    const result = {width, height, gray, binary, cleaned, projection, lines, staves, components, truncated, heads, settings};
    self.postMessage({type: 'result', result}, [gray.buffer, binary.buffer, cleaned.buffer, projection.buffer]);
  } catch (error) { self.postMessage({type: 'error', message: String(error.message || error)}); }
};
