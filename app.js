/**
 * Seleção de Carta de Crédito - Protótipo Navegável
 *
 * V1: Cartão de crédito só habilita quando TODAS as cartas estão selecionadas
 * V2: Cartão de crédito habilita assim que QUALQUER carta é selecionada
 * V3: "Adicionar forma de pagamento" com tipos dinâmicos (Cartão, PIX, etc.)
 *     Habilita como V2, mas o usuário escolhe o tipo. Só 1 tipo de cada vez.
 */

// ============================================================
// STATE
// ============================================================

const TOTAL_RESERVA = 11000;

// V3: Dynamic payment types configuration
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
  version: 3,
  currentScenario: 1,
  cartas: [],
  // V1/V2 credit card state
  creditCard: {
    enabled: false,
    selected: false,
    filled: false,
    valorPagar: 0,
  },
  // V3 additional payment state
  additionalPayment: {
    enabled: false,
    selected: false,         // row selected (expanded)
    selectedType: null,      // 'credit-card' | 'pix' | null
    filled: false,           // payment info filled
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

  state.creditCard = { enabled: false, selected: false, filled: false, valorPagar: 0 };
  state.additionalPayment = { enabled: false, selected: false, selectedType: null, filled: false, valorPagar: 0 };

  render();
  updateNavButtons(index);
  updateScenarioInfo(config);
}

