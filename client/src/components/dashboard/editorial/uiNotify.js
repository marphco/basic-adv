// Mini sistema UI per sostituire window.alert / window.confirm con toast e
// modale di conferma coerenti col design. Singleton con pub/sub: i componenti
// chiamano toast()/confirmDialog() da qualsiasi punto; <UiHost/> rende tutto.

const listeners = new Set();
let state = { toasts: [], confirm: null, prompt: null };
let seq = 0;

const emit = () => {
  const snap = state;
  listeners.forEach((l) => l(snap));
};

export const subscribe = (l) => {
  listeners.add(l);
  l(state);
  return () => listeners.delete(l);
};

// toast(message, "success" | "error" | "info")
export function toast(message, type = "info") {
  const id = ++seq;
  state = { ...state, toasts: [...state.toasts, { id, message, type }] };
  emit();
  setTimeout(() => removeToast(id), type === "error" ? 6000 : 3500);
  return id;
}

export function removeToast(id) {
  state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
  emit();
}

export const toastErr = (m) => toast(m, "error");
export const toastOk = (m) => toast(m, "success");

// confirmDialog(message, { title, confirmLabel, danger }) → Promise<boolean>
export function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    state = {
      ...state,
      confirm: {
        message,
        title: opts.title || "",
        confirmLabel: opts.confirmLabel || "Conferma",
        danger: !!opts.danger,
        resolve,
      },
    };
    emit();
  });
}

export function resolveConfirm(result) {
  const c = state.confirm;
  state = { ...state, confirm: null };
  emit();
  if (c) c.resolve(result);
}

// promptDialog(message, { title, confirmLabel, placeholder, defaultValue })
// → Promise<string|null>: il testo (anche "") su conferma, null se annullato.
export function promptDialog(message, opts = {}) {
  return new Promise((resolve) => {
    state = {
      ...state,
      prompt: {
        message,
        title: opts.title || "",
        confirmLabel: opts.confirmLabel || "Invia",
        placeholder: opts.placeholder || "",
        defaultValue: opts.defaultValue || "",
        resolve,
      },
    };
    emit();
  });
}

export function resolvePrompt(result) {
  const pr = state.prompt;
  state = { ...state, prompt: null };
  emit();
  if (pr) pr.resolve(result);
}
