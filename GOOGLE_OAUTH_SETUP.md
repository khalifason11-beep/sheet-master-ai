# Google OAuth Configuration Guide - Cellow

## ✅ Changes Applied

تم تطبيق جميع التحديثات اللازمة لإصلاح مشكلة خطأ 404 في تسجيل الدخول عبر Google.

### الملفات المحدثة:

1. **`.env`** - إضافة متغير البيئة للـ callback URL
2. **`src/routes/auth.tsx`** - تحديث دالة `handleGoogle` لإرسال الـ callback URL الصحيح
3. **`src/routes/auth.callback.tsx`** - ملف جديد للتعامل مع redirect من Google
4. **`src/integrations/supabase/client.ts`** - تفعيل كشف الجلسة وOAuth implicit flow

---

## 🔧 الخطوات المتبقية (IMPORTANT)

### 1. تأكد من إعدادات Google Cloud Console ✓

تحقق من أنك أضفت redirect URLs في Google Cloud Console:

```
لـ Development:
- http://localhost:3000/auth/callback
- http://localhost:3000

لـ Production:
- https://yourdomain.com/auth/callback
- https://yourdomain.com
```

**الموقع:** Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client

### 2. تحديث ملف `.env` (إن لم يكن محدثاً)

```env
SUPABASE_PROJECT_ID="mbfpwrcyejezwtzqwish"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_-XjayBWbsV9cjlKPzbnQ_A_uuOyU4Xe"
SUPABASE_URL="https://mbfpwrcyejezwtzqwish.supabase.co"
VITE_SUPABASE_PROJECT_ID="mbfpwrcyejezwtzqwish"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_-XjayBWbsV9cjlKPzbnQ_A_uuOyU4Xe"
VITE_SUPABASE_URL="https://mbfpwrcyejezwtzqwish.supabase.co"
VITE_OAUTH_CALLBACK_URL="/auth/callback"
```

### 3. تفعيل Google Provider في Supabase ✓

في لوحة تحكم Supabase:
1. اذهب إلى **Authentication > Providers**
2. تفعيل **Google**
3. أدخل بيانات Google OAuth:
   - Client ID
   - Client Secret
4. تأكد من إضافة Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

### 4. إعادة تشغيل سيرفر التطوير

```bash
# توقف السيرفر (Ctrl+C)

# امسح الـ cache
rm -rf node_modules/.vite
rm -rf .next (if exists)

# أعد تشغيل السيرفر
npm run dev
# أو
bun run dev
```

---

## 🧪 اختبار الحل

1. افتح المتصفح: `http://localhost:3000/auth`
2. اضغط على زر **"Continue with Google"**
3. ستنقل Google إلى صفحة تسجيل الدخول الخاصة بك
4. بعد الموافقة، سيتم redirect إلى `/auth/callback`
5. ستظهر رسالة نجاح وسيتم redirect إلى `/dashboard`

---

## 🐛 استكشاف الأخطاء

### الخطأ: "Invalid redirect_uri"
**الحل:** تأكد من إضافة `/auth/callback` في Google Cloud Console بالضبط

### الخطأ: Still getting 404
**الحل:** تحقق من:
- تم تحديث `.env` وإعادة تشغيل السيرفر
- التحقق من أن ملف `auth.callback.tsx` موجود في `src/routes/`
- الـ URL في المتصفح يشير إلى `/auth/callback`

### الخطأ: "Session not found"
**الحل:** قد تحتاج إلى:
- مسح cookies في المتصفح
- إعادة تحميل الصفحة بـ `Ctrl+Shift+R`
- التحقق من أن Supabase Google Provider مفعل

---

## 📋 ملخص الحل

| المشكلة | الحل المطبق |
|--------|-----------|
| غياب callback route | ✅ تم إنشاء `src/routes/auth.callback.tsx` |
| redirect_uri غير صحيح | ✅ تم تحديث إلى `/auth/callback` |
| عدم كشف جلسة OAuth | ✅ تم تفعيل `detectSessionInUrl` و `flowType: 'implicit'` |
| متغيرات بيئة ناقصة | ✅ تم إضافة `VITE_OAUTH_CALLBACK_URL` |

---

## 🔗 المراجع المفيدة

- [Supabase OAuth Guide](https://supabase.com/docs/guides/auth/oauth2)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [TanStack Router Guide](https://tanstack.com/router/latest)

---

**تم آخر تحديث:** 2026-07-21  
**الحالة:** ✅ جاهز للاختبار
