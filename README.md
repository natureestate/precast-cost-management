# Precast Cost Management System

> ระบบจัดการต้นทุนสินค้าพรีคาสท์ พร้อม AI-powered Cost Analysis

## 📋 Overview

ระบบบริหารจัดการต้นทุนสินค้าคอนกรีตพรีคาสท์แบบครบวงจร ครอบคลุมทั้งกระบวนการผลิต ขนส่ง และติดตั้ง พร้อมระบบ RAG (Retrieval-Augmented Generation) สำหรับวิเคราะห์ต้นทุนและให้คำแนะนำอัจฉริยะ

### 🎯 Main Features

- **📊 Cost Tracking**: บันทึกและติดตามต้นทุนแบบ real-time
- **🏭 Production Management**: จัดการต้นทุนการผลิตในโรงงาน
- **🚚 Transportation Costs**: คำนวณและติดตามค่าขนส่ง
- **🔧 Installation Tracking**: บันทึกต้นทุนการติดตั้ง
- **🤖 AI-Powered Analysis**: ใช้ RAG วิเคราะห์และให้คำแนะนำต้นทุน
- **📈 Cost Forecasting**: ประมาณการต้นทุนโปรเจคใหม่
- **📑 Document Management**: เก็บเอกสาร quote, invoice, cost breakdown

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Cloudflare Workers (API)              │
│  - REST API endpoints                           │
│  - File upload handling                         │
│  - Cost calculation logic                       │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┴──────────┬───────────┬────────────┐
    │                     │           │            │
┌───▼────┐      ┌────────▼─────┐  ┌──▼──────┐  ┌─▼────────┐
│   D1   │      │ Workers AI   │  │Vectorize│  │    R2    │
│Database│      │ - Embeddings │  │ Vector  │  │Documents │
│        │      │ - LLM Query  │  │Database │  │  Store   │
│Cost    │      │ - Analysis   │  │         │  │          │
│Data    │      └──────────────┘  └─────────┘  └──────────┘
└────────┘
```

### 🔧 Tech Stack

**Backend:**
- Cloudflare Workers (Serverless API)
- Hono (Web Framework)
- TypeScript

**Database & Storage:**
- D1 (SQLite) - ข้อมูลต้นทุน, products, projects
- R2 (Object Storage) - เอกสาร PDFs, images, invoices
- KV (Key-Value) - Cache, sessions
- Vectorize - Vector embeddings สำหรับ RAG

**AI/ML:**
- Workers AI
  - `@cf/baai/bge-base-en-v1.5` - Text embeddings
  - `@cf/meta/llama-3.1-8b-instruct` - LLM for analysis

**Frontend (Optional):**
- React / Next.js
- Tailwind CSS

## 📁 Project Structure

```
precast-cost-system/
├── src/
│   ├── index.ts                 # Main Worker entry point
│   ├── routes/
│   │   ├── costs.ts            # Cost CRUD operations
│   │   ├── products.ts         # Product management
│   │   ├── projects.ts         # Project management
│   │   ├── upload.ts           # Document upload
│   │   └── query.ts            # RAG query endpoint
│   ├── services/
│   │   ├── cost-calculator.ts  # Cost calculation logic
│   │   ├── embeddings.ts       # Vector embedding service
│   │   └── rag.ts              # RAG implementation
│   ├── db/
│   │   ├── schema.sql          # Database schema
│   │   └── queries.ts          # SQL queries
│   └── types/
│       └── index.ts            # TypeScript types
├── wrangler.jsonc              # Cloudflare configuration
├── package.json
├── tsconfig.json
├── README.md
└── AGENT.md                    # AI Agent instructions
```

## 🗄️ Database Schema

### Tables

**products**
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT) - ชื่อสินค้า
- category (TEXT) - ประเภท (เสา, คาน, พื้น, ฯลฯ)
- unit (TEXT) - หน่วย (ชิ้น, เมตร, ตร.ม.)
- description (TEXT)
- created_at (TIMESTAMP)
```

