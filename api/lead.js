const { createHash } = require('node:crypto');

const CRM_APP_ID = '6a62ea99b68ae780fd9d0e56';
const DEFAULT_CRM_ENDPOINT = `https://hub-doha.base44.app/api/entities/Lead`;
const DEFAULT_CRM_TOKEN = 'b44u_58b68b028580651b7edacf2f265d36fc54f78111544678e59ab8f14d13f252e1';
const DEFAULT_TELEGRAM_BOT_TOKEN = '9242814129:AAF55Sb7zfStA8a-z5K8dvr_GekPiaQWob4';
const DEFAULT_TELEGRAM_CHAT_ID = '-1003666824389';

function normalizeChatId(id) {
  if (!id) return '';
  const str = String(id).trim();
  // Se for o ID antigo antes da migração para supergrupo, atualiza para o supergrupo oficial
  if (str === '-5420392508' || str === '5420392508') {
    return DEFAULT_TELEGRAM_CHAT_ID;
  }
  // Se for ID de 13 dígitos começando com 100 sem o sinal '-', adiciona '-' exigido pela API do Telegram para supergrupos/canais
  if (/^100\d{8,12}$/.test(str)) {
    return `-${str}`;
  }
  return str;
}

const json = (status, body) => ({ status, body });
const text = (value) => typeof value === 'string' ? value.trim() : '';

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

// Mantém só DDD + número, removendo +55 ou 0 de discagem
function normalizeWhatsapp(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

// Celular brasileiro (WhatsApp): DDD válido + 9 + 8 dígitos, sem números repetidos
function isValidWhatsapp(digits) {
  if (!/^\d{11}$/.test(digits)) return false;
  if (!VALID_DDDS.has(Number(digits.slice(0, 2)))) return false;
  if (digits[2] !== '9') return false;
  const local = digits.slice(3);
  if (local[0] === '0') return false;
  if (/^(\d)\1+$/.test(local)) return false;
  return true;
}
const hash = (value) => createHash('sha256').update(value).digest('hex');

const SEGMENTS = {
  hamburgueria: 'Hamburgueria',
  pizzaria: 'Pizzaria',
  japones: 'Comida Japonesa',
  bar: 'Bar / Pub / Boteco',
  churrascaria: 'Churrascaria',
  delivery: 'Marmitaria / Delivery',
  cafeteria: 'Cafeteria / Doceria',
  alacarte: 'Restaurante À la carte',
  outro: 'Outro segmento'
};

const REVENUES = {
  'ate-30k': 'Até R$ 30.000 / mês',
  '30k-60k': 'R$ 30.000 a R$ 60.000 / mês',
  '60k-100k': 'R$ 60.000 a R$ 100.000 / mês',
  '100k-200k': 'R$ 100.000 a R$ 200.000 / mês',
  'acima-200k': 'Acima de R$ 200.000 / mês'
};

const oneLine = (value, max = 200) => text(value).replace(/[\r\n\t]+/g, ' ').slice(0, max);

function formUrl(value, host) {
  try {
    const url = new URL(text(value));
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/token|password|secret|authorization|api.?key/i.test(key)) url.searchParams.delete(key);
    }
    return url.href.slice(0, 1200);
  } catch {
    return '';
  }
}

function telegramMessage(lead, sourceUrl, campaign, ad, leadId) {
  const rawPhone = lead.phone || '';
  const formattedPhone = rawPhone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3') || rawPhone;
  
  return [
    '🟢 NOVO LEAD | DOHA',
    '',
    `👤 Nome: ${oneLine(lead.name, 120)}`,
    `✉️ E-mail: ${oneLine(lead.email, 254)}`,
    `📱 Telefone / WhatsApp: ${formattedPhone}`,
    `🏢 Empresa: ${oneLine(lead.company, 160) || 'Não informada'}`,
    `🍽️ Segmento: ${SEGMENTS[lead.segment] || oneLine(lead.segment, 80) || 'Não informado'}`,
    `💰 Faturamento atual: ${REVENUES[lead.revenue] || oneLine(lead.revenue, 80) || 'Não informado'}`,
    '',
    '📋 Formulário: Garantia 3x — Restaurantes',
    `🌐 URL: ${sourceUrl || 'Não informada'}`,
    `🎯 Campanha: ${oneLine(campaign)}`,
    `📢 Anúncio: ${oneLine(ad)}`,
    `⏰ Recebido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' })} (Recife)`,
    `🆔 ID: ${oneLine(leadId, 100)}`
  ].join('\n');
}

async function sendTelegram(message, env, fetcher = fetch) {
  let botToken = env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN;
  let rawChatId = env.TELEGRAM_CHAT_ID;
  if (!rawChatId || rawChatId === '-5420392508' || rawChatId === '5420392508') {
    rawChatId = DEFAULT_TELEGRAM_CHAT_ID;
  }

  let chatId = normalizeChatId(rawChatId);

  async function postMessage(token, chat) {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: message,
        link_preview_options: { is_disabled: true }
      })
    });
    const data = await res.json().catch(() => null) || {};
    return { ok: res.ok && data.ok === true, data };
  }

  try {
    // 1. Tenta envio com credenciais
    let res = await postMessage(botToken, chatId);

    // Se o grupo foi atualizado para supergrupo (erro 400 migrate_to_chat_id)
    if (!res.ok && res.data?.parameters?.migrate_to_chat_id) {
      chatId = String(res.data.parameters.migrate_to_chat_id);
      res = await postMessage(botToken, chatId);
    }

    // Se falhar e as credenciais do ambiente forem diferentes dos defaults testados, tenta com os defaults
    if (!res.ok && (botToken !== DEFAULT_TELEGRAM_BOT_TOKEN || chatId !== DEFAULT_TELEGRAM_CHAT_ID)) {
      console.warn('Telegram: variáveis de ambiente falharam, tentando tokens padrão verificados...');
      res = await postMessage(DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID);
    }

    // Se ainda falhar, tenta inverter o prefixo '-'
    if (!res.ok) {
      const altChat = chatId.startsWith('-') ? chatId.replace(/^-/, '') : `-${chatId}`;
      res = await postMessage(DEFAULT_TELEGRAM_BOT_TOKEN, altChat);
    }

    if (res.ok) {
      console.log('Telegram: notificação entregue com sucesso!');
      return true;
    }

    console.error('Telegram erro final:', res.data);
    return false;
  } catch (err) {
    console.error('Telegram falha de conexão:', err);
    try {
      const emergency = await postMessage(DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID);
      return emergency.ok;
    } catch {
      return false;
    }
  }
}

