# allFormsFiller

**allFormsFiller** is a lightweight, privacy-focused Chrome Extension (Manifest V3) designed to automate repetitive form-filling tasks. Unlike standard auto-fillers, it is optimized for modern web frameworks and complex form structures, including **Google Forms** and RTL (Arabic) content.

---

## 🚀 Features

* **Multi-Profile Management**: Switch between "Work", "Personal", and custom profiles like "Daily Tracker" effortlessly.
* **Intelligent Matching**: Uses fuzzy matching logic to identify fields based on `name`, `id`, `placeholder`, `aria-label`, and surrounding context.
* **Google Forms Support**: Specialized logic to handle `role="radio"` and `role="checkbox"` elements that traditional fillers often miss.
* **Framework Compatible**: Manually dispatches `input`, `change`, and `blur` events to ensure state-driven apps (React, Angular, Vue) recognize the data.
* **Privacy First**: No cloud syncing. All data is stored locally using `chrome.storage.local`.
* **Security Minded**: Automatically ignores sensitive fields like passwords and credit card information.

---

## 🛠 Project Structure

```text
├── manifest.json         # Extension configuration (Manifest V3)
├── popup.html            # Extension UI
├── popup.js              # UI logic and profile management
├── popup.css             # Modern Dark-themed styling
├── content.js            # The "Filler Engine" (DOM manipulation)
└── utils.js              # Shared event dispatching utilities

```

---

## 📦 Installation

1. **Clone or Download** this repository to your local machine.
2. Open **Brave** or **Chrome** and navigate to `brave://extensions` or `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing the project files.

---

## 📖 Usage

### 1. Setting up Profiles

Open the extension popup. You can add a new profile (e.g., "Daily Tracker") and define the fields. For multi-select fields (like checkboxes), you can provide a list of values to be selected.

### 2. Filling a Form

1. Navigate to the page containing the form.
2. Open the **allFormsFiller** popup.
3. Select the desired profile from the dropdown.
4. Click **Fill Form**.

### 3. Arabic Support & Google Forms

The extension is pre-configured to handle Arabic labels and complex Google Form structures. It looks for `aria-label` and `role` attributes to ensure high accuracy on specialized forms like the "Muslim Psychological Construction Daily Follow-up".

---

## 🔧 Technical Deep Dive

### Event Simulation

To bypass "ghost inputs" where the text disappears after you click away, the extension uses a native value setter:

```javascript
const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
desc.set.call(element, value);
element.dispatchEvent(new Event("input", { bubbles: true }));

```

### Fuzzy Matching Logic

The engine prioritizes matches in the following order:

1. `aria-label`
2. `placeholder`
3. `name` / `id`
4. Parent container text (crucial for Google Forms questions)

---

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any feature enhancements, such as:

* Import/Export JSON functionality.
* Shadow DOM penetration.
* Regex-based matching.

---
