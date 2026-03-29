import { create } from 'zustand';

export interface Keyframe {
  time: number;
  property: string;
  value: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface AnimationTrack {
  id: string;
  entityId: string;
  entityName: string;
  keyframes: Keyframe[];
}

interface AnimationState {
  tracks: AnimationTrack[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedTrackId: string | null;

  addTrack: (entityId: string, entityName: string) => void;
  removeTrack: (id: string) => void;
  addKeyframe: (trackId: string, keyframe: Keyframe) => void;
  removeKeyframe: (trackId: string, time: number, property: string) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  selectTrack: (id: string | null) => void;
}

let trackCounter = 0;

export const useAnimationStore = create<AnimationState>((set, get) => ({
  tracks: [],
  currentTime: 0,
  duration: 5,
  isPlaying: false,
  selectedTrackId: null,

  addTrack: (entityId, entityName) => {
    trackCounter++;
    const track: AnimationTrack = {
      id: `track_${trackCounter}`,
      entityId,
      entityName,
      keyframes: [],
    };
    set(state => ({ tracks: [...state.tracks, track] }));
  },

  removeTrack: (id) => {
    set(state => ({
      tracks: state.tracks.filter(t => t.id !== id),
      selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
    }));
  },

  addKeyframe: (trackId, keyframe) => {
    set(state => ({
      tracks: state.tracks.map(t => {
        if (t.id !== trackId) return t;
        const existing = t.keyframes.findIndex(
          k => k.time === keyframe.time && k.property === keyframe.property
        );
        const keyframes = [...t.keyframes];
        if (existing >= 0) {
          keyframes[existing] = keyframe;
        } else {
          keyframes.push(keyframe);
          keyframes.sort((a, b) => a.time - b.time);
        }
        return { ...t, keyframes };
      }),
    }));
  },

  removeKeyframe: (trackId, time, property) => {
    set(state => ({
      tracks: state.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          keyframes: t.keyframes.filter(k => !(k.time === time && k.property === property)),
        };
      }),
    }));
  },

  setCurrentTime: (time) => set({ currentTime: Math.max(0, Math.min(time, get().duration)) }),
  setDuration: (duration) => set({ duration: Math.max(1, duration) }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectTrack: (id) => set({ selectedTrackId: id }),

  /**
   * Evaluate all tracks at a given time and return entity property updates.
   */
  evaluateAt: (time: number): Map<string, Record<string, number>> => {
    const result = new Map<string, Record<string, number>>();
    for (const track of get().tracks) {
      if (track.keyframes.length === 0) continue;
      const props: Record<string, number> = {};

      const byProp = new Map<string, Keyframe[]>();
      for (const kf of track.keyframes) {
        const list = byProp.get(kf.property) || [];
        list.push(kf);
        byProp.set(kf.property, list);
      }

      for (const [prop, kfs] of byProp) {
        if (kfs.length === 0) continue;
        const sorted = [...kfs].sort((a, b) => a.time - b.time);

        if (time <= sorted[0].time) {
          props[prop] = sorted[0].value;
        } else if (time >= sorted[sorted.length - 1].time) {
          props[prop] = sorted[sorted.length - 1].value;
        } else {
          let prev = sorted[0], next = sorted[1];
          for (let i = 0; i < sorted.length - 1; i++) {
            if (time >= sorted[i].time && time <= sorted[i + 1].time) {
              prev = sorted[i];
              next = sorted[i + 1];
              break;
            }
          }
          const range = next.time - prev.time;
          const raw = range > 0 ? (time - prev.time) / range : 0;
          const t = applyEasing(raw, next.easing);
          props[prop] = prev.value + (next.value - prev.value) * t;
        }
      }

      result.set(track.entityId, props);
    }
    return result;
  },
}));

function applyEasing(t: number, easing: Keyframe['easing']): number {
  switch (easing) {
    case 'easeIn': return t * t;
    case 'easeOut': return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}
