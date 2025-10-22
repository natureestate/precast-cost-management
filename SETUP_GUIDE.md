# 🚀 Quick Setup Guide

## ขั้นตอนการอัพเดทโปรเจค

### 1️⃣ ดาวน์โหลดไฟล์ที่จำเป็น

จาก Claude outputs ให้ดาวน์โหลดไฟล์เหล่านี้:

- ✅ `analytics.ts` - Analytics route
- ✅ `cost-calculator.test.ts` - Unit tests
- ✅ `DEPLOYMENT.md` - Deployment guide
- ✅ `update-project.sh` - Auto update script
- ✅ `SETUP_GUIDE.md` - คู่มือนี้

### 2️⃣ เตรียมโปรเจค

```bash
# เปิด Terminal และไปที่โฟลเดอร์โปรเจค
cd ~/path/to/precast-cost-system

# ย้ายไฟล์ที่ดาวน์โหลดมาที่นี่
mv ~/Downloads/analytics.ts .
mv ~/Downloads/cost-calculator.test.ts .
mv ~/Downloads/DEPLOYMENT.md .
mv ~/Downloads/update-project.sh .
```

### 3️⃣ รัน Auto Update Script

```bash
# ทำให้ script executable (ถ้ายังไม่ได้ทำ)
chmod +x update-project.sh

# รัน script
./update-project.sh
```

Script จะทำอะไร:
- ✅ คัดลอก `analytics.ts` ไปยัง `src/routes/`
- ✅ อัพเดท `src/index.ts` ให้ import analytics
- ✅ คัดลอก test file ไปยัง `src/__tests__/`
- ✅ คัดลอก `DEPLOYMENT.md` ไปยัง root
- ✅ รัน `npm install`
- ✅ ถามว่าจะ commit และ push หรือไม่

### 4️⃣ (ทางเลือก) อัพเดทแบบ Manual

ถ้าไม่ต้องการใช้ script สามารถทำแบบ manual:

```bash
# 1. คัดลอก analytics.ts
cp analytics.ts src/routes/analytics.ts

# 2. คัดลอก test file
mkdir -p src/__tests__
cp cost-calculator.test.ts src/__tests__/

# 3. คัดลอก DEPLOYMENT.md
cp DEPLOYMENT.md ./

# 4. แก้ไข src/index.ts (ดูด้านล่าง)
```

#### แก้ไข src/index.ts

เพิ่ม import ด้านบน:
```typescript
import analytics from './routes/analytics';
```

เพิ่ม route mounting:
```typescript
app.route('/api/analytics', analytics);
```

ตำแหน่งที่แนะนำ - หลังจาก query route:
```typescript
app.route('/api/query', query);
app.route('/api/analytics', analytics);  // ← เพิ่มบรรทัดนี้
```

### 5️⃣ สร้าง Vectorize Index (CRITICAL!)

```bash
wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine
```

### 6️⃣ ทดสอบ Local

```bash
# Start dev server
npm run dev

# เปิด browser ไปที่
# http://localhost:8787/health

# หรือทดสอบด้วย curl
curl http://localhost:8787/api/analytics/summary
```

### 7️⃣ รัน Tests

```bash
npm test
```

### 8️⃣ Deploy

```bash
# Deploy to production
npm run deploy

# หรือ
wrangler deploy
```

---

## 🔧 Manual Git Operations

ถ้าไม่ได้ใช้ auto script:

```bash
# 1. Check status
git status

# 2. Add files
git add src/routes/analytics.ts
git add src/__tests__/cost-calculator.test.ts
git add src/index.ts
git add DEPLOYMENT.md

# 3. Commit
git commit -m "feat: Add analytics, tests, and deployment docs

- Add analytics endpoints (summary, compare, estimate, trends)
- Add unit tests for cost calculator
- Add comprehensive deployment documentation
- Update main index to include analytics route"

# 4. Push
git push origin main
```

---

## ✅ Checklist

- [ ] ดาวน์โหลดไฟล์ทั้งหมด
- [ ] รัน `update-project.sh` หรืออัพเดท manual
- [ ] สร้าง Vectorize index
- [ ] ทดสอบ local (`npm run dev`)
- [ ] รัน tests (`npm test`)
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Deploy (`npm run deploy`)

---

## 🆘 Troubleshooting

### ปัญหา: "Permission denied" เมื่อรัน script
```bash
chmod +x update-project.sh
./update-project.sh
```

### ปัญหา: "File not found"
ตรวจสอบว่าคุณอยู่ใน project root directory:
```bash
pwd  # ควรเห็น path ไปยัง precast-cost-system
ls   # ควรเห็น package.json และ src/
```

### ปัญหา: Git conflicts
```bash
git status
git diff src/index.ts  # ดู changes
# แก้ไข conflicts แบบ manual
git add .
git commit -m "fix: Resolve merge conflicts"
```

### ปัญหา: Vectorize creation fails
```bash
# Login again
wrangler login

# Try again
wrangler vectorize create precast-vectors --dimensions=768 --metric=cosine
```

---

## 📞 Need Help?

1. ดู `DEPLOYMENT.md` สำหรับ detailed guide
2. ดู `AGENT.md` สำหรับ development guidelines
3. ถามใน Claude chat อีกครั้ง! 😊

---

**Happy Coding! 🎉**
