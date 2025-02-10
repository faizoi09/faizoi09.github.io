class POSSystem {
    constructor() {
        this.cart = [];
        this.products = []; // Simpan semua produk
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.setupEventListeners();
        this.cartButtonsInitialized = false;
        this.allProducts = []; // Untuk menyimpan semua produk asli
        this.waNumber = '';
        this.storeAddress = '';
        this.website = '';
        this.storeName = '';
        this.bankAccount = '';
        this.SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWZzaLTiUsY1517Ssdw3LFr3KqvBpwytjd5iCAgJw5O3m_z-HzdyZyjte6n8PlN7zO/exec';
        
        this.initSystem();
    }

    async initSystem() {
        try {
            await this.loadStoreInfo();
            this.init();
        } catch (error) {
            console.error('Error initializing system:', error);
        }
    }

    init() {
        if (!this.cart) {
            this.cart = [];
        }
        this.loadProducts();
        this.updateCartDisplay();

        // Cek login status setelah load produk
        const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
        if (loggedInUser) {
            this.showUserInfo(loggedInUser);
        }
    }

    showUserInfo(user) {
        try {
            const userDisplay = document.getElementById('userDisplay');
            const navUser = document.querySelector('.nav-user');
            const loginMenu = document.querySelector('.nav-login');
            
            if (user) {
                // User sudah login
                if (userDisplay) {
                    userDisplay.textContent = `${user.username} (${user.role})`;
                }
                if (navUser) {
                    navUser.style.display = 'flex';
                }
                if (loginMenu) {
                    loginMenu.style.display = 'none';
                }
                
                // Tampilkan menu admin jika rolenya admin
                const adminMenu = document.querySelector('.admin-only');
                if (adminMenu && user.role === 'admin') {
                    adminMenu.style.display = 'flex';
                }
            } else {
                // User belum login
                if (navUser) {
                    navUser.style.display = 'none';
                }
                if (loginMenu) {
                    loginMenu.style.display = 'flex';
                }
                const adminMenu = document.querySelector('.admin-only');
                if (adminMenu) {
                    adminMenu.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error showing user info:', error);
        }
    }

    logout() {
        try {
            // Hapus data login
            localStorage.removeItem('loggedInUser');
            sessionStorage.removeItem('loggedInUser');
            
            // Reset tampilan UI untuk user yang tidak login
            this.showUserInfo(null);
            
            // Refresh halaman utama
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error during logout:', error);
            window.location.href = 'index.html';
        }
    }

    loadProducts() {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '<div class="loading">Memuat data produk...</div>';

        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWZzaLTiUsY1517Ssdw3LFr3KqvBpwytjd5iCAgJw5O3m_z-HzdyZyjte6n8PlN7zO/exec';
        
        // Buat URL dengan parameter
        const url = new URL(SCRIPT_URL);
        url.searchParams.set('action', 'getProducts');
        url.searchParams.set('t', Date.now()); // Cache buster
        
        // Gunakan JSONP untuk menghindari masalah CORS
        const callbackName = 'handleProductData_' + Date.now();
        url.searchParams.set('callback', callbackName);
        
        // Buat fungsi callback global
        window[callbackName] = (response) => {
            try {
                if (response.status === 'success' && Array.isArray(response.data)) {
                    this.displayProducts(response.data);
                } else {
                    throw new Error(response.message || 'Format data tidak valid');
                }
            } catch (error) {
                console.error('Error:', error);
                productsGrid.innerHTML = `
                    <div class="error-message">
                        ${error.message}
                        <button onclick="pos.loadProducts()">Coba Lagi</button>
                    </div>
                `;
            } finally {
                // Bersihkan callback
                delete window[callbackName];
            }
        };

        // Buat dan tambahkan script tag
        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
            productsGrid.innerHTML = `
                <div class="error-message">
                    Gagal terhubung ke server. Silakan coba lagi.
                    <button onclick="pos.loadProducts()">Coba Lagi</button>
                </div>
            `;
            delete window[callbackName];
        };
        
        document.body.appendChild(script);
    }

    displayProducts(products) {
        // Simpan semua produk
        this.allProducts = products;
        this.products = products;
        
        this.renderProducts(this.products);
    }

    renderProducts(productsToShow) {
        const productsGrid = document.getElementById('productsGrid');
        
        if (!productsToShow || productsToShow.length === 0) {
            productsGrid.innerHTML = '<div class="no-results">Tidak ada produk yang ditemukan</div>';
            return;
        }

        const totalPages = Math.ceil(productsToShow.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, productsToShow.length);
        const currentProducts = productsToShow.slice(startIndex, endIndex);

        productsGrid.innerHTML = `
            <div class="products-container">
                ${currentProducts.map(product => {
                    const isInCart = this.cart.some(item => item.id === product.id);
                    return `
                        <div class="product-card" data-id="${product.id}">
                            <div class="product-image">
                                ${product.gambar_produk ? 
                                    `<img src="${product.gambar_produk}" alt="${product.nama_produk}" onerror="this.src='images/no-image.png'">` : 
                                    `<img src="images/no-image.png" alt="No Image">`
                                }
                            </div>
                            <div class="product-info">
                                <h3>${product.nama_produk}</h3>
                                <p class="price">Rp ${this.formatNumber(product.harga)}</p>
                                <p class="stock">Stok: ${product.stok} ${product.satuan || 'pcs'}</p>
                                <button onclick="window.pos.addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
                                    class="${isInCart ? 'in-cart' : ''}">
                                    ${isInCart ? 'Dalam Keranjang' : 'Tambah ke Keranjang'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            ${this.createPagination(totalPages)}
        `;
    }

    createPagination(totalPages) {
        if (totalPages <= 1) return '';

        let paginationHtml = `
            <div class="pagination">
                <button class="page-btn prev-btn" ${this.currentPage === 1 ? 'disabled' : ''}>
                    &laquo; Prev
                </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <button class="page-btn number-btn ${i === this.currentPage ? 'active' : ''}" 
                    data-page="${i}">
                    ${i}
                </button>
            `;
        }

        paginationHtml += `
                <button class="page-btn next-btn" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next &raquo;
                </button>
            </div>
        `;

        return paginationHtml;
    }

    setupPaginationListeners() {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        pagination.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.classList.contains('prev-btn') && this.currentPage > 1) {
                this.currentPage--;
                this.renderProducts(this.products);
            } else if (button.classList.contains('next-btn') && 
                      this.currentPage < Math.ceil(this.products.length / this.itemsPerPage)) {
                this.currentPage++;
                this.renderProducts(this.products);
            } else if (button.classList.contains('number-btn')) {
                const page = parseInt(button.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderProducts(this.products);
                }
            }
        });
    }

    formatNumber(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }

    addToCart(product) {
        try {
            if (!product || !product.id) {
                console.error('Invalid product:', product);
                return;
            }

            const existingItem = this.cart.find(item => item.id === product.id);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stok) {
                    alert(`Stok tidak mencukupi. Stok tersedia: ${product.stok}`);
                    return;
                }
                existingItem.quantity += 1;
            } else {
                this.cart.push({
                    ...product,
                    quantity: 1
                });
            }
            
            this.updateCartDisplay();
            this.updateCartBadge();
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }

    setupEventListeners() {
        // Perbaiki event listener untuk grid produk
        document.getElementById('productsGrid').addEventListener('click', (e) => {
            const addButton = e.target.closest('button');
            if (addButton && addButton.onclick) {
                // Event sudah ditangani oleh onclick di button
                return;
            }
        });

        // Event listener untuk checkout
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this.checkout();
            });
        }

        // Tambahkan event listener untuk link login
        const loginLink = document.querySelector('.nav-login');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginModal();
            });
        }

        // Tutup modal ketika klik di luar modal
        window.onclick = (event) => {
            const cartModal = document.getElementById('cartModal');
            const strukModal = document.getElementById('strukModal');
            
            if (event.target === cartModal) {
                this.toggleCart();
            }
            if (event.target === strukModal) {
                strukModal.style.display = 'none';
            }
        };
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Keranjang kosong</div>';
            cartTotal.textContent = 'Rp 0';
            document.getElementById('checkoutBtn').disabled = true;
            return;
        }

        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="item-info">
                    <h4>${item.nama_produk}</h4>
                    <p>Rp ${this.formatNumber(item.harga)} x ${item.quantity}</p>
                </div>
                <div class="item-total">
                    Rp ${this.formatNumber(item.harga * item.quantity)}
                </div>
                <div class="item-actions">
                    <button type="button" 
                        class="qty-btn minus-btn" 
                        onclick="window.pos.decreaseQuantity(${item.id})"
                        ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button type="button" 
                        class="qty-btn plus-btn" 
                        onclick="window.pos.increaseQuantity(${item.id})"
                        ${item.quantity >= item.stok ? 'disabled' : ''}>+</button>
                    <button type="button" 
                        class="remove-btn" 
                        onclick="window.pos.removeFromCart(${item.id})">×</button>
                </div>
            </div>
        `).join('');

        const total = this.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
        cartTotal.textContent = `Rp ${this.formatNumber(total)}`;
        document.getElementById('checkoutBtn').disabled = false;

        // Update tampilan tombol di produk
        const productButtons = document.querySelectorAll('.product-card button');
        productButtons.forEach(button => {
            const productId = parseInt(button.closest('.product-card').dataset.id);
            const isInCart = this.cart.some(item => item.id === productId);
            
            if (isInCart) {
                button.classList.add('in-cart');
                button.textContent = 'Dalam Keranjang';
            } else {
                button.classList.remove('in-cart');
                button.textContent = 'Tambah ke Keranjang';
            }
        });
    }

    decreaseQuantity(itemId) {
        try {
            const item = this.cart.find(item => item.id === itemId);
            if (!item) return;

            if (item.quantity > 1) {
                item.quantity -= 1;
                this.updateCartDisplay();
                this.updateCartBadge();
            } else {
                if (confirm('Hapus produk dari keranjang?')) {
                    this.removeFromCart(itemId);
                    
                    // Reset tombol jika keranjang kosong
                    if (this.cart.length === 0) {
                        this.resetAllCartButtons();
                    }
                }
            }
        } catch (error) {
            console.error('Error decreasing quantity:', error);
        }
    }

    increaseQuantity(itemId) {
        try {
            const item = this.cart.find(item => item.id === itemId);
            if (!item) return;

            if (item.quantity < item.stok) {
                item.quantity += 1;
                this.updateCartDisplay();
                this.updateCartBadge();
            } else {
                alert(`Stok tidak mencukupi. Stok tersedia: ${item.stok}`);
            }
        } catch (error) {
            console.error('Error increasing quantity:', error);
        }
    }

    removeFromCart(itemId) {
        try {
            const index = this.cart.findIndex(item => item.id === itemId);
            if (index !== -1) {
                const item = this.cart[index];
                if (confirm(`Hapus ${item.nama_produk} dari keranjang?`)) {
                    this.cart.splice(index, 1);
                    this.updateCartDisplay();
                    this.updateCartBadge();
                    
                    // Update tampilan tombol produk yang dihapus
                    const productButton = document.querySelector(`.product-card[data-id="${itemId}"] button`);
                    if (productButton) {
                        productButton.classList.remove('in-cart');
                        productButton.textContent = 'Tambah ke Keranjang';
                    }
                }
            }
        } catch (error) {
            console.error('Error removing item:', error);
        }
    }

    calculateChange() {
        const cashInput = document.getElementById('cashInput');
        const changeAmount = document.getElementById('changeAmount');
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        const total = this.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
        const cash = parseFloat(cashInput.value) || 0;
        const change = cash - total;
        
        // Format dan tampilkan kembalian
        changeAmount.textContent = `Rp ${this.formatNumber(change)}`;
        
        // Atur warna berdasarkan nilai kembalian
        if (change < 0) {
            changeAmount.className = 'negative';
            checkoutBtn.disabled = true;
        } else if (change >= 0 && this.cart.length > 0) {
            changeAmount.className = 'positive';
            checkoutBtn.disabled = false;
        } else {
            changeAmount.className = '';
            checkoutBtn.disabled = true;
        }
    }

    async loadStoreInfo() {
        return new Promise((resolve, reject) => {
            const callbackName = 'handleStoreInfo_' + Date.now();
            let timeoutId;

            window[callbackName] = (response) => {
                clearTimeout(timeoutId);
                try {
                    if (response.status === 'success' && response.data) {
                        this.waNumber = response.data.waNumber;
                        this.storeAddress = response.data.address;
                        this.website = response.data.website;
                        this.storeName = response.data.storeName;
                        this.bankAccount = response.data.bankAccount;
                        
                        // Update judul di navbar
                        const storeTitle = document.getElementById('storeName');
                        if (storeTitle) {
                            storeTitle.textContent = this.storeName || 'TOKO-KU';
                        }
                        
                        // Update nama toko di struk
                        const strukStoreName = document.getElementById('strukStoreName');
                        if (strukStoreName) {
                            strukStoreName.textContent = this.storeName || 'TOKO-KU';
                        }
                        
                        console.log('Store info loaded:', response.data);
                        resolve(response.data);
                    } else {
                        const error = new Error(response.message || 'Gagal memuat informasi toko');
                        console.error('Store info error:', error);
                        reject(error);
                    }
                } catch (error) {
                    console.error('Error processing store info:', error);
                    reject(error);
                } finally {
                    this.cleanupCallback(callbackName);
                }
            };

            const script = document.createElement('script');
            script.src = `${this.SCRIPT_URL}?action=getStoreInfo&callback=${callbackName}&t=${Date.now()}`;
            
            timeoutId = setTimeout(() => {
                this.cleanupCallback(callbackName);
                reject(new Error('Timeout memuat informasi toko'));
            }, 10000);

            script.onerror = () => {
                clearTimeout(timeoutId);
                this.cleanupCallback(callbackName);
                reject(new Error('Gagal memuat script informasi toko'));
            };

            document.body.appendChild(script);
        });
    }

    cleanupCallback(callbackName) {
        const script = document.querySelector(`script[src*="callback=${callbackName}"]`);
        if (script) {
            document.body.removeChild(script);
        }
        delete window[callbackName];
    }

    async checkout() {
        if (this.cart.length === 0) {
            alert('Keranjang belanja kosong!');
            return;
        }

        // Validasi form pembeli
        const buyerData = this.validateBuyerForm();
        if (!buyerData) return;

        try {
            // Coba load nomor WA jika belum ada
            if (!this.waNumber) {
                try {
                    await this.loadStoreInfo();
                } catch (error) {
                    console.error('Error loading store info:', error);
                    throw new Error('Gagal memuat informasi toko. Silakan coba lagi.');
                }
            }

            const total = this.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
            
            // Tampilkan struk dalam modal
            const strukData = {
                tanggal: new Date().toLocaleString('id-ID'),
                items: this.cart,
                total: total,
                cash: total,
                change: 0,
                buyer: buyerData
            };
            
            this.showStruk(strukData);
            
            // Reset keranjang dan form pembeli
            this.cart = [];
            this.updateCartDisplay();
            this.resetBuyerForm();
            this.updateCartBadge();
            this.toggleCart();

            // Fokus ke input nama pembeli untuk transaksi berikutnya
            document.getElementById('buyerName').focus();

        } catch (error) {
            console.error('Error during checkout:', error);
            alert(error.message || 'Terjadi kesalahan saat memproses transaksi. Silakan coba lagi.');
        }
    }

    generateWhatsAppMessage(strukData) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const tanggal = new Date().toLocaleDateString('id-ID', options);

        // Header struk dengan nama toko dari spreadsheet
        let message = `*${this.storeName || 'TOKO'}*\n`;
        message += `───────────────────\n`;
        message += `📅 ${tanggal}\n`;
        message += `👤 Pembeli: ${strukData.buyer.name}\n`;
        message += `───────────────────\n\n`;

        // Detail pembelian
        message += `*DETAIL PEMBELIAN*\n`;
        
        // Hitung panjang maksimum untuk rata kanan
        const maxLength = 35;
        
        // Tambahkan setiap item dengan format yang rapi
        strukData.items.forEach((item, index) => {
            const subtotal = item.harga * item.quantity;
            
            // Nomor urut item
            message += `${index + 1}. ${item.nama_produk}\n`;
            
            // Quantity dan harga satuan
            const qtyText = `   ${item.quantity} ${item.satuan} x Rp ${this.formatNumber(item.harga)}`;
            message += `${qtyText}\n`;
            
            // Subtotal dengan rata kanan
            const subtotalText = `Rp ${this.formatNumber(subtotal)}`;
            const spaces = ' '.repeat(maxLength - subtotalText.length);
            message += `   ${spaces}${subtotalText}\n`;
            
            // Separator antar item
            if (index < strukData.items.length - 1) {
                message += `   ----------------------\n`;
            }
        });

        // Footer dengan informasi toko dari spreadsheet
        message += `\n═══════════════════════\n`;
        const totalText = `*TOTAL: Rp ${this.formatNumber(strukData.total)}*`;
        const totalSpaces = ' '.repeat(Math.max(0, 35 - totalText.length));
        message += `${totalSpaces}${totalText}\n`;
        message += `═══════════════════════\n\n`;

        message += `💐 *Terima kasih atas pembelian Anda* 💐\n`;
        message += `───────────────────\n`;
        message += `📍 ${this.storeAddress || 'Alamat tidak tersedia'}\n`;
        message += `📞 ${this.waNumber}\n`;
        if (this.website) {
            message += `🌐 ${this.website}\n`;
        }
        message += `───────────────────\n\n`;
        message += `_Silahkan lanjutkan dengan mentransfer ke Rekening_\n`;
        message += `_${this.bankAccount}_\n`;

        return message;
    }

    showStruk(strukData) {
        const modal = document.getElementById('strukModal');
        if (!modal) {
            console.error('Modal struk tidak ditemukan!');
            return;
        }
        
        try {
            // Reset semua elemen struk terlebih dahulu
            this.resetStruk();
            
            // Generate nomor struk
            const noStruk = this.generateStrukNumber();
            document.getElementById('noStruk').textContent = `No: ${noStruk}`;

            // Perbaikan format tanggal
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            
            const tanggal = new Date().toLocaleDateString('id-ID', options);
            document.getElementById('tanggalStruk').textContent = tanggal;

            // Hapus tampilan kasir
            document.getElementById('kasirStruk').style.display = 'none';

            // Tampilkan items
            const itemList = document.getElementById('itemList');
            strukData.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-row';
                itemDiv.innerHTML = `
                    <span>${item.nama_produk} x${item.quantity}</span>
                    <span>Rp ${this.formatNumber(item.harga * item.quantity)}</span>
                `;
                itemList.appendChild(itemDiv);
            });

            // Tampilkan total
            document.getElementById('totalStruk').textContent = 
                `Rp ${this.formatNumber(strukData.total)}`;

            // Sembunyikan bagian pembayaran
            const paymentSection = document.querySelector('.payment-section');
            if (paymentSection) {
                paymentSection.style.display = 'none';
            }

            // Tambahkan informasi pembeli
            const buyerInfo = document.createElement('div');
            buyerInfo.className = 'buyer-info';
            buyerInfo.innerHTML = `
                <p>Pembeli: ${strukData.buyer.name}</p>
                <p>Alamat: ${strukData.buyer.address}</p>
                <p>WhatsApp: ${strukData.buyer.phone}</p>
            `;
            
            // Sisipkan setelah tanggal
            const tanggalStruk = document.getElementById('tanggalStruk');
            tanggalStruk.parentNode.insertBefore(buyerInfo, tanggalStruk.nextSibling);

            // Tampilkan modal
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error showing struk:', error);
            alert('Terjadi kesalahan saat menampilkan struk');
        }
    }

    generateStrukNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV/${year}${month}${day}/${random}`;
    }

    // Tambahkan method baru untuk menutup modal
    closeStruk() {
        const modal = document.getElementById('strukModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.currentPage = 1;
            this.renderProducts(this.allProducts);
            return;
        }

        const searchQuery = query.toLowerCase().trim();
        const filteredProducts = this.allProducts.filter(product => {
            return (
                product.nama_produk.toLowerCase().includes(searchQuery) ||
                product.id.toString().includes(searchQuery) ||
                product.harga.toString().includes(searchQuery)
            );
        });

        this.currentPage = 1;
        this.renderProducts(filteredProducts);
    }

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            // Reset form
            document.getElementById('loginForm').reset();
        }
    }

    closeLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        
        try {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            
            const validUsers = [
                { username: 'admin', password: 'admin123', role: 'admin' },
                { username: 'test', password: 'test123', role: 'kasir' }
            ];
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const user = validUsers.find(u => 
                u.username === username && u.password === password
            );
            
            if (user) {
                const userData = {
                    username: user.username,
                    role: user.role
                };
                sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
                
                // Update UI
                this.showUserInfo(userData);
                
                // Tutup modal
                this.closeLoginModal();
                
                // Tampilkan menu admin jika role admin
                const adminMenu = document.querySelector('.admin-only');
                if (adminMenu && user.role === 'admin') {
                    adminMenu.style.display = 'flex';
                    // Tanya user apakah ingin langsung ke panel admin
                    if (confirm('Login berhasil! Apakah Anda ingin membuka Panel Admin?')) {
                        window.location.href = 'admin/index.html';
                        return;
                    }
                }
                
                // Tampilkan pesan selamat datang
                const welcomeMessage = `Selamat datang, ${userData.username}!`;
                alert(welcomeMessage);
            } else {
                throw new Error('Username atau password salah. Silakan coba lagi.');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            alert(error.message);
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
        
        return false;
    }

    // Tambahkan method baru untuk validasi form pembeli
    validateBuyerForm() {
        const name = document.getElementById('buyerName').value.trim();
        const address = document.getElementById('buyerAddress').value.trim();
        const phone = document.getElementById('buyerPhone').value.trim();
        
        // Validasi nama
        if (!name) {
            alert('Nama pembeli harus diisi!');
            return false;
        }
        
        // Validasi alamat
        if (!address) {
            alert('Alamat harus diisi!');
            return false;
        }
        
        // Validasi nomor WhatsApp
        if (!phone) {
            alert('Nomor WhatsApp harus diisi!');
            return false;
        }
        
        // Validasi format nomor WhatsApp
        const phoneRegex = /^08[1-9][0-9]{7,11}$/;
        if (!phoneRegex.test(phone)) {
            alert('Format nomor WhatsApp tidak valid!\nContoh: 08123456789');
            return false;
        }
        
        return {
            name,
            address,
            phone
        };
    }

    // Modifikasi resetBuyerForm untuk memastikan form benar-benar bersih
    resetBuyerForm() {
        const buyerName = document.getElementById('buyerName');
        const buyerAddress = document.getElementById('buyerAddress');
        const buyerPhone = document.getElementById('buyerPhone');
        
        // Reset nilai input
        buyerName.value = '';
        buyerAddress.value = '';
        buyerPhone.value = '';
        
        // Hapus kelas validasi jika ada
        buyerName.classList.remove('valid', 'invalid');
        buyerAddress.classList.remove('valid', 'invalid');
        buyerPhone.classList.remove('valid', 'invalid');
    }

    // Tambahkan method baru untuk reset struk
    resetStruk() {
        // Reset nomor dan tanggal
        document.getElementById('noStruk').textContent = '';
        document.getElementById('tanggalStruk').textContent = '';
        
        // Reset daftar item
        document.getElementById('itemList').innerHTML = '';
        
        // Reset total
        document.getElementById('totalStruk').textContent = '';
        
        // Hapus info pembeli yang lama jika ada
        const oldBuyerInfo = document.querySelector('.buyer-info');
        if (oldBuyerInfo) {
            oldBuyerInfo.remove();
        }
    }

    sendToWhatsApp() {
        try {
            if (!this.waNumber) {
                alert('Nomor WhatsApp toko tidak tersedia');
                return;
            }

            // Ambil data struk yang ditampilkan
            const items = Array.from(document.querySelectorAll('#itemList .item-row')).map(row => {
                const itemText = row.querySelector('span:first-child').textContent;
                const itemTotal = row.querySelector('span:last-child').textContent;
                return `${itemText}: ${itemTotal}`;
            });

            const total = document.getElementById('totalStruk').textContent;
            const buyerName = document.querySelector('.buyer-info p:nth-child(1)').textContent;
            const buyerAddress = document.querySelector('.buyer-info p:nth-child(2)').textContent;
            const buyerPhone = document.querySelector('.buyer-info p:nth-child(3)').textContent;
            const noStruk = document.getElementById('noStruk').textContent;
            const tanggal = document.getElementById('tanggalStruk').textContent;

            // Buat pesan WhatsApp
            let message = `*${this.storeName || 'TOKO'}*\n`;
            message += `${noStruk}\n`;
            message += `${tanggal}\n\n`;
            message += `${buyerName}\n`;
            message += `${buyerAddress}\n`;
            message += `${buyerPhone}\n\n`;
            message += `*Detail Pesanan:*\n`;
            items.forEach(item => {
                message += `${item}\n`;
            });
            message += `\n*${total}*\n\n`;
            message += `Silakan transfer ke:\n`;
            message += `${this.bankAccount || '[Nomor Rekening]'}\n\n`;
            message += `Terima kasih telah berbelanja! 🙏`;

            // Buka WhatsApp dengan pesan yang sudah disiapkan
            const waURL = `https://wa.me/${this.waNumber}?text=${encodeURIComponent(message)}`;
            window.open(waURL, '_blank');

        } catch (error) {
            console.error('Error sending to WhatsApp:', error);
            alert('Terjadi kesalahan saat mengirim ke WhatsApp');
        }
    }

    // Tambahkan method untuk update badge keranjang
    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;
        
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        
        // Tambahkan animasi
        badge.classList.remove('animate');
        void badge.offsetWidth; // Trigger reflow
        badge.classList.add('animate');
    }

    // Tambahkan method untuk toggle cart modal
    toggleCart() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            } else {
                modal.style.display = 'block';
                this.updateCartDisplay(); // Refresh tampilan cart
            }
        }
    }
}

