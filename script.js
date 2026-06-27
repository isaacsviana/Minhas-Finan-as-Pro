// --- Mapeamentos ---
const ICONS = {
  food: '🍔', home: '🏠', transport: '🚗', leisure: '🎮',
  health: '💊', salary: '💰', invest: '📈', other: '⚙️'
};
 
const CATS = {
  food: 'Alimentação', home: 'Moradia', transport: 'Transporte',
  leisure: 'Lazer', health: 'Saúde', salary: 'Salário',
  invest: 'Investimento', other: 'Outros'
};
 
const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
 
// --- Estado ---
let transactions = JSON.parse(localStorage.getItem('transactions_v3') || '[]');
let currentType = 'expense';
let deleteId = null;
let doughnutChart = null;
let lineChart = null;
 
// --- Inicialização ---
document.getElementById('date').valueAsDate = new Date();
document.getElementById('current-period').textContent =
  new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
 
document.getElementById('modal-confirm').onclick = () => {
  if (deleteId) {
    transactions = transactions.filter(t => t.id !== deleteId);
    save();
    update();
    showToast('Transação removida.', 'success');
  }
  closeModal();
};
 
buildMonthFilter();
update();
 
// --- Tipo de Transação ---
function setType(t) {
  currentType = t;
  const be = document.getElementById('btn-expense');
  const bi = document.getElementById('btn-income');
  be.className = 'type-btn' + (t === 'expense' ? ' active-expense' : '');
  bi.className = 'type-btn' + (t === 'income' ? ' active-income' : '');
}
 
// --- Formatação ---
function fmt(n) {
  return Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
 
// --- Adicionar Transação ---
function addTransaction() {
  const text = document.getElementById('text').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const date = document.getElementById('date').value;
  const cat = document.getElementById('category').value;
 
  if (!text || !amount || !date || !cat) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }
  if (amount <= 0) {
    showToast('Valor deve ser maior que zero.', 'error');
    return;
  }
 
  transactions.push({ id: Date.now(), text, amount, date, category: cat, type: currentType });
  save();
 
  document.getElementById('text').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('category').value = '';
  document.getElementById('text').focus();
 
  showToast('Transação adicionada!', 'success');
  update();
}
 
// --- Salvar no LocalStorage ---
function save() {
  localStorage.setItem('transactions_v3', JSON.stringify(transactions));
}
 
// --- Modal de Confirmação ---
function openModal(id) {
  deleteId = id;
  document.getElementById('modal').classList.add('open');
}
 
function closeModal() {
  deleteId = null;
  document.getElementById('modal').classList.remove('open');
}
 
// --- Toast ---
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 2500);
}
 
