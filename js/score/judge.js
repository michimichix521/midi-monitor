export const SCORE_WEIGHTS = {pitch: .5, timing: .3, duration: .2};

function gradeTiming(error, thresholds) {
  if (error <= thresholds.perfect) return 'PERFECT';
  if (error <= thresholds.great) return 'GREAT';
  if (error <= thresholds.good) return 'GOOD';
  return 'MISS';
}

export class PerformanceJudge {
  constructor(events, bpm, thresholds) {
    this.msPerBeat = 60000 / bpm; this.thresholds = thresholds; this.startedAt = null;
    this.expected = events.flatMap(event => event.notes.map(note => ({...note,
      expectedTime: event.startBeat * this.msPerBeat, expectedDuration: note.durationBeat * this.msPerBeat,
      matched: false, grade: null, durationError: null})));
    this.played = []; this.extra = 0; this.counts = {PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0};
  }
  start() { this.startedAt = performance.now(); }
  elapsed() { return Math.max(0, performance.now() - this.startedAt); }
  on(note) {
    if (this.startedAt === null) return null;
    const elapsed = this.elapsed();
    const candidates = this.expected.filter(item => !item.matched && item.midi === note.midi);
    const expected = candidates.sort((a, b) => Math.abs(a.expectedTime - elapsed) - Math.abs(b.expectedTime - elapsed))[0];
    if (!expected || Math.abs(expected.expectedTime - elapsed) > this.thresholds.good) {
      this.played.push({...note, result: 'EXTRA'}); this.extra++; return {grade: 'MISS', extra: true};
    }
    const error = Math.abs(expected.expectedTime - elapsed), grade = gradeTiming(error, this.thresholds);
    expected.matched = true; expected.grade = grade; expected.played = note; expected.timingError = error;
    this.counts[grade]++; this.played.push({...note, expectedId: expected.id, result: grade});
    return {grade, expected};
  }
  off(note) {
    const played = [...this.played].reverse().find(item => item.channel === note.channel && item.midi === note.midi && !item.endTime);
    if (!played) return;
    played.endTime = note.endTime; played.duration = note.duration;
    const expected = this.expected.find(item => item.id === played.expectedId);
    if (expected) expected.durationError = Math.abs(expected.expectedDuration - note.duration);
  }
  finish() {
    for (const item of this.expected) if (!item.matched) { item.grade = 'MISS'; this.counts.MISS++; }
    const matched = this.expected.filter(item => item.matched), timing = matched.map(item => item.timingError || 0);
    const durations = matched.filter(item => Number.isFinite(item.durationError));
    const pitch = this.expected.length ? matched.length / this.expected.length * 100 : 0;
    const timingScore = matched.length ? matched.reduce((sum, item) => sum + ({PERFECT: 100, GREAT: 80, GOOD: 60, MISS: 0}[item.grade] || 0), 0) / matched.length : 0;
    const duration = durations.length ? durations.reduce((sum, item) => sum + Math.max(0, 100 - item.durationError / Math.max(1, item.expectedDuration) * 100), 0) / durations.length : 0;
    const total = pitch * SCORE_WEIGHTS.pitch + timingScore * SCORE_WEIGHTS.timing + duration * SCORE_WEIGHTS.duration;
    return {total: Math.round(total), pitch, timing: timingScore, duration, counts: this.counts, extra: this.extra,
      averageError: timing.length ? timing.reduce((sum, value) => sum + value, 0) / timing.length : 0,
      maximumError: timing.length ? Math.max(...timing) : 0, played: this.played.length, expected: this.expected.length};
  }
}
