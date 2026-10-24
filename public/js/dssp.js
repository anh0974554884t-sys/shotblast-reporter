// ==========================================================================
// SMC PRODUCT MASTER MANAGEMENT (DSSP - 861 SẢN PHẨM TỪ FILE DSSP.xlsx)
// ==========================================================================

class ProductManager {
  constructor() {
    this.products = [];
    this.currentCategory = '';
  }

  async init() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        this.products = await res.json();
      } else {
        throw new Error('API offline');
      }
    } catch (e) {
      // Fallback: try loading default_products.json
      try {
        const localRes = await fetch('/data/default_products.json');
        if (localRes.ok) {
          this.products = await localRes.json();
        }
      } catch (err) {
        const cached = localStorage.getItem('shotblast_products');
        if (cached) {
          try {
            this.products = JSON.parse(cached);
          } catch (ex) {
            this.products = [];
          }
        }
      }
    }

    if (this.products && this.products.length > 0) {
      localStorage.setItem('shotblast_products', JSON.stringify(this.products));
    }
    return this.products;
  }

  getAll() {
    return this.products;
  }

  findByCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return this.products.find(p => p.code.toUpperCase() === clean) || null;
  }

  setCategoryFilter(category) {
    this.currentCategory = category ? category.trim().toUpperCase() : '';
  }

  search(query, limit = 12) {
    let list = this.products;
    if (this.currentCategory) {
      list = list.filter(p => 
        (p.category && p.category.toUpperCase().includes(this.currentCategory)) ||
        (p.series && p.series.toUpperCase().includes(this.currentCategory)) ||
        p.code.toUpperCase().startsWith(this.currentCategory)
      );
    }

    if (!query) {
      return list.slice(0, limit);
    }

    const q = query.trim().toUpperCase();
    return list
      .filter(p => 
        p.code.toUpperCase().includes(q) || 
        (p.name && p.name.toUpperCase().includes(q)) ||
        (p.category && p.category.toUpperCase().includes(q)) ||
        (p.series && p.series.toUpperCase().includes(q))
      )
      .slice(0, limit);
  }

  async save(productData) {
    const code = (productData.code || '').trim().toUpperCase();
    if (!code) throw new Error('Mã sản phẩm không được trống');

    const item = {
      code,
      name: productData.name || `Sản phẩm ${code}`,
      factory: productData.factory || 'SMC3',
      category: productData.category || '',
      series: productData.series || '',
      settingQty: Number(productData.settingQty) || 10,
      notes: productData.notes || ''
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const data = await res.json();
        this.products = data.products;
      }
    } catch (err) {
      const idx = this.products.findIndex(p => p.code.toUpperCase() === code);
      if (idx >= 0) {
        this.products[idx] = { ...this.products[idx], ...item };
      } else {
        this.products.push({ id: 'sp_' + Date.now(), ...item });
      }
      localStorage.setItem('shotblast_products', JSON.stringify(this.products));
    }

    return item;
  }

  renderQuickChips(containerEl, onSelect) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    // Prominent SMC parts often processed in Shotblast
    const featuredCodes = [
      'P3800201C-020',
      'P3802401C-030',
      'P3800501C-040',
      'MGP20ABAC893A100',
      'MGP25AAAC894A075',
      'MGP32A-AC895A025',
      'C1G20-02AAT031A',
      'C1G25-02AAT032'
    ];

    let chips = [];
    featuredCodes.forEach(code => {
      const p = this.findByCode(code);
      if (p) chips.push(p);
    });

    // If some not found, supplement with first items
    if (chips.length < 8 && this.products.length > 0) {
      chips = [...chips, ...this.products.slice(0, 8 - chips.length)];
    }

    chips.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.innerHTML = `<b>${p.code}</b> <span class="chip-sub">(${p.name || p.category || 'SMC'})</span>`;
      btn.title = `${p.code} - ${p.name || ''} (Định mức: ${p.settingQty || 10} cái/mẻ)`;
      btn.addEventListener('click', () => {
        window.soundManager.playClick();
        onSelect(p);
      });
      containerEl.appendChild(btn);
    });
  }

  renderTable(tbodyEl, onSelect) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = '';
    
    // Show first 100 for fast DOM rendering, search bar filters dynamically
    const displayList = this.search('', 100);

    displayList.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-mono">${p.stt || (idx + 1)}</td>
        <td>
          <span class="product-code-tag">${p.code}</span>
          ${p.series ? `<span class="badge-series">${p.series}</span>` : ''}
        </td>
        <td>
          <div class="prod-name-main">${p.name || '--'}</div>
          ${p.category ? `<small class="text-muted">${p.category}</small>` : ''}
        </td>
        <td class="text-center font-mono text-bold text-accent">${p.settingQty || 10}</td>
        <td class="text-center">
          <button type="button" class="btn-tool-pill btn-select-dssp">Chọn mã này</button>
        </td>
      `;

      tr.querySelector('.btn-select-dssp').addEventListener('click', () => {
        window.soundManager.playClick();
        if (onSelect) onSelect(p);
      });

      tbodyEl.appendChild(tr);
    });
  }
}

window.productManager = new ProductManager();
