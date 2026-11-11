(() => { "use strict"; const root = 
  document.documentElement; const themeButton = 
  document.getElementById("themeToggle"); const 
  form = document.getElementById("contactForm"); 
  const submitButton = 
  document.getElementById("submitBtn"); const 
  feedback = 
  document.getElementById("formFeedback"); const 
  year = document.getElementById("year");
  // Iconos SVG nativos (evita dependencias 
  // externas)
  const sunIcon = `<svg class="w-4 h-4 
  text-amber-400" fill="none" 
  stroke="currentColor" stroke-width="2" 
  viewBox="0 0 24 24"><circle cx="12" cy="12" 
  r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 
  1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 
  19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`; 
  const moonIcon = `<svg class="w-4 h-4 
  text-slate-700" fill="none" 
  stroke="currentColor" stroke-width="2" 
  viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 
  1111.21 3 7 7 0 0021 12.79z"/></svg>`; function 
  updateThemeUI(isDark) {
    if (isDark) { root.classList.add("dark"); if 
      (themeButton) {
        themeButton.innerHTML = sunIcon; 
        themeButton.setAttribute("aria-pressed", 
        "true"); themeButton.setAttribute("title", 
        "Cambiar a modo claro");
      }
    } else {
      root.classList.remove("dark"); if 
      (themeButton) {
        themeButton.innerHTML = moonIcon; 
        themeButton.setAttribute("aria-pressed", 
        "false"); 
        themeButton.setAttribute("title", "Cambiar 
        a modo oscuro");
      }
    }
  }
  // 1. Detección inicial de tema
  let savedTheme = null; try { savedTheme = 
  localStorage.getItem("theme"); } catch (_) {} 
  const prefersDark = 
  window.matchMedia("(prefers-color-scheme: 
  dark)").matches; let isDark = savedTheme ? 
  savedTheme === "dark" : prefersDark; 
  updateThemeUI(isDark); if (themeButton) {
    themeButton.addEventListener("click", () => { 
      isDark = !isDark; updateThemeUI(isDark); try 
      {
        localStorage.setItem("theme", isDark ? 
        "dark" : "light");
      } catch (_) {}
    });
  }
  // 2. Año actual en el pie
  if (year) { year.textContent = String(new 
    Date().getFullYear());
  }
  // 3. Feedback visual accesible
  function showFeedback(message, type = "error") { 
    if (!feedback) return; feedback.textContent = 
    message; feedback.className = type === 
    "success"
      ? "p-4 rounded-xl text-sm text-center 
      font-medium bg-emerald-50 text-emerald-800 
      border border-emerald-200 
      dark:bg-emerald-950/60 dark:text-emerald-300 
      dark:border-emerald-800 transition-all 
      duration-300"
      : "p-4 rounded-xl text-sm text-center 
      : font-medium bg-rose-50 text-rose-800 
      : border border-rose-200 dark:bg-rose-950/60 
      : dark:text-rose-300 dark:border-rose-800 
      : transition-all duration-300";
    feedback.classList.remove("hidden"); 
    feedback.scrollIntoView({ behavior: "smooth", 
    block: "nearest" });
  }
  // 4. Formulario de contacto
  if (form) { form.addEventListener("submit", 
    async (event) => {
      event.preventDefault(); if (feedback) 
      feedback.classList.add("hidden"); if 
      (!form.reportValidity()) return;
      // Antispam honeypot
      if (form.elements._gotcha && 
      form.elements._gotcha.value.trim() !== "") {
        form.reset(); showFeedback("No se ha 
        podido procesar la solicitud.", "error"); 
        return;
      }
      const senderName = form.elements.name ? 
      form.elements.name.value.trim() : ""; const 
      endpoint = window.APP_CONFIG && 
      window.APP_CONFIG.formEndpoint; const 
      isEndpointValid = endpoint && 
      /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint); 
      const originalLabel = submitButton ? 
      submitButton.textContent : "Enviar"; if 
      (submitButton) {
        submitButton.disabled = true; 
        submitButton.textContent = "Enviando 
        mensaje…";
      }
      // Fallback local simulado si no hay 
      // endpoint activo
      if (!isEndpointValid) { setTimeout(() => { 
          form.reset(); if (submitButton) {
            submitButton.disabled = false; 
            submitButton.textContent = 
            originalLabel;
          }
          showFeedback(`[Modo Local] Grazas, 
          ${senderName || "amigo"}. A mensaxe 
          procesouse correctamente.`, "success");
        }, 600);
        return;
      }
      try { const formData = new FormData(form); 
        formData.delete("_gotcha"); const response 
        = await fetch(endpoint, {
          method: "POST", body: formData, headers: 
          { "Accept": "application/json" }
        });
        if (!response.ok) { let detail = ""; try { 
            const result = await response.json(); 
            if (result && result.errors) {
              detail = result.errors.map(item => 
              item.message).join(" ");
            }
          } catch (_) {}
          throw new Error(detail || "El servicio 
          no ha aceptado el mensaje.");
        }
        form.reset(); showFeedback(`Moitas grazas, 
        ${senderName}. Tu mensaje se ha enviado 
        con éxito.`, "success");
      } catch (error) {
        showFeedback(error.message || "Error al 
        enviar el mensaje. Inténtalo de nuevo.", 
        "error");
      } finally {
        if (submitButton) { submitButton.disabled 
          = false; submitButton.textContent = 
          originalLabel;
        }
      }
    });
  }
})();
