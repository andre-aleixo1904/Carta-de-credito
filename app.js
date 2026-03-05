/**
 * Seleção de Carta de Crédito - Protótipo Navegável
 *
 * "Adicionar forma de pagamento" com tipos dinâmicos (Cartão, PIX, etc.)
 * Habilita assim que qualquer carta é selecionada. Só 1 tipo de cada vez.
 */

// ============================================================
// STATE
// ============================================================

const TOTAL_RESERVA = 11000;

const PAYMENT_TYPES = [
  {
    id: 'credit-card',
    label: 'Cartão de Crédito',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 10h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="14" width="6" height="2" rx="1" fill="currentColor"/></svg>',
  },
  {
    id: 'pix',
    label: 'PIX',
    icon: '<svg width="20" height="20" viewBox="0 0 512 512" fill="#32BCAD"><path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.2H112.6C132.6 391.2 151.5 383.4 165.7 369.2L242.4 292.5zM262.5 218.9C256.1 224.4 247.9 224.5 242.4 218.9L165.7 142.2C151.5 127.1 132.6 120.2 112.6 120.2H103.3L200.7 22.76C231.1-7.586 280.3-7.586 310.6 22.76L407.8 119.9H392.6C372.6 119.9 353.7 127.7 339.5 141.9L262.5 218.9zM112.6 142.7C126.4 142.7 139.1 148.3 149.7 158.1L226.4 234.8C233.6 241.1 243 245.6 252.5 245.6C261.9 245.6 271.3 241.1 278.5 234.8L355.5 157.8C365.3 148.1 378.8 142.5 392.6 142.5H430.3L488.6 200.8C518.9 231.1 518.9 280.3 488.6 310.6L430.3 368.9H392.6C378.8 368.9 365.3 363.3 355.5 353.5L278.5 276.5C264.6 262.6 240.3 262.6 226.4 276.6L149.7 353.2C139.1 363 126.4 368.6 112.6 368.6H80.78L22.76 310.6C-7.586 280.3-7.586 231.1 22.76 200.8L80.78 142.7H112.6z"/></svg>',
  },
];

const state = {
  currentScenario: 1,
  cartas: [],
  additionalPayment: {
    enabled: false,
    selected: false,
    selectedType: null,
    filled: false,
    valorPagar: 0,
  },
};

// ============================================================
// SCENARIO CONFIGS
// ============================================================

const scenarioConfigs = [
  { id: 0, name: 'Nenhuma selecionada', description: '1 carta cobre tudo sozinha',
    cartas: [{ id: '442', creditoDisponivel: 20000 }, { id: '469', creditoDisponivel: 8000 }] },
  { id: 1, name: '1 carta crédito total', description: '1 carta cobre o valor total da reserva',
    cartas: [{ id: '442', creditoDisponivel: 20000 }, { id: '469', creditoDisponivel: 8000 }] },
  { id: 2, name: '2 cartas crédito total', description: '2 cartas juntas cobrem o total',
    cartas: [{ id: '442', creditoDisponivel: 5000 }, { id: '469', creditoDisponivel: 6000 }] },
  { id: 3, name: '1 carta sem crédito total', description: '1 carta não cobre, precisa de mais',
    cartas: [{ id: '442', creditoDisponivel: 5000 }, { id: '469', creditoDisponivel: 3000 }] },
  { id: 4, name: '2 cartas sem crédito total', description: '2 cartas não cobrem, pagamento adicional habilita',
    cartas: [{ id: '442', creditoDisponivel: 5000 }, { id: '469', creditoDisponivel: 3000 }] },
];

// ============================================================
// FORMAT HELPERS
// ============================================================

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// CORE LOGIC
// ============================================================

function resetToScenario(index) {
  state.currentScenario = index;
  const config = scenarioConfigs[index];

  state.cartas = config.cartas.map(c => ({
    id: c.id, creditoDisponivel: c.creditoDisponivel,
    selected: false, disabled: false, utilizar: 0,
  }));

  state.additionalPayment = { enabled: false, selected: false, selectedType: null, filled: false, valorPagar: 0 };
  clearCCFields();

  render();
  updateNavButtons(index);
  updateScenarioInfo(config);
}

