# AGENT.md - AI Development Guidelines

> คู่มือสำหรับ AI Agents ในการพัฒนา Precast Cost Management System

## 🎯 Project Overview

**Project Name:** Precast Cost Management System  
**Purpose:** ระบบจัดการต้นทุนสินค้าพรีคาสท์ครบวงจร (ผลิต-ขนส่ง-ติดตั้ง) พร้อม RAG สำหรับวิเคราะห์ต้นทุน

**Tech Stack:**
- Cloudflare Workers (Serverless)
- D1 (SQLite Database)
- R2 (Object Storage)
- Vectorize (Vector Database)
- Workers AI (Embeddings + LLM)
- TypeScript + Hono framework

## 📋 Project Context

### Business Domain
- **Industry:** อุตสาหกรรมคอนกรีตพรีคาสท์
- **Target Users:** โรงงานผลิต, ฝ่ายบัญชี, project managers
- **Main Goals:**
  - ติดตามต้นทุนแบบ real-time
  - วิเคราะห์ต้นทุนด้วย AI
  - ประมาณการต้นทุนโปรเจคใหม่
  - จัดเก็บเอกสารและความรู้

### Key Features
1. **Cost Tracking**: บันทึกต้นทุนแบบแยกตามประเภท (ผลิต/ขนส่ง/ติดตั้ง)
2. **Document Management**: อัปโหลดและ index เอกสารเข้า RAG
3. **AI Query**: ถาม-ตอบเกี่ยวกับต้นทุนด้วย natural language
4. **Analytics**: วิเคราะห์และเปรียบเทียบต้นทุน
5. **Estimation**: ประมาณการต้นทุนโปรเจคใหม่

## 🗄️ Database Schema

### Core Tables

