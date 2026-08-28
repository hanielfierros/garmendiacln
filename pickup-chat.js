/**
 * Chat Dominius + voz — Pick Up V13
 */
(function (global) {
  "use strict";

  const CFG = () => global.MG_PICKUP_CONFIG || {};

  let recognition = null;
  let listening = false;

  function initSpeech(onTranscript) {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) return false;
    recognition = new SR();
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text && onTranscript) onTranscript(text);
      stopMic();
    };
    recognition.onerror = () => stopMic();
    recognition.onend = () => stopMic();
    return true;
  }

  function startMic(onTranscript) {
    if (!recognition && !initSpeech(onTranscript)) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    if (listening) {
      recognition.stop();
      return;
    }
    listening = true;
    try {
      recognition.start();
    } catch {
      listening = false;
    }
  }

  function stopMic() {
    listening = false;
  }

  function isListening() {
    return listening;
  }

  async function sendToDominius(message) {
    const url = CFG().dominiusApi || "https://dominius-api.onrender.com/chat";
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Eres asistente del Mercado Garmendia en Culiacán. Responde breve en español (o inglés si el usuario escribe en inglés). El usuario quiere comprar en Pick Up. Mensaje: ${message}`,
        }),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return data.botResponse || "Listo, preparé opciones según tu pedido.";
    } catch (err) {
      clearTimeout(tid);
      return "Conexión con IA limitada. Generé carritos según el catálogo del mercado.";
    }
  }

  global.MG_PICKUP_CHAT = {
    sendToDominius,
    startMic,
    stopMic,
    isListening,
    initSpeech,
  };
})(window);