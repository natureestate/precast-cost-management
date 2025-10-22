// Environment bindings
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
}

// Product types
export interface Product {
  id?: number;
  name: string;
  category: string;
  unit: string;
  description?: string;
  created_at?: string;
}

// Production Cost types
export interface ProductionCost {
  id?: number;
  product_id: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
  quantity: number;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface ProductionCostInput {
  product_id: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  quantity: number;
  date: string;
  notes?: string;
}

// Project types
export interface Project {
  id?: number;
  name: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'completed' | 'cancelled';
  total_estimated_cost?: number;
  total_actual_cost?: number;
  created_at?: string;
}

// Transportation Cost types
export interface TransportationCost {
  id?: number;
  project_id: number;
  distance_km: number;
  fuel_cost: number;
  vehicle_type: string;
  driver_cost: number;
  toll_fees?: number;
  total_cost: number;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface TransportationCostInput {
  project_id: number;
  distance_km: number;
  fuel_cost: number;
  vehicle_type: string;
  driver_cost: number;
  toll_fees?: number;
  date: string;
  notes?: string;
}

// Installation Cost types
export interface InstallationCost {
  id?: number;
  project_id: number;
  labor_cost: number;
  equipment_cost: number;
  duration_hours: number;
  crane_cost?: number;
  total_cost: number;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface InstallationCostInput {
  project_id: number;
  labor_cost: number;
  equipment_cost: number;
  duration_hours: number;
  crane_cost?: number;
  date: string;
  notes?: string;
}

// Document types
export interface Document {
  id?: number;
  project_id?: number;
  filename: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  uploaded_at?: string;
  vector_indexed?: boolean;
  vector_id?: string;
}

// Vector Metadata types
export interface VectorMetadata {
  id?: number;
  document_id: number;
  chunk_index: number;
  chunk_text: string;
  vector_id: string;
  created_at?: string;
}

// RAG types
export interface RAGQueryInput {
  query: string;
  project_id?: number;
  topK?: number;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    document: string;
    relevance: number;
    chunk_text?: string;
  }>;
  cost_breakdown?: {
    material?: number;
    labor?: number;
    overhead?: number;
    total?: number;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  metadata?: {
    timestamp: string;
    count?: number;
  };
}

// Error types
export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Cost calculation types
export interface CostCalculation {
  total: number;
  cost_per_unit?: number;
  breakdown: {
    material?: number;
    labor?: number;
    overhead?: number;
    fuel?: number;
    driver?: number;
    equipment?: number;
    crane?: number;
    toll_fees?: number;
  };
}

// Embedding types
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

// Vector search types
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}
