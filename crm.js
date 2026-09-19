(function(){
'use strict';
let buyerFilter='ALL', buyerSearch='';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function buyerRows(){
  const rows=(window.data?.customers||[]); // fallback is handled below through global lexical binding
}
function getCustomers(){try{return data.customers||[]}catch(e){return[]}}
function getEsc(v){try{return esc(v)}catch(e){return String(v??'')}}
function getDate(v){try{return date(v)}catch(e){return v||'—'}}
function renderBuyerTable(){
  const body=document.getElementById('customersRows'); if(!body)return;
  const all=getCustomers();
  const q=buyerSearch.trim().toLowerCase();
  const filtered=all.filter(x=>{
    const type=x.buyer_type||((x.customer_type||'').toLowerCase()==='export'?'GLOBAL':'LOCAL');
    const status=x.status==='Aktif'?'ACTIVE':x.status==='Prospek'?'PROSPECT':x.status==='Tidak Aktif'?'INACTIVE':'';
    if(buyerFilter==='LOCAL'&&type!=='LOCAL')return false;
    if(buyerFilter==='GLOBAL'&&type!=='GLOBAL')return false;
    if(buyerFilter==='ACTIVE'&&status!=='ACTIVE')return false;
    if(buyerFilter==='PROSPECT'&&status!=='PROSPECT')return false;
    return !q||[x.name,x.company_name,x.country,x.city,x.province,x.email,x.phone].some(v=>String(v||'').toLowerCase().includes(q));
  });
  body.innerHTML=filtered.map(x=>{
    const type=x.buyer_type||((x.customer_type||'').toLowerCase()==='export'?'GLOBAL':'LOCAL');
    const loc=type==='GLOBAL'?[x.city,x.country].filter(Boolean).join(', ')||'—':[x.city,x.province].filter(Boolean).join(', ')||x.country||'Indonesia';
    const follow=x.next_follow_up?getDate(x.next_follow_up.slice(0,10)):'—';
    const actions='<button type="button" class="row-btn" data-action="edit" data-table="customers" data-id="'+x.id+'">Edit</button><button type="button" class="row-btn danger" data-action="delete" data-table="customers" data-id="'+x.id+'">Hapus</button>';
    return '<tr><td>'+getEsc(x.customer_code||'—')+'</td><td><b>'+getEsc(x.name)+'</b><br><small>'+getEsc(x.email||x.whatsapp||x.phone||'')+'</small></td><td>'+getEsc(x.company_name||'—')+'</td><td>'+getEsc(loc)+'</td><td><span class="tag">'+(type==='GLOBAL'?'🌎 Global':'🇮🇩 Lokal')+'</span></td><td><span class="tag">'+getEsc(x.status||'Prospek')+'</span></td><td>'+getEsc(follow)+'</td><td>'+actions+'</td></tr>';
  }).join('')||'<tr><td colspan="8" class="buyer-empty">Belum ada buyer pada filter ini.</td></tr>';
}
function renderBuyerStats(){
  const all=getCustomers();
  const local=all.filter(x=>(x.buyer_type||((x.customer_type||'').toLowerCase()==='export'?'GLOBAL':'LOCAL'))==='LOCAL').length;
  const global=all.length-local;
  const active=all.filter(x=>x.status==='Aktif').length;
  const prospect=all.filter(x=>x.status==='Prospek').length;
  [['customerCount',all.length],['customerLocal',local],['customerGlobal',global],['customerActive',active],['customerProspect',prospect]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});
}
function enhanceCustomerForm(){
  try{
    forms.customer.fields=[
      ['customer_code','Kode buyer','text'],
      ['buyer_type','Segmentasi','select',1,['LOCAL','GLOBAL']],
      ['name','Nama / Contact Person','text',1],
      ['company_name','Perusahaan / Toko','text'],
      ['country','Negara','text'],
      ['city','Kota','text'],
      ['province','Provinsi','text'],
      ['phone','Telepon','text'],
      ['whatsapp','WhatsApp','text'],
      ['email','Email','email'],
      ['website','Website','url'],
      ['instagram','Instagram','text'],
      ['customer_type','Jenis buyer','select',0,['Retail','Wholesale','B2B','Export']],
      ['currency','Mata uang','select',0,['IDR','USD','EUR','GBP','SGD','KRW']],
      ['incoterm','Incoterm','select',0,['EXW','FOB','CIF']],
      ['preferred_moq','MOQ yang diminati','number'],
      ['preferred_price','Harga yang diminati','number'],
      ['shipping_destination','Tujuan pengiriman','text'],
      ['status','Status CRM','select',0,['Prospek','Aktif','Tidak Aktif']],
      ['next_follow_up','Follow-up berikutnya','date'],
      ['notes','Catatan','text']
    ];
    forms.customer.title='Buyer / Customer';
  }catch(e){console.warn('CRM form setup',e)}
}
function toggleCustomerFields(){
  const form=document.getElementById('dataForm'); if(!form||document.getElementById('formTitle')?.textContent?.toLowerCase().indexOf('buyer')<0)return;
  const type=form.querySelector('[name="buyer_type"]')?.value||'LOCAL';
  const hideLocal=['province']; const hideGlobal=[];
  const globalOnly=['country','currency','incoterm','preferred_moq','preferred_price','shipping_destination'];
  globalOnly.forEach(n=>{const el=form.querySelector('[name="'+n+'"]')?.closest('label');if(el)el.style.display=type==='GLOBAL'?'':'none'});
  const country=form.querySelector('[name="country"]')?.closest('label'); if(country)country.style.display=type==='GLOBAL'?'':'';
  let note=form.querySelector('.buyer-form-note');if(!note){note=document.createElement('div');note.className='buyer-form-note';form.querySelector('#formFields')?.prepend(note)}
  note.textContent=type==='GLOBAL'?'🌎 Buyer Global — lengkapi negara, mata uang, Incoterm, MOQ dan tujuan pengiriman.':'🇮🇩 Buyer Lokal — data provinsi digunakan untuk segmentasi pasar Indonesia.';
  note.className=type==='GLOBAL'?'buyer-global-note':'buyer-local-note';
}
function hook(){
  enhanceCustomerForm();
  document.querySelectorAll('[data-buyer-filter]').forEach(b=>b.addEventListener('click',()=>{buyerFilter=b.dataset.buyerFilter;document.querySelectorAll('[data-buyer-filter]').forEach(x=>x.classList.toggle('active',x===b));renderBuyerTable()}));
  document.getElementById('buyerSearch')?.addEventListener('input',e=>{buyerSearch=e.target.value;renderBuyerTable()});
  document.addEventListener('click',e=>{if(e.target.closest('[data-open="customer"]'))setTimeout(toggleCustomerFields,0)});
  document.addEventListener('change',e=>{if(e.target.matches('#dataForm [name="buyer_type"]'))toggleCustomerFields()});
  const originalOpen=window.openForm;
  // openForm is a global function declaration in the main script; wrap it when accessible.
  if(typeof originalOpen==='function'){
    window.openForm=function(type,row){originalOpen(type,row);if(type==='customer')setTimeout(toggleCustomerFields,0)};
  }
  window.renderBuyerEnhancements=()=>{renderBuyerStats();renderBuyerTable()};
  renderBuyerStats();renderBuyerTable();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();