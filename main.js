// POS Sederhana - GitHub Pages Frontend (Vanilla JS)
// Terhubung ke Google Apps Script sebagai backend (lihat README.md).

(function(){
  // Helpers
  function money(n){ return new Intl.NumberFormat('id-ID').format(Number(n||0)); }
  function byId(id){ return document.getElementById(id); }

  // Tabs
  window.showTab = function(id){
    ['barang','jual','laporan'].forEach(function(x){
      byId(x).style.display = (x===id ? 'block' : 'none');
    });
  };

  // API helpers
  async function apiGet(action, params){
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    if (typeof API_KEY === 'string' && API_KEY) url.searchParams.set('key', API_KEY);
    if (params) Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v));
    const r = await fetch(url.toString(), { method: 'GET' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message);
    return j.data;
  }

  async function apiPost(action, body){
    const payload = Object.assign({ action: action }, body || {});
    if (typeof API_KEY === 'string' && API_KEY) payload.key = API_KEY;
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message);
    return j.data;
  }

  // State
  let items = [];
  let cart = [];

  async function loadItems(){
    items = await apiGet('getItems');
    const low = await apiGet('getLowStock');
    byId('lowStockMsg').textContent = (low && low.length)
      ? ('⚠️ Stok menipis: ' + low.map(x=>x.nama).join(', ')) : '';
    const tbody = byId('tblBarang').querySelector('tbody');
    tbody.innerHTML = '';
    items.forEach(function(it){
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>'+it.nama+'</td>' +
        '<td>'+it.satuan+'</td>' +
        '<td class="right">'+money(it.harga)+'</td>' +
        '<td class="right">'+money(it.stok)+'</td>' +
        '<td class="right">'+money(it.minStok)+'</td>';
      tbody.appendChild(tr);
    });
    renderSearch(byId('cari').value || '');
  }

  function renderSearch(q){
    q = (q||'').toLowerCase();
    const wrap = byId('hasilCari');
    const filtered = items.filter(it => (it.nama||'').toLowerCase().includes(q));
    wrap.innerHTML = filtered.map(it => (
      '<button data-nama="'+it.nama.replace(/"/g,'&quot;')+'" data-harga="'+Number(it.harga)+'">' +
      '+ '+it.nama+' (Rp '+money(it.harga)+')' +
      '</button>'
    )).join(' ');
    wrap.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function(){
        const nama = btn.dataset.nama;
        const harga = Number(btn.dataset.harga);
        const ex = cart.find(c => c.nama === nama);
        if (ex) ex.qty += 1; else cart.push({ nama, harga, qty: 1 });
        renderCart();
      });
    });
  }

  function renderCart(){
    const tbody = byId('tblCart').querySelector('tbody');
    tbody.innerHTML = '';
    let subtotal = 0;
    cart.forEach(function(c, idx){
      const total = c.harga * c.qty; subtotal += total;
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>'+c.nama+'</td>' +
        '<td class="right">'+money(c.harga)+'</td>' +
        '<td class="right"><input type="number" min="1" value="'+c.qty+'" style="width:70px" data-idx="'+idx+'" /></td>' +
        '<td class="right">'+money(total)+'</td>' +
        '<td><button data-del="'+idx+'">Hapus</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('input[type=number]').forEach(inp => {
      inp.addEventListener('change', function(){
        const i = Number(inp.dataset.idx);
        const val = Number(inp.value||1);
        cart[i].qty = Math.max(1, val);
        renderCart();
      });
    });
    tbody.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', function(){
        const i = Number(btn.dataset.del);
        cart.splice(i,1);
        renderCart();
      });
    });

    byId('subtotal').textContent = money(subtotal);
    const diskonVal = Number(byId('diskon').value || 0);
    byId('diskonCell').textContent = money(diskonVal);
    byId('grand').textContent = money(Math.max(0, subtotal - diskonVal));
  }

  function showNota(saleId, sale){
    const nota = byId('nota');
    const info = byId('notaInfo');
    const body = byId('notaBody');
    const sub = byId('notaSub');
    const disc = byId('notaDisc');
    const grand = byId('notaGrand');

    const tanggal = new Date().toLocaleString('id-ID');
    info.innerHTML = 'No: <b>'+saleId+'</b><br/>Tanggal: '+tanggal+'<br/>Customer: '+(sale.customer||'-');
    body.innerHTML = '';
    let subtotal = 0;
    (sale.items||[]).forEach(function(it){
      const total = Number(it.qty)*Number(it.harga); subtotal += total;
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>'+it.nama+'</td>'+
        '<td class="right">'+money(it.harga)+'</td>'+
        '<td class="right">'+money(it.qty)+'</td>'+
        '<td class="right">'+money(total)+'</td>';
      body.appendChild(tr);
    });
    sub.textContent = money(subtotal);
    const d = Number(sale.diskon||0);
    disc.textContent = money(d);
    grand.textContent = money(Math.max(0, subtotal - d));
    nota.style.display = 'block';
  }

  async function checkout(){
    if (!cart.length){ alert('Keranjang kosong'); return; }
    const sale = {
      tanggalISO: new Date().toISOString(),
      customer: byId('customer').value,
      items: cart.map(c => ({ nama: c.nama, qty: c.qty, harga: c.harga })),
      diskon: Number(byId('diskon').value || 0),
    };
    const res = await apiPost('createSale', { sale });
    showNota(res.saleId, sale);
    window.print();
    cart = [];
    renderCart();
    await loadItems();
  }

  async function loadReport(){
    const from = byId('from').value;
    const to = byId('to').value;
    const data = await apiGet('getSalesReport', { from, to });
    const tbody = byId('tblReport').querySelector('tbody');
    tbody.innerHTML = '';
    (data.rows||[]).forEach(function(r){
      const tr = document.createElement('tr');
      const tgl = new Date(r.tanggal).toLocaleDateString('id-ID');
      tr.innerHTML = '<td>'+tgl+'</td>' +
        '<td>'+(r.customer||'')+'</td>' +
        '<td class="right">'+money(r.subtotal)+'</td>' +
        '<td class="right">'+money(r.diskon)+'</td>' +
        '<td class="right">'+money(r.grand)+'</td>';
      tbody.appendChild(tr);
    });
    byId('totalGrand').textContent = money(data.totalGrand||0);
  }

  function bindEvents(){
    byId('btnSimpanBarang').addEventListener('click', async function(){
      const item = {
        nama: (byId('b_nama').value||'').trim(),
        satuan: (byId('b_satuan').value||'').trim(),
        harga: Number(byId('b_harga').value||0),
        stok: Number(byId('b_stok').value||0),
        minStok: Number(byId('b_min').value||0),
      };
      if (!item.nama){ alert('Nama wajib'); return; }
      await apiPost('upsertItem', { item });
      await loadItems();
      ['b_nama','b_satuan','b_harga','b_stok','b_min'].forEach(function(id){ byId(id).value=''; });
    });

    byId('cari').addEventListener('input', function(e){
      renderSearch(e.target.value || '');
    });
    byId('btnCheckout').addEventListener('click', checkout);
    byId('btnLoadReport').addEventListener('click', loadReport);
    byId('diskon').addEventListener('input', renderCart);
  }

  (async function init(){
    bindEvents();
    await loadItems();
    renderSearch('');
    renderCart();
  })();
})();
