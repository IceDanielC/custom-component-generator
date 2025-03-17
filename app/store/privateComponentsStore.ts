import { create } from 'zustand';

interface PrivateComponentsState {
  name: string;
  setName: (name: string) => void;
}

export const usePrivateComponentsStore = create<PrivateComponentsState>((set) => ({
  name: '@private-basic-components',
  setName: (name: string) => set({ name })
}));
