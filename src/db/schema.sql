-- Products (สินค้าพรีคาสท์)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Costs (ต้นทุนการผลิต)
CREATE TABLE IF NOT EXISTS production_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  material_cost REAL NOT NULL,
  labor_cost REAL NOT NULL,
  overhead_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  cost_per_unit REAL NOT NULL,
  quantity INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Projects (โปรเจค)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  total_estimated_cost REAL,
  total_actual_cost REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transportation Costs (ต้นทุนขนส่ง)
CREATE TABLE IF NOT EXISTS transportation_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  distance_km REAL NOT NULL,
  fuel_cost REAL NOT NULL,
  vehicle_type TEXT NOT NULL,
  driver_cost REAL NOT NULL,
  toll_fees REAL DEFAULT 0,
  total_cost REAL NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Installation Costs (ต้นทุนติดตั้ง)
CREATE TABLE IF NOT EXISTS installation_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  labor_cost REAL NOT NULL,
  equipment_cost REAL NOT NULL,
  duration_hours REAL NOT NULL,
  crane_cost REAL DEFAULT 0,
  total_cost REAL NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Documents (เอกสาร)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vector_indexed BOOLEAN DEFAULT FALSE,
  vector_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Vector Metadata (สำหรับ RAG)
CREATE TABLE IF NOT EXISTS vector_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_costs_product ON production_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_production_costs_date ON production_costs(date);
CREATE INDEX IF NOT EXISTS idx_transportation_costs_project ON transportation_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_installation_costs_project ON installation_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_document ON vector_metadata(document_id);
