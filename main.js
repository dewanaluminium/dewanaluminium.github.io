(function(){
  const statusEl = document.getElementById('status');
  function setStatus(msg, isError){
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = isError ? 'error' : '';
  }
  function money(n){ return new Intl.NumberFormat('id-ID').format(Number(n||0)); }
  function byId(id){ return document.getElementById(id); }

  window.showTab = function(id){
    ['barang','jual','laporan'].forEach(function(x){
      const el = byId(x);
      if (el) el.style.display = (x===id ? 'block' : 'none');
    });
  };

  async function apiGet(action, params){
    if (!API_URL) throw new Error('API_URL belum diisi di config.js');
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    if (params) Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v));
    const r = await fetch(url.toString());
    const j = await r.json();
    if (!j.ok) throw new Error(j.message||'API error');
    return j.data;
  }
  async function apiPost(action, body){
  if (!API_URL) throw new Error('API_URL belum diisi di config.js');
  const form = new URLSearchParams();
  form.set('action', action);
  Object.entries(body||{}).forEach(([k, v])=>{
    form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString()
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.message||'API error');
  return j.data;
  }

  let items=[]; let cart=[];
  async function loadItems(){
    try{
      items = await apiGet('getItems');
      const low = await apiGet('getLowStock');
      const lowMsg = byId('lowStockMsg');
      if (lowMsg) lowMsg.textContent = low.length? '⚠️ Stok menipis: '+low.map(x=>x.nama).join(', '):'';
      const tbody = byId('tblBarang').querySelector('tbody');
      tbody.innerHTML='';
      items.forEach(it=>{
        const tr=document.createElement('tr');
        tr.innerHTML='<td>'+it.nama+'</td><td>'+it.satuan+'</td><td class="right">'+money(it.harga)+'</td><td class="right">'+money(it.stok)+'</td><td class="right">'+money(it.minStok)+'</td>';
        tbody.appendChild(tr);
      });
      setStatus('Data barang loaded: '+items.length+' item.');
    }catch(e){ setStatus('Gagal load items: '+e.message,true); alert(e.message); }
  }
  function renderSearch(q){
  q = (q||'').toLowerCase();
  const wrap = document.getElementById('hasilCari');
  if (!wrap) return;
  const filtered = items.filter(it => (it.nama||'').toLowerCase().includes(q));
  wrap.innerHTML = filtered.map(it => (
    '<button data-nama="'+it.nama.replace(/"/g,'&quot;')+'" data-harga="'+Number(it.harga)+'">'+
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
// panggil saat init & bind input:
document.getElementById('cari').addEventListener('input', e => renderSearch(e.target.value||''));
  function bindEvents(){
    const btn = byId('btnSimpanBarang');
    if(btn) btn.addEventListener('click', async ()=>{
      const item={
        nama:(byId('b_nama').value||'').trim(),
        satuan:(byId('b_satuan').value||'').trim(),
        harga:Number(byId('b_harga').value||0),
        stok:Number(byId('b_stok').value||0),
        minStok:Number(byId('b_min').value||0)
      };
      if(!item.nama){alert('Nama wajib');return;}
      try{ await apiPost('upsertItem',{item}); await loadItems(); setStatus('Item tersimpan.'); }catch(e){setStatus('Gagal simpan: '+e.message,true);alert(e.message);}
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{bindEvents(); loadItems();});
})();
