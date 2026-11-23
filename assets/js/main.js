/**
 * DOHA - Landing Page Scripts
 * - Animações de Scroll Reveal bidirecional (aparece ao descer, some ao subir)
 * - Suporte a Carrossel Mobile para Depoimentos e Cards "O que você recebe"
 * - Player de Vídeo dos Shorts do YouTube (Inline e Modal)
 * - Accordion Interativo de Perguntas Frequentes
 * - Máscara Dinâmica de Telefone (Brasil)
 * - Validação e Envio de Formulário com integração ao CRM Base44
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initPhoneMask();
  initFaqAccordion();
  initVideoCards();
  initMobileCarousels();
  initLeadForm();
  initFloatingCta();
});

/* ==========================================================================
   0. SCROLL REVEAL SUAVE E ESTÁVEL (SEM PISCAMENTO / FLICKER)
   Anima suavemente ao rolar a tela para baixo e permanece visível definitivamente.
   ========================================================================== */
function initScrollReveal() {
  const allRevealElements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale'
  );

  if (!allRevealElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Uma vez revelado, desassocia o observador para nunca mais sumir nem piscar ao rolar a página
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  allRevealElements.forEach((el) => {
    // Revela imediatamente apenas se o elemento já estiver na porção superior inicial da tela
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight * 0.7) {
      el.classList.add('visible');
    } else {
      observer.observe(el);
    }
  });
}

/* ==========================================================================
   1. WHATSAPP: MÁSCARA (DDD) 9XXXX-XXXX + VALIDAÇÃO DE CELULAR BRASILEIRO
   ========================================================================== */

// DDDs válidos no Brasil (Anatel)
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

// Extrai somente os dígitos nacionais (DDD + número), removendo +55 ou 0 de discagem
function normalizeWhatsapp(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

// Retorna null se válido, ou a mensagem de erro específica
function getWhatsappError(raw) {
  const digits = normalizeWhatsapp(raw);
  if (!digits) return 'Por favor, informe seu WhatsApp com DDD.';
  if (digits.length === 10) return 'Esse número parece um telefone fixo ou está sem o 9. Informe seu celular com WhatsApp (ex: (11) 98765-4321).';
  if (digits.length < 11) return 'Número incompleto. Informe DDD + 9 dígitos (ex: (11) 98765-4321).';
  if (digits.length > 11) return 'Número com dígitos demais. Informe apenas DDD + 9 dígitos.';
  if (!VALID_DDDS.has(Number(digits.slice(0, 2)))) return 'DDD inválido. Verifique o código de área.';
  if (digits[2] !== '9') return 'Informe um número de celular (WhatsApp). Celulares começam com 9 após o DDD.';
  const local = digits.slice(3); // 8 dígitos após o 9
  if (local[0] === '0') return 'Número de WhatsApp inválido. Verifique os dígitos.';
  if (/^(\d)\1+$/.test(local)) return 'Número de WhatsApp inválido. Verifique os dígitos.';
  return null;
}

function formatWhatsapp(value) {
  const v = value.slice(0, 11);
  if (v.length > 7) return v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  if (v.length > 0) return v.replace(/^(\d{0,2})/, '($1');
  return v;
}

function initPhoneMask() {
  const phoneInput = document.getElementById('lead-phone');
  if (!phoneInput) return;

  // Bloqueia qualquer tecla que não seja número (mantém atalhos e navegação)
  phoneInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;
    if (!/\d/.test(e.key)) e.preventDefault();
  });

  // Ao colar, aceita formatos como +55 11 98765-4321 e mantém só os dígitos
  phoneInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    phoneInput.value = formatWhatsapp(normalizeWhatsapp(pasted));
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatWhatsapp(normalizeWhatsapp(e.target.value));
  });
}

/* ==========================================================================
   2. FAQ ACCORDION INTERATIVO
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-question-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Opcional: fechar outros itens abertos para manter accordion limpo
      faqItems.forEach((other) => {
        if (other !== item) {
          other.classList.remove('active');
          const otherIcon = other.querySelector('.faq-toggle-icon');
          if (otherIcon) otherIcon.textContent = '+';
        }
      });

      if (isActive) {
        item.classList.remove('active');
        const icon = item.querySelector('.faq-toggle-icon');
        if (icon) icon.textContent = '+';
      } else {
        item.classList.add('active');
        const icon = item.querySelector('.faq-toggle-icon');
        if (icon) icon.textContent = '×';
      }
    });
  });
}

/* ==========================================================================
   3. PLAYER DE VÍDEO (YOUTUBE SHORTS)
   Permite rodar o vídeo inline direto no card ou em modal fullscreen
   ========================================================================== */
