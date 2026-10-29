const SUPABASE_URL = 'https://mbzhdoxvtasqzlebrdvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iemhkb3h2dGFzcXpsZWJyZHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTgzMDQsImV4cCI6MjEwODUzNDMwNH0.PiM_IGMre-HI6tOH3tfRxkboIsBXdU6YkAoVXyCzRlg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CATEGORIES = ['Cerâmica Bruta', 'Fios e Tramas', 'Madeira Nativa', 'Arte em Tela', 'Fibras da Terra', 'Diversos'];

let currentUser = null;
let currentUserProfile = null;
let allProducts = [];
let cart = [];

// Catálogo com caminhos relativos corrigidos para a pasta img
const MOCK_PRODUCTS = [
    {
        id: 9901,
        title: 'Bilha de Água Fresca',
        category: 'Cerâmica Bruta',
        price: 185.00,
        image_url: 'img/bilha.jpg',
        description: 'Peça moldada no torno com argila regional. Mantém a água fresca, tradição pura do interior paulista.',
        profiles: { name: 'Mestre Oleiro João', city: 'Bairro Santo Antônio - Bebedouro/SP' }
    },
    {
        id: 9902,
        title: 'Manta Tear Pôr-do-Sol',
        category: 'Fios e Tramas',
        price: 340.00,
        image_url: 'img/manta.jpg',
        description: 'Tecida à mão fio a fio durante 15 dias. Cores que refletem o fim de tarde nos canaviais da região.',
        profiles: { name: 'Dona Maria Tecelã', city: 'Centro - Bebedouro/SP' }
    },
    {
        id: 9903,
        title: 'Tucano Entalhado',
        category: 'Madeira Nativa',
        price: 210.00,
        image_url: 'img/escultura.jpg',
        description: 'Esculpido em madeira de reaproveitamento de podas. Pintura com pigmentos de terra.',
        profiles: { name: 'Ateliê Raízes de Madeira', city: 'Vila Nova - Bebedouro/SP' }
    },
    {
        id: 9904,
        title: 'Tela "O Canavial"',
        category: 'Arte em Tela',
        price: 550.00,
        image_url: 'img/quadro.jpg',
        description: 'Óleo sobre tela capturando a luz do sol e o movimento das plantações de cana-de-açúcar.',
        profiles: { name: 'Galeria Caipira', city: 'Bairro Primavera - Bebedouro/SP' }
    },
    {
        id: 9905,
        title: 'Cesto Palha de Milho',
        category: 'Fibras da Terra',
        price: 120.00,
        image_url: 'img/cesto.jpg',
        description: 'Cesto estruturado através do trançado da palha de milho desidratada ao sol.',
        profiles: { name: 'Trançadeiras Unidas', city: 'Sítio Boa Vista - Bebedouro/SP' }
    },
    {
        id: 9906,
        title: 'Mesa Rústica "Raiz"',
        category: 'Madeira Nativa',
        price: 850.00,
        image_url: 'img/mesa.jpg',
        description: 'Mesa de centro aproveitando as formas orgânicas de raiz tombada naturalmente.',
        profiles: { name: 'Marcenaria do Zé', city: 'Distrito Rural - BebedouroSP' }
    }
];

const $ = id => document.getElementById(id);

/* --- ANIMAÇÕES DE SCROLL REVEAL --- */
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

function reinitReveal() {
    document.querySelectorAll('.reveal').forEach(el => {
        el.classList.remove('active');
        observer.observe(el);
    });
}

/* --- NOTIFICAÇÕES TOAST --- */
function showToast(message, type = 'info') {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

/* --- CONTROLO DE VISTAS --- */
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    $(`view-${viewId}`).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    $('navMenu').classList.remove('active');
    
    if (viewId === 'catalog') loadCatalog();
    if (viewId === 'dashboard' && currentUser) { loadArtisanProducts(); loadReport(); }
    
    reinitReveal();
}

$('mobileMenuBtn').addEventListener('click', () => { $('navMenu').classList.toggle('active'); });

/* --- INICIALIZAÇÃO & AUTENTICAÇÃO --- */
function init() {
    $('prodCategory').innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    renderChips();
    loadCartFromStorage();
    db.auth.onAuthStateChange((_, session) => applySession(session));
    reinitReveal();
}

