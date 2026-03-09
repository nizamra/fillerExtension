const STORAGE_KEYS = {
  profiles: "profiles",
  currentProfile: "currentProfile"
};

const DEFAULT_PROFILES = {

  "متابعة يومية": {
    "Email": "sample@gmail.com",
    "معرف التلجرام": "@sample",
    "هل أقمت الصوات الخمس؟": ["صلاة الفجر", "صلاة الظهر", "صلاة العصر", "صلاة المغرب", "صلاة العشاء"],
    "هل قرأت ورد القرآن مع التفسير؟": "نعم، كاملا",
    "هل أتممت ورد ختمة القرآن في رمضان؟": "نعم، كاملا",
    "هل قرأت ورد الحديث كاملا؟": "نعم، كاملا",
    "هل صليت (سنة الفجر، الضحى، الوتر) ؟": ["سنة الفجر", "الضحى", "الوتر"],
    "هل قرأت أذكار الصباح والمساء؟": "أذكار الصباح والمساء",
    "هل قرأت الأذكار الموظفة خلال اليوم الموجودة في حصن المسلم؟": [
      "أذكار الأذان وأذكار الصلاة",
      "أذكار الاستيقاظ وأذكار النوم وأذكار الفزع من النوم",
      "أذكار الدخول والخروج من المسجد، والمنزل، والخلاء",
      "أذكار الأحوال اليومية كالتسمية قبل الأكل والتكبير عند الصعود والتسبيح عند النزول وغيرها ...."
    ],
    "هل أتممت الأوراد التي تم إرسالها على القناة العلمية؟": "نعم، كلها",
    "هل قرأت شيئًا في مجال استخلافك": "نعم",
    "هل كان لك ورد من القراءة الحرة": "نعم",
    "هل مارست الرياضة؟": "نعم",
    "هل قمت بالترويح؟": "نعم، قمت بترويح غير موهن"
  },
  Work: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@company.com",
    company: "ACME Corp",
    job_title: "Senior Engineer",
    phone: "+1 555 0100",
    address: "123 Business St",
    city: "Metropolis",
    country: "USA"
  },
  Personal: {
    first_name: "John",
    last_name: "Doe",
    email: "john.personal@example.com",
    phone: "+1 555 9999",
    address: "456 Home Ave",
    city: "Smallville",
    country: "USA"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const profileSelect = document.getElementById("profileSelect");
  const addProfileBtn = document.getElementById("addProfileBtn");
  const deleteProfileBtn = document.getElementById("deleteProfileBtn");
  const addFieldBtn = document.getElementById("addFieldBtn");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const fillFormBtn = document.getElementById("fillFormBtn");
  const fieldsContainer = document.getElementById("fieldsContainer");
  const statusEl = document.getElementById("status");

  let profiles = {};
  let currentProfile = null;

  function setStatus(message, type = "info") {
    statusEl.textContent = message || "";
    statusEl.className = "status-text " + (type || "");
  }

  function renderProfileOptions() {
    profileSelect.innerHTML = "";
    const names = Object.keys(profiles);
    if (!names.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No profiles";
      profileSelect.appendChild(opt);
      profileSelect.disabled = true;
      return;
    }
    profileSelect.disabled = false;
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === currentProfile) {
        opt.selected = true;
      }
      profileSelect.appendChild(opt);
    });
  }

  function renderFields() {
    fieldsContainer.innerHTML = "";
    if (!currentProfile || !profiles[currentProfile]) {
      return;
    }
    const profile = profiles[currentProfile];
    const entries = Object.entries(profile);
    if (!entries.length) {
      addFieldRow("", "");
      return;
    }
    entries.forEach(([key, value]) => addFieldRow(key, value));
  }

  function addFieldRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "field-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "key (e.g. first_name)";
    keyInput.value = key;

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "value";
    valueInput.value = value;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-field-btn";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => {
      row.remove();
    });

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(deleteBtn);
    fieldsContainer.appendChild(row);
  }

  function collectFieldsFromUI() {
    const rows = Array.from(fieldsContainer.querySelectorAll(".field-row"));
    const result = {};
    rows.forEach((row) => {
      const [keyInput, valueInput] = row.querySelectorAll("input[type='text']");
      const key = (keyInput.value || "").trim();
      const value = valueInput.value || "";
      if (!key) return;
      result[key] = value;
    });
    return result;
  }

  function loadFromStorage() {
    chrome.storage.local.get(
      [STORAGE_KEYS.profiles, STORAGE_KEYS.currentProfile],
      (data) => {
        const storedProfiles = data[STORAGE_KEYS.profiles];
        const storedCurrent = data[STORAGE_KEYS.currentProfile];

        if (!storedProfiles || Object.keys(storedProfiles).length === 0) {
          profiles = { ...DEFAULT_PROFILES };
          currentProfile = "Work";
          chrome.storage.local.set({
            [STORAGE_KEYS.profiles]: profiles,
            [STORAGE_KEYS.currentProfile]: currentProfile
          });
        } else {
          profiles = storedProfiles;
          currentProfile =
            storedCurrent && storedProfiles[storedCurrent]
              ? storedCurrent
              : Object.keys(storedProfiles)[0];
        }

        renderProfileOptions();
        renderFields();
      }
    );
  }

  function saveProfileToStorage(showMessage = true) {
    if (!currentProfile) {
      setStatus("No active profile to save.", "error");
      return;
    }
    const profileData = collectFieldsFromUI();
    profiles[currentProfile] = profileData;
    chrome.storage.local.set(
      {
        [STORAGE_KEYS.profiles]: profiles,
        [STORAGE_KEYS.currentProfile]: currentProfile
      },
      () => {
        if (chrome.runtime.lastError) {
          setStatus("Failed to save: " + chrome.runtime.lastError.message, "error");
        } else if (showMessage) {
          setStatus("Profile saved.", "success");
        }
      }
    );
  }

  profileSelect.addEventListener("change", () => {
    currentProfile = profileSelect.value;
    renderFields();
    setStatus("");
  });

  addProfileBtn.addEventListener("click", () => {
    const name = prompt("New profile name:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (profiles[trimmed]) {
      setStatus("Profile already exists.", "error");
      return;
    }
    profiles[trimmed] = {};
    currentProfile = trimmed;
    renderProfileOptions();
    renderFields();
    saveProfileToStorage(false);
    setStatus("Profile created.", "success");
  });

  deleteProfileBtn.addEventListener("click", () => {
    if (!currentProfile) return;
    if (!confirm(`Delete profile "${currentProfile}"?`)) return;
    delete profiles[currentProfile];
    const names = Object.keys(profiles);
    currentProfile = names[0] || null;
    renderProfileOptions();
    renderFields();
    chrome.storage.local.set(
      {
        [STORAGE_KEYS.profiles]: profiles,
        [STORAGE_KEYS.currentProfile]: currentProfile
      },
      () => {
        setStatus("Profile deleted.", "success");
      }
    );
  });

  addFieldBtn.addEventListener("click", () => {
    addFieldRow("", "");
  });

  saveProfileBtn.addEventListener("click", () => {
    saveProfileToStorage(true);
  });

  fillFormBtn.addEventListener("click", () => {
    if (!currentProfile || !profiles[currentProfile]) {
      setStatus("No active profile selected.", "error");
      return;
    }
    const profileData = collectFieldsFromUI();
    if (Object.keys(profileData).length === 0) {
      setStatus("Profile has no fields to fill.", "error");
      return;
    }

    // Keep storage in sync when filling
    profiles[currentProfile] = profileData;
    chrome.storage.local.set(
      {
        [STORAGE_KEYS.profiles]: profiles,
        [STORAGE_KEYS.currentProfile]: currentProfile
      },
      () => {}
    );

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        setStatus("No active tab found.", "error");
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "FILL_FORM",
          profileName: currentProfile,
          profileData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setStatus(
              "Unable to fill on this page (is the content script loaded?).",
              "error"
            );
            return;
          }
          if (response && response.filledCount != null) {
            setStatus(
              `Filled ${response.filledCount} field${
                response.filledCount === 1 ? "" : "s"
              } using "${currentProfile}".`,
              "success"
            );
          } else {
            setStatus("Form fill triggered.", "success");
          }
        }
      );
    });
  });

  loadFromStorage();
});

