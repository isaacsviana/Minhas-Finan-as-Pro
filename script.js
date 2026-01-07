// --- 1. Elementos do DOM ---
const balanceEl = document.getElementById('balance');
const money_plusEl = document.getElementById('money-plus');
const money_minusEl = document.getElementById('money-minus');
const listEl = document.getElementById('list');
const form = document.getElementById('form');

// Campos do formulário
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categoryInput = document.getElementById('category');
const typeInputs = document.getElementsByName('trans-type'); // Radio buttons

// Canvas do Gráfico
const chartCtx = document.getElementById('expenseChart').getContext('2d');
let myChart; // Variável global para o gráfico

// --- 2. Estado da Aplicação (Dados) ---
// Tenta pegar do localStorage, se não tiver, inicia vazio
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// Mapa de emojis para categorias (para usar na lista)
const categoryIcons = {
    food: '🍔', home: '🏠', transport: '🚗', leisure: '🎮',
    health: '💊', salary: '💰', other: '⚙️'
};

// Define a data de hoje como padrão no input de data
dateInput.valueAsDate = new Date();

// --- 3. Funções Principais ---

// Função para gerar ID único
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Adiciona transação ao DOM (Lista visível)
function addTransactionDOM(transaction) {
    const sign = transaction.type === 'expense' ? '-' : '+';
    const item = document.createElement('li');

    item.classList.add('transaction-item');
    item.classList.add(transaction.type === 'expense' ? 'minus' : 'plus');

    // Formata moeda
    const amountFormatted = Math.abs(transaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    // Formata data (converte string YYYY-MM-DD para PT-BR)
    const dateObj = new Date(transaction.date);
    const dateFormatted = dateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    
    const icon = categoryIcons[transaction.category] || '📝';

    item.innerHTML = `
        <div class="item-info-group">
            <span class="category-icon">${icon}</span>
            <div class="item-text">
                <h4>${transaction.text}</h4>
                <span>${dateFormatted} - ${transaction.category.toUpperCase()}</span>
            </div>
        </div>
        <div style="display:flex; align-items:center;">
            <span style="font-weight:600">${sign}${amountFormatted}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
        </div>
    `;

    listEl.appendChild(item);
}

// Atualiza os valores dos cards e o gráfico
function updateValues() {
    // Calcula totais
    const amounts = transactions.map(transaction => transaction.type === 'expense' ? -transaction.amount : transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0);
    
    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0);

    const expense = (amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0) * -1);

    // Atualiza DOM
    balanceEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    money_plusEl.innerText = income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    money_minusEl.innerText = `-${expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

    // Atualiza o Gráfico
    updateChart();
}

// Remove transação
function removeTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
}

// Adiciona nova transação (Submit do Form)
function addTransaction(e) {
    e.preventDefault();

    if (textInput.value.trim() === '' || amountInput.value.trim() === '' || categoryInput.value === '') {
        alert('Por favor, preencha descrição, valor e categoria.');
        return;
    }

    // Descobre qual radio button está marcado
    let selectedType;
    for (const radio of typeInputs) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }

    const transaction = {
        id: generateID(),
        text: textInput.value,
        amount: +amountInput.value, // o '+' converte string para número
        date: dateInput.value,
        category: categoryInput.value,
        type: selectedType
    };

    transactions.push(transaction);
    addTransactionDOM(transaction);
    updateValues();
    updateLocalStorage();

    // Limpa campos, mas mantém a data e o tipo
    textInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
    textInput.focus();
}

// Atualiza LocalStorage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// --- 4. Lógica do Gráfico (Chart.js) ---
function updateChart() {
    // 1. Filtrar apenas despesas
    const expenses = transactions.filter(t => t.type === 'expense');

    // 2. Agrupar despesas por categoria e somar os valores
    // Resultado esperado: { food: 150, transport: 50 }
    const groupedExpenses = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {});

    // 3. Preparar dados para o Chart.js
    const labels = Object.keys(groupedExpenses).map(cat => cat.toUpperCase()); // Nomes das categorias
    const dataPoints = Object.values(groupedExpenses); // Valores somados
    
    // Cores para o gráfico (estilo dark)
    const backgroundColors = ['#f75a68', '#8257e5', '#00b37e', '#e1e1e6', '#FF9F43', '#28C76F'];

    // Se o gráfico já existe, destrua antes de criar um novo (para não sobrepor)
    if (myChart) {
        myChart.destroy();
    }

    // Se não houver despesas, não desenha nada e esconde o container
    if(expenses.length === 0) {
        document.querySelector('.chart-container').style.display = 'none';
        return;
    } else {
        document.querySelector('.chart-container').style.display = 'flex';
    }

    // Cria o novo gráfico
    myChart = new Chart(chartCtx, {
        type: 'doughnut', // Tipo "Rosquinha"
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#202024', // Cor do fundo do card para "cortar"
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#e1e1e6', font: { family: 'Poppins' } }
                },
                tooltip: {
                  callbacks: {
                      label: function(context) {
                          let label = context.label || '';
                          if (label) { label += ': '; }
                          // Formata o valor no tooltip do gráfico
                          label += context.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          return label;
                      }
                  }
                }
            }
        }
    });
}

// --- 5. Inicialização ---
function init() {
    listEl.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
}

// Event Listeners
init();
form.addEventListener('submit', addTransaction);