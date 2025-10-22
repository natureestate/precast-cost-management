import { Product, ProductionCost, Project, TransportationCost, InstallationCost, Document, VectorMetadata } from '../types';

export class DatabaseQueries {
  constructor(private db: D1Database) {}

  // Products queries
  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        'INSERT INTO products (name, category, unit, description) VALUES (?, ?, ?, ?)'
      )
      .bind(product.name, product.category, product.unit, product.description || null)
      .run();

    return result.meta.last_row_id;
  }

  async getProduct(id: number): Promise<Product | null> {
    const result = await this.db
      .prepare('SELECT * FROM products WHERE id = ?')
      .bind(id)
      .first<Product>();

    return result;
  }

  async getAllProducts(): Promise<Product[]> {
    const result = await this.db
      .prepare('SELECT * FROM products ORDER BY created_at DESC')
      .all<Product>();

    return result.results;
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const result = await this.db
      .prepare('SELECT * FROM products WHERE category = ? ORDER BY name')
      .bind(category)
      .all<Product>();

    return result.results;
  }

  // Production costs queries
  async createProductionCost(cost: Omit<ProductionCost, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO production_costs
        (product_id, material_cost, labor_cost, overhead_cost, total_cost, cost_per_unit, quantity, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cost.product_id,
        cost.material_cost,
        cost.labor_cost,
        cost.overhead_cost,
        cost.total_cost,
        cost.cost_per_unit,
        cost.quantity,
        cost.date,
        cost.notes || null
      )
      .run();

    return result.meta.last_row_id;
  }

  async getProductionCosts(productId?: number, startDate?: string, endDate?: string): Promise<ProductionCost[]> {
    let query = 'SELECT * FROM production_costs WHERE 1=1';
    const params: any[] = [];

    if (productId) {
      query += ' AND product_id = ?';
      params.push(productId);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all<ProductionCost>();

    return result.results;
  }

  // Projects queries
  async createProject(project: Omit<Project, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO projects
        (name, location, start_date, end_date, status, total_estimated_cost, total_actual_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        project.name,
        project.location || null,
        project.start_date || null,
        project.end_date || null,
        project.status || 'active',
        project.total_estimated_cost || null,
        project.total_actual_cost || null
      )
      .run();

    return result.meta.last_row_id;
  }

  async getProject(id: number): Promise<Project | null> {
    const result = await this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first<Project>();

    return result;
  }

  async getAllProjects(status?: string): Promise<Project[]> {
    let query = 'SELECT * FROM projects';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all<Project>();

    return result.results;
  }

  async updateProjectCosts(projectId: number): Promise<void> {
    // Calculate total actual cost from transportation and installation costs
    const result = await this.db
      .prepare(
        `UPDATE projects
        SET total_actual_cost = (
          SELECT COALESCE(SUM(total_cost), 0)
          FROM (
            SELECT total_cost FROM transportation_costs WHERE project_id = ?
            UNION ALL
            SELECT total_cost FROM installation_costs WHERE project_id = ?
          )
        )
        WHERE id = ?`
      )
      .bind(projectId, projectId, projectId)
      .run();
  }

  // Transportation costs queries
  async createTransportationCost(cost: Omit<TransportationCost, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO transportation_costs
        (project_id, distance_km, fuel_cost, vehicle_type, driver_cost, toll_fees, total_cost, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cost.project_id,
        cost.distance_km,
        cost.fuel_cost,
        cost.vehicle_type,
        cost.driver_cost,
        cost.toll_fees || 0,
        cost.total_cost,
        cost.date,
        cost.notes || null
      )
      .run();

    return result.meta.last_row_id;
  }

  async getTransportationCosts(projectId?: number): Promise<TransportationCost[]> {
    let query = 'SELECT * FROM transportation_costs';
    const params: any[] = [];

    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all<TransportationCost>();

    return result.results;
  }

  // Installation costs queries
  async createInstallationCost(cost: Omit<InstallationCost, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO installation_costs
        (project_id, labor_cost, equipment_cost, duration_hours, crane_cost, total_cost, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cost.project_id,
        cost.labor_cost,
        cost.equipment_cost,
        cost.duration_hours,
        cost.crane_cost || 0,
        cost.total_cost,
        cost.date,
        cost.notes || null
      )
      .run();

    return result.meta.last_row_id;
  }

  async getInstallationCosts(projectId?: number): Promise<InstallationCost[]> {
    let query = 'SELECT * FROM installation_costs';
    const params: any[] = [];

    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all<InstallationCost>();

    return result.results;
  }

  // Documents queries
  async createDocument(document: Omit<Document, 'id' | 'uploaded_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO documents
        (project_id, filename, file_path, file_type, file_size, vector_indexed, vector_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        document.project_id || null,
        document.filename,
        document.file_path,
        document.file_type,
        document.file_size || null,
        document.vector_indexed || false,
        document.vector_id || null
      )
      .run();

    return result.meta.last_row_id;
  }

  async getDocument(id: number): Promise<Document | null> {
    const result = await this.db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .bind(id)
      .first<Document>();

    return result;
  }

  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    const result = await this.db
      .prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY uploaded_at DESC')
      .bind(projectId)
      .all<Document>();

    return result.results;
  }

  async updateDocumentVectorStatus(documentId: number, vectorId: string): Promise<void> {
    await this.db
      .prepare('UPDATE documents SET vector_indexed = TRUE, vector_id = ? WHERE id = ?')
      .bind(vectorId, documentId)
      .run();
  }

  // Vector metadata queries
  async createVectorMetadata(metadata: Omit<VectorMetadata, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO vector_metadata
        (document_id, chunk_index, chunk_text, vector_id)
        VALUES (?, ?, ?, ?)`
      )
      .bind(
        metadata.document_id,
        metadata.chunk_index,
        metadata.chunk_text,
        metadata.vector_id
      )
      .run();

    return result.meta.last_row_id;
  }

  async getVectorMetadataByDocumentId(documentId: number): Promise<VectorMetadata[]> {
    const result = await this.db
      .prepare('SELECT * FROM vector_metadata WHERE document_id = ? ORDER BY chunk_index')
      .bind(documentId)
      .all<VectorMetadata>();

    return result.results;
  }

  async getVectorMetadataByVectorId(vectorId: string): Promise<VectorMetadata | null> {
    const result = await this.db
      .prepare('SELECT * FROM vector_metadata WHERE vector_id = ?')
      .bind(vectorId)
      .first<VectorMetadata>();

    return result;
  }
}