function initVideoCards() {
  const videoCards = document.querySelectorAll('.video-card');
  const modal = document.getElementById('video-modal');
  const modalIframe = document.getElementById('modal-iframe');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  videoCards.forEach((card) => {
    const videoId = card.getAttribute('data-video-id');
    const iframeContainer = card.querySelector('.video-iframe-container');
    const closeBtn = card.querySelector('.video-close-inline-btn');

    card.addEventListener('click', (e) => {
      // Se clicou no botão de fechar inline, não abre novamente
      if (e.target.closest('.video-close-inline-btn')) return;

      if (!videoId) return;

      // No mobile ou desktop: toca inline dentro do card
      if (iframeContainer) {
        iframeContainer.innerHTML = `
          <button class="video-close-inline-btn" title="Fechar vídeo">&times;</button>
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1" 
            title="Depoimento de Cliente Doha"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `;
        iframeContainer.style.display = 'block';

        const newCloseBtn = iframeContainer.querySelector('.video-close-inline-btn');
        if (newCloseBtn) {
          newCloseBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            iframeContainer.innerHTML = '';
            iframeContainer.style.display = 'none';
          });
        }
      }
    });
  });

  // Fecha modal se existir
  if (modal && modalCloseBtn && modalIframe) {
    modalCloseBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      modalIframe.src = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        modalIframe.src = '';
      }
    });
  }
}

/* ==========================================================================
   4. CARROSSEL MOBILE PARA DEPOIMENTOS E CARDS "O QUE VOCÊ RECEBE"
   ========================================================================== */
function initMobileCarousels() {
  setupCarousel('features-track', 'features-dots');
}