function recalculate() {
  let used = 0;
  state.cartas.forEach(c => {
    if (c.selected) {
      const remaining = TOTAL_RESERVA - used;
      c.utilizar = Math.min(c.creditoDisponivel, Math.max(0, remaining));
      used += c.utilizar;
    } else {
      c.utilizar = 0;
    }
  });

  // Auto-deselect cartas with utilizar = 0
  state.cartas.forEach(c => {
    if (c.selected && c.utilizar <= 0) {
      c.selected = false;
      c.utilizar = 0;
    }
  });

  used = state.cartas.reduce((sum, c) => sum + (c.selected ? c.utilizar : 0), 0);
  const remaining = TOTAL_RESERVA - used;
  const fullyCovered = remaining <= 0;
  const anySelected = state.cartas.some(c => c.selected);

  state.cartas.forEach(c => {
    if (!c.selected) c.disabled = fullyCovered;
  });

  if (fullyCovered) {
    state.additionalPayment.enabled = false;
    state.additionalPayment.selected = false;
    state.additionalPayment.selectedType = null;
    state.additionalPayment.filled = false;
    state.additionalPayment.valorPagar = 0;
    clearCCFields();
  } else if (anySelected) {
    state.additionalPayment.enabled = true;
    state.additionalPayment.valorPagar = remaining;
  } else {
    state.additionalPayment.enabled = false;
    state.additionalPayment.selected = false;
    state.additionalPayment.selectedType = null;
    state.additionalPayment.filled = false;
    state.additionalPayment.valorPagar = 0;
  }

  render();
}

function calculateFeedback() {
  const totalUsed = state.cartas.reduce((sum, c) => sum + (c.selected ? c.utilizar : 0), 0);
  const anySelected = state.cartas.some(c => c.selected);
  if (!anySelected) return null;

  const remaining = TOTAL_RESERVA - totalUsed;

  if (remaining <= 0) {
    return { type: 'success', title: 'Pagamento totalmente coberto com cartas de crédito.', subtitle: 'Você pode finalizar sua reserva.' };
  }

  const ap = state.additionalPayment;
  if (ap.selected && ap.filled) {
    const typeName = ap.selectedType === 'pix' ? 'Pix' : 'cartão de crédito';
    return { type: 'success', title: `Pagamento totalmente coberto com cartas de crédito e ${typeName}.`, subtitle: 'Você pode finalizar sua reserva.' };
  }
  if (ap.selected && ap.selectedType === 'credit-card' && !ap.filled) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Preencha todos os dados do cartão de crédito.' };
  }
  if (ap.selected && ap.selectedType && !ap.filled) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Complete os dados da forma de pagamento selecionada.' };
  }
  if (ap.selected && !ap.selectedType) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Selecione uma forma de pagamento adicional.' };
  }
  if (ap.enabled) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Você pode adicionar outra forma de pagamento.' };
  }
  return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Você pode adicionar mais cartas ou outra forma de pagamento.' };
}

// ============================================================
// INTERACTIONS
// ============================================================

function toggleCarta(id) {
  const carta = state.cartas.find(c => c.id === id);
  if (!carta) return;
  if (carta.disabled && !carta.selected) return;

  carta.selected = !carta.selected;

  if (carta.selected) {
    const otherUsed = state.cartas.filter(c => c.id !== id && c.selected).reduce((sum, c) => sum + c.utilizar, 0);
    const remaining = TOTAL_RESERVA - otherUsed;
    carta.utilizar = Math.min(carta.creditoDisponivel, Math.max(0, remaining));
  } else {
    carta.utilizar = 0;
    const anyStillSelected = state.cartas.some(c => c.id !== id && c.selected);
    if (!anyStillSelected) {
      state.additionalPayment.selected = false;
      state.additionalPayment.selectedType = null;
      state.additionalPayment.filled = false;
      clearCCFields();
    }
  }

  recalculate();
}

function toggleV3Payment() {
  const ap = state.additionalPayment;
  if (!ap.enabled && !ap.selected) return;
  ap.selected = !ap.selected;
  if (!ap.selected) {
    ap.selectedType = null;
    ap.filled = false;
    clearCCFields();
  }
  render();
}

function selectPaymentType(typeId) {
  const ap = state.additionalPayment;
  if (!ap.selected) return;

  if (ap.selectedType === typeId) {
    ap.selectedType = null;
    ap.filled = false;
    clearCCFields();
  } else {
    ap.selectedType = typeId;
    clearCCFields();
    ap.filled = (typeId === 'pix');
  }
  render();
}

// ============================================================
// CREDIT CARD FORM HELPERS
// ============================================================

function areCCFieldsFilled() {
  const titular = document.getElementById('v3TitularInput');
  const numero = document.getElementById('v3NumeroInput');
  const mes = document.getElementById('v3MesInput');
  const ano = document.getElementById('v3AnoInput');
  const cvv = document.getElementById('v3CvvInput');
  return titular.value.trim() !== '' &&
         numero.value.replace(/\s/g, '').length >= 13 &&
         mes.value !== '' &&
         ano.value !== '' &&
         cvv.value.trim().length >= 3;
}

