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
}));