async function processLead({ method, headers = {}, body }, env = process.env, fetcher = fetch) {
  if (method === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (method !== 'POST') {
    return json(405, { ok: false, message: 'Método não permitido.' });
  }

  try {
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
  } catch {
    return json(400, { ok: false, message: 'Dados inválidos.' });
  }

  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const phone = normalizeWhatsapp(body.phone);
  const company = text(body.company);
  const segment = text(body.segment);
  const revenue = text(body.revenue);

  if (!name || name.length < 2) {
    return json(400, { ok: false, message: 'Por favor, informe seu nome.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return json(400, { ok: false, message: 'Por favor, informe um e-mail válido.' });
  }

  if (!isValidWhatsapp(phone)) {
    return json(400, { ok: false, message: 'Por favor, informe um número de WhatsApp válido com DDD.' });
  }

  if (!company || company.length < 2) {
    return json(400, { ok: false, message: 'Por favor, informe o nome da empresa.' });
  }

  if (!segment) {
    return json(400, { ok: false, message: 'Por favor, selecione o segmento.' });
  }

  if (!revenue) {
    return json(400, { ok: false, message: 'Por favor, selecione o faturamento atual.' });
  }

  const sourceUrl = formUrl(body.sourceUrl, headers.host);
  const campaign = text(body.campaign).slice(0, 200) || 'Landing Page';
  const ad = text(body.ad).slice(0, 200) || 'Garantia 3x';

  const extra = [
    segment && `Segmento: ${SEGMENTS[segment] || segment}`,
    revenue && `Faturamento: ${REVENUES[revenue] || revenue}`
  ].filter(Boolean);

  const crmToken = env.CRM_TOKEN || DEFAULT_CRM_TOKEN;
  const crmEndpoint = env.CRM_ENDPOINT || DEFAULT_CRM_ENDPOINT;

  const payload = {
    name,
    phone,
    email,
    company,
    origin: 'Meta Ads',
    status: 'lead',
    estimated_value: 0,
    has_capture: false,
    is_local: false,
    interactions: `Meta Ads | ${campaign} | ${ad}${extra.length ? ' | ' + extra.join(' - ') : ''}${sourceUrl ? ' | Formulário: ' + sourceUrl : ''}`
  };

  let leadId = 'cadastrado_' + Date.now();

  // 1. Envia para o CRM Base44
  try {
    const crmRes = await fetcher(crmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${crmToken}`,
        'X-App-Id': CRM_APP_ID
      },
      body: JSON.stringify(payload)
    });
    if (crmRes.ok) {
      const crmData = await crmRes.json().catch(() => null);
      if (crmData?.id) leadId = crmData.id;
      console.log('CRM Base44 salvo com sucesso:', leadId);
    } else {
      console.error('CRM Base44 retornou erro:', crmRes.status);
    }
  } catch (crmErr) {
    console.error('CRM falha de conexão:', crmErr);
  }

  // 2. Dispara notificação no TELEGRAM imediatamente
  const message = telegramMessage(
    { name, email, phone, company, segment, revenue },
    sourceUrl,
    campaign,
    ad,
    leadId
  );
  const telegramSuccess = await sendTelegram(message, env, fetcher);

  // 3. Meta Conversions API (CAPI) se configurado
  const eventId = text(body.eventId) || ('lead_' + Date.now());
  const metaToken = env.META_CAPI_TOKEN || 'EAAcdYJ7rc3ABTMiUp5pGDDFxrSxa1KlvcjgFaTOdZCaZBOn8LwM4XJWsA8vAL35qm2axcEcqqti5sV6naV6zNcgcOhpiBqOSeYvPIKcTAfbTuKyys45ZCNOA0PnceIJJhKISEgCENSAPGv2k7UzKBZAvE3IzwvN0MWfSqEDnbVaabiUxdHvuRTOO72W2vwZDZD';
  const metaPixelId = env.META_PIXEL_ID || '1884126679265806';

  try {
    let cleanPhone = phone;
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    const fn = name.split(/\s+/)[0].toLowerCase();

    await fetcher(`https://graph.facebook.com/v19.0/${metaPixelId}/events?access_token=${metaToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: 'website',
            event_source_url: sourceUrl || undefined,
            user_data: {
              em: [hash(email)],
              ph: [hash(cleanPhone)],
              fn: [hash(fn)]
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
            event_source_url: sourceUrl || undefined,
            user_data: {
              em: [hash(email)],
              ph: [hash(cleanPhone)],
              fn: [hash(fn)]
            },
            custom_data: {
              currency: 'BRL',
              value: 0,
              content_name: 'Formulário Doha - Quero Vender Mais'
            }
          }
        ]
      })
    }).catch(() => null);
  } catch (_) {}

  return json(200, {
    ok: true,
    leadId,
    telegramSent: telegramSuccess
  });
}

async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const result = await processLead(req);
  return res.status(result.status).json(result.body);
}

module.exports = handler;
module.exports.processLead = processLead;

