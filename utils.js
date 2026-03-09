// Shared utilities for event dispatching and safe value setting

/**
 * Sets the value of a form element and dispatches input/change/blur events
 * so that modern frameworks (React, Vue, Angular, etc.) pick up the change.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} element
 * @param {string} value
 */
function setElementValueWithEvents(element, value) {
  if (!element) return;

  // استخدام setter الأصلي لتجاوز قيود React
  const valueSetter =
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")
      ?.set;

  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // تحديث select ليطابق القيمة عند الإمكان
  if (element.tagName === "SELECT") {
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i].value === String(value)) {
        element.selectedIndex = i;
        break;
      }
    }
  }

  // إرسال الأحداث اللازمة لتحديث حالة النموذج
  const events = ["input", "change", "blur"];
  events.forEach((type) => {
    element.dispatchEvent(
      new Event(type, {
        bubbles: true
      })
    );
  });
}