**production_costs**
```sql
- id (INTEGER PRIMARY KEY)
- product_id (INTEGER FK)
- material_cost (REAL) - ต้นทุนวัตถุดิบ
- labor_cost (REAL) - ค่าแรง
- overhead_cost (REAL) - ค่าโสหุ้ย
- total_cost (REAL)
- cost_per_unit (REAL)
- date (DATE)
- notes (TEXT)
```

**transportation_costs**
```sql
- id (INTEGER PRIMARY KEY)
- project_id (INTEGER FK)
- distance_km (REAL)
- fuel_cost (REAL)
- vehicle_type (TEXT)
- driver_cost (REAL)
- total_cost (REAL)
- date (DATE)
```

**installation_costs**
```sql
- id (INTEGER PRIMARY KEY)
- project_id (INTEGER FK)
- labor_cost (REAL)
- equipment_cost (REAL)
- duration_hours (REAL)
- total_cost (REAL)
- date (DATE)
```

**projects**
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- location (TEXT)
- start_date (DATE)
- end_date (DATE)
- status (TEXT)
- total_estimated_cost (REAL)
- total_actual_cost (REAL)
```

**documents**
```sql
- id (INTEGER PRIMARY KEY)
- project_id (INTEGER FK)
- filename (TEXT)
- file_path (TEXT) - R2 path
- file_type (TEXT)
- uploaded_at (TIMESTAMP)
- vector_indexed (BOOLEAN)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Clone repository
git clone <repository-url>
cd precast-cost-system

# Install dependencies
npm install

# Login to Cloudflare
wrangler login
```

### Configuration

1. **สร้าง Infrastructure (ใช้ Claude Chat + MCP)**

```
Phase 1: สร้าง D1 Database
> สร้าง D1 database ชื่อ "precast-costs-db"

Phase 2: สร้าง R2 Bucket
> สร้าง R2 bucket ชื่อ "precast-documents"

Phase 3: สร้าง KV Namespace
> สร้าง KV namespace ชื่อ "precast-cache"
```

2. **สร้าง Vectorize Index (ใช้ Claude Code)**

```bash
wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine
```

3. **Update wrangler.jsonc**

```jsonc
{
  "name": "precast-cost-system",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  "ai": {
    "binding": "AI"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "precast-costs-db",
      "database_id": "<YOUR_D1_ID>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "precast-documents"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<YOUR_KV_ID>"
    }
  ],
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "precast-vectors"
    }
  ]
}
```

4. **Initialize Database**

```bash
# Run migrations
wrangler d1 execute precast-costs-db --file=./src/db/schema.sql
```

### Development

```bash
# Start local development server
npm run dev
# or
wrangler dev

# Access at http://localhost:8787
```

### Deployment

```bash
# Deploy to production
npm run deploy
# or
wrangler deploy
```

## 📚 API Endpoints

### Cost Management

```http
# บันทึกต้นทุนการผลิต
POST /api/costs/production
Content-Type: application/json

{
  "product_id": 1,
  "material_cost": 5000,
  "labor_cost": 2000,
  "overhead_cost": 1000,
  "date": "2025-10-21",
  "notes": "งวดที่ 1"
}

# ดึงข้อมูลต้นทุนการผลิต
GET /api/costs/production?product_id=1&start_date=2025-01-01

# บันทึกต้นทุนขนส่ง
POST /api/costs/transportation
{
  "project_id": 1,
  "distance_km": 50,
  "fuel_cost": 1500,
  "vehicle_type": "10-wheeler",
  "driver_cost": 800
}

# บันทึกต้นทุนติดตั้ง
POST /api/costs/installation
{
  "project_id": 1,
  "labor_cost": 3000,
  "equipment_cost": 2000,
  "duration_hours": 8
}
```

### Document Management

```http
# Upload เอกสาร
POST /api/documents/upload
Content-Type: multipart/form-data

file: <PDF/Image file>
project_id: 1
file_type: "invoice"

# ดึงรายการเอกสาร
GET /api/documents?project_id=1
```

### RAG Query

```http
# ถามคำถามเกี่ยวกับต้นทุน
POST /api/query
Content-Type: application/json