function setupCarousel(trackId, dotsContainerId) {
  const track = document.getElementById(trackId);
  const dotsContainer = document.getElementById(dotsContainerId);

  if (!track) return;

  const cards = Array.from(track.children);
  const count = cards.length;

  // Cria os dots indicadores dinamicamente se houver container
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Ir para slide ${i + 1}`);
      dot.addEventListener('click', () => {
        cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      dotsContainer.appendChild(dot);
    }
  }

  const dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel-dot') : [];

  // Atualiza os dots conforme o usuário arrasta para o lado
  let scrollTimeout;
  track.addEventListener('scroll', () => {
    if (!dots.length) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(trackCenter - cardCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === closestIndex);
      });
    }, 40);
  }, { passive: true });

  // Suporte a arrasto fluido com mouse (drag-to-scroll)
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasMoved = false;

  track.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    track.classList.add('is-dragging');
    startX = e.pageX - track.offsetLeft;
    scrollStart = track.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.25;
    if (Math.abs(walk) > 4) hasMoved = true;
    track.scrollLeft = scrollStart - walk;
  });

  // Previne cliques fantasmas nos cards se o usuário estava arrastando
  track.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* ==========================================================================
   5. META PIXEL & CONVERSIONS API (CAPI) - RASTREAMENTO DE LEAD E COMPRA
   Pixel ID: 1884126679265806
   ========================================================================== */
const META_PIXEL_ID = '1884126679265806';
const META_CAPI_TOKEN = 'EAAcdYJ7rc3ABTMiUp5pGDDFxrSxa1KlvcjgFaTOdZCaZBOn8LwM4XJWsA8vAL35qm2axcEcqqti5sV6naV6zNcgcOhpiBqOSeYvPIKcTAfbTuKyys45ZCNOA0PnceIJJhKISEgCENSAPGv2k7UzKBZAvE3IzwvN0MWfSqEDnbVaabiUxdHvuRTOO72W2vwZDZD';

async function sha256(message) {
  if (!message) return '';
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function trackMetaLead({ eventId, name, email, phone }) {
  // 1. Disparo do Pixel no Navegador (Client-side) - Lead e Purchase (Comprar)
  if (typeof fbq === 'function') {
    fbq('track', 'Lead', {
      content_name: 'Formulário Doha - Quero Vender Mais',
      currency: 'BRL',
      value: 0
    }, { eventID: eventId });

    fbq('track', 'Purchase', {
      content_name: 'Formulário Doha - Quero Vender Mais',
      currency: 'BRL',
      value: 0
    }, { eventID: 'purchase_' + eventId });

    console.log('Meta Pixel: eventos Lead e Purchase disparados no navegador com eventID:', eventId);
  }

  // 2. Disparo via Meta Conversions API (CAPI) para redundância e 100% de captura
  try {
    const cleanEmail = email.trim().toLowerCase();
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    const firstName = name.trim().split(' ')[0].toLowerCase();

    const [hashedEmail, hashedPhone, hashedName] = await Promise.all([
      sha256(cleanEmail),
      sha256(cleanPhone),
      sha256(firstName)
    ]);

    const capiPayload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: window.location.href,
          user_data: {
            em: hashedEmail ? [hashedEmail] : [],
            ph: hashedPhone ? [hashedPhone] : [],
            fn: hashedName ? [hashedName] : []
          },
          custom_data: {
            currency: 'BRL',
            value: 0,
            content_name: 'Formulário Doha - Quero Vender Mais'
          }
        },
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: 'purchase_' + eventId,
          action_source: 'website',
          event_source_url: window.location.href,
          user_data: {
            em: hashedEmail ? [hashedEmail] : [],
            ph: hashedPhone ? [hashedPhone] : [],
            fn: hashedName ? [hashedName] : []
          },
          custom_data: {
            currency: 'BRL',
            value: 0,
            content_name: 'Formulário Doha - Quero Vender Mais'
          }
        }
      ]
    };

    fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(capiPayload)
    }).then(res => res.json()).then(data => {
      console.log('Meta Conversions API (CAPI) Lead & Purchase registrados:', data);
    }).catch(err => {
      console.warn('Meta CAPI aviso:', err);
    });

  } catch (err) {
    console.warn('Erro ao processar CAPI:', err);
  }
}

/* ==========================================================================
   6. INTEGRAÇÃO COM O CRM BASE44 E ENVIO DO FORMULÁRIO DE LEADS
   Endpoint: https://hub-doha.base44.app/api/entities/Lead
   Token: b44u_58b68b028580651b7edacf2f265d36fc54f78111544678e59ab8f14d13f252e1
   ========================================================================== */
function initLeadForm() {
  const form = document.getElementById('lead-form');
  const formHeader = document.getElementById('form-header');
  const formSuccessContainer = document.getElementById('form-success-container');
  const leadCard = document.getElementById('lead-form-card');
  const feedback = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('btn-submit');

  const nameInput = document.getElementById('lead-name');
  const emailInput = document.getElementById('lead-email');
  const phoneInput = document.getElementById('lead-phone');
  const phoneWrapper = phoneInput?.closest('.phone-input-wrapper');
  const companyInput = document.getElementById('lead-company');
  const segmentSelect = document.getElementById('lead-segment');
  const revenueSelect = document.getElementById('lead-revenue');

  if (!form) return;

  // Limpa o estado de erro visual conforme o usuário interage com o campo
  const clearError = (inputEl, wrapperEl) => {
    if (inputEl) inputEl.classList.remove('has-error');
    if (wrapperEl) wrapperEl.classList.remove('has-error');
    if (feedback && !form.querySelectorAll('.has-error').length) {
      feedback.style.display = 'none';
      feedback.className = 'form-feedback';
      feedback.textContent = '';
    }
  };

  [nameInput, emailInput, companyInput].forEach(el => {
    if (el) el.addEventListener('input', () => clearError(el));
  });
  if (phoneInput) {
    phoneInput.addEventListener('input', () => clearError(phoneInput, phoneWrapper));
  }
  [segmentSelect, revenueSelect].forEach(el => {
    if (el) el.addEventListener('change', () => clearError(el));
  });

  function showSuccessScreen() {
    if (form) form.style.display = 'none';
    if (formHeader) formHeader.style.display = 'none';
    if (formSuccessContainer) {
      formSuccessContainer.style.display = 'block';
    }
    if (leadCard) {
      leadCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  const CRM_ENDPOINT = 'https://hub-doha.base44.app/api/entities/Lead';
  const CRM_TOKEN = 'b44u_58b68b028580651b7edacf2f265d36fc54f78111544678e59ab8f14d13f252e1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpa erros anteriores
    [nameInput, emailInput, companyInput, segmentSelect, revenueSelect].forEach(el => el?.classList.remove('has-error'));
    if (phoneWrapper) phoneWrapper.classList.remove('has-error');
    if (phoneInput) phoneInput.classList.remove('has-error');
    if (feedback) {
      feedback.style.display = 'none';
      feedback.className = 'form-feedback';
      feedback.textContent = '';
    }

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim().toLowerCase() || '';
    const phoneError = getWhatsappError(phoneInput?.value || '');
    // Envia somente dígitos (DDD + número), ex: 11987654321
    const phone = normalizeWhatsapp(phoneInput?.value || '');
    const company = companyInput?.value.trim() || '';
    const segment = segmentSelect?.value || '';
    const revenue = revenueSelect?.value || '';

    const errors = [];
    let firstInvalid = null;

    // 1. Validação do Nome
    if (!name || name.length < 2) {
      errors.push('Nome');
      nameInput?.classList.add('has-error');
      if (!firstInvalid) firstInvalid = nameInput;
    }

    // 2. Validação do E-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('E-mail');
      emailInput?.classList.add('has-error');
      if (!firstInvalid) firstInvalid = emailInput;
    }

    // 3. Validação do WhatsApp (celular brasileiro: DDD válido + 9 + 8 dígitos)
    if (phoneError) {
      errors.push('WhatsApp');
      if (phoneWrapper) phoneWrapper.classList.add('has-error');
      if (phoneInput) phoneInput.classList.add('has-error');
      if (!firstInvalid) firstInvalid = phoneInput;
    }

    // 4. Validação da Empresa
    if (!company || company.length < 2) {
      errors.push('Empresa');
      companyInput?.classList.add('has-error');
      if (!firstInvalid) firstInvalid = companyInput;
    }

    // 5. Validação do Segmento
    if (!segment) {
      errors.push('Segmento');
      segmentSelect?.classList.add('has-error');
      if (!firstInvalid) firstInvalid = segmentSelect;
    }

    // 6. Validação do Faturamento
    if (!revenue) {
      errors.push('Faturamento');
      revenueSelect?.classList.add('has-error');
      if (!firstInvalid) firstInvalid = revenueSelect;
    }

    // Se houver algum campo inválido, bloqueia o envio
    if (errors.length > 0) {
      if (feedback) {
        feedback.className = 'form-feedback is-error';
        feedback.style.display = 'block';

        if (errors.length === 1) {
          if (errors[0] === 'E-mail') {
            feedback.textContent = 'Por favor, informe um e-mail válido (ex: seu@email.com).';
          } else if (errors[0] === 'WhatsApp') {
            feedback.textContent = phoneError;
          } else if (errors[0] === 'Segmento') {
            feedback.textContent = 'Por favor, selecione o segmento do seu restaurante.';
          } else if (errors[0] === 'Faturamento') {
            feedback.textContent = 'Por favor, selecione a faixa de faturamento atual.';
          } else {
            feedback.textContent = `Por favor, preencha o campo ${errors[0]}.`;
          }
        } else if (errors.includes('WhatsApp') && phoneError) {
          feedback.textContent = `Por favor, preencha todos os campos obrigatórios. ${phoneError}`;
        } else {
          feedback.textContent = 'Por favor, preencha todos os campos obrigatórios para continuar.';
        }
      }

      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    // Gerador de ID único de evento para deduplicação Pixel + CAPI
    const eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    // Dispara o evento de Lead no Meta Pixel e CAPI imediatamente
    trackMetaLead({ eventId, name, email, phone });

    // Captura parâmetros de UTM se existirem na URL da página
    const urlParams = new URLSearchParams(window.location.search);
    const campaign = urlParams.get('utm_campaign') || urlParams.get('campaign') || 'Landing Page';
    const ad = urlParams.get('utm_content') || urlParams.get('utm_term') || urlParams.get('ad') || 'Garantia 3x';

    // Monta a string de interactions: Meta Ads | {{campanha}} | {{anúncio}}
    let interactionsStr = `Meta Ads | ${campaign} | ${ad}`;
    if (segment || revenue) {
      const extraInfo = [];
      if (segment) extraInfo.push(`Segmento: ${segment}`);
      if (revenue) extraInfo.push(`Faturamento: ${revenue}`);
      interactionsStr += ` | ${extraInfo.join(' - ')}`;
    }

    // Payload completo enviado para o endpoint /api/lead (CRM + Telegram + CAPI)
    const leadPayload = {
      name,
      phone,
      email,
      company,
      segment,
      revenue,
      campaign,
      ad,
      eventId,
      sourceUrl: window.location.href
    };

    // Payload de fallback caso chamado direto no CRM
    const directCrmPayload = {
      name: name,
      phone: phone,
      email: email,
      company: company,
      origin: "Meta Ads",
      status: "lead",
      estimated_value: 0,
      has_capture: false,
      is_local: false,
      interactions: interactionsStr
    };

    // Feedback visual de carregamento
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando...';
    }
    if (feedback) {
      feedback.style.display = 'none';
    }

    try {
      // 1. Envia prioritariamente para a API do servidor (que notifica no Telegram e salva no CRM)
      let apiDelivered = false;
      let telegramDelivered = false;
      try {
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload)
        });

        if (response.ok) {
          const resData = await response.json();
          console.log('Lead processado via /api/lead (Telegram + CRM):', resData);
          apiDelivered = true;
          if (resData.telegramSent === true) {
            telegramDelivered = true;
          }
        } else {
          console.warn('/api/lead retornou status:', response.status);
        }
      } catch (errApi) {
        console.warn('Falha ao conectar em /api/lead (possível ambiente estático local):', errApi);
      }

      // 2. Se o Telegram não foi confirmado pela API do servidor, dispara fallback direto do navegador
      if (!telegramDelivered) {
        try {
          const rawPhone = phone || '';
          const formattedPhone = rawPhone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3') || rawPhone;
          const segName = {
            hamburgueria: 'Hamburgueria',
            pizzaria: 'Pizzaria',
            japones: 'Comida Japonesa',
            bar: 'Bar / Pub / Boteco',
            churrascaria: 'Churrascaria',
            delivery: 'Marmitaria / Delivery',
            cafeteria: 'Cafeteria / Doceria',
            alacarte: 'Restaurante À la carte',
            outro: 'Outro segmento'
          }[segment] || segment || 'Não informado';

          const revName = {
            'ate-30k': 'Até R$ 30.000 / mês',
            '30k-60k': 'R$ 30.000 a R$ 60.000 / mês',
            '60k-100k': 'R$ 60.000 a R$ 100.000 / mês',
            '100k-200k': 'R$ 100.000 a R$ 200.000 / mês',
            'acima-200k': 'Acima de R$ 200.000 / mês'
          }[revenue] || revenue || 'Não informado';

          const directMsg = [
            '🟢 NOVO LEAD | DOHA',
            '',
            `👤 Nome: ${name}`,
            `✉️ E-mail: ${email}`,
            `📱 Telefone / WhatsApp: ${formattedPhone}`,
            `🏢 Empresa: ${company || 'Não informada'}`,
            `🍽️ Segmento: ${segName}`,
            `💰 Faturamento atual: ${revName}`,
            '',
            '📋 Formulário: Garantia 3x — Restaurantes',
            `🌐 URL: ${window.location.href}`,
            `🎯 Campanha: ${campaign}`,
            `📢 Anúncio: ${ad}`,
            `⏰ Recebido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' })} (Recife)`,
            `🆔 ID: ${eventId}`
          ].join('\n');

          await fetch('https://api.telegram.org/bot9242814129:AAF55Sb7zfStA8a-z5K8dvr_GekPiaQWob4/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: -1003666824389,
              text: directMsg,
              link_preview_options: { is_disabled: true }
            })
          }).then(r => r.json()).then(d => {
            if (d.ok) console.log('Telegram notificação entregue via fallback direto!');
          }).catch(e => console.warn('Telegram fallback erro:', e));
        } catch (_) {}
      }

      // 3. Se a rota de servidor não respondeu, faz fallback direto ao CRM do navegador
      if (!apiDelivered) {
        await fetch(CRM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRM_TOKEN}`
          },
          body: JSON.stringify(directCrmPayload)
        }).catch(e => console.error('Fallback CRM erro:', e));
      }

      // Exibe a tela de confirmação do WhatsApp e depoimento em vídeo
      showSuccessScreen();
      form.reset();

    } catch (error) {
      console.error('Falha no processo de envio:', error);
      // Exibe a tela de confirmação com WhatsApp e depoimento para não perder o usuário
      showSuccessScreen();
    }
  });
}

/* ==========================================================================
   7. BOTÃO FLUTUANTE DE CTA ("QUERO VENDER MAIS")
   Aparece no canto inferior direito quando o formulário sai da visualização
   ========================================================================== */
function initFloatingCta() {
  const floatingBtn = document.getElementById('floating-cta-btn');
  const heroForm = document.getElementById('lead-form-card');
  const nameInput = document.getElementById('lead-name');

  if (!floatingBtn || !heroForm) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Quando o formulário do Hero não está mais visível na viewport
      if (!entry.isIntersecting) {
        floatingBtn.classList.add('is-visible');
      } else {
        floatingBtn.classList.remove('is-visible');
      }
    });
  }, {
    threshold: 0.1
  });

  observer.observe(heroForm);

  floatingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (nameInput) {
        nameInput.focus();
      }
    }, 600);
  });
}