async function applySession(session) {
    currentUser = session ? session.user : null;
    if (currentUser) {
        const { data } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
        if (!data) return;
        currentUserProfile = data;
        $('userGreeting').textContent = `Olá, ${data.name.split(' ')[0]}`;
        
        $('loginBtn').classList.add('hidden');
        $('logoutBtn').classList.remove('hidden');
        
        if (data.is_artisan) $('btnNavAtelie').classList.remove('hidden');
        else $('btnNavAtelie').classList.add('hidden');
        
        if ($('orderBuyerName')) $('orderBuyerName').value = data.name || '';
        if ($('orderBuyerPhone') && data.contact) $('orderBuyerPhone').value = data.contact || '';
    } else {
        $('userGreeting').textContent = '';
        $('loginBtn').classList.remove('hidden');
        $('logoutBtn').classList.add('hidden');
        $('btnNavAtelie').classList.add('hidden');
    }
}

$('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    showToast('Sessão terminada com sucesso.');
    showView('home');
});

/* Alternância de Abas de Autenticação */
let isLoginMode = true;
$('tabLogin').addEventListener('click', () => { isLoginMode = true; toggleAuthTabs(); });
$('tabRegister').addEventListener('click', () => { isLoginMode = false; toggleAuthTabs(); });

function toggleAuthTabs() {
    $('tabLogin').classList.toggle('active', isLoginMode);
    $('tabRegister').classList.toggle('active', !isLoginMode);
    
    const fields = $('registerFields');
    if (isLoginMode) fields.classList.add('hidden');
    else fields.classList.remove('hidden');
    
    $('authSubmitBtn').textContent = isLoginMode ? 'Confirmar Acesso' : 'Finalizar Registo';
}

