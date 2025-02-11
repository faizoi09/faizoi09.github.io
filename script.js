class POSSystem {
    constructor() {
        this.cart = [];
        this.products = [];
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.setupEventListeners();
        this.allProducts = [];
        this.waNumber = '';
        this.storeAddress = '';
        this.website = '';
        this.storeName = '';
        this.bankAccount = '';
        this.SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_QwA2iLE2ID_NftmWge8kQFUXak6L4qO4QHUwnn-Szj89ZgUXm7zUiMp79vD2wVl6/exec';
        
        this.initSystem();
        this.lastTransaction = null;
        this.currentProduct = null;
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
    }

    setupEventListeners() {
        document.getElementById('productsGrid').addEventListener('click', (e) => {
            const addButton = e.target.closest('button');
            if (addButton && addButton.onclick) {
                return;
            }
        });

        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this.checkout();
            });
        }

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

    loadProducts() {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '<div class="loading">Memuat data produk...</div>';
        
        const url = new URL(this.SCRIPT_URL);
        url.searchParams.set('action', 'getProducts');
        url.searchParams.set('t', Date.now());
        
        const callbackName = 'handleProductData_' + Date.now();
        url.searchParams.set('callback', callbackName);
        
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
                delete window[callbackName];
            }
        };

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

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, productsToShow.length);
        const currentProducts = productsToShow.slice(startIndex, endIndex);
        const totalPages = Math.ceil(productsToShow.length / this.itemsPerPage);

        productsGrid.innerHTML = currentProducts.map(product => `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image" onclick="window.pos.showProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    ${product.gambar_produk ? 
                        `<img src="${product.gambar_produk}" alt="${product.nama_produk}" onerror="this.src='images/no-image.png'">` : 
                        `<img src="images/no-image.png" alt="No Image">`
                    }
                </div>
                <div class="product-info">
                    <h3 onclick="window.pos.showProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">${product.nama_produk}</h3>
                    <p class="price">Rp ${this.formatNumber(product.harga)}</p>
                    <p class="stock">Stok: ${product.stok} ${product.satuan || 'pcs'}</p>
                    <button onclick="window.pos.addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
                        class="${this.cart.some(item => item.id === product.id) ? 'in-cart' : ''}">
                        ${this.cart.some(item => item.id === product.id) ? 'Dalam Keranjang' : 'Tambah ke Keranjang'}
                    </button>
                </div>
            </div>
        `).join('');

        if (totalPages > 1) {
            const pagination = document.createElement('div');
            pagination.className = 'pagination';
            
            if (this.currentPage > 1) {
                pagination.innerHTML += `
                    <button class="page-btn prev-btn" onclick="window.pos.changePage(${this.currentPage - 1})">
                        Sebelumnya
                    </button>
                `;
            }

            for (let i = 1; i <= totalPages; i++) {
                if (
                    i === 1 || 
                    i === totalPages || 
                    (i >= this.currentPage - 1 && i <= this.currentPage + 1)
                ) {
                    pagination.innerHTML += `
                        <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="window.pos.changePage(${i})">
                            ${i}
                        </button>
                    `;
                } else if (
                    i === this.currentPage - 2 || 
                    i === this.currentPage + 2
                ) {
                    pagination.innerHTML += `<span class="page-dots">...</span>`;
                }
            }

            if (this.currentPage < totalPages) {
                pagination.innerHTML += `
                    <button class="page-btn next-btn" onclick="window.pos.changePage(${this.currentPage + 1})">
                        Berikutnya
                    </button>
                `;
            }

            productsGrid.appendChild(pagination);
        }
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
        
        changeAmount.textContent = `Rp ${this.formatNumber(change)}`;
        
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
        try {
            const url = new URL(this.SCRIPT_URL);
            url.searchParams.set('action', 'getStoreInfo');
            url.searchParams.set('t', Date.now());
            
            // Buat callback unik
            const callbackName = 'handleStoreInfo_' + Date.now();
            url.searchParams.set('callback', callbackName);
            
            // Buat promise untuk menangani JSONP
            const storeInfoPromise = new Promise((resolve, reject) => {
                window[callbackName] = (response) => {
                    if (response.status === 'success') {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.message || 'Gagal memuat informasi toko'));
                    }
                    // Bersihkan callback
                    delete window[callbackName];
                    document.body.removeChild(script);
                };
            });

            // Buat dan tambahkan script tag
            const script = document.createElement('script');
            script.src = url.toString();
            script.onerror = () => {
                reject(new Error('Gagal memuat script store info'));
                delete window[callbackName];
                document.body.removeChild(script);
            };
            document.body.appendChild(script);

            // Tunggu response
            const data = await storeInfoPromise;
            
            // Update store info
            this.waNumber = data.waNumber;
            this.storeAddress = data.address;
            this.website = data.website;
            this.storeName = data.storeName;
            this.bankAccount = data.bankAccount;
            
            // Update store name
            const storeNameElements = ['storeName', 'footerStoreName', 'strukStoreName'];
            storeNameElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = this.storeName || 'BOUQUET MIS-RIN';
            });
            
            // Update footer info
            const footerAddress = document.getElementById('footerAddress');
            if (footerAddress) {
                footerAddress.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${this.storeAddress || 'Alamat tidak tersedia'}`;
            }
            
            const footerWhatsapp = document.getElementById('footerWhatsapp');
            if (footerWhatsapp) {
                footerWhatsapp.innerHTML = `<i class="fab fa-whatsapp"></i> ${this.waNumber || 'WhatsApp tidak tersedia'}`;
            }
            
            const footerWebsite = document.getElementById('footerWebsite');
            if (footerWebsite) {
                if (this.website) {
                    footerWebsite.innerHTML = `<i class="fas fa-globe"></i> <a href="${this.website}" target="_blank">${this.website}</a>`;
                } else {
                    footerWebsite.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('Error loading store info:', error);
            
            // Set default values jika gagal
            this.storeName = 'BOUQUET MIS-RIN';
            this.storeAddress = 'Alamat tidak tersedia';
            this.waNumber = 'WhatsApp tidak tersedia';
            this.website = '';
            
            // Update UI dengan default values
            document.getElementById('storeName').textContent = this.storeName;
            document.getElementById('footerStoreName').textContent = this.storeName;
            document.getElementById('footerAddress').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${this.storeAddress}`;
            document.getElementById('footerWhatsapp').innerHTML = `<i class="fab fa-whatsapp"></i> ${this.waNumber}`;
            document.getElementById('footerWebsite').style.display = 'none';
            
            throw error;
        }
    }

    async checkout() {
        if (this.cart.length === 0) {
            alert('Keranjang belanja kosong!');
            return;
        }

        const buyerData = this.validateBuyerForm();
        if (!buyerData) return;

        try {
            if (!this.waNumber) {
                try {
                    await this.loadStoreInfo();
                } catch (error) {
                    console.error('Error loading store info:', error);
                    throw new Error('Gagal memuat informasi toko. Silakan coba lagi.');
                }
            }

            const total = this.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
            
            this.lastTransaction = {
                items: [...this.cart],
                total: total,
                buyer: { ...buyerData }
            };
            
            this.showStruk(this.lastTransaction);
            
            const productButtons = document.querySelectorAll('.product-card button');
            productButtons.forEach(button => {
                button.classList.remove('in-cart');
                button.textContent = 'Tambah ke Keranjang';
            });
            
            this.cart = [];
            this.updateCartDisplay();
            this.resetBuyerForm();
            this.updateCartBadge();
            this.toggleCart();

            document.getElementById('buyerName').focus();

        } catch (error) {
            console.error('Error during checkout:', error);
            alert(error.message || 'Terjadi kesalahan saat memproses transaksi. Silakan coba lagi.');
        }
    }

    generateWhatsAppMessage(strukData) {
        const tanggal = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (!strukData.items || strukData.items.length === 0) {
            console.error('Tidak ada item dalam strukData');
            return 'Error: Data pesanan kosong';
        }

        let message = `🏪 *${this.storeName || 'TOKO'}*\n`;
        message += `📅 ${tanggal}\n`;
        message += `👤 ${strukData.buyer.name}\n\n`;
        
        message += `📝 *DETAIL PESANAN:*\n`;
        strukData.items.forEach((item, index) => {
            if (!item || !item.nama_produk) {
                console.error('Item tidak valid:', item);
                return;
            }
            
            const subtotal = item.harga * item.quantity;
            message += `${index + 1}. *${item.nama_produk}*\n`;
            message += `   • Jumlah: ${item.quantity} ${item.satuan || 'pcs'}\n`;
            message += `   • Harga: Rp ${this.formatNumber(item.harga)}\n`;
            message += `   • Subtotal: Rp ${this.formatNumber(subtotal)}\n`;
            message += `   ---------------\n`;
        });

        message += `\n💰 *TOTAL: Rp ${this.formatNumber(strukData.total)}*\n\n`;
        
        message += `🏦 *Pembayaran via Transfer:*\n`;
        message += `${this.bankAccount}\n\n`;
        
        message += `📍 ${this.storeAddress || 'Alamat tidak tersedia'}\n`;
        if (this.website) {
            message += `🌐 ${this.website}\n`;
        }
        
        message += `\nTerima kasih telah berbelanja! 🙏`;

        return message;
    }

    showStruk(strukData) {
        try {
            const modal = document.getElementById('strukModal');
            if (!modal) {
                console.error('Modal struk tidak ditemukan');
                return;
            }

            // Set store name
            const storeNameEl = document.getElementById('strukStoreName');
            if (storeNameEl) {
                storeNameEl.textContent = this.storeName || 'BOUQUET MIS-RIN';
            }

            // Set nomor struk
            const noStrukEl = document.getElementById('noStruk');
            if (noStrukEl) {
                noStrukEl.textContent = `No: ${this.generateStrukNumber()}`;
            }

            // Set tanggal
            const tanggalEl = document.getElementById('tanggalStruk');
            if (tanggalEl) {
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                };
                tanggalEl.textContent = new Date().toLocaleDateString('id-ID', options);
            }

            // Set buyer info
            const buyerNameEl = document.getElementById('buyerNameStruk');
            const buyerAddressEl = document.getElementById('buyerAddressStruk');
            const buyerPhoneEl = document.getElementById('buyerPhoneStruk');

            if (buyerNameEl && strukData.buyer) {
                buyerNameEl.textContent = `Pembeli: ${strukData.buyer.name}`;
            }
            if (buyerAddressEl && strukData.buyer) {
                buyerAddressEl.textContent = `Alamat: ${strukData.buyer.address}`;
            }
            if (buyerPhoneEl && strukData.buyer) {
                buyerPhoneEl.textContent = `WhatsApp: ${strukData.buyer.phone}`;
            }

            // Set items
            const itemList = document.getElementById('itemList');
            if (itemList && strukData.items) {
                itemList.innerHTML = strukData.items.map(item => `
                    <div class="item-row">
                        <span>${item.nama_produk} x${item.quantity}</span>
                        <span>Rp ${this.formatNumber(item.harga * item.quantity)}</span>
                    </div>
                `).join('');
            }

            // Set total
            const totalEl = document.getElementById('totalStruk');
            if (totalEl) {
                totalEl.textContent = `Rp ${this.formatNumber(strukData.total)}`;
            }

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

    searchProducts(query) {
        if (!query.trim()) {
            this.currentPage = 1;
            this.renderProducts(this.allProducts);
            return;
        }

        const searchQuery = query.toLowerCase().trim();
        const filteredProducts = this.allProducts.filter(product => 
            product.nama_produk.toLowerCase().includes(searchQuery) ||
            product.id.toString().includes(searchQuery) ||
            product.harga.toString().includes(searchQuery)
        );

        this.currentPage = 1;
        this.renderProducts(filteredProducts);
    }

    validateBuyerForm() {
        const name = document.getElementById('buyerName').value.trim();
        const address = document.getElementById('buyerAddress').value.trim();
        const phone = document.getElementById('buyerPhone').value.trim();
        
        if (!name) {
            alert('Nama pembeli harus diisi!');
            return false;
        }
        
        if (!address) {
            alert('Alamat harus diisi!');
            return false;
        }
        
        if (!phone) {
            alert('Nomor WhatsApp harus diisi!');
            return false;
        }
        
        if (!/^08[1-9][0-9]{7,11}$/.test(phone)) {
            alert('Format nomor WhatsApp tidak valid!\nContoh: 08123456789');
            return false;
        }
        
        return { name, address, phone };
    }

    resetBuyerForm() {
        document.getElementById('buyerName').value = '';
        document.getElementById('buyerAddress').value = '';
        document.getElementById('buyerPhone').value = '';
    }

    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            badge.textContent = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        }
    }

    toggleCart() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
            if (modal.style.display === 'block') {
                this.updateCartDisplay();
            }
        }
    }

    sendToWhatsApp() {
        if (!this.waNumber) {
            alert('Nomor WhatsApp toko tidak tersedia');
            return;
        }

        if (!this.lastTransaction) {
            alert('Tidak ada data transaksi yang tersedia');
            return;
        }

        const message = this.generateWhatsAppMessage(this.lastTransaction);
        window.open(`https://wa.me/${this.waNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }

    changePage(pageNumber) {
        this.currentPage = pageNumber;
        this.renderProducts(this.products);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showProductModal(product) {
        this.currentProduct = product;
        const modal = document.getElementById('productModal');
        const imageContainer = document.querySelector('.product-image-zoom');
        const img = document.getElementById('modalProductImage');
        const thumbnailsContainer = document.getElementById('productThumbnails');
        
        // Set product details
        document.getElementById('modalProductName').textContent = product.nama_produk;
        document.getElementById('modalProductPrice').textContent = this.formatNumber(product.harga);
        document.getElementById('modalProductStock').textContent = `${product.stok} ${product.satuan || 'pcs'}`;
        document.getElementById('modalProductDescription').textContent = product.deskripsi || 'Tidak ada deskripsi';
        
        // Setup add to cart button
        const addToCartBtn = document.getElementById('modalAddToCart');
        const isInCart = this.cart.some(item => item.id === product.id);
        if (addToCartBtn) {
            addToCartBtn.textContent = isInCart ? 'Dalam Keranjang' : 'Tambah ke Keranjang';
            addToCartBtn.className = `add-to-cart-btn ${isInCart ? 'in-cart' : ''}`;
            // Hapus event listener lama jika ada
            addToCartBtn.replaceWith(addToCartBtn.cloneNode(true));
            // Tambahkan event listener baru
            document.getElementById('modalAddToCart').addEventListener('click', () => {
                this.addToCart(product);
                // Update tampilan tombol setelah ditambahkan ke keranjang
                const btn = document.getElementById('modalAddToCart');
                btn.textContent = 'Dalam Keranjang';
                btn.className = 'add-to-cart-btn in-cart';
                // Update juga tombol di card produk
                const cardBtn = document.querySelector(`.product-card[data-id="${product.id}"] button`);
                if (cardBtn) {
                    cardBtn.textContent = 'Dalam Keranjang';
                    cardBtn.className = 'in-cart';
                }
            });
        }
        
        // Collect all available images
        let images = [];
        
        // Add main image
        if (product.gambar_produk) {
            images.push(product.gambar_produk);
        }
        
        // Add second image
        if (product.gambar_produk2) {
            images.push(product.gambar_produk2);
        }
        
        // Add third image
        if (product.gambar_produk3) {
            images.push(product.gambar_produk3);
        }
        
        // Set default image if no images available
        if (images.length === 0) {
            images.push('images/no-image.png');
        }
        
        // Set main image
        img.src = images[0];
        img.alt = product.nama_produk;
        
        // Generate thumbnails only if there are multiple images
        if (images.length > 1) {
            thumbnailsContainer.innerHTML = images.map((src, index) => `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                     onclick="window.pos.changeProductImage('${src}', this)">
                    <img src="${src}" alt="${product.nama_produk} ${index + 1}"
                         onerror="this.src='images/no-image.png'">
                </div>
            `).join('');
            thumbnailsContainer.style.display = 'flex';
        } else {
            thumbnailsContainer.style.display = 'none';
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Image zoom and pan functionality
        let scale = 1;
        let isPanning = false;
        let startX;
        let startY;
        let panX = 0;
        let panY = 0;

        // Add zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn zoom-in">+</button>
            <button class="zoom-btn zoom-out">-</button>
            <button class="zoom-btn zoom-reset">↺</button>
        `;
        imageContainer.appendChild(zoomControls);

        // Zoom in function
        const zoomIn = () => {
            if (scale < 3) {
                scale += 0.5;
                updateTransform();
            }
        };

        // Zoom out function
        const zoomOut = () => {
            if (scale > 1) {
                scale -= 0.5;
                updateTransform();
            }
        };

        // Reset zoom and pan
        const resetZoom = () => {
            scale = 1;
            panX = 0;
            panY = 0;
            updateTransform();
            imageContainer.classList.remove('zoomed');
        };

        // Update transform
        const updateTransform = () => {
            img.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
            imageContainer.classList.toggle('zoomed', scale > 1);
        };

        // Add event listeners for zoom controls
        zoomControls.querySelector('.zoom-in').onclick = (e) => {
            e.stopPropagation();
            zoomIn();
        };
        
        zoomControls.querySelector('.zoom-out').onclick = (e) => {
            e.stopPropagation();
            zoomOut();
        };
        
        zoomControls.querySelector('.zoom-reset').onclick = (e) => {
            e.stopPropagation();
            resetZoom();
        };

        // Pan functionality
        imageContainer.onmousedown = function(e) {
            if (scale > 1) {
                isPanning = true;
                startX = e.clientX - panX;
                startY = e.clientY - panY;
                this.style.cursor = 'grabbing';
            }
        };

        imageContainer.onmousemove = function(e) {
            if (!isPanning) return;
            
            const moveX = e.clientX - startX;
            const moveY = e.clientY - startY;
            
            // Calculate max pan based on zoom level
            const maxPan = 100 * (scale - 1);
            panX = Math.min(Math.max(moveX, -maxPan), maxPan);
            panY = Math.min(Math.max(moveY, -maxPan), maxPan);
            
            updateTransform();
        };

        imageContainer.onmouseup = function() {
            isPanning = false;
            this.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        };

        imageContainer.onmouseleave = function() {
            isPanning = false;
            this.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        };

        // Double click to reset zoom
        imageContainer.ondblclick = function(e) {
            e.preventDefault();
            resetZoom();
        };

        // Mouse wheel zoom
        imageContainer.onwheel = function(e) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        };

        // Cleanup on modal close
        const cleanup = () => {
            resetZoom();
            if (zoomControls.parentNode) {
                zoomControls.parentNode.removeChild(zoomControls);
            }
        };

        // Add cleanup to modal close button
        modal.querySelector('.close').onclick = () => {
            cleanup();
            this.closeProductModal();
        };
    }

    closeProductModal() {
        const modal = document.getElementById('productModal');
        modal.style.display = 'none';
        this.currentProduct = null;
    }

    // Update changeProductImage method
    changeProductImage(src, thumbnailElement) {
        const mainImage = document.getElementById('modalProductImage');
        const oldSrc = mainImage.src; // Store old source
        
        // Set new image
        mainImage.src = src;
        
        // Handle image load error
        mainImage.onerror = () => {
            mainImage.src = 'images/no-image.png';
        };
        
        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        thumbnailElement.classList.add('active');
        
        // Reset zoom when changing image
        const imageContainer = document.querySelector('.product-image-zoom');
        if (imageContainer.classList.contains('zoomed')) {
            imageContainer.classList.remove('zoomed');
            mainImage.style.transform = 'none';
        }
        
        // Reset pan position
        if (this.currentPanX !== undefined) {
            this.currentPanX = 0;
            this.currentPanY = 0;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.pos = new POSSystem();
});

function closeModal() {
    document.getElementById('strukModal').style.display = 'none';
}

window.addEventListener('click', event => {
    const modal = document.getElementById('strukModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});