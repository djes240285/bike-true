import { describe, expect, test } from 'bun:test';
import { parseReading, parseVisitDraft } from './device';

describe('device', () => {
  test('углы читаются, пустой и битый снимок отбрасываются', () => {
    expect(parseReading(null)).toBeNull();
    expect(parseReading('{')).toBeNull();
    expect(parseReading(JSON.stringify({ knee: null, back: null, arm: null, hip: null }))).toBeNull();
    expect(parseReading(JSON.stringify({ knee: 142, hadTopPhoto: true }))).toEqual({
      reading: { knee: 142, back: null, arm: null, hip: null },
      hadTop: true,
    });
  });

  test('черновик записи режется по полям', () => {
    expect(parseVisitDraft(null)).toBeNull();
    expect(parseVisitDraft('nope')).toBeNull();
    expect(
      parseVisitDraft(
        JSON.stringify({
          name: 'А'.repeat(100),
          phone: '+7 900',
          comment: 'вечером',
          dayChoice: 'tomorrow',
          customDate: '2026-13-40',
          time: '18:00',
        }),
      ),
    ).toEqual({
      name: 'А'.repeat(80),
      phone: '+7 900',
      comment: 'вечером',
      dayChoice: 'tomorrow',
      customDate: '',
      time: '18:00',
    });
  });
});