$('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim();
    const password = $('password').value;
    const btn = $('authSubmitBtn');
    btn.disabled = true; btn.textContent = 'Aguarde...';

    try {
        if (isLoginMode) {
            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast('Bem-vindo à Raízes Locais!');
            showView('catalog');
        } else {
            const role = $('role').value;
            const { error } = await db.auth.signUp({
                email, password,
                options: { 
                    data: { 
                        name: $('name').value.trim(), 
                        is_artisan: role === 'artisan', 
                        city: $('city').value.trim(), 
                        contact: $('contact').value.trim() 
                    } 
                }
            });
            if (error) throw error;
            showToast('Registo realizado! Aceda com o seu e-mail.');
            $('authForm').reset();
            isLoginMode = true;
            toggleAuthTabs();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

/* --- CATÁLOGO & FILTROS --- */
let activeCat = '';
function renderChips() {
    $('categoryChips').innerHTML = ['Todas as Peças', ...CATEGORIES].map(c => {
        const val = c === 'Todas as Peças' ? '' : c;
        const cls = val === activeCat ? 'chip-btn active' : 'chip-btn';
        return `<button class="${cls}" onclick="filterCat('${val}')">${c}</button>`;
    }).join('');
}
window.filterCat = (c) => { activeCat = c; renderChips(); renderCatalog(); };

async function loadCatalog() {
    $('catalogGrid').innerHTML = '<p class="text-center w-100">A carregar acervo de Bebedouro...</p>';
    
    let dbData = [];
    try {
        const { data } = await db.from('products').select('*, profiles(name, city)');
        if (data) dbData = data;
    } catch (err) { console.log('Modo de demonstração ativo.'); }
    
    allProducts = [...MOCK_PRODUCTS, ...dbData];
    renderCatalog();
}

function renderCatalog() {
    const term = $('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(p => {
        const matchCat = !activeCat || p.category === activeCat;
        const matchTerm = p.title.toLowerCase().includes(term) || 
                          (p.profiles && p.profiles.city && p.profiles.city.toLowerCase().includes(term)) || 
                          (p.profiles && p.profiles.name && p.profiles.name.toLowerCase().includes(term));
        return matchCat && matchTerm;
    });
    
    if (filtered.length === 0) {
        $('catalogGrid').innerHTML = '<p class="text-center w-100 lead-text mt-3">Nenhuma obra encontrada nesta categoria.</p>';
        return;
    }

    $('catalogGrid').innerHTML = filtered.map((p, index) => {
        const artisan = p.profiles ? p.profiles.name : 'Mestre Artesão';
        const animDelay = (index % 6) * 0.1;
        
        return `
        <div class="art-card reveal active" style="transition-delay: ${animDelay}s">
            <img src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x500?text=Obra+Artesanal'">
            <div class="art-details">
                <span class="art-cat">${p.category}</span>
                <h3 class="art-title">${p.title}</h3>
                <p class="art-author">${artisan}</p>
                <div class="art-price-row">
                    <span class="art-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="art-actions">
                    <button class="btn-add-cart" onclick="addToCart('${p.id}')">Adicionar à Sacola 🧺</button>
                    <button class="btn-solid-small" onclick="buyNow('${p.id}')">Comprar Agora</button>
                </div>
            </div>
        </div>
    `}).join('');
}
$('searchInput').addEventListener('input', renderCatalog);

/* --- SACOLA & CHECKOUT --- */
function loadCartFromStorage() {
    const saved = localStorage.getItem('raizes_locais_cart');
    if (saved) {
        try { cart = JSON.parse(saved); } catch (e) { cart = []; }
    }
    updateCartUI();
}

function saveCartToStorage() {
    localStorage.setItem('raizes_locais_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    $('cartCount').textContent = totalItems;
    renderCartItems();
}

function openCart() {
    $('cartDrawerOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCart() {
    $('cartDrawerOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}

function addToCart(productId) {
    const prod = allProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    const existingIndex = cart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: prod.id,
            title: prod.title,
            price: prod.price,
            image_url: prod.image_url,
            artisan: prod.profiles ? prod.profiles.name : 'Mestre Artesão',
            quantity: 1
        });
    }

    saveCartToStorage();
    showToast(`"<strong>${prod.title}</strong>" foi adicionada à sua sacola!`, 'success');
}

function buyNow(productId) {
    addToCart(productId);
    openCart();
}

function updateItemQuantity(productId, delta) {
    const index = cart.findIndex(item => String(item.id) === String(productId));
    if (index === -1) return;

    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCartToStorage();
}

function removeItemFromCart(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    saveCartToStorage();
    showToast('Item retirado da sacola.');
}

function renderCartItems() {
    const container = $('cartItemsList');
    const checkoutSec = $('cartCheckoutSection');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-state">
                <span class="cart-empty-icon">🧺</span>
                <h4>Sua sacola está vazia</h4>
                <p class="lead-text" style="font-size: 0.95rem;">Adicione peças exclusivas feitas pelos mestres de Bebedouro para prosseguir.</p>
                <button class="btn-solid-small mt-2" onclick="closeCart(); showView('catalog');">Ir às Compras</button>
            </div>
        `;
        checkoutSec.classList.add('hidden');
        return;
    }

    checkoutSec.classList.remove('hidden');

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
        <div class="cart-item-card">
            <img src="${item.image_url}" class="cart-item-img" onerror="this.onerror=null; this.src='https://via.placeholder.com/80?text=Obra'">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-author">Por ${item.artisan}</div>
                <div class="cart-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateItemQuantity('${item.id}', -1)">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateItemQuantity('${item.id}', 1)">+</button>
                    <button class="btn-remove-item" onclick="removeItemFromCart('${item.id}')" title="Excluir">🗑</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    $('cartSubtotalText').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    $('cartTotalText').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

let selectedMethod = 'pix';
function selectPaymentMethod(method, element) {
    selectedMethod = method;
    document.querySelectorAll('.payment-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');

    const cardFields = $('cardFieldsContainer');
    if (method === 'card') {
        cardFields.classList.remove('hidden');
    } else {
        cardFields.classList.add('hidden');
    }
}

async function processCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        showToast('Sua sacola está vazia!', 'error');
        return;
    }

    const buyerName = $('orderBuyerName').value.trim();
    const buyerPhone = $('orderBuyerPhone').value.trim();
    const buyerAddress = $('orderBuyerAddress').value.trim();
    const buyerDistrict = $('orderBuyerDistrict').value.trim();

    if (!buyerName || !buyerAddress || !buyerDistrict) {
        showToast('Por favor, preencha o endereço completo de Bebedouro.', 'error');
        return;
    }

    const finishBtn = $('btnFinishOrder');
    const finishText = $('btnFinishText');
    const finishSpinner = $('btnFinishSpinner');

    finishBtn.disabled = true;
    finishText.textContent = 'A processar transação segura...';
    finishSpinner.classList.remove('hidden');

    setTimeout(async () => {
        finishBtn.disabled = false;
        finishText.textContent = 'Confirmar e Finalizar Compra';
        finishSpinner.classList.add('hidden');

        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const orderId = `#VRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        if (currentUser) {
            try {
                for (const item of cart) {
                    await db.from('sales').insert({ product_id: item.id, buyer_id: currentUser.id });
                }
            } catch (err) {
                console.log('Venda simulada localmente:', err.message);
            }
        }

        showPaymentSuccessModal({
            orderId,
            buyerName,
            address: `${buyerAddress}, ${buyerDistrict} - Bebedouro/SP`,
            paymentMethod: selectedMethod.toUpperCase(),
            total,
            items: [...cart]
        });

        cart = [];
        saveCartToStorage();
        closeCart();
    }, 1200);
}

