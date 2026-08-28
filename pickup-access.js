/**
 * Control de acceso y temporizador Pick Up
 */
(function (global) {
  "use strict";

  const CFG = () => global.MG_PICKUP_CONFIG || {};
  let timerId = null;
  let deadline = 0;
  let extensionsUsed = 0;
  let onExpire = null;
  let timerLabelEl = null;

  function getSession() {
    try {
      const raw = sessionStorage.getItem(CFG().sessionKey || "mg_pickup_session_v13");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s?.token || s.expires < Date.now()) return null;
      return s;
    } catch {
      return null;
    }
  }

  function guardEntry() {
    if (!getSession()) {
      global.location.replace("index.html");
      return false;
    }
    return true;
  }

  function clearSession() {
    sessionStorage.removeItem(CFG().sessionKey || "mg_pickup_session_v13");
    sessionStorage.removeItem("mg_pickup_state_v13");
  }

  function clearAllAndExit() {
    clearSession();
    global.location.replace("index.html");
  }

  function formatRemaining(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function tickTimer(labelEl) {
    const left = deadline - Date.now();
    if (labelEl) {
      labelEl.textContent = formatRemaining(left);
      labelEl.classList.toggle("pu-timer-warn", left <= 120000);
      labelEl.classList.toggle("pu-timer-critical", left <= 60000);
    }
    if (left <= 0) {
      clearInterval(timerId);
      timerId = null;
      handleExpired();
    }
  }

  function handleExpired() {
    const maxExt = CFG().timerMaxExtensions ?? 2;
    if (extensionsUsed < maxExt) {
      const ok = confirm(
        "Tu tiempo para completar el pedido ha terminado.\n\n¿Deseas continuar? (Se agregan 3 minutos más)"
      );
      if (ok) {
        extensionsUsed += 1;
        deadline = Date.now() + (CFG().timerExtensionMs || 180000);
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => tickTimer(timerLabelEl), 1000);
        tickTimer(timerLabelEl);
        return;
      }
    }
    clearAllAndExit();
    if (typeof onExpire === "function") onExpire();
  }

  function startTimer(labelEl, expireCallback) {
    onExpire = expireCallback;
    timerLabelEl = labelEl;
    extensionsUsed = 0;
    deadline = Date.now() + (CFG().timerInitialMs || 420000);
    if (timerId) clearInterval(timerId);
    tickTimer(labelEl);
    timerId = setInterval(() => tickTimer(labelEl), 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  global.MG_PICKUP_ACCESS = {
    guardEntry,
    clearSession,
    clearAllAndExit,
    startTimer,
    stopTimer,
    getSession,
  };
})(window);