function recalculate() {
  // Recalculate "A utilizar" for all selected cartas in order
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

  // Update disabled state for non-selected cartas
  state.cartas.forEach(c => {
    if (!c.selected) c.disabled = fullyCovered;
  });

  if (state.version === 3) {
    // V3: same enabling logic as V2 but for additional payment
    if (fullyCovered) {
      state.additionalPayment.enabled = false;
      state.additionalPayment.selected = false;
      state.additionalPayment.selectedType = null;
      state.additionalPayment.filled = false;
      state.additionalPayment.valorPagar = 0;
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
  } else if (state.version === 2) {
    // V2: credit card enables as soon as any carta is selected
    if (fullyCovered) {
      state.creditCard.enabled = false;
      if (!state.creditCard.selected) state.creditCard.valorPagar = 0;
    } else if (anySelected) {
      state.creditCard.enabled = true;
      state.creditCard.valorPagar = remaining;
    } else {
      state.creditCard.enabled = false;
      state.creditCard.selected = false;
      state.creditCard.filled = false;
      state.creditCard.valorPagar = 0;
    }
  } else {
    // V1: credit card only enables when ALL cartas are selected
    if (fullyCovered) {
      state.creditCard.enabled = false;
      if (!state.creditCard.selected) state.creditCard.valorPagar = 0;
    } else {
      const allCartasSelected = state.cartas.every(c => c.selected);
      if (allCartasSelected) {
        state.creditCard.enabled = true;
        state.creditCard.valorPagar = remaining;
      } else {
        state.creditCard.enabled = false;
        state.creditCard.selected = false;
        state.creditCard.filled = false;
        state.creditCard.valorPagar = remaining;
      }
    }
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

  // V3 feedback
  if (state.version === 3) {
    const ap = state.additionalPayment;
    if (ap.selected && ap.filled) {
      const typeName = ap.selectedType === 'pix' ? 'Pix' : 'cartão de crédito';
      return { type: 'success', title: `Pagamento totalmente coberto com cartas de crédito e ${typeName}.`, subtitle: 'Você pode finalizar sua reserva.' };
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

  // V1/V2 feedback
  if (state.creditCard.selected && state.creditCard.filled) {
    return { type: 'success', title: 'Pagamento totalmente coberto com cartas de crédito e cartão de crédito.', subtitle: 'Você pode finalizar sua reserva.' };
  }
  if (state.creditCard.selected && !state.creditCard.filled) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Você pode pagar o restante com cartão de crédito.' };
  }
  if (state.creditCard.enabled) {
    return { type: 'alert', title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`, subtitle: 'Você pode pagar o restante com cartão de crédito.' };
  }
  return {
    type: 'alert',
    title: `Ainda faltam R$ ${formatCurrency(remaining)} para concluir o pagamento.`,
    subtitle: state.version === 2 ? 'Você pode adicionar mais cartas ou pagar com cartão de crédito.' : 'Você pode adicionar mais cartas.',
  };
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
    // Only reset payment sections if no cartas remain selected
    const anyStillSelected = state.cartas.some(c => c.id !== id && c.selected);
    if (!anyStillSelected) {
      state.creditCard.selected = false;
      state.creditCard.filled = false;
      state.additionalPayment.selected = false;
      state.additionalPayment.selectedType = null;
      state.additionalPayment.filled = false;
    }
  }

  recalculate();
}

function toggleCreditCard() {
  if (state.version === 3) return;
  const cc = state.creditCard;
  if (!cc.enabled && !cc.selected) return;
  cc.selected = !cc.selected;
  if (!cc.selected) cc.filled = false;
  render();
}

function fillCreditCard() {
  if (state.version === 3) return;
  if (!state.creditCard.selected) return;
  state.creditCard.filled = !state.creditCard.filled;
  render();
}

// V3 interactions
function toggleV3Payment() {
  if (state.version !== 3) return;
  const ap = state.additionalPayment;
  if (!ap.enabled && !ap.selected) return;
  ap.selected = !ap.selected;
  if (!ap.selected) {
    ap.selectedType = null;
    ap.filled = false;
  }
  render();
}

function selectPaymentType(typeId) {
  if (state.version !== 3) return;
  const ap = state.additionalPayment;
  if (!ap.selected) return;

  if (ap.selectedType === typeId) {
    // Deselect
    ap.selectedType = null;
    ap.filled = false;
  } else {
    ap.selectedType = typeId;
    // PIX is considered filled immediately (QR generated on purchase)
    ap.filled = (typeId === 'pix');
  }
  render();
}

function fillV3Payment() {
  if (state.version !== 3) return;
  const ap = state.additionalPayment;
  if (!ap.selected || !ap.selectedType) return;
  ap.filled = !ap.filled;
  render();
}

// ============================================================
// RENDER
// ============================================================

function render() {
  state.cartas.forEach(carta => renderCarta(carta));

  // Show/hide V1V2 vs V3 sections
  const ccSection = document.getElementById('creditCardSection');
  const v3Section = document.getElementById('v3PaymentSection');

  if (state.version === 3) {
    ccSection.style.display = 'none';
    v3Section.style.display = 'flex';
    renderV3Payment();
  } else {
    ccSection.style.display = 'flex';
    v3Section.style.display = 'none';
    renderCreditCard(state.creditCard);
  }

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

function renderCreditCard(cc) {
  const cbCC = document.getElementById('cbCC');
  const ccRow = document.getElementById('creditCardRow');
  const ccLabel = document.getElementById('ccLabel');
  const ccLabelActive = document.getElementById('ccLabelActive');
  const iconAdd = document.getElementById('iconAdd');
  const iconAddActive = document.getElementById('iconAddActive');
  const ccForm = document.getElementById('creditCardForm');
  const ccValorPagar = document.getElementById('ccValorPagar');

  cbCC.className = 'checkbox';
  if (cc.selected) cbCC.classList.add('selected');
  else if (cc.enabled) cbCC.classList.add('default');
  else cbCC.classList.add('disabled');

  ccRow.classList.toggle('disabled-row', !cc.enabled && !cc.selected);

  if (cc.enabled || cc.selected) {
    ccLabel.style.display = 'none';
    ccLabelActive.style.display = 'block';
    iconAdd.style.display = 'none';
    iconAddActive.style.display = 'block';
    ccValorPagar.textContent = formatCurrency(cc.valorPagar);
  } else {
    ccLabel.style.display = 'block';
    ccLabelActive.style.display = 'none';
    iconAdd.style.display = 'block';
    iconAddActive.style.display = 'none';
  }

  if (cc.selected) {
    ccForm.style.display = 'flex';
    renderCCFormState(cc.filled);
  } else {
    ccForm.style.display = 'none';
  }
}

function renderCCFormState(filled) {
  ['titular', 'numero'].forEach(id => {
    document.getElementById(`${id}Placeholder`).style.display = filled ? 'none' : 'block';
    document.getElementById(`${id}Filled`).style.display = filled ? 'flex' : 'none';
  });
  ['mes', 'ano', 'cvv'].forEach(id => {
    document.getElementById(`${id}Placeholder`).style.display = filled ? 'none' : 'block';
    document.getElementById(`${id}Filled`).style.display = filled ? 'flex' : 'none';
  });
}

// V3 Render
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

  // Checkbox
  cbV3.className = 'checkbox';
  if (ap.selected) cbV3.classList.add('selected');
  else if (ap.enabled) cbV3.classList.add('default');
  else cbV3.classList.add('disabled');

  v3Row.classList.toggle('disabled-row', !ap.enabled && !ap.selected);

  // Labels
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

  // Type selector
  if (ap.selected) {
    typeSelector.style.display = 'block';
    renderPaymentTypeOptions();
  } else {
    typeSelector.style.display = 'none';
  }

  // Payment forms
  v3CCForm.style.display = (ap.selected && ap.selectedType === 'credit-card') ? 'flex' : 'none';
  v3PixSection.style.display = (ap.selected && ap.selectedType === 'pix') ? 'flex' : 'none';

  if (ap.selectedType === 'credit-card') {
    renderV3CCFormState(ap.filled);
  }
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

  // Re-bind click events
  container.querySelectorAll('.payment-type-option').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPaymentType(el.dataset.type);
    });
  });
}

function renderV3CCFormState(filled) {
  ['v3Titular', 'v3Numero'].forEach(id => {
    document.getElementById(`${id}Placeholder`).style.display = filled ? 'none' : 'block';
    document.getElementById(`${id}Filled`).style.display = filled ? 'flex' : 'none';
  });
  ['v3Mes', 'v3Ano', 'v3Cvv'].forEach(id => {
    document.getElementById(`${id}Placeholder`).style.display = filled ? 'none' : 'block';
    document.getElementById(`${id}Filled`).style.display = filled ? 'flex' : 'none';
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
  const creditInfo = config.cartas.map(c => `Carta ${c.id}: R$ ${formatCurrency(c.creditoDisponivel)}`).join('  ·  ');
  infoEl.innerHTML = `
    <span class="info-scenario-name">${config.name}</span>
    <span class="info-scenario-sep">—</span>
    <span class="info-scenario-desc">${config.description}</span>
    <span class="info-scenario-sep">|</span>
    <span class="info-scenario-credits">${creditInfo}</span>
    <span class="info-scenario-sep">|</span>
    <span class="info-scenario-credits">Reserva: R$ ${formatCurrency(TOTAL_RESERVA)}</span>
  `;
}

function updateNavButtons(activeIndex) {
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.scenario) === activeIndex);
  });
}

// ============================================================
// VERSION
// ============================================================

function setVersion(v) {
  state.version = v;
  document.querySelectorAll('.version-card').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.version) === v);
  });
  resetToScenario(state.currentScenario);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Version cards (sidebar)
  document.querySelectorAll('.version-card').forEach(btn => {
    btn.addEventListener('click', () => setVersion(parseInt(btn.dataset.version)));
  });

  // Scenario buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => resetToScenario(parseInt(btn.dataset.scenario)));
  });

  // Carta clicks
  document.getElementById('carta442Row').addEventListener('click', () => toggleCarta('442'));
  document.getElementById('carta469Row').addEventListener('click', () => toggleCarta('469'));

  // V1/V2: Credit Card
  document.getElementById('creditCardRow').addEventListener('click', () => toggleCreditCard());
  document.getElementById('creditCardForm').addEventListener('click', () => fillCreditCard());

  // V3: Additional Payment
  document.getElementById('v3PaymentRow').addEventListener('click', () => toggleV3Payment());
  document.getElementById('v3CreditCardForm').addEventListener('click', (e) => {
    e.stopPropagation();
    fillV3Payment();
  });

  // Initialize with V3 (Final) as default
  setVersion(3);
});