function showPaymentSuccessModal(data) {
    $('receiptOrderId').textContent = data.orderId;
    $('receiptBuyerName').textContent = data.buyerName;
    $('receiptBuyerAddress').textContent = data.address;
    
    let methodFormatted = 'PIX Instantâneo';
    if (data.paymentMethod === 'CARD') methodFormatted = 'Cartão de Crédito (3x)';
    if (data.paymentMethod === 'CASH') methodFormatted = 'Retirada com o Artesão';
    $('receiptPaymentMethod').textContent = methodFormatted;
    
    $('receiptTotalValue').textContent = `R$ ${data.total.toFixed(2).replace('.', ',')}`;

    $('receiptItemsSummary').innerHTML = data.items.map(i => `
        <div class="receipt-item-line">
            <span>${i.quantity}x ${i.title}</span>
            <strong>R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}</strong>
        </div>
    `).join('');

    $('successModalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
    $('successModalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    showView('catalog');
}

/* --- PAINEL DO ARTESÃO --- */
let currentImageLocalPath = null;
$('prodImageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentImageLocalPath = 'img/' + file.name;
    $('imagePreview').src = URL.createObjectURL(file);
    $('imagePreview').classList.remove('hidden');
    document.querySelector('.upload-placeholder').classList.add('hidden');
});

$('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentImageLocalPath) { showToast('A fotografia da obra é obrigatória!', 'error'); return; }
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A moldar a argila...';

    const prod = {
        artisan_id: currentUser.id,
        title: $('prodTitle').value.trim(),
        price: parseFloat($('prodPrice').value),
        category: $('prodCategory').value,
        description: $('prodDesc').value.trim(),
        image_url: currentImageLocalPath 
    };
    
    const { error } = await db.from('products').insert([prod]);
    btn.disabled = false; btn.textContent = 'Publicar no Catálogo';

    if (error) { 
        showToast(error.message, 'error'); 
    } else {
        showToast('Peça catalogada com sucesso!');
        $('productForm').reset();
        currentImageLocalPath = null;
        $('imagePreview').classList.add('hidden');
        document.querySelector('.upload-placeholder').classList.remove('hidden');
        loadArtisanProducts();
    }
});

async function loadArtisanProducts() {
    const { data } = await db.from('products').select('*').eq('artisan_id', currentUser.id).order('created_at', { ascending: false });
    if (!data || data.length === 0) { 
        $('myProducts').innerHTML = '<p class="lead-text">Seu ateliê ainda não possui obras cadastradas.</p>'; 
        return; 
    }
    
    $('myProducts').innerHTML = data.map(p => `
        <div class="work-item-dash">
            <img src="${p.image_url}" onerror="this.onerror=null; this.src='https://via.placeholder.com/220x160?text=Sem+Foto'">
            <div class="work-item-info">
                <strong>${p.title}</strong>
                <span style="color: var(--terra-main); font-weight: 700;">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
            </div>
            <button class="btn-delete" onclick="deleteProd(${p.id})">Retirar da Feira</button>
        </div>
    `).join('');
}

window.deleteProd = async (id) => {
    if (confirm('Deseja retirar esta obra do catálogo?')) {
        await db.from('products').delete().eq('id', id);
        showToast('Peça recolhida com sucesso.');
        loadArtisanProducts();
    }
};

async function loadReport() {
    const { data: prods } = await db.from('products').select('id').eq('artisan_id', currentUser.id);
    if (prods && prods.length > 0) {
        const ids = prods.map(p => p.id);
        const { data: sales } = await db.from('sales').select('id').in('product_id', ids);
        $('repSales').textContent = sales ? sales.length : 0;
    } else { 
        $('repSales').textContent = 0; 
    }
    $('repViews').textContent = Math.floor(Math.random() * 800) + 320;
}

init();