function clearCCFields() {
  ['v3TitularInput', 'v3NumeroInput', 'v3CvvInput'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['v3MesInput', 'v3AnoInput'].forEach(id => {
    const el = document.getElementById(id);
    el.selectedIndex = 0;
    el.classList.remove('has-value');
  });
  const badge = document.getElementById('v3NumeroBadge');
  if (badge) badge.style.display = 'none';
}

function updateSelectState(selectEl) {
  if (selectEl.value) {
    selectEl.classList.add('has-value');
  } else {
    selectEl.classList.remove('has-value');
  }
}

function updateCardBadge(inputEl, badgeId) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  const digits = inputEl.value.replace(/\D/g, '');
  badge.style.display = digits.length >= 4 ? 'flex' : 'none';
}

function formatCardNumber(input) {
  let value = input.value.replace(/\D/g, '');
  value = value.substring(0, 16);
  value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
  input.value = value;
}

function formatCVV(input) {
  input.value = input.value.replace(/\D/g, '');
}

function formatTitular(input) {
  input.value = input.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
}

function onCCFieldInput() {
  updateCardBadge(document.getElementById('v3NumeroInput'), 'v3NumeroBadge');
  state.additionalPayment.filled = areCCFieldsFilled();
  renderFeedback();
}

function onSelectChange(selectEl) {
  updateSelectState(selectEl);
  onCCFieldInput();
}

// ============================================================
// RENDER
// ============================================================

function render() {
  state.cartas.forEach(carta => renderCarta(carta));

  const v3Section = document.getElementById('v3PaymentSection');
  v3Section.style.display = 'flex';
  renderV3Payment();

  renderFeedback();
}

function renderCarta(carta) {
  const id = carta.id;
  const cb = document.getElementById(`cb${id}`);
  const row = document.getElementById(`carta${id}Row`);
  const creditEl = document.getElementById(`carta${id}Credit`);
  const utilizarEl = document.getElementById(`carta${id}Utilizar`);
  const utilizarValEl = document.getElementById(`carta${id}UtilizarVal`);

  cb.className = 'checkbox';
  if (carta.disabled && !carta.selected) cb.classList.add('disabled');
  else if (carta.selected) cb.classList.add('selected');
  else cb.classList.add('default');

  row.classList.toggle('disabled-row', carta.disabled && !carta.selected);
  creditEl.textContent = formatCurrency(carta.creditoDisponivel);

  if (carta.selected && carta.utilizar > 0) {
    utilizarEl.style.display = 'inline';
    utilizarValEl.textContent = formatCurrency(carta.utilizar);
  } else {
    utilizarEl.style.display = 'none';
  }
}

function renderV3Payment() {
  const ap = state.additionalPayment;
  const cbV3 = document.getElementById('cbV3');
  const v3Row = document.getElementById('v3PaymentRow');
  const v3Label = document.getElementById('v3Label');
  const v3LabelActive = document.getElementById('v3LabelActive');
  const iconV3 = document.getElementById('iconAddV3');
  const iconV3Active = document.getElementById('iconAddV3Active');
  const v3ValorPagar = document.getElementById('v3ValorPagar');
  const typeSelector = document.getElementById('paymentTypeSelector');
  const v3CCForm = document.getElementById('v3CreditCardForm');
  const v3PixSection = document.getElementById('v3PixSection');

  cbV3.className = 'checkbox';
  if (ap.selected) cbV3.classList.add('selected');
  else if (ap.enabled) cbV3.classList.add('default');
  else cbV3.classList.add('disabled');

  v3Row.classList.toggle('disabled-row', !ap.enabled && !ap.selected);

  if (ap.enabled || ap.selected) {
    v3Label.style.display = 'none';
    v3LabelActive.style.display = 'block';
    iconV3.style.display = 'none';
    iconV3Active.style.display = 'block';
    v3ValorPagar.textContent = formatCurrency(ap.valorPagar);
  } else {
    v3Label.style.display = 'block';
    v3LabelActive.style.display = 'none';
    iconV3.style.display = 'block';
    iconV3Active.style.display = 'none';
  }

  if (ap.selected) {
    typeSelector.style.display = 'block';
    renderPaymentTypeOptions();
  } else {
    typeSelector.style.display = 'none';
  }

  v3CCForm.style.display = (ap.selected && ap.selectedType === 'credit-card') ? 'flex' : 'none';
  v3PixSection.style.display = (ap.selected && ap.selectedType === 'pix') ? 'flex' : 'none';

  if (ap.selectedType === 'pix') {
    document.getElementById('v3PixValor').textContent = formatCurrency(ap.valorPagar);
  }
}

