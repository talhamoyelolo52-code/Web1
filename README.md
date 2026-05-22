# ⚔️ Minecraft Plugin Web Compiler

Railway-এ Deploy করার জন্য তৈরি Web Compiler।

## 🚀 Railway-এ Deploy করার স্টেপ:

### ১. GitHub-এ Push করো
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mc-plugin-compiler.git
git push -u origin main
```

### ২. Railway-এ Deploy
1. [railway.app](https://railway.app) এ গিয়ে লগইন করো
2. "New Project" → "Deploy from GitHub repo"
3. তোমার repo সিলেক্ট করো
4. Railway অটোমেটিক Dockerfile দেখে Deploy করবে

### ৩. Environment Variables (যদি লাগে)
- `PORT` = 3000 (অটো সেট হয়)

### ৪. Access
Deploy হওয়ার পর Railway তোমাকে URL দেবে:
```
https://your-app-name.up.railway.app
```

## 📋 Features:
- ✅ Java (.java) ফাইল কম্পাইল
- ✅ Maven প্রোজেক্ট (pom.xml)
- ✅ Gradle প্রোজেক্ট (build.gradle)
- ✅ JAR ফাইল ডাউনলোড
- ✅ কম্পাইলেশন লগ দেখা

## ⚠️ Important:
Railway-এর ফ্রি প্ল্যানে **512MB RAM** থাকে। বড় Maven প্রোজেক্ট কম্পাইল করতে **RAM বাড়াতে হতে পারে** (Starter Plan $5/month)।
