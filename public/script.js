/**
 * Asistente Virtual Oficial Entel Perú - Frontend Client
 * Conecta con POST /api/support/chat
 */

document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chatContainer');
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const quickChips = document.getElementById('quickChips');
  const welcomeTime = document.getElementById('welcomeTime');

  // Historial en memoria de la sesión activa
  let conversationHistory = [];
  let isSending = false;

  // Actualizar hora del mensaje inicial
  if (welcomeTime) {
    welcomeTime.textContent = getFormattedTime();
  }

  // Ajuste automático de altura del textarea al escribir
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  });

  // Enviar mensaje con la tecla Enter (sin shift)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Manejo de chips de preguntas frecuentes
  if (quickChips) {
    quickChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-btn');
      if (chip && !isSending) {
        const query = chip.getAttribute('data-query');
        if (query) {
          userInput.value = query;
          chatForm.dispatchEvent(new Event('submit'));
        }
      }
    });
  }

  // Limpiar chat
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar la conversación con el Asistente Entel?')) {
        conversationHistory = [];
        // Mantener solo el primer mensaje y los chips
        window.location.reload();
      }
    });
  }

  // Enviar formulario de chat
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();

    if (!message || isSending) return;

    // 1. Mostrar mensaje del usuario en pantalla
    appendUserMessage(message);
    userInput.value = '';
    userInput.style.height = 'auto';

    // 2. Ocultar chips de inicio tras la primera interacción
    if (quickChips) {
      quickChips.style.display = 'none';
    }

    // 3. Activar estado de carga
    setLoadingState(true);

    try {
      // 4. Llamada HTTP a la API REST de Express
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          history: conversationHistory
        })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errorMsg = json.error || 'Ocurrió un error al procesar tu consulta con Entel.';
        appendErrorMessage(errorMsg);
        return;
      }

      const { reply, category, summary, suggestedSteps, requiresHuman } = json.data;

      // 5. Mostrar la respuesta estructurada de la IA
      appendBotMessage({
        reply,
        category,
        summary,
        suggestedSteps,
        requiresHuman
      });

      // 6. Almacenar en el historial local para memoria contextual en turnos siguientes
      conversationHistory.push({ role: 'user', content: message });
      conversationHistory.push({ role: 'model', content: reply });
    } catch (error) {
      console.error('Error al conectar con la API de soporte Entel:', error);
      appendErrorMessage(
        'No pudimos conectar con los servidores de Entel. Por favor verifica tu conexión o intenta nuevamente.'
      );
    } finally {
      setLoadingState(false);
      userInput.focus();
    }
  });

  /**
   * Renderiza un mensaje del usuario en la interfaz
   */
  function appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row message-user';

    row.innerHTML = `
      <div class="avatar-user">Tú</div>
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(text)}</div>
        <div class="message-footer">
          <span class="message-time">${getFormattedTime()}</span>
        </div>
      </div>
    `;

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  /**
   * Renderiza la respuesta del Asistente Entel con formato estructurado
   */
  function appendBotMessage({ reply, category, summary, suggestedSteps, requiresHuman }) {
    const row = document.createElement('div');
    row.className = 'message-row message-bot';

    const categoryLabel = getCategoryLabel(category);
    const categoryClass = `category-${category || 'otro'}`;
    const formattedText = formatMarkdown(reply);

    // Renderizar pasos sugeridos
    let stepsHtml = '';
    if (Array.isArray(suggestedSteps) && suggestedSteps.length > 0) {
      const items = suggestedSteps
        .map(
          (step) => `
            <li class="suggested-step-item">
              <span class="suggested-step-bullet">✓</span>
              <span>${escapeHtml(step)}</span>
            </li>`
        )
        .join('');

      stepsHtml = `
        <div class="suggested-steps-card">
          <div class="suggested-steps-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Pasos recomendados:
          </div>
          <ul class="suggested-steps-list">
            ${items}
          </ul>
        </div>
      `;
    }

    // Renderizar caja de alerta humana si requiresHuman es true
    let humanAlertHtml = '';
    if (requiresHuman) {
      humanAlertHtml = `
        <div class="human-alert-box">
          <div class="human-alert-header">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>Derivación prioritaria a un Asesor Humano Entel</span>
          </div>
          <div class="human-alert-desc">
            Hemos detectado una solicitud que requiere atención personalizada o gestión de cuenta/facturación. Un asesor de Entel Perú puede atenderte de inmediato a través de nuestros canales directos:
          </div>
          <div class="human-alert-actions">
            <a href="https://wa.me/51994860000" target="_blank" rel="noopener noreferrer" class="btn-advisor-action btn-advisor-wa">
              WhatsApp 994 860 000
            </a>
            <a href="tel:123" class="btn-advisor-action btn-advisor-call">
              Llamar al 123 (Gratis)
            </a>
          </div>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="avatar-bot">
        <span class="avatar-text">E</span>
      </div>
      <div class="message-bubble">
        <div class="message-author">Asistente Entel Perú</div>
        <div style="margin-bottom: 8px;">
          <span class="category-badge ${categoryClass}">${escapeHtml(categoryLabel)}</span>
        </div>
        <div class="message-text">${formattedText}</div>
        ${stepsHtml}
        ${humanAlertHtml}
        <div class="message-footer">
          <span class="message-time">${getFormattedTime()}</span>
        </div>
      </div>
    `;

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  /**
   * Renderiza mensaje de error amigable
   */
  function appendErrorMessage(errorMsg) {
    const row = document.createElement('div');
    row.className = 'message-row message-bot';

    row.innerHTML = `
      <div class="avatar-bot" style="background: #e11d48;">
        <span class="avatar-text">!</span>
      </div>
      <div class="message-bubble" style="border-left: 4px solid #e11d48;">
        <div class="message-author" style="color: #e11d48;">Aviso de Servicio Entel</div>
        <div class="message-text" style="color: #9f1239;">
          ${escapeHtml(errorMsg)}
        </div>
        <div class="message-footer">
          <span class="message-time">${getFormattedTime()}</span>
        </div>
      </div>
    `;

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  /**
   * Gestiona el estado de carga y el indicador visual de escritura
   */
  function setLoadingState(loading) {
    isSending = loading;
    sendBtn.disabled = loading;
    userInput.disabled = loading;

    if (loading) {
      typingIndicator.style.display = 'block';
      scrollToBottom();
    } else {
      typingIndicator.style.display = 'none';
    }
  }

  /**
   * Desplaza el scroll hacia el mensaje más reciente
   */
  function scrollToBottom() {
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  /**
   * Retorna hora actual con formato HH:MM
   */
  function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Mapea categorías internas a etiquetas amigables en español
   */
  function getCategoryLabel(cat) {
    const map = {
      recibo_pago: 'Recibos y Facturación',
      saldo_bolsas: 'Saldo y Bolsas (*144#)',
      internet_llamadas: 'Planes e Internet',
      chip_esim: 'eSIM y Chip',
      portabilidad: 'Portabilidad Numérica',
      equipo: 'Equipos y Terminales',
      reclamo: 'Gestión de Reclamo',
      otro: 'Atención al Cliente'
    };
    return map[cat] || 'Soporte Entel';
  }

  /**
   * Convierte sintaxis markdown básica a HTML seguro
   */
  function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Negrita: **texto**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Viñetas: líneas que inician con * o -
    html = html.replace(/^[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Saltos de línea dobles y simples
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Sanitización de cadenas HTML contra XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

