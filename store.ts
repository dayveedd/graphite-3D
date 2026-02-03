import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { AppState, CSGModel } from './types';
import { generate3DModel } from './services/geminiService';

const DB_KEY = 'graphite_models';

// ID Generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useStore = create<AppState>((set, get) => ({
  models: [],
  currentModel: null,
  isGenerating: false,
  viewMode: 'assembled',
  unit: 'mm',
  wireframe: false,
  showDimensions: true,

  addModel: (model) => {
    set((state) => {
        const newModels = [model, ...state.models];
        // Persist to IDB
        idbSet(DB_KEY, newModels).catch(console.error);
        return { models: newModels, currentModel: model };
    });
  },

  setCurrentModel: (id) => {
    const model = get().models.find((m) => m.id === id);
    if (model) {
        set({ currentModel: model });
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  
  setUnit: (unit) => set({ unit }),
  
  toggleWireframe: () => set((state) => ({ wireframe: !state.wireframe })),
  
  toggleShowDimensions: () => set((state) => ({ showDimensions: !state.showDimensions })),

  loadModelsFromStorage: async () => {
    try {
      const models = (await idbGet(DB_KEY)) as CSGModel[];
      if (models) {
        set({ models });
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  },

  generateModel: async (imageBase64, apiKey) => {
    set({ isGenerating: true });
    try {
        const partialModel = await generate3DModel(imageBase64, apiKey);
        
        const newModel: CSGModel = {
            id: generateId(),
            timestamp: Date.now(),
            originalImage: imageBase64,
            ...partialModel
        };

        get().addModel(newModel);
        set({ isGenerating: false });
        return newModel.id;
    } catch (e) {
        set({ isGenerating: false });
        throw e;
    }
  }
}));
