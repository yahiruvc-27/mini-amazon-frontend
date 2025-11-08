/* app.js - multi-item cart with remove & single cart area */
let cart = []; // each entry: { product_id, name, price, quantity, stock }

function ensureCartContainer() {
  // create cart container once under main area (not per loadProducts call)
  if (document.getElementById('cart-section')) return;
  const main = document.querySelector('main');
  const section = document.createElement('section');
  section.id = 'cart-section';
  section.innerHTML = `
    <h2>Your Cart</h2>
    <ul id="cart-list">Cart is empty</ul>
    <div style="margin-top:10px;">
      <button id="checkout-btn" disabled onclick="checkout()">Checkout</button>
      <button id="clear-cart-btn" onclick="clearCart()">Clear Cart</button>
    </div>
  `;
  main.appendChild(section);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; // clear

    // ensure single cart section present
    ensureCartContainer();

    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'product';
      item.innerHTML = `
        <img src="/images/${p.image_key}" alt="${p.name}">
        <b>${p.name}</b><br>
        ${p.description}<br>
        Price: $${p.price}<br>
        In stock: ${p.stock}<br>
        Quantity: <input type="number" id="qty-${p.product_id}" min="1" max="${p.stock}" value="1" style="width:60px;"><br>
        <button onclick="addToCart(${p.product_id}, ${p.price}, ${p.stock}, '${p.name.replace(/'/g, "\\'")}')">Add to Cart</button>
      `;
      grid.appendChild(item);
    });

    // refresh cart UI after reloading products
    renderCart();
  } catch (err) {
    document.getElementById('product-grid').innerText = 'Error loading products';
    console.error(err);
  }
}

function addToCart(product_id, price, stock, name) {
  const qtyEl = document.getElementById(`qty-${product_id}`);
  const qty = parseInt(qtyEl.value, 10);
  if (!qty || qty < 1) return alert('Enter a valid quantity');
  if (qty > stock) return alert('Not enough stock');

  // aggregate by product_id
  const existing = cart.find(c => c.product_id === product_id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, stock);
  } else {
    cart.push({ product_id, name, price, quantity: qty, stock });
  }
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-list');
  if (!list) return; // safety
  list.innerHTML = '';

  if (cart.length === 0) {
    list.textContent = 'Cart is empty';
    document.getElementById('checkout-btn').disabled = true;
    return;
  }

  cart.forEach((item, idx) => {
    const li = document.createElement('li');
    li.style.marginBottom = '6px';
    li.innerHTML = `
      <span>${escapeHtml(item.name)} — ${item.quantity} × $${item.price} = $${(item.quantity * item.price).toFixed(2)}</span>
      <button style="margin-left:8px;" onclick="removeCartItem(${idx})">Remove</button>
      <button style="margin-left:6px;" onclick="decreaseQty(${idx})">-</button>
      <button style="margin-left:4px;" onclick="increaseQty(${idx})">+</button>
    `;
    list.appendChild(li);
  });

  document.getElementById('checkout-btn').disabled = false;
}

function removeCartItem(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function decreaseQty(index) {
  if (!cart[index]) return;
  cart[index].quantity = Math.max(1, cart[index].quantity - 1);
  renderCart();
}

function increaseQty(index) {
  if (!cart[index]) return;
  cart[index].quantity = Math.min(cart[index].stock, cart[index].quantity + 1);
  renderCart();
}

async function checkout() {
  if (cart.length === 0) return alert('Cart is empty');

  const name = prompt('Enter your name:');
  const email = prompt('Enter your email:');
  if (!name || !email) return alert('Name and email required');

  const payload = {
    buyer_name: name,
    buyer_email: email,
    items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
  };

  try {
    const resp = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    if (result.success) {
      alert('Purchase successful!');
      clearCart();
      await loadProducts(); // refresh product stock
    } else {
      alert(result.message || 'Purchase failed');
    }
  } catch (err) {
    console.error(err);
    alert('Network or server error');
  }
}

function escapeHtml(unsafe) { // small helper to avoid simple injection in UI
  return unsafe.replace(/[&<"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','"':'&quot;',"'":'&#039;'})[m]; });
}

// Show instance AZ (server-side fetch is better, but this keeps prior behavior)
async function showAZ() {
  try {
    const res = await fetch('/az.txt'); // if you wrote az.txt on boot
    const az = await res.text();
    document.getElementById('az-name').textContent = az || 'unknown';
  } catch {
    document.getElementById('az-name').textContent = 'unknown';
  }
}

ensureCartContainer();
showAZ();
loadProducts();