function renderPaymentTypeOptions() {
  const container = document.getElementById('paymentTypeOptions');
  const ap = state.additionalPayment;

  container.innerHTML = PAYMENT_TYPES.map(pt => {
    const isSelected = ap.selectedType === pt.id;
    return `
      <div class="payment-type-option ${isSelected ? 'selected' : ''}" data-type="${pt.id}">
        <div class="radio-circle ${isSelected ? 'selected' : ''}">
          ${isSelected ? '<div class="radio-dot"></div>' : ''}
        </div>
        <span class="payment-type-icon">${pt.icon}</span>
        <span class="payment-type-label">${pt.label}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.payment-type-option').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPaymentType(el.dataset.type);
    });
  });
}

function renderFeedback() {
  const successEl = document.getElementById('feedbackSuccess');
  const alertEl = document.getElementById('feedbackAlert');
  const successTitle = document.getElementById('successTitle');
  const alertTitle = document.getElementById('alertTitle');
  const alertSubtitle = document.getElementById('alertSubtitle');

  const feedback = calculateFeedback();

  if (!feedback) {
    successEl.style.display = 'none';
    alertEl.style.display = 'none';
    return;
  }

  if (feedback.type === 'success') {
    successEl.style.display = 'flex';
    alertEl.style.display = 'none';
    successTitle.textContent = feedback.title;
  } else {
    successEl.style.display = 'none';
    alertEl.style.display = 'flex';
    alertTitle.textContent = feedback.title;
    alertSubtitle.textContent = feedback.subtitle;
  }
}

// ============================================================
// SCENARIO INFO & NAV
// ============================================================

function updateScenarioInfo(config) {
  const infoEl = document.getElementById('scenarioInfo');
  if (!infoEl) return;
  const creditLines = config.cartas.map(c => `<span class="scenario-detail-line">Carta ${c.id}: <strong>R$ ${formatCurrency(c.creditoDisponivel)}</strong></span>`).join('');
  infoEl.innerHTML = `
    <span class="scenario-detail-line">Reserva: <strong>R$ ${formatCurrency(TOTAL_RESERVA)}</strong></span>
    ${creditLines}
  `;
}

function updateNavButtons(activeIndex) {
  document.querySelectorAll('.scenario-card').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.scenario) === activeIndex);
  });
}

// ============================================================
// VIEW MODE (Desktop / Mobile)
// ============================================================

function setViewMode(mode) {
  const body = document.body;
  const cardContainer = document.getElementById('cardContainer');

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });

  if (mode === 'mobile') {
    body.classList.add('mobile-mode');

    if (!document.getElementById('mobileFrame')) {
      const frame = document.createElement('div');
      frame.id = 'mobileFrame';
      frame.className = 'mobile-frame';
      frame.innerHTML = '<div class="mobile-frame-notch"></div><div class="mobile-frame-content" id="mobileFrameContent"></div>';

      cardContainer.parentNode.insertBefore(frame, cardContainer);
      const frameContent = document.getElementById('mobileFrameContent');
      frameContent.appendChild(cardContainer);
    }
  } else {
    body.classList.remove('mobile-mode');

    const frame = document.getElementById('mobileFrame');
    if (frame) {
      const mainEl = document.querySelector('.main-content');
      mainEl.appendChild(cardContainer);
      frame.remove();
    }
  }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // View toggle (Desktop/Mobile)
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  // Scenario cards (sidebar)
  document.querySelectorAll('.scenario-card').forEach(btn => {
    btn.addEventListener('click', () => resetToScenario(parseInt(btn.dataset.scenario)));
  });

  // Carta clicks
  document.getElementById('carta442Row').addEventListener('click', () => toggleCarta('442'));
  document.getElementById('carta469Row').addEventListener('click', () => toggleCarta('469'));

  // Additional Payment
  document.getElementById('v3PaymentRow').addEventListener('click', () => toggleV3Payment());

  // Credit card field input listeners
  ['v3TitularInput', 'v3NumeroInput', 'v3CvvInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', onCCFieldInput);
  });
  ['v3MesInput', 'v3AnoInput'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', function() { onSelectChange(this); });
  });
  // Titular only letters
  document.getElementById('v3TitularInput').addEventListener('input', function() { formatTitular(this); });
  // Card number formatting
  document.getElementById('v3NumeroInput').addEventListener('input', function() { formatCardNumber(this); });
  // CVV only digits
  document.getElementById('v3CvvInput').addEventListener('input', function() { formatCVV(this); });

  // Stop click propagation on form
  document.getElementById('v3CreditCardForm').addEventListener('click', (e) => e.stopPropagation());

  // Initialize
  resetToScenario(1);
});