```sql
-- Products (สินค้าพรีคาสท์)
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'column', 'beam', 'slab', 'wall', etc.
  unit TEXT NOT NULL, -- 'piece', 'meter', 'sqm'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Costs (ต้นทุนการผลิต)
CREATE TABLE production_costs (
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
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  total_estimated_cost REAL,
  total_actual_cost REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transportation Costs (ต้นทุนขนส่ง)
CREATE TABLE transportation_costs (
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
CREATE TABLE installation_costs (
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
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- R2 path
  file_type TEXT NOT NULL, -- 'invoice', 'quotation', 'report', etc.
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  vector_indexed BOOLEAN DEFAULT FALSE,
  vector_id TEXT, -- Vectorize vector ID
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Vector Metadata (สำหรับ RAG)
CREATE TABLE vector_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

### Indexes

```sql
CREATE INDEX idx_production_costs_product ON production_costs(product_id);
CREATE INDEX idx_production_costs_date ON production_costs(date);
CREATE INDEX idx_transportation_costs_project ON transportation_costs(project_id);
CREATE INDEX idx_installation_costs_project ON installation_costs(project_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_vector_metadata_document ON vector_metadata(document_id);
```

## 🏗️ Code Architecture

### Directory Structure

```
src/
├── index.ts              # Main Worker entry + routing
├── routes/
│   ├── costs.ts         # Cost CRUD endpoints
│   ├── products.ts      # Product management
│   ├── projects.ts      # Project management
│   ├── documents.ts     # Document upload/retrieval
│   ├── query.ts         # RAG query endpoint
│   └── analytics.ts     # Analytics & reports
├── services/
│   ├── cost-calculator.ts    # Cost calculation logic
│   ├── embeddings.ts         # Vector embedding service
│   ├── rag.ts               # RAG implementation
│   └── document-parser.ts    # PDF/document parsing
├── db/
│   ├── schema.sql       # Database schema
│   └── queries.ts       # Reusable SQL queries
├── types/
│   └── index.ts         # TypeScript types
└── utils/
    ├── validators.ts    # Input validation
    └── formatters.ts    # Data formatting
```

### Key Design Patterns

1. **Service Layer Pattern**: แยก business logic ไปยัง services/
2. **Repository Pattern**: centralize database queries ใน db/queries.ts
3. **Type Safety**: ใช้ TypeScript types อย่างเข้มงวด
4. **Error Handling**: consistent error responses
5. **Logging**: log สำคัญทุก operation

## 🔧 Development Guidelines

### When Using Claude Chat (Web)

**DO:**
- ✅ วางแผน architecture และ data models
- ✅ สร้าง/แก้ไข D1 tables ผ่าน MCP tools
- ✅ สร้าง R2 buckets ผ่าน MCP
- ✅ สร้าง KV namespaces ผ่าน MCP
- ✅ Generate starter code และ configuration
- ✅ ออกแบบ API endpoints
- ✅ สร้าง documentation
- ✅ วิเคราะห์ logs และ errors
- ✅ ค้นหา Cloudflare documentation

**EXAMPLE PROMPTS:**

```
> สร้าง D1 database ชื่อ "precast-costs-db" 
  และรัน schema จากไฟล์ src/db/schema.sql

> ดึงข้อมูลต้นทุนการผลิตทั้งหมดจาก D1 
  ในเดือนตุลาคม 2025

> สร้าง R2 bucket ชื่อ "precast-documents" 
  สำหรับเก็บ invoices และ quotations

> วิเคราะห์ว่าทำไม query ช้า 
  และแนะนำวิธี optimize

> สร้าง TypeScript types สำหรับ 
  production_costs table
```

**DON'T:**
- ❌ ใช้ deploy Workers (ไม่มี terminal access)
- ❌ สร้าง Vectorize index (ใช้ Claude Code CLI แทน)
- ❌ รัน local development server
- ❌ ทำ git operations

### When Using Claude Code CLI

**DO:**
- ✅ Development และ testing
- ✅ สร้าง Vectorize index
- ✅ รัน `wrangler dev` เพื่อ local testing
- ✅ Deploy ด้วย `wrangler deploy`
- ✅ Debug และแก้ไข bugs
- ✅ รัน tests
- ✅ Git operations
- ✅ Package management

**EXAMPLE PROMPTS:**

```
> สร้าง Vectorize index ชื่อ "precast-vectors" 
  ด้วย dimensions 768 และ metric cosine

> รัน development server และทดสอบ 
  endpoint POST /api/costs/production

> Deploy worker to production และ 
  ทดสอบว่า API ทำงานถูกต้อง

> แก้ไข bug ใน rag.ts ที่ทำให้ 
  vector search ให้ผลลัพธ์ผิด

> เขียน unit tests สำหรับ 
  cost-calculator service
```

## 🤖 RAG Implementation Details

### Embedding Strategy

**Text Embedding Model:** `@cf/baai/bge-base-en-v1.5`
- Dimensions: 768
- Metric: Cosine similarity

**Document Processing:**
1. Upload document → R2
2. Extract text (PDF → text)
3. Split into chunks (512 tokens per chunk)
4. Generate embeddings for each chunk
5. Store in Vectorize with metadata
6. Link to D1 documents table

**Metadata Structure:**
```typescript
interface VectorMetadata {
  document_id: number;
  chunk_index: number;
  document_type: string; // 'invoice', 'report', etc.
  project_id?: number;
  date: string;
  source_filename: string;
}
```

### Query Pipeline

1. **User Query** → Generate embedding
2. **Vector Search** → Vectorize query (topK=5)
3. **Context Retrieval** → Fetch full text from D1
4. **Cost Data** → Query relevant cost data from D1
5. **LLM Generation** → Send to Llama 3.1 with context
6. **Response** → Return answer + sources

### LLM Prompt Template

```typescript
const systemPrompt = `You are a cost analysis expert for a precast concrete manufacturing company in Thailand. 

Your role:
- Analyze production, transportation, and installation costs
- Provide accurate cost estimates based on historical data
- Explain cost breakdowns clearly in Thai language
- Suggest cost optimization strategies

Context:
{retrieved_documents}

Current Cost Data:
{cost_data}

Guidelines:
- Always cite sources when referencing specific documents
- Use Thai baht (฿) for all monetary values
- Format numbers with commas (e.g., 8,500 บาท)
- Be specific and provide detailed breakdowns
- If data is insufficient, clearly state what's missing

User Question: {user_query}`;
```

## 📊 Cost Calculation Logic

### Production Cost Formula

```typescript
interface ProductionCost {
  material_cost: number;      // ต้นทุนวัตถุดิบ
  labor_cost: number;         // ค่าแรง
  overhead_cost: number;      // ค่าโสหุ้ย (โรงงาน, ไฟฟ้า, ฯลฯ)
  quantity: number;           // จำนวนที่ผลิต
}

function calculateProductionTotal(cost: ProductionCost): number {
  const total = cost.material_cost + cost.labor_cost + cost.overhead_cost;
  const cost_per_unit = total / cost.quantity;
  return { total, cost_per_unit };
}
```

### Transportation Cost Formula

```typescript
interface TransportationCost {
  distance_km: number;
  fuel_price_per_liter: number;
  fuel_consumption: number;   // L/km
  driver_cost: number;
  toll_fees: number;
}

function calculateTransportationTotal(cost: TransportationCost): number {
  const fuel_cost = cost.distance_km * cost.fuel_consumption * cost.fuel_price_per_liter;
  return fuel_cost + cost.driver_cost + cost.toll_fees;
}
```

### Installation Cost Formula

```typescript
interface InstallationCost {
  labor_cost_per_hour: number;
  duration_hours: number;
  equipment_cost: number;      // เครน, เครื่องมือ
  crane_cost?: number;
}

function calculateInstallationTotal(cost: InstallationCost): number {
  const labor_total = cost.labor_cost_per_hour * cost.duration_hours;
  return labor_total + cost.equipment_cost + (cost.crane_cost || 0);
}
```

## 🔒 Security & Validation

### Input Validation Rules

```typescript
// Cost values
- Must be positive numbers
- Max: 100,000,000 (100M baht)
- Min: 0

// Dates
- Must be valid ISO format (YYYY-MM-DD)
- Cannot be future dates (except estimates)

// File uploads
- Max size: 10MB
- Allowed types: PDF, JPG, PNG, Excel
- Scan for malware

// Query strings
- Max length: 1000 characters
- Sanitize SQL injection attempts
- Rate limit: 10 requests/minute per IP
```

### Error Handling

```typescript
// Standard error response format
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Error codes
- VALIDATION_ERROR: 400
- UNAUTHORIZED: 401
- NOT_FOUND: 404
- RATE_LIMIT: 429
- SERVER_ERROR: 500
```

## 📈 Analytics & Reports

### Available Metrics

1. **Cost Trends**
   - Production cost over time
   - Transportation cost per km
   - Installation cost per project

2. **Product Analysis**
   - Cost per product type
   - Most/least profitable products
   - Production efficiency

3. **Project Comparison**
   - Actual vs estimated costs
   - Cost breakdown by category
   - Project profitability

4. **Predictive Analytics**
   - Cost forecasting
   - Material price trends
   - Seasonal patterns

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test cost calculations
- calculateProductionTotal()
- calculateTransportationTotal()
- calculateInstallationTotal()

// Test RAG functions
- generateEmbedding()
- vectorSearch()
- retrieveContext()
```

### Integration Tests

```typescript
// Test API endpoints
- POST /api/costs/production
- GET /api/costs/production
- POST /api/query
- POST /api/documents/upload
```

### E2E Tests

```typescript
// Complete workflows
1. Upload document → Index → Query
2. Create project → Add costs → Generate report
3. Estimate new project based on similar past projects
```

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Run all tests
- [ ] Update environment variables
- [ ] Check D1 migrations
- [ ] Verify R2 bucket permissions
- [ ] Test Vectorize connection
- [ ] Review API rate limits

### Deployment Steps

```bash
# 1. Run tests
npm test

# 2. Build
npm run build

# 3. Deploy
wrangler deploy

# 4. Verify
curl https://your-worker.workers.dev/health

# 5. Test critical endpoints
./scripts/smoke-test.sh
```

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify RAG queries work
- [ ] Test document uploads
- [ ] Monitor costs

## 📝 Code Style & Conventions

### TypeScript

```typescript
// Use explicit types
✅ function getCost(id: number): Promise<Cost>
❌ function getCost(id: any): Promise<any>

// Use interfaces for complex objects
✅ interface ProductionCost { ... }
❌ type ProductionCost = { ... }

// Use async/await
✅ const result = await db.query(...)
❌ db.query(...).then(...)

// Handle errors properly
✅ try { ... } catch (error) { ... }
❌ No error handling
```

### SQL

```sql
-- Use meaningful aliases
✅ SELECT p.name, pc.total_cost FROM products p JOIN production_costs pc
❌ SELECT p.name, pc.total_cost FROM products p, production_costs pc

-- Use prepared statements
✅ db.prepare("SELECT * FROM products WHERE id = ?").bind(id)
❌ db.prepare(`SELECT * FROM products WHERE id = ${id}`)
```

### API Responses

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2025-10-21T10:30:00Z",
    "count": 10
  }
}