// Inisialisasi instance POS dan pasang ke window
window.addEventListener('DOMContentLoaded', () => {
    window.pos = new POSSystem();
});

// Fungsi untuk mencoba memuat ulang data
function retryLoad() {
    console.log('Retrying load...'); // Debug log
    new POSSystem().loadProducts();
}

// Fungsi untuk menutup modal struk
function closeStruk() {
    document.getElementById('strukModal').style.display = 'none';
}

// Tutup modal jika user klik di luar struk
window.onclick = function(event) {
    const modal = document.getElementById('strukModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

function printStruk() {
    const strukContent = document.querySelector('.struk-container').cloneNode(true);
    
    // Hapus tombol-tombol dari hasil cetak
    const buttons = strukContent.querySelector('.struk-buttons');
    if (buttons) {
        buttons.remove();
    }
    
    // Buat HTML untuk iframe
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    padding: 20px;
                    margin: 0;
                }
                
                .struk-container {
                    width: 80mm; /* Ukuran kertas struk standar */
                    margin: 0 auto;
                }
                
                .struk-header {
                    text-align: center;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .struk-header h2 {
                    margin: 0;
                    padding: 0;
                }
                
                .item-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                
                .total-section {
                    border-top: 1px dashed #000;
                    margin-top: 20px;
                    padding-top: 10px;
                }
                
                .payment-section {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px dashed #000;
                }
                
                .struk-footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 0.9em;
                    border-top: 1px dashed #000;
                    padding-top: 20px;
                }
                
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm 297mm; /* Ukuran kertas struk */
                    }
                    
                    body {
                        margin: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${strukContent.outerHTML}
        </body>
        </html>
    `;
    
    // Dapatkan iframe
    const iframe = document.getElementById('printFrame');
    const iframeDoc = iframe.contentWindow.document;
    
    // Tulis konten ke iframe
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();
    
    // Tunggu iframe selesai load
    iframe.onload = function() {
        // Cetak iframe
        iframe.contentWindow.print();
    };
}

function doGet(e) {
    // Pastikan CORS diset dengan benar
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        if (e.parameter.action === 'login') {
            return handleLogin(e);
        } else if (e.parameter.action === 'getProducts') {
            return handleProducts(e);
        } else {
            return output.setContent(JSON.stringify({
                status: 'error',
                message: 'Action tidak valid'
            }));
        }
    } catch (error) {
        return output.setContent(JSON.stringify({
            status: 'error',
            message: error.toString()
        }));
    }
}

function handleProducts(e) {
    try {
        // Log untuk debugging
        Logger.log('Accessing spreadsheet...');
        Logger.log('Spreadsheet ID: 1MPC3v_FvAHA6l10twq2klw3eqGrfIq1owa2k_Fnfedw');
        
        // Buka spreadsheet dengan ID yang benar
        const spreadsheet = SpreadsheetApp.openById('1HvfJUPkBNPGdB5Puhi46ENsoPNYdpxUEPcyjxpWhCFM');
        if (!spreadsheet) {
            throw new Error('Spreadsheet tidak ditemukan');
        }
        
        // Akses sheet 'stok barang'
        const sheet = spreadsheet.getSheetByName('stok barang');
        if (!sheet) {
            throw new Error('Sheet "stok barang" tidak ditemukan');
        }
        
        // Ambil data
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const products = [];
        
        // Proses data
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row[0]) { // Hanya ambil baris yang memiliki ID
                const product = {};
                for (let j = 0; j < headers.length; j++) {
                    product[headers[j]] = row[j];
                }
                products.push(product);
            }
        }
        
        // Log jumlah produk
        Logger.log('Products found: ' + products.length);
        
        const response = {
            status: 'success',
            data: products
        };
        
        // Handle JSONP
        if (e.parameter.callback) {
            return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(response) + ')')
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        
        // Handle JSON biasa
        return ContentService.createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON)
            .setHeader('Access-Control-Allow-Origin', '*');
        
    } catch (error) {
        Logger.log('Error in handleProducts: ' + error.toString());
        Logger.log('Stack: ' + error.stack);
        
        const response = {
            status: 'error',
            message: 'Gagal memuat data: ' + error.toString()
        };
        
        if (e.parameter.callback) {
            return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(response) + ')')
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        
        return ContentService.createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON)
            .setHeader('Access-Control-Allow-Origin', '*');
    }
}

function handleLogin(e) {
    try {
        const username = e.parameter.username;
        const password = e.parameter.password;
        
        // Gunakan spreadsheet yang sama
        const spreadsheetId = '1HvfJUPkBNPGdB5Puhi46ENsoPNYdpxUEPcyjxpWhCFM';
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = spreadsheet.getSheetByName('users');
        
        if (!sheet) {
            throw new Error('Sheet "users" tidak ditemukan');
        }

        const data = sheet.getDataRange().getValues();
        
        // Cek kredensial
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === username && data[i][1] === password) {
                const response = {
                    status: 'success',
                    message: 'Login berhasil',
                    user: {
                        username: username,
                        role: data[i][2] || 'user'
                    }
                };
                
                if (e.parameter.callback) {
                    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(response) + ')')
                        .setMimeType(ContentService.MimeType.JAVASCRIPT);
                }
                
                return ContentService.createTextOutput(JSON.stringify(response))
                    .setMimeType(ContentService.MimeType.JSON)
                    .setHeader('Access-Control-Allow-Origin', '*');
            }
        }
        
        throw new Error('Username atau password salah');
        
    } catch (error) {
        Logger.log('Error in handleLogin: ' + error.toString()); // Tambah logging
        const response = {
            status: 'error',
            message: error.toString()
        };
        
        if (e.parameter.callback) {
            return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(response) + ')')
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        
        return ContentService.createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON)
            .setHeader('Access-Control-Allow-Origin', '*');
    }
}

// Fungsi untuk modal
function closeModal() {
    document.getElementById('strukModal').style.display = 'none';
}

function openModal() {
    document.getElementById('strukModal').style.display = 'block';
}

// Event listener untuk menutup modal saat klik di luar
window.addEventListener('click', function(event) {
    let modal = document.getElementById('strukModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});