{
  "query": "ต้นทุนเฉลี่ยในการผลิตเสาคอนกรีตขนาด 30x30 ซม. คือเท่าไหร่?",
  "project_id": 1  // optional
}

Response:
{
  "answer": "จากข้อมูลที่มี ต้นทุนเฉลี่ยในการผลิตเสาคอนกรีต 30x30 ซม. อยู่ที่ประมาณ 8,500 บาท/ชิ้น แบ่งเป็น:\n- วัตถุดิบ: 5,000 บาท\n- ค่าแรง: 2,000 บาท\n- ค่าโสหุ้ย: 1,500 บาท",
  "sources": [
    {
      "document": "cost-report-2025-09.pdf",
      "relevance": 0.89
    }
  ],
  "cost_breakdown": {
    "material": 5000,
    "labor": 2000,
    "overhead": 1500,
    "total": 8500
  }
}
```

### Analytics

```http
# สรุปต้นทุนโดยรวม
GET /api/analytics/summary?project_id=1

# เปรียบเทียบต้นทุนระหว่างโปรเจค
GET /api/analytics/compare?project_ids=1,2,3

# ประมาณการต้นทุนโปรเจคใหม่
POST /api/analytics/estimate
{
  "products": [
    {
      "product_id": 1,
      "quantity": 50
    }
  ],
  "distance_km": 80,
  "installation_days": 5
}
```

## 🤖 RAG Features

### Document Indexing

ระบบจะ index เอกสารต่อไปนี้อัตโนมัติ:
- ใบเสนอราคา (Quotations)
- ใบแจ้งหนี้ (Invoices)
- Cost breakdown reports
- Material specifications
- Historical cost data

### Query Examples

```
1. "ต้นทุนค่าขนส่งเฉลี่ยต่อกิโลเมตรคือเท่าไหร่?"

2. "เปรียบเทียบต้นทุนการผลิตคานพรีคาสท์ระหว่างไตรมาส 1 และ 2"

3. "ช่วยประมาณการต้นทุนสำหรับโปรเจคที่มีเสา 100 ต้น คาน 80 เส้น 
   ระยะทางขนส่ง 60 กม."

4. "วิเคราะห์ว่าต้นทุนส่วนไหนที่สูงที่สุดในโปรเจคที่ผ่านมา?"

5. "แนะนำวิธีลดต้นทุนการผลิตจากข้อมูลที่มี"
```

## 📊 Reports & Dashboards

- สรุปต้นทุนรายเดือน/รายไตรมาส
- เปรียบเทียบต้นทุน Actual vs Estimated
- Cost trend analysis
- Product profitability analysis
- Project cost breakdown

## 🔒 Security

- API authentication ผ่าน API keys
- Role-based access control
- Data encryption at rest (R2)
- Audit logging

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:8787/api/costs/production \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "material_cost": 5000}'
```

## 📈 Monitoring

- Cloudflare Analytics Dashboard
- Cost tracking per request
- Error rate monitoring
- Response time metrics

## 🛠️ Development Workflow

1. **Planning Phase** (Claude Chat)
   - ออกแบบ features ใหม่
   - วางแผน database changes
   - สร้าง API specs

2. **Infrastructure** (Claude Chat + MCP)
   - สร้าง/แก้ไข D1 tables
   - จัดการ R2 buckets
   - ดูข้อมูลและ schema

3. **Development** (Claude Code CLI)
   - เขียน/แก้ไข code
   - Local testing
   - Debug issues

4. **Deployment** (Claude Code CLI)
   - Deploy to staging
   - Integration testing
   - Deploy to production

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 📞 Contact

- Project Owner: [Your Name]
- Email: [your.email@example.com]
- Documentation: See AGENT.md for AI development guidelines

## 🗺️ Roadmap

- [ ] v1.0: Basic cost tracking + RAG query
- [ ] v1.1: Advanced analytics dashboard
- [ ] v1.2: Mobile app
- [ ] v2.0: Predictive cost modeling with ML
- [ ] v2.1: Multi-factory support
- [ ] v2.2: Supplier integration

---

Built with ❤️ using Cloudflare Workers + AI
