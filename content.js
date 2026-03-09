// Content script: listens for messages and fills forms based on active profile.

/**
 * Basic security filter to avoid sensitive fields such as passwords and
 * credit card information.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} el
 * @returns {boolean} true if the element should be skipped
 */
function isSensitiveField(el) {
  const tag = el.tagName;
  const type = (el.type || "").toLowerCase();

  if (type === "password") return true;

  const attrsToCheck = [
    el.id || "",
    el.name || "",
    el.autocomplete || "",
    (el.getAttribute("aria-label") || ""),
    (el.placeholder || "")
  ]
    .join(" ")
    .toLowerCase();

  const ccKeywords = [
    "cardnumber",
    "card number",
    "creditcard",
    "cc-number",
    "ccnumber",
    "cc-num",
    "cvc",
    "cvv",
    "cardcode",
    "expiry",
    "expdate",
    "exp-date",
    "expiration",
    "cardholder",
    "card holder",
    "iban",
    "routing",
    "security code"
  ];

  if (ccKeywords.some((kw) => attrsToCheck.includes(kw))) {
    return true;
  }

  // Heuristic: short numeric fields with credit card-like hints
  if (tag === "INPUT" && type === "text") {
    const maxLength = parseInt(el.maxLength, 10);
    if (
      (maxLength === 3 || maxLength === 4) &&
      /cvv|cvc|cvn|cv2/i.test(attrsToCheck)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes a key or attribute string for fuzzy comparison.
 * Uses Unicode-aware normalization so it works with non‑Latin scripts
 * (e.g. Arabic) by keeping all letters and digits and stripping punctuation.
 * @param {string} str
 * @returns {string}
 */
function normalizeKey(str) {
  if (!str) return "";
  try {
    return str
      .toLocaleLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}]+/gu, "");
  } catch (_) {
    // Fallback for very old engines without Unicode properties support.
    return (str || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF0-9]/g, "");
  }
}

/**
 * Computes a fuzzy match score between a profile key and a field's metadata.
 * Higher score means better match.
 * @param {string} profileKey
 * @param {string} fieldMetaCombined
 * @returns {number}
 */
function fuzzyMatchScore(profileKey, fieldMetaCombined) {
  const keyNorm = normalizeKey(profileKey);
  const fieldNorm = normalizeKey(fieldMetaCombined);
  if (!keyNorm || !fieldNorm) return 0;

  let score = 0;

  if (fieldNorm === keyNorm) {
    score += 10;
  } else if (fieldNorm.includes(keyNorm)) {
    score += 7;
  } else if (keyNorm.includes(fieldNorm)) {
    score += 5;
  }

  const synonyms = {
    firstname: ["fname", "givenname", "forename", "first"],
    lastname: ["lname", "surname", "familyname", "last"],
    email: ["emailaddress", "e-mail"],
    phone: ["phonenumber", "mobile", "tel", "telephone"],
    address: ["addr", "street", "streetaddress", "line1", "line2", "shipping", "billing"],
    city: ["town"],
    zip: ["postcode", "postalcode"],
    country: ["nation"],
    company: ["organization", "organisation", "business", "employer"]
  };

  Object.entries(synonyms).forEach(([canonical, variants]) => {
    const canonNorm = normalizeKey(canonical);
    if (keyNorm === canonNorm) {
      variants.forEach((v) => {
        if (fieldNorm.includes(normalizeKey(v))) {
          score += 4;
        }
      });
    }
  });

  // Bonus if some substring overlap exists
  let common = 0;
  const len = Math.min(keyNorm.length, fieldNorm.length);
  for (let i = 0; i < len; i++) {
    if (keyNorm[i] === fieldNorm[i]) {
      common++;
    } else {
      break;
    }
  }
  score += common * 0.3;

  return score;
}

/**
 * تحسين البحث الضبابي ليدعم النصوص العربية
 * Helper: finds best matching profile key for a given field.
 * @param {HTMLElement} el
 * @param {Record<string, string>} profileData
 * @returns {{key: string, value: string}|null}
 */
