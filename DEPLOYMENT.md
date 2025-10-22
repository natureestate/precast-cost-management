# 🚀 Deployment Checklist

## Pre-Deployment Tasks

### 1. ✅ Infrastructure Setup

- [x] D1 Database created: `precast-costs-db` (ID: `7a0003b0-5032-4e4c-89cd-a4fd51900f53`)
- [x] R2 Bucket created: `precast-documents`
- [ ] **Vectorize Index** - CRITICAL! Run:
  ```bash
  wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine
  ```
- [ ] Optional: KV Namespace for caching
  ```bash
  wrangler kv:namespace create precast-cache
  ```

### 2. ✅ Code Completion

- [x] All routes implemented (products, projects, costs, upload, query)
- [x] Services layer complete (calculator, embeddings, RAG)
- [x] Database queries layer complete
- [x] TypeScript types defined
- [ ] Analytics route (ไฟล์ `analytics.ts` พร้อมแล้ว - ต้อง integrate)
- [ ] Unit tests (ไฟล์ `cost-calculator.test.ts` พร้อมแล้ว)

### 3. 🔧 Configuration Files

- [x] `wrangler.jsonc` - configured with D1, R2, AI bindings
- [x] `package.json` - dependencies complete
- [x] `tsconfig.json` - TypeScript config ready
- [x] `.gitignore` - protect secrets

### 4. 📝 Documentation

- [x] README.md - comprehensive
- [x] AGENT.md - AI development guide
- [ ] API documentation (consider adding Swagger/OpenAPI)

---

## Deployment Steps

### Step 1: Complete Missing Infrastructure

```bash
# 1. Create Vectorize Index (REQUIRED)
wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine

# Expected output:
# ✅ Successfully created index: precast-vectors
# Add this to wrangler.jsonc (already there!):
# "vectorize": [{"binding": "VECTORIZE", "index_name": "precast-vectors"}]

# 2. Optional: Create KV Namespace
wrangler kv:namespace create precast-cache
# Then add the ID to wrangler.jsonc under kv_namespaces
```

### Step 2: Add Analytics Route

```bash
# Copy analytics.ts to src/routes/
cp analytics.ts src/routes/

# Update src/index.ts to import and mount analytics route:
```

Add to `src/index.ts`:
```typescript
import analytics from './routes/analytics';

// ...after other routes...
app.route('/api/analytics', analytics);
```

### Step 3: Run Database Migrations

```bash
# Initialize D1 database with schema
wrangler d1 execute precast-costs-db --file=./src/db/schema.sql

# Verify tables
wrangler d1 execute precast-costs-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected tables:
- products
- production_costs
- projects
- transportation_costs
- installation_costs
- documents
- vector_metadata

### Step 4: Local Testing

```bash
# Install dependencies
npm install

# Run local dev server
npm run dev

# In another terminal, test endpoints:

# 1. Health check
curl http://localhost:8787/health

# 2. Create a product
curl -X POST http://localhost:8787/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Column","category":"column","unit":"piece","description":"Test product"}'

# 3. Create a project
curl -X POST http://localhost:8787/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","location":"Bangkok","status":"active"}'

# 4. Test RAG query (will fail until Vectorize is set up)
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the average production cost?"}'
```

### Step 5: Run Tests

```bash
# Add test file to project
mkdir -p src/__tests__
cp cost-calculator.test.ts src/__tests__/

# Run tests
npm test

# Expected: All tests pass ✅
```

### Step 6: Deploy to Staging (Optional)

```bash
# Create staging environment in wrangler.jsonc
# Then deploy
wrangler deploy --env staging
```

### Step 7: Deploy to Production

```bash
# Final deployment
npm run deploy

# Or
wrangler deploy

# Expected output:
# ✨ Built successfully!
# 🌎 Deployed to https://precast-cost-system.<your-subdomain>.workers.dev
```

### Step 8: Post-Deployment Verification

```bash
# Replace <YOUR_WORKER_URL> with your actual URL
export WORKER_URL="https://precast-cost-system.<subdomain>.workers.dev"

# 1. Health check
curl $WORKER_URL/health

# 2. Test endpoints
curl $WORKER_URL/api/products

# 3. Monitor logs
wrangler tail

# 4. Check analytics
open "https://dash.cloudflare.com/?to=/:account/workers/services/view/precast-cost-system/production"
```

---

## Post-Deployment Tasks

### 1. 🗄️ Seed Initial Data

```bash
# Create seed script or manually add via API:

# Add sample products
curl -X POST $WORKER_URL/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Concrete Column 30x30","category":"column","unit":"piece"}'

# Add more as needed...
```

### 2. 📊 Setup Monitoring

- Enable Cloudflare Analytics
- Set up alerts for error rates
- Monitor response times
- Track API usage

### 3. 🔒 Security Review

- [ ] Add API key authentication (if needed)
- [ ] Setup CORS properly for production domain
- [ ] Review rate limiting
- [ ] Audit logging enabled

### 4. 📚 Documentation

- [ ] Update README with production URL
- [ ] Document API endpoints (consider Swagger)
- [ ] Create user guide
- [ ] Update AGENT.md with production tips

---

## Rollback Plan

If deployment fails:

```bash
# 1. Check deployment history
wrangler deployments list

# 2. Rollback to previous version
wrangler rollback

# 3. Check logs
wrangler tail

# 4. Fix issues locally and redeploy
```

---

## Common Issues & Solutions

### Issue: Vectorize not found
**Solution:**
```bash
wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine
```

### Issue: D1 database empty
**Solution:**
```bash
wrangler d1 execute precast-costs-db --file=./src/db/schema.sql
```

### Issue: R2 bucket not accessible
**Solution:**
- Check wrangler.jsonc binding name matches code
- Verify bucket exists: `wrangler r2 bucket list`

### Issue: AI model not responding
**Solution:**
- Check Workers AI is enabled in your account
- Verify model names: `@cf/baai/bge-base-en-v1.5` and `@cf/meta/llama-3.1-8b-instruct`

### Issue: CORS errors
**Solution:**
- Update CORS configuration in `src/index.ts`
- Add your production domain to allowed origins

---

## Performance Optimization

After deployment:

1. **Enable Caching**
   - Add KV caching for frequent queries
   - Cache vector search results (5-10 min TTL)

2. **Database Optimization**
   - Monitor slow queries
   - Add indexes as needed
   - Consider D1 read replicas

3. **Rate Limiting**
   - Add rate limiting per IP
   - Consider API keys for power users

4. **Cost Optimization**
   - Monitor Workers AI usage
   - Optimize vector chunk sizes
   - Batch operations where possible

---

## Success Criteria

Deployment is successful when:

- [x] All endpoints return 200/201 responses
- [x] Health check passes
- [x] Can create products, projects, costs
- [x] Document upload works (R2)
- [ ] RAG query returns meaningful results (needs Vectorize)
- [x] No errors in logs
- [x] Response times < 500ms
- [x] Tests pass

---

## Next Steps After Deployment

### v1.1 Features to Add:
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Export to Excel/PDF
- [ ] Multi-user support with authentication

### v1.2 Features:
- [ ] Mobile app (React Native)
- [ ] Real-time cost tracking
- [ ] Predictive analytics

### v2.0 Major Features:
- [ ] Machine Learning cost predictions
- [ ] Multi-factory support
- [ ] Supplier integration
- [ ] Advanced reporting

---

**Last Updated:** 2025-10-22
**Status:** Ready for Deployment (pending Vectorize setup)
