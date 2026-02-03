export type ShapeType = 'cube' | 'cylinder' | 'sphere' | 'wedge';
export type OperationType = 'base' | 'add' | 'subtract';
export type Unit = 'mm' | 'cm' | 'm';
export type ViewMode = 'assembled' | 'separated';

export interface CSGPart {
  id: string;
  type: ShapeType;
  operation: OperationType;
  dimensions: [number, number, number]; // [width/radius, height, depth]
  position: [number, number, number];
  rotation: [number, number, number]; // in degrees
  explanation: string;
}

export interface CSGModel {
  id: string;
  name: string;
  timestamp: number;
  parts: CSGPart[];
  originalImage: string; // Base64
}

export interface AppState {
  models: CSGModel[];
  currentModel: CSGModel | null;
  isGenerating: boolean;
  viewMode: ViewMode;
  unit: Unit;
  wireframe: boolean;
  showDimensions: boolean;
  addModel: (model: CSGModel) => void;
  setCurrentModel: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setUnit: (unit: Unit) => void;
  toggleWireframe: () => void;
  toggleShowDimensions: () => void;
  loadModelsFromStorage: () => Promise<void>;
  generateModel: (imageBase64: string, apiKey: string) => Promise<string>;
}
