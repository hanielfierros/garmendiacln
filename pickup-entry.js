/**
 * Entrada Pick Up desde HOME — contraseña y sesión
 */
(function (global) {
  "use strict";

  const CFG = () => global.MG_PICKUP_CONFIG || { password: "garmendia", sessionKey: "mg_pickup_session_v13" };

  function createSession() {
    const token = `pk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const session = {
      token,
      from: "home",
      created: Date.now(),
      expires: Date.now() + 60 * 60 * 1000,
    };
    sessionStorage.setItem(CFG().sessionKey, JSON.stringify(session));
    return session;
  }

  function openFromHome() {
    const pwd = prompt("Ingresa la contraseña para acceder a PICK UP:");
    if (pwd === null) return;
    if (pwd.trim().toLowerCase() !== String(CFG().password).toLowerCase()) {
      alert("Contraseña incorrecta.");
      return;
    }
    createSession();
    global.location.href = "pickup.html";
  }

  global.MG_PICKUP_ENTRY = { openFromHome, createSession };
})(window);