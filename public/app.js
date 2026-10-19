const itemsEl = document.getElementById('items');
const totalEl = document.getElementById('total');
const errorEl = document.getElementById('error');
const payBtn = document.getElementById('pay');

function addRow(name = '', price = '', quantity = 1) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <input class="name" placeholder="Item name" value="${name}">
    <input class="price" type="number" min="20" step="0.01" placeholder="Price (PHP)" value="${price}">
    <input class="qty" type="number" min="1" step="1" value="${quantity}">`;
  row.addEventListener('input', updateTotal);
  itemsEl.appendChild(row);
}

function readItems() {
  return [...itemsEl.children].map((r) => ({
    name: r.querySelector('.name').value,
    price: r.querySelector('.price').value,
    quantity: r.querySelector('.qty').value,
  }));
}

function updateTotal() {
  const total = readItems().reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  totalEl.textContent = total.toFixed(2);
}

document.getElementById('add').addEventListener('click', () => addRow());

payBtn.addEventListener('click', async () => {
  errorEl.textContent = '';
  payBtn.disabled = true;
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: readItems() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    window.location.href = data.checkout_url;
  } catch (e) {
    errorEl.textContent = e.message;
    payBtn.disabled = false;
  }
});

addRow('Sample product', '100.00', 1);
updateTotal();