// Error response
{
  "success": false,
  "error": "Invalid product ID",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-21T10:30:00Z"
}
```

## 🎓 Learning Resources

### Cloudflare Documentation
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [R2 Storage](https://developers.cloudflare.com/r2/)

### RAG Best Practices
- Chunk size: 512-1024 tokens optimal
- Overlap: 50-100 tokens between chunks
- TopK: 3-5 results for context
- Reranking: Consider if needed

### Cost Optimization
- Cache frequently accessed data in KV
- Use D1 indexes on filtered columns
- Batch vector operations
- Stream large responses

## 🐛 Common Issues & Solutions

### Issue: Vector search returns irrelevant results
**Solution:** 
- Improve chunking strategy
- Add more metadata to vectors
- Tune topK parameter
- Consider query rewriting

### Issue: Slow D1 queries
**Solution:**
- Add indexes on commonly filtered columns
- Use EXPLAIN QUERY PLAN
- Limit result sets
- Consider caching in KV

### Issue: Document parsing fails
**Solution:**
- Check file format
- Validate PDF structure
- Handle encoding issues
- Add retry logic

## 📞 Getting Help

### For Claude Chat Users
- Use MCP tools to inspect D1 data
- Search Cloudflare docs
- Analyze error logs
- Generate solution code

### For Claude Code CLI Users
- Check Wrangler logs: `wrangler tail`
- Local debugging with breakpoints
- Test with curl commands
- Review deployment logs

## ✅ Definition of Done

A feature is complete when:
- [ ] Code is written and tested
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Manual QA completed
- [ ] Deployed to production
- [ ] Monitoring in place

---

**Remember:** This project uses both Claude Chat and Claude Code CLI strategically. Use Claude Chat for planning, infrastructure, and data inspection. Use Claude Code CLI for development, testing, and deployment.

Happy coding! 🚀
