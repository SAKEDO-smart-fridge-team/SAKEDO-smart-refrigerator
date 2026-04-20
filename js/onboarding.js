// js/onboarding.js

const TOTAL_STEPS = 5;

function showStep(stepNumber) {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    if (stepEl) {
      stepEl.style.display = "none";
    }
  }

  const targetStep = document.getElementById(`step-${stepNumber}`);
  if (targetStep) {
    targetStep.style.display = "flex";
  }
}

window.showStep = showStep;

function getSelectedValues(selector) {
  return Array.from(document.querySelectorAll(`${selector}.active`)).map(
    (button) => button.dataset.value || button.textContent.trim()
  );
}

function collectOnboardingSelections() {
  const selectedDiet = document.querySelector(".diet-btn.active");
  return {
    diet_preference: selectedDiet?.dataset.value || "none",
    allergies: getSelectedValues("#step-3 .tag-btn"),
    disliked_foods: getSelectedValues("#step-4 .tag-btn"),
    favorite_cuisines: getSelectedValues("#step-5 .tag-btn")
  };
}

function markSingleOptionActive(selector, value) {
  const options = document.querySelectorAll(selector);
  options.forEach((option) => {
    option.classList.toggle("active", option.dataset.value === value);
  });
}

function markMultiOptionsActive(selector, values) {
  const selected = new Set((values || []).map((value) => String(value).toLowerCase()));
  document.querySelectorAll(selector).forEach((option) => {
    const key = String(option.dataset.value || "").toLowerCase();
    option.classList.toggle("active", selected.has(key));
  });
}

function applySavedSelections(settings) {
  markSingleOptionActive(".diet-btn", settings?.diet_preference || "none");
  markMultiOptionsActive("#step-3 .tag-btn", settings?.allergies || []);
  markMultiOptionsActive("#step-4 .tag-btn", settings?.disliked_foods || []);
  markMultiOptionsActive("#step-5 .tag-btn", settings?.favorite_cuisines || []);
}

async function completeOnboarding() {
  const auth = window.sakedoApi?.getStoredAuth();
  if (!auth?.access_token) {
    window.location.href = "login.html";
    return;
  }

  const payload = {
    ...collectOnboardingSelections(),
    onboarding_completed: true
  };

  try {
    await window.sakedoApi.updateUserSettings(payload);
  } catch (error) {
    alert(error.message || "Không thể lưu cài đặt cá nhân.");
    return;
  }

  window.location.href = "index.html";
}

window.completeOnboarding = completeOnboarding;

async function skipOnboarding() {
  const auth = window.sakedoApi?.getStoredAuth();
  if (!auth?.access_token) {
    window.location.href = "login.html";
    return;
  }

  try {
    await window.sakedoApi.updateUserSettings({ onboarding_completed: true });
  } catch (error) {
    // Allow user to continue even if persisting skip fails.
  }

  window.location.href = "index.html";
}

window.skipOnboarding = skipOnboarding;

document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.sakedoApi?.getStoredAuth();
  if (!auth?.access_token) {
    window.location.href = "login.html";
    return;
  }

  const dietButtons = document.querySelectorAll(".diet-btn");
  dietButtons.forEach((button) => {
    button.addEventListener("click", () => {
      dietButtons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
    });
  });

  const tagButtons = document.querySelectorAll(".tag-btn");
  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
    });
  });

  try {
    const settings = await window.sakedoApi.getUserSettings();
    if (settings?.onboarding_completed) {
      window.location.href = "index.html";
      return;
    }
    applySavedSelections(settings);
  } catch (error) {
    // Keep onboarding usable even when loading settings fails.
  }

  showStep(1);
});