// --- Filtro de Mês ---
function buildMonthFilter() {
  const sel = document.getElementById('filter-month');
  const months = new Set(transactions.map(t => t.date.slice(0, 7)));
  const now = new Date().toISOString().slice(0, 7);
  const all = [...months];
  if (!all.includes(now)) all.unshift(now);
  all.sort((a, b) => b.localeCompare(a));
 
  sel.innerHTML = '<option value="all">Todos os meses</option>' + all.map(m => {
    const [y, mo] = m.split('-');
    const label = new Date(+y, +mo - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return `<option value="${m}"${m === now ? ' selected' : ''}>${label}</option>`;
  }).join('');
}
 
// --- Listar Transações Filtradas ---
function getFiltered() {
  const type = document.getElementById('filter-type').value;
  const month = document.getElementById('filter-month').value;
  return transactions.filter(t => {
    if (type !== 'all' && t.type !== type) return false;
    if (month !== 'all' && !t.date.startsWith(month)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}
 
function renderList() {
  const list = document.getElementById('list');
  const filtered = getFiltered();
  document.getElementById('tx-count').textContent =
    filtered.length + ' registro' + (filtered.length !== 1 ? 's' : '');
 
  if (!filtered.length) {
    list.innerHTML = `
      <li>
        <div class="empty">
          <div class="empty-icon">📭</div>
          <p>Nenhuma transação encontrada.</p>
        </div>
      </li>`;
    return;
  }
 
  list.innerHTML = filtered.map(t => {
    const sign = t.type === 'expense' ? '−' : '+';
    const dateStr = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR');
    return `
      <li class="tx-item ${t.type === 'expense' ? 'minus' : 'plus'}">
        <div class="tx-left">
          <div class="tx-icon">${ICONS[t.category] || '📝'}</div>
          <div>
            <div class="tx-desc">${t.text}</div>
            <div class="tx-meta">${dateStr} · ${CATS[t.category] || t.category}</div>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${t.type === 'expense' ? 'minus' : 'plus'}">${sign} ${fmt(t.amount)}</span>
          <button class="del-btn" onclick="openModal(${t.id})" title="Remover">×</button>
        </div>
      </li>`;
  }).join('');
}
 
// --- Cards de Saldo ---
function updateCards() {
  const inc = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const exp = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const bal = inc - exp;
 
  document.getElementById('money-plus').textContent = fmt(inc);
  document.getElementById('money-minus').textContent = fmt(exp);
 
  const balEl = document.getElementById('balance');
  balEl.textContent = (bal < 0 ? '− ' : '') + fmt(bal);
  balEl.className = 'card-value' + (bal > 0 ? ' positive' : bal < 0 ? ' negative' : '');
 
  document.getElementById('income-count').textContent =
    transactions.filter(t => t.type === 'income').length + ' transação(ões)';
  document.getElementById('expense-count').textContent =
    transactions.filter(t => t.type === 'expense').length + ' transação(ões)';
 
  const savings = inc > 0 ? ((inc - exp) / inc * 100).toFixed(1) : 0;
  document.getElementById('balance-sub').textContent =
    inc > 0 ? `Taxa de poupança: ${savings}%` : 'Adicione entradas para calcular';
}
 
// --- Gráfico de Rosca (Categorias) ---
function updateDoughnut() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const grouped = {};
  expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });
  const keys = Object.keys(grouped);
  const vals = Object.values(grouped);
  const total = vals.reduce((a, b) => a + b, 0);
 
  const catList = document.getElementById('cat-list');
 
  if (!keys.length) {
    catList.innerHTML = '<li class="cat-item" style="color:var(--muted);font-size:0.8rem">Nenhuma despesa ainda.</li>';
    if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
    return;
  }
 
  const sorted = keys
    .map((k, i) => ({ key: k, val: vals[i], color: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.val - a.val);
 
  catList.innerHTML = sorted.map(s => `
    <li class="cat-item">
      <span class="cat-dot" style="background:${s.color}"></span>
      <span class="cat-name">${CATS[s.key] || s.key}</span>
      <span class="cat-pct">${(s.val / total * 100).toFixed(0)}%</span>
      <span class="cat-val">${fmt(s.val)}</span>
    </li>`).join('');
 
  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(document.getElementById('doughnut-chart'), {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => CATS[s.key]),
      datasets: [{
        data: sorted.map(s => s.val),
        backgroundColor: sorted.map(s => s.color),
        borderWidth: 2,
        borderColor: '#18181b',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + fmt(ctx.raw)
          }
        }
      }
    }
  });
}
 
// --- Gráfico de Linha (Evolução do Saldo) ---
function updateLineChart() {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const byDay = {};
  let running = 0;
  sorted.forEach(t => {
    running += t.type === 'income' ? t.amount : -t.amount;
    byDay[t.date] = running;
  });
 
  const dates = Object.keys(byDay).sort();
 
  if (dates.length < 2) {
    if (lineChart) { lineChart.destroy(); lineChart = null; }
    return;
  }
 
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('line-chart'), {
    type: 'line',
    data: {
      labels: dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
      datasets: [{
        data: dates.map(d => byDay[d]),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.08)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: dates.length > 15 ? 0 : 4,
        pointBackgroundColor: '#8b5cf6',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + fmt(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#71717a', font: { size: 10, family: 'Poppins' }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#71717a',
            font: { size: 10, family: 'Poppins' },
            callback: v => fmt(v)
          }
        }
      }
    }
  });
}
 
// --- Exportar CSV ---
function exportCSV() {
  if (!transactions.length) {
    showToast('Nenhuma transação para exportar.', 'error');
    return;
  }
  const rows = [
    ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
    ...transactions
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(t => [
        t.date,
        t.text,
        CATS[t.category] || t.category,
        t.type === 'income' ? 'Entrada' : 'Saída',
        t.amount.toFixed(2)
      ])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'financas.csv';
  a.click();
  showToast('CSV exportado!', 'success');
}
 
// --- Atualizar Tudo ---
function update() {
  buildMonthFilter();
  updateCards();
  updateDoughnut();
  updateLineChart();
  renderList();
}