function findBestProfileMatchForField(el, profileData) {
  // جلب كافة النصوص المرتبطة بالحقل (label, placeholder, aria-label, name, id)
  const searchableText = [
    el.getAttribute("aria-label") || "",
    el.placeholder || "",
    el.name || "",
    el.id || "",
    // البحث عن نص السؤال في الحاوية القريبة (مهم جداً لنماذج جوجل)
    el.closest('[role="listitem"]')?.innerText || ""
  ]
    .join(" ")
    .toLowerCase();

  if (!searchableText.trim()) return null;

  for (const [key, value] of Object.entries(profileData)) {
    if (value == null || value === "") continue;
    const normalizedKey = String(key).toLowerCase();
    // إذا كان نص السؤال يحتوي على مفتاح البروفايل
    if (searchableText.includes(normalizedKey)) {
      return { key, value };
    }
  }

  return null;
}

/**
 * الوظيفة المحدثة لتعبئة النموذج مع دعم كامل للاختيارات المتعددة (Google Forms)
 * @param {Object} profileData - بيانات البروفايل المختار
 * @returns {number} عدد الحقول التي تمت تعبئتها
 */
function fillPageWithProfile(profileData) {
  if (!profileData || typeof profileData !== "object") return 0;

  // استهداف المدخلات التقليدية وعناصر نماذج جوجل (التي تستخدم role)
  const allFields = Array.from(
    document.querySelectorAll(
      "input, textarea, select, [role='radio'], [role='checkbox']"
    )
  );

  let filledCount = 0;

  allFields.forEach((el) => {
    if (!el) return;

    if (isSensitiveField(el)) return;

    const match = findBestProfileMatchForField(el, profileData);
    if (!match) return;

    // تحويل القيمة إلى مصفوفة دائماً لتسهيل التعامل مع الاختيارات المتعددة
    const targetValues = Array.isArray(match.value) 
      ? match.value.map(v => String(v).trim().toLowerCase()) 
      : [String(match.value).trim().toLowerCase()];

    const role = el.getAttribute && el.getAttribute("role");

    // --- منطق التعامل مع نماذج جوجل (Radio & Checkbox) ---
    if (role === "radio" || role === "checkbox") {
      const labelText = (el.getAttribute("aria-label") || el.innerText || "").trim().toLowerCase();
      
      if (!labelText) return;

      // التحقق مما إذا كان نص الخيار (مثل "صلاة الفجر") موجوداً ضمن القيم المطلوبة في البروفايل
      const shouldBeChecked = targetValues.some(val => 
        val.includes(labelText) || labelText.includes(val)
      );

      const isCurrentlyChecked = el.getAttribute("aria-checked") === "true";

      // إذا كان الخيار يجب أن يكون مختاراً وهو غير مختار حالياً، نقوم بالنقر عليه
      if (shouldBeChecked && !isCurrentlyChecked) {
        el.click();
        filledCount++;
      } 
      // اختيار إضافي: إذا كان الخيار مختاراً ولا ينبغي أن يكون (غير موجود في البروفايل)، نقوم بإلغائه
      else if (!shouldBeChecked && isCurrentlyChecked && role === "checkbox") {
        el.click();
      }
      return; 
    }

    // --- منطق التعامل مع الحقول النصية والقوائم المنسدلة ---
    const tag = el.tagName;
    const type = (el.type || "").toLowerCase();

    // تخطي الأزرار
    if (tag === "INPUT" && ["button", "submit", "reset", "file"].includes(type)) {
      return;
    }

    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      // بالنسبة للحقول النصية، نأخذ القيمة الأولى فقط إذا كانت مصفوفة
      const valueToSet = Array.isArray(match.value) ? match.value[0] : match.value;
      setElementValueWithEvents(el, String(valueToSet));
      filledCount++;
    }
  });

  return filledCount;
}

// المستمع للرسائل القادمة من الـ Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "FILL_FORM") {
    return;
  }

  const profileData = message.profileData || {};
  const filledCount = fillPageWithProfile(profileData);
  
  try {
    sendResponse({ filledCount });
  } catch (_) {
    // تجاهل أخطاء القنوات المغلقة
  }
});
