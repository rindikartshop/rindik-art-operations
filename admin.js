const cfg=window.RINDIK_SUPABASE;
if(!cfg?.url||!cfg?.publishableKey) throw new Error('Konfigurasi Supabase belum tersedia.');
const db=window.supabase.createClient(cfg.url,cfg.publishableKey);

const data={
  orders:[],attendance:[],targets:[],customers:[],products:[],production:[],agenda:[],
  artisans:[],invoices:[],exportShipments:[],expenses:[],payments:[],companySettings:null
};
let mode='login',activeForm='',editingId=null,starting=false;

const el=id=>document.getElementById(id);
const msg=(id,v)=>{const x=el(id);if(x)x.textContent=v||''};
const money=v=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—';
const time=v=>v?new Date(v).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'—';
const today=()=>new Date().toLocaleDateString('en-CA');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const noUpdatedAt=new Set(['attendance','expenses','payments','orders']);

const forms={
  customer:{table:'customers',title:'Customer / Buyer',eyebrow:'CRM',fields:[
    ['customer_code','Kode customer','text'],['name','Nama','text',1],['company_name','Perusahaan','text'],
    ['country','Negara','text'],['city','Kota','text'],['phone','WhatsApp / Telepon','text'],
    ['email','Email','email'],['customer_type','Tipe','select',0,['Retail','Wholesale','B2B','Export']],
    ['status','Status','select',0,['Prospek','Aktif','Tidak Aktif']],['notes','Catatan','text']
  ]},
  product:{table:'products',title:'Produk & Stok',eyebrow:'INVENTORY',fields:[
    ['sku','SKU','text',1],['name','Nama produk','text',1],['category','Kategori','text'],
    ['material','Material','text'],['unit','Satuan','text'],['cost_price','Harga modal','number'],
    ['selling_price','Harga jual','number'],['stock','Stok awal','number'],['min_stock','Minimum stok','number'],
    ['active','Status produk','select',0,['Ya','Tidak']],['notes','Catatan','text']
  ]},
  order:{table:'orders',title:'Pesanan / PO',eyebrow:'PENJUALAN',fields:[
    ['order_code','Kode PO / Pesanan','text'],['order_date','Tanggal order','date'],['due_date','Target kirim','date',1],['customer_id','Customer / Buyer','customer',1],
    ['sku','Produk / SKU','product',1],['quantity','Qty','number',1],['unit_price','Harga / pcs','number',1],
    ['total_amount','Total','number',1],['dp_amount','DP','number'],['status','Status','select',0,['Baru','Menunggu Pembayaran','Diproduksi','Siap Kirim','Selesai','Batal']],
    ['payment_status','Pembayaran','select',0,['Belum Lunas','DP','Lunas']],['currency','Mata uang','select',0,['IDR','USD']],
    ['notes','Catatan','text']
  ]},
  production:{table:'production_orders',title:'Produksi',eyebrow:'PRODUKSI',fields:[
    ['production_code','Kode produksi','text',1],['order_id','Pesanan / PO','order'],['product_id','Produk','product_id'],
    ['artisan_id','Pengrajin','artisan_id'],['qty_planned','Qty rencana','number',1],['qty_completed','Qty selesai','number'],
    ['start_date','Mulai','date'],['due_date','Jatuh tempo','date'],['status','Status','select',0,['Rencana','Diproses','QC','Selesai','Batal']],['notes','Catatan','text']
  ]},
  artisan:{table:'artisans',title:'Pengrajin',eyebrow:'PENGRAJIN',fields:[
    ['artisan_code','Kode','text'],['name','Nama','text',1],['division','Divisi','text'],['phone','Telepon','text'],
    ['address','Alamat','text'],['skill','Keahlian','text'],['status','Status','select',0,['Aktif','Nonaktif']],
    ['joined_date','Bergabung','date'],['daily_capacity','Kapasitas / hari','number'],['notes','Catatan','text']
  ]},
  attendance:{table:'attendance',title:'Absensi',eyebrow:'SDM',fields:[
    ['employee_name','Nama karyawan','text',1],['division','Divisi','text'],
    ['status','Status','select',1,['Hadir','Terlambat','Izin','Sakit']],['notes','Catatan','text']
  ]},
  invoice:{table:'invoices',title:'Invoice',eyebrow:'TAGIHAN',fields:[
    ['invoice_no','Nomor invoice','text',1],['order_id','Pesanan / PO','order'],
    ['customer_id','Customer / Buyer','customer'],['issue_date','Tanggal','date',1],['due_date','Jatuh tempo','date'],
    ['subtotal','Subtotal','number'],['shipping_cost','Ongkir','number'],['discount','Diskon','number'],
    ['total','Total','number',1],['paid_amount','Sudah dibayar','number'],
    ['status','Status','select',0,['Draft','Terkirim','Sebagian','Lunas','Batal']],['notes','Catatan','text']
  ]},
  export:{table:'export_shipments',title:'Export Shipment & FOB',eyebrow:'EXPORT',fields:[
    ['shipment_code','Kode shipment','text',1],['customer_id','Customer / Buyer','customer'],
    ['country','Negara tujuan','text'],['destination','Pelabuhan / kota','text'],['shipment_date','Tanggal kirim','date'],
    ['incoterm','Incoterm','select',0,['FOB','EXW','CIF']],['cbm','CBM','number'],['carton_count','Jumlah karton','number'],
    ['piece_count','Jumlah pcs','number'],['fob_total','Total FOB','number'],['currency','Mata uang','select',0,['USD','IDR']],
    ['status','Status','select',0,['Rencana','Booking','Dokumen','Dikirim','Selesai']],['notes','Catatan','text']
  ]},
  payment:{table:'payments',title:'Pembayaran Customer',eyebrow:'PEMBAYARAN',fields:[
    ['invoice_id','Invoice','invoice'],['order_id','Pesanan / PO','order'],['payment_date','Tanggal','date',1],
    ['amount','Jumlah pembayaran','number',1],['payment_method','Metode','select',0,['Cash','Transfer','Bank','Lainnya']],
    ['reference_no','No. referensi','text'],['notes','Catatan','text']
  ]},
  expense:{table:'expenses',title:'Pengeluaran',eyebrow:'KEUANGAN',fields:[
    ['expense_date','Tanggal','date',1],['category','Kategori','text',1],['description','Keterangan','text',1],
    ['amount','Jumlah','number',1],['payment_method','Metode','select',0,['Cash','Transfer','Bank','Lainnya']],['notes','Catatan','text']
  ]},
  agenda:{table:'agenda_events',title:'Agenda & Kalender',eyebrow:'AGENDA',fields:[['title','Judul agenda','text',1],['agenda_date','Tanggal','date',1],['start_time','Jam mulai','time'],['end_time','Jam selesai','time'],['category','Kategori','select',0,['Agenda','Follow-up Customer','Produksi','Pengiriman','Meeting','Pembayaran','Pribadi','Lainnya']],['reminder_minutes','Ingatkan (menit sebelum)','number'],['status','Status','select',0,['Terjadwal','Selesai','Batal']],['notes','Catatan','text']]},
  target:{table:'business_targets',title:'Target Bisnis',eyebrow:'TARGET',fields:[
    ['title','Nama target','text',1],['target_value','Nilai target','number',1],['current_value','Realisasi','number'],
    ['unit','Satuan','select',0,['Rp','pcs','%','order']],['period_label','Periode','text']
  ]}
};

function setView(v){
  const x=el(v);if(!x)return;
  document.querySelectorAll('.view').forEach(a=>a.classList.remove('active'));
  x.classList.add('active');
  document.querySelectorAll('[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===v));
  history.replaceState(null,'','#'+v);
  document.querySelector('aside')?.classList.remove('open');
}
document.querySelectorAll('[data-view]').forEach(a=>a.onclick=e=>{e.preventDefault();setView(a.dataset.view)});
el('menu').onclick=()=>document.querySelector('aside').classList.toggle('open');

const action=(table,id,extra='')=>'<td class="actions"><button type="button" class="row-btn" data-action="edit" data-table="'+table+'" data-id="'+id+'">Edit</button>'+extra+'<button type="button" class="row-btn danger" data-action="delete" data-table="'+table+'" data-id="'+id+'">Hapus</button></td>';
function addActions(){
  document.querySelectorAll('table thead tr').forEach(tr=>{
    if(!tr.querySelector('.actions-head')) tr.insertAdjacentHTML('beforeend','<th class="actions-head">AKSI</th>');
  });
}

function relationOptions(type,value){
  if(type==='customer') return '<select name="__x"><option value="">Pilih customer</option>'+data.customers.map(x=>'<option value="'+esc(x.id)+'" '+(String(value)===String(x.id)?'selected':'')+'>'+esc(x.name)+(x.company_name?' · '+esc(x.company_name):'')+'</option>').join('')+'</select>';
  if(type==='product') return '<select name="__x"><option value="">Pilih produk</option>'+data.products.filter(x=>x.active!==false).map(x=>'<option value="'+esc(x.sku)+'" '+(String(value)===String(x.sku)?'selected':'')+'>'+esc(x.sku)+' · '+esc(x.name)+' · '+money(x.selling_price)+'</option>').join('')+'</select>';
  if(type==='order') return '<select name="__x"><option value="">Pilih PO</option>'+data.orders.map(x=>'<option value="'+esc(x.id)+'" '+(String(value)===String(x.id)?'selected':'')+'>'+esc(x.order_code||x.id)+' · '+esc(x.customer_name||'')+'</option>').join('')+'</select>';
  if(type==='invoice') return '<select name="__x"><option value="">Pilih invoice</option>'+data.invoices.map(x=>'<option value="'+esc(x.id)+'" '+(String(value)===String(x.id)?'selected':'')+'>'+esc(x.invoice_no)+' · '+money(x.total)+'</option>').join('')+'</select>';
  if(type==='product_id') return '<select name="__x"><option value="">Pilih produk</option>'+data.products.map(x=>'<option value="'+esc(x.id)+'" '+(String(value)===String(x.id)?'selected':'')+'>'+esc(x.sku)+' · '+esc(x.name)+'</option>').join('')+'</select>';
  if(type==='artisan_id') return '<select name="__x"><option value="">Pilih pengrajin</option>'+data.artisans.filter(x=>x.status!=='Nonaktif').map(x=>'<option value="'+esc(x.id)+'" '+(String(value)===String(x.id)?'selected':'')+'>'+esc(x.name)+' · '+esc(x.artisan_code||'')+'</option>').join('')+'</select>';
  return '';
}

function fieldHtml(field,row){
  const [name,label,type,required,choices]=field;
  let value=row?.[name];
  if(value===undefined||value===null||value===''){
    if(['quantity','qty_planned'].includes(name)) value=1;
    else if(['issue_date','expense_date','start_date','joined_date','shipment_date','payment_date'].includes(name)) value=today();
    else value='';
  }
  const req=required?' required':'';
  if(['customer','product','order','invoice','product_id','artisan_id'].includes(type)){
    let html=relationOptions(type,value).replace('name="__x"','name="'+name+'"'+req);
    return '<label>'+label+html+'</label>';
  }
  if(type==='select') return '<label>'+label+'<select name="'+name+'"'+req+'>'+choices.map(o=>'<option value="'+esc(o)+'" '+(String(value)===String(o)?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>';
  const readonly=name==='total_amount'?' readonly':'';
  return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'"'+req+readonly+'></label>';
}

function openForm(type,row=null){
  const f=forms[type];if(!f)return;
  activeForm=type;editingId=row?.id||null;
  el('formEyebrow').textContent=f.eyebrow;
  el('formTitle').textContent=(editingId?'Edit ':'Tambah ')+f.title;
  msg('formMessage','');
  const fields=el('formFields');
  if(!fields){console.error('formFields tidak ditemukan');return}
  fields.innerHTML=f.fields.map(x=>fieldHtml(x,row)).join('');
  fields.style.display='grid';
  fields.style.gap='2px';
  if(type==='customer'&&!editingId&&!row?.customer_code){
    const n=String(data.customers.length+1).padStart(3,'0');
    fields.querySelector('[name="customer_code"]').value='CUS-'+n;
  }
  if(type==='product'&&!editingId) {
    const sku=fields.querySelector('[name="sku"]'); if(sku) sku.focus();
  }
  if(type==='order'&&!editingId&&!row?.order_code){
    const d=today().replaceAll('-','');const code='PO-'+d+'-'+String(data.orders.length+1).padStart(3,'0');
    fields.querySelector('[name="order_code"]').value=code;
  }
  if(type==='order'){
    const ps=fields.querySelector('[name="sku"]'),q=fields.querySelector('[name="quantity"]'),u=fields.querySelector('[name="unit_price"]'),tot=fields.querySelector('[name="total_amount"]');
    const calc=()=>{const p=data.products.find(x=>String(x.sku)===String(ps?.value));if(p&&!u.value)u.value=Number(p.selling_price||0);if(tot)tot.value=Number(q?.value||0)*Number(u?.value||0)};
    ps?.addEventListener('change',()=>{const p=data.products.find(x=>String(x.sku)===String(ps.value));if(p)u.value=Number(p.selling_price||0);calc()});
    q?.addEventListener('input',calc);u?.addEventListener('input',calc);calc();
  }
  el('modal').hidden=false;
}

function render(){
  const o=data.orders;
  el('salesTotal').textContent=money(o.reduce((n,x)=>n+Number(x.total_amount||0),0));
  el('ordersTotal').textContent=o.length;
  el('attendanceTotal').textContent=data.attendance.filter(x=>x.attendance_date===today()&&['Hadir','Terlambat'].includes(x.status)).length;
  el('targetsTotal').textContent=data.targets.length;
  el('productsTotal').textContent=data.products.filter(x=>x.active!==false).length;
  el('customersTotal').textContent=data.customers.length;
  el('productionTotal').textContent=data.production.filter(x=>['Diproses','QC'].includes(x.status)).length;
  el('invoicesTotal').textContent=data.invoices.length;
  el('expensesTotal').textContent=money(data.expenses.reduce((n,x)=>n+Number(x.amount||0),0));
  el('paymentsTotal').textContent=money(data.payments.reduce((n,x)=>n+Number(x.amount||0),0));
  el('receivablesTotal').textContent=money(data.invoices.reduce((n,x)=>n+Math.max(0,Number(x.total||0)-Number(x.paid_amount||0)),0));
  const activeCustomers=data.customers.filter(x=>x.status==='Aktif').length;
  el('customerCount')&&(el('customerCount').textContent=data.customers.length);
  el('customerActive')&&(el('customerActive').textContent=activeCustomers);
  el('customerExport')&&(el('customerExport').textContent=data.customers.filter(x=>x.customer_type==='Export').length);
  const activeProducts=data.products.filter(x=>x.active!==false);
  const stockTotal=activeProducts.reduce((n,x)=>n+Number(x.stock||0),0);
  const stockValue=activeProducts.reduce((n,x)=>n+Number(x.stock||0)*Number(x.cost_price||0),0);
  el('productCount')&&(el('productCount').textContent=activeProducts.length);
  el('stockTotal')&&(el('stockTotal').textContent=stockTotal);
  el('lowStock')&&(el('lowStock').textContent=activeProducts.filter(x=>Number(x.stock||0)<=Number(x.min_stock||0)).length);
  el('stockValue')&&(el('stockValue').textContent=money(stockValue));
  const orderValue=o.reduce((n,x)=>n+Number(x.total_amount||0),0);
  el('orderCount')&&(el('orderCount').textContent=o.length);
  el('orderValue')&&(el('orderValue').textContent=money(orderValue));
  el('orderDp')&&(el('orderDp').textContent=money(o.reduce((n,x)=>n+Number(x.dp_amount||0),0)));
  el('orderOutstanding')&&(el('orderOutstanding').textContent=money(o.reduce((n,x)=>n+Math.max(0,Number(x.total_amount||0)-Number(x.dp_amount||0)),0)));
  const todayMs=new Date(today()+'T00:00:00').getTime();
  const dueSoon=o.filter(x=>x.due_date&&x.status!=='Selesai'&&x.status!=='Batal').map(x=>{const d=new Date(x.due_date+'T00:00:00').getTime(),days=Math.ceil((d-todayMs)/86400000);return {...x,days}}).filter(x=>x.days<=7);
  el('orderDueSoon')&&(el('orderDueSoon').textContent=dueSoon.length);
  const alertBox=el('orderAlerts');
  if(alertBox){
    alertBox.hidden=dueSoon.length===0;
    alertBox.innerHTML=dueSoon.sort((a,b)=>a.days-b.days).map(x=>{
      const label=x.days<0?'TERLAMBAT '+Math.abs(x.days)+' hari':x.days===0?'KIRIM HARI INI':x.days===1?'KIRIM BESOK':'Kirim '+x.days+' hari lagi';
      const cls=x.days<0?'danger-alert':x.days<=2?'urgent-alert':'soon-alert';
      return '<div class="order-alert '+cls+'"><b>'+esc(label)+'</b><span>'+esc(x.order_code||'PO')+' · '+esc(x.customer_name||'Customer')+' · '+esc(x.product_name||'Produk')+'</span><small>Target kirim: '+date(x.due_date)+'</small></div>';
    }).join('');
  }
  el('productionCount')&&(el('productionCount').textContent=data.production.length);
  el('productionPlanned')&&(el('productionPlanned').textContent=data.production.reduce((n,x)=>n+Number(x.qty_planned||0),0));
  el('productionCompleted')&&(el('productionCompleted').textContent=data.production.reduce((n,x)=>n+Number(x.qty_completed||0),0));
  el('productionActive')&&(el('productionActive').textContent=data.production.filter(x=>['Diproses','QC'].includes(x.status)).length);
  el('artisanCount')&&(el('artisanCount').textContent=data.artisans.length);
  el('artisanActive')&&(el('artisanActive').textContent=data.artisans.filter(x=>x.status==='Aktif').length);
  el('artisanCapacity')&&(el('artisanCapacity').textContent=data.artisans.filter(x=>x.status==='Aktif').reduce((n,x)=>n+Number(x.daily_capacity||0),0));
  const attToday=data.attendance.filter(x=>x.attendance_date===today());
  el('attToday')&&(el('attToday').textContent=attToday.filter(x=>x.status==='Hadir').length);
  el('attLate')&&(el('attLate').textContent=attToday.filter(x=>x.status==='Terlambat').length);
  el('attLeave')&&(el('attLeave').textContent=attToday.filter(x=>['Izin','Sakit'].includes(x.status)).length);
  const invTotal=data.invoices.reduce((n,x)=>n+Number(x.total||0),0);
  const invPaid=data.invoices.reduce((n,x)=>n+Number(x.paid_amount||0),0);
  el('invoiceCount')&&(el('invoiceCount').textContent=data.invoices.length);
  el('invoiceValue')&&(el('invoiceValue').textContent=money(invTotal));
  el('invoicePaid')&&(el('invoicePaid').textContent=money(invPaid));
  el('invoiceDue')&&(el('invoiceDue').textContent=money(Math.max(0,invTotal-invPaid)));
  el('shipmentCount')&&(el('shipmentCount').textContent=data.exportShipments.length);
  el('shipmentCbm')&&(el('shipmentCbm').textContent=data.exportShipments.reduce((n,x)=>n+Number(x.cbm||0),0).toFixed(2));
  el('shipmentPcs')&&(el('shipmentPcs').textContent=data.exportShipments.reduce((n,x)=>n+Number(x.piece_count||0),0));
  const fobCurrencies=[...new Set(data.exportShipments.map(x=>x.currency||'USD'))];
  el('shipmentFob')&&(el('shipmentFob').textContent=fobCurrencies.length>1?'Multi-currency':new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(data.exportShipments.reduce((n,x)=>n+Number(x.fob_total||0),0))+' '+(fobCurrencies[0]||'USD'));
  renderAgenda();

  const orderCells=x=>'<td>'+date(x.order_date)+'</td><td>'+esc(x.customer_name)+'</td><td>'+esc(x.product_name)+'</td><td>'+money(x.total_amount)+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>';
  el('recentOrders').innerHTML=o.slice(0,5).map(x=>'<tr>'+orderCells(x)+'</tr>').join('')||'<tr><td colspan="5">Belum ada pesanan.</td></tr>';
  el('ordersRows').innerHTML=o.map(x=>'<tr>'+orderCells(x)+action('orders',x.id)+'</tr>').join('')||'<tr><td colspan="6">Belum ada pesanan.</td></tr>';
  el('customersRows').innerHTML=data.customers.map(x=>'<tr><td>'+esc(x.customer_code||'—')+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.company_name||'—')+'</td><td>'+esc(x.country||'Indonesia')+'</td><td>'+esc(x.customer_type||'—')+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>'+action('customers',x.id)+'</tr>').join('')||'<tr><td colspan="7">Belum ada customer.</td></tr>';
  el('productsRows').innerHTML=data.products.map(x=>'<tr><td>'+esc(x.sku)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.category||'—')+'</td><td>'+money(x.selling_price)+'</td><td>'+Number(x.stock||0)+'</td><td>'+Number(x.min_stock||0)+'</td>'+action('products',x.id)+'</tr>').join('')||'<tr><td colspan="7">Belum ada produk.</td></tr>';
  el('productionRows').innerHTML=data.production.map(x=>'<tr><td>'+esc(x.production_code)+'</td><td>'+esc(data.products.find(p=>String(p.id)===String(x.product_id))?.name||x.product_name||'—')+'</td><td>'+Number(x.qty_planned||0)+' / '+Number(x.qty_completed||0)+'</td><td>'+esc(data.artisans.find(a=>String(a.id)===String(x.artisan_id))?.name||'—')+'</td><td>'+date(x.due_date)+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>'+action('production_orders',x.id)+'</tr>').join('')||'<tr><td colspan="7">Belum ada produksi.</td></tr>';
  el('artisansRows').innerHTML=data.artisans.map(x=>'<tr><td>'+esc(x.artisan_code||'—')+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.skill||'—')+'</td><td>'+Number(x.daily_capacity||0)+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>'+action('artisans',x.id)+'</tr>').join('')||'<tr><td colspan="6">Belum ada pengrajin.</td></tr>';
  el('attendanceRows').innerHTML=data.attendance.map(x=>{const a=data.artisans.find(v=>v.name===x.employee_name);return '<tr><td>'+esc(x.employee_name)+'</td><td>'+esc(x.division||'—')+'</td><td>'+date(x.attendance_date)+'</td><td>'+time(x.check_in)+'</td><td>'+time(x.check_out)+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td><td>'+(a?'<button type="button" class="row-btn" data-action="qr" data-id="'+a.id+'">QR</button>':'')+(x.check_in&&!x.check_out?'<button type="button" class="row-btn" data-action="checkout" data-id="'+x.id+'">Pulang</button>':'')+'<button type="button" class="row-btn" data-action="edit" data-table="attendance" data-id="'+x.id+'">Edit</button><button type="button" class="row-btn danger" data-action="delete" data-table="attendance" data-id="'+x.id+'">Hapus</button></td></tr>'}).join('')||'<tr><td colspan="7">Belum ada absensi.</td></tr>';
  el('invoicesRows').innerHTML=data.invoices.map(x=>'<tr><td>'+esc(x.invoice_no)+'</td><td>'+date(x.issue_date)+'</td><td>'+date(x.due_date)+'</td><td>'+money(x.total)+'</td><td>'+money(x.paid_amount)+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>'+action('invoices',x.id,'<button type="button" class="row-btn" data-action="print" data-id="'+x.id+'">Print</button>')+'</tr>').join('')||'<tr><td colspan="7">Belum ada invoice.</td></tr>';
  el('exportRows').innerHTML=data.exportShipments.map(x=>'<tr><td>'+esc(x.shipment_code)+'</td><td>'+esc(x.country||'—')+'</td><td>'+esc(x.destination||'—')+'</td><td>'+Number(x.cbm||0)+'</td><td>'+Number(x.carton_count||0)+'</td><td>'+Number(x.piece_count||0)+'</td><td>'+Number(x.fob_total||0)+' '+esc(x.currency||'USD')+'</td><td><span class="tag">'+esc(x.status||'—')+'</span></td>'+action('export_shipments',x.id)+'</tr>').join('')||'<tr><td colspan="9">Belum ada shipment.</td></tr>';
  el('paymentsRows').innerHTML=data.payments.slice(0,30).map(x=>'<tr><td>'+date(x.payment_date)+'</td><td>'+esc(data.invoices.find(i=>String(i.id)===String(x.invoice_id))?.invoice_no||'—')+'</td><td>'+esc(data.orders.find(o=>String(o.id)===String(x.order_id))?.order_code||'—')+'</td><td>'+money(x.amount)+'</td><td>'+esc(x.payment_method||'—')+'</td><td>'+esc(x.reference_no||'—')+'</td>'+action('payments',x.id)+'</tr>').join('')||'<tr><td colspan="7">Belum ada pembayaran.</td></tr>';
  el('expensesRows').innerHTML=data.expenses.slice(0,30).map(x=>'<tr><td>'+date(x.expense_date)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.payment_method||'—')+'</td><td>'+money(x.amount)+'</td>'+action('expenses',x.id)+'</tr>').join('')||'<tr><td colspan="6">Belum ada pengeluaran.</td></tr>';
  el('targetsRows').innerHTML=data.targets.map(t=>{const total=Number(t.target_value||0),cur=Number(t.current_value||0),pct=total?Math.min(100,Math.round(cur/total*100)):0;return '<article class="panel target"><h3>'+esc(t.title)+'</h3><p>'+new Intl.NumberFormat('id-ID').format(cur)+' '+esc(t.unit||'Rp')+' dari '+new Intl.NumberFormat('id-ID').format(total)+' '+esc(t.unit||'Rp')+' · '+esc(t.period_label||'')+'</p><div class="bar"><i style="width:'+pct+'%"></i></div><p><b>'+pct+'% tercapai</b></p>'+action('business_targets',t.id)+'</article>'}).join('')||'<section class="panel"><p>Belum ada target.</p></section>';
  addActions();
}

async function load(){
  const q={
    orders:db.from('orders').select('*').order('created_at',{ascending:false}),
    attendance:db.from('attendance').select('*').order('attendance_date',{ascending:false}),
    targets:db.from('business_targets').select('*').order('created_at',{ascending:false}),
    customers:db.from('customers').select('*').order('created_at',{ascending:false}),
    products:db.from('products').select('*').order('created_at',{ascending:false}),
    production:db.from('production_orders').select('*').order('created_at',{ascending:false}),
    artisans:db.from('artisans').select('*').order('created_at',{ascending:false}),
    invoices:db.from('invoices').select('*').order('created_at',{ascending:false}),
    exportShipments:db.from('export_shipments').select('*').order('created_at',{ascending:false}),
    expenses:db.from('expenses').select('*').order('expense_date',{ascending:false}),
    payments:db.from('payments').select('*').order('payment_date',{ascending:false}),
    settings:db.from('app_settings').select('*').eq('id','company').maybeSingle(),
    agenda:db.from('agenda_events').select('*').order('agenda_date',{ascending:true}).order('start_time',{ascending:true})
  };
  const es=Object.entries(q),rs=await Promise.all(es.map(([,x])=>x)),bad=rs.find(x=>x.error);
  if(bad){console.error(bad.error);msg('settingsMessage',bad.error.message||'Data belum bisa dimuat.');return false}
  es.forEach(([k],i)=>{if(k!=='settings')data[k]=rs[i].data||[]});
  const st=rs[es.findIndex(x=>x[0]==='settings')].data;
  data.companySettings=st||{company_name:'Rindik Art',admin_name:''};
  data.agenda=rs[es.findIndex(x=>x[0]==='agenda')].data||[];
  if(st){el('companyName').value=st.company_name||'Rindik Art';el('adminName').value=st.admin_name||'';el('headerName').textContent=st.company_name||'Rindik Art'}
  render();msg('settingsMessage','');return true;
}

async function syncInvoicePayments(invoiceId){
  if(!invoiceId)return;
  const {data:rows,error}=await db.from('payments').select('amount').eq('invoice_id',invoiceId);
  if(error){console.error(error);return}
  const paid=(rows||[]).reduce((n,x)=>n+Number(x.amount||0),0);
  const inv=data.invoices.find(x=>String(x.id)===String(invoiceId));if(!inv)return;
  const total=Number(inv.total||0);
  const status=paid<=0?'Draft':paid>=total?'Lunas':'Sebagian';
  const {error:e}=await db.from('invoices').update({paid_amount:Math.min(paid,total),status,updated_at:new Date().toISOString()}).eq('id',invoiceId);
  if(e)console.error(e);
}

el('dataForm').onsubmit=async e=>{
  e.preventDefault();
  msg('formMessage','Menyimpan...');
  const f=forms[activeForm];
  const raw=Object.fromEntries(new FormData(e.target));
  Object.keys(raw).forEach(k=>{if(raw[k]==='')delete raw[k]});
  if(activeForm==='order'){
    raw.order_date=raw.order_date||today();raw.quantity=Number(raw.quantity||1);raw.unit_price=Number(raw.unit_price||0);
    raw.total_amount=raw.quantity*raw.unit_price;raw.dp_amount=Number(raw.dp_amount||0);
    const cust=data.customers.find(x=>String(x.id)===String(raw.customer_id));
    const prod=data.products.find(x=>String(x.sku)===String(raw.sku));
    if(!cust||!prod){msg('formMessage','Pilih customer dan produk yang valid.');return}
    raw.customer_name=cust.name;raw.product_name=prod.name;
  }
  if(activeForm==='product'){
    raw.cost_price=Number(raw.cost_price||0);raw.selling_price=Number(raw.selling_price||0);raw.stock=Number(raw.stock||0);raw.min_stock=Number(raw.min_stock||0);raw.active=raw.active!=='Tidak';
  }
  if(activeForm==='customer'&&!raw.customer_code)raw.customer_code='CUS-'+String(data.customers.length+1).padStart(3,'0');
  if(activeForm==='invoice'){raw.subtotal=Number(raw.subtotal||0);raw.shipping_cost=Number(raw.shipping_cost||0);raw.discount=Number(raw.discount||0);raw.total=Number(raw.total||0);raw.paid_amount=Number(raw.paid_amount||0)}
  if(activeForm==='payment'){raw.amount=Number(raw.amount||0);raw.payment_date=raw.payment_date||today()}
  if(activeForm==='expense')raw.amount=Number(raw.amount||0);
  if(activeForm==='target'){raw.target_value=Number(raw.target_value||0);raw.current_value=Number(raw.current_value||0)}
  if(activeForm==='attendance'){raw.attendance_date=today();if(['Hadir','Terlambat'].includes(raw.status)&&!editingId)raw.check_in=new Date().toISOString()}
  if(activeForm==='production'){
    raw.qty_planned=Number(raw.qty_planned||0);raw.qty_completed=Number(raw.qty_completed||0);
    const p=data.products.find(x=>String(x.id)===String(raw.product_id));if(p){raw.product_name=p.name}
  }
  if(activeForm==='export'){
    raw.cbm=Number(raw.cbm||0);raw.carton_count=Number(raw.carton_count||0);raw.piece_count=Number(raw.piece_count||0);raw.fob_total=Number(raw.fob_total||0);
    const c=data.customers.find(x=>String(x.id)===String(raw.customer_id));if(c&&!raw.country)raw.country=c.country||'';
  }
  if(!editingId && activeForm==='production'&&!raw.production_code)raw.production_code='PRD-'+today().replaceAll('-','')+'-'+String(data.production.length+1).padStart(3,'0');
  if(!editingId && activeForm==='invoice'&&!raw.invoice_no)raw.invoice_no='INV-'+today().replaceAll('-','')+'-'+String(data.invoices.length+1).padStart(3,'0');
  if(!editingId && activeForm==='export'&&!raw.shipment_code)raw.shipment_code='SHP-'+today().replaceAll('-','')+'-'+String(data.exportShipments.length+1).padStart(3,'0');

  const payload=noUpdatedAt.has(f.table)?raw:{...raw,updated_at:new Date().toISOString()};
  const query=editingId?db.from(f.table).update(payload).eq('id',editingId):db.from(f.table).insert(payload);
  const {error}=await query;
  if(error){console.error(error);msg('formMessage','Gagal menyimpan: '+error.message);return}
  if(activeForm==='payment'&&raw.invoice_id)await syncInvoicePayments(raw.invoice_id);
  el('modal').hidden=true;editingId=null;e.target.reset();await load();
};

let calendarCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);const agendaDateTime=a=>new Date(a.agenda_date+'T'+(a.start_time||'00:00:00'));
function renderAgenda(){const now=new Date(),upcoming=data.agenda.filter(a=>a.status!=='Batal'&&a.status!=='Selesai'&&agendaDateTime(a)>=now).sort((a,b)=>agendaDateTime(a)-agendaDateTime(b)).slice(0,8);const shipmentAlerts=data.orders.filter(x=>x.due_date&&x.status!=='Selesai'&&x.status!=='Batal').map(x=>{const d=new Date(x.due_date+'T00:00:00');return {...x,days:Math.ceil((d-new Date(today()+'T00:00:00'))/86400000)}}).filter(x=>x.days<=7);const p=el('notificationPanel');if(p){const items=[];upcoming.slice(0,5).forEach(a=>items.push('<div class="notice"><b>🔔 '+esc(a.title)+'</b><span>'+date(a.agenda_date)+(a.start_time?' · '+String(a.start_time).slice(0,5):'')+' · '+esc(a.category||'Agenda')+'</span></div>'));shipmentAlerts.slice(0,5).forEach(x=>items.push('<div class="notice shipment"><b>📦 '+esc(x.days<0?'Pesanan terlambat':x.days===0?'Pengiriman hari ini':x.days===1?'Pengiriman besok':'Pengiriman '+x.days+' hari lagi')+'</b><span>'+esc(x.order_code||'PO')+' · '+esc(x.customer_name||'Customer')+'</span></div>'));p.innerHTML=items.length?'<div class="notice-title">🔔 Pusat Notifikasi</div>'+items.join(''):'<div class="notice quiet">✓ Tidak ada agenda atau deadline yang perlu perhatian saat ini.</div>'}const rows=el('agendaRows');if(rows)rows.innerHTML=data.agenda.slice().sort((a,b)=>agendaDateTime(a)-agendaDateTime(b)).map(a=>'<tr><td>'+date(a.agenda_date)+'</td><td>'+esc(a.start_time?String(a.start_time).slice(0,5):'—')+'</td><td><b>'+esc(a.title)+'</b><br><small>'+esc(a.notes||'')+'</small></td><td>'+esc(a.category||'Agenda')+'</td><td><span class="tag">'+esc(a.status||'Terjadwal')+'</span></td>'+action('agenda_events',a.id)+'</tr>').join('')||'<tr><td colspan="6">Belum ada agenda.</td></tr>';renderCalendar();if(document.visibilityState==='visible')maybeBrowserNotify(upcoming,shipmentAlerts)}
function renderCalendar(){const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),start=(first.getDay()+6)%7;el('calendarTitle').textContent=first.toLocaleDateString('id-ID',{month:'long',year:'numeric'});const names=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];let h=names.map(n=>'<div class="cal-name">'+n+'</div>').join('');for(let i=0;i<start;i++)h+='<div class="cal-day empty"></div>';for(let d=1;d<=days;d++){const ds=new Date(y,m,d).toLocaleDateString('en-CA'),list=data.agenda.filter(a=>a.agenda_date===ds&&a.status!=='Batal');h+='<div class="cal-day '+(ds===today()?'today':'')+'"><b>'+d+'</b>'+list.slice(0,3).map(a=>'<span>'+esc(a.start_time?String(a.start_time).slice(0,5)+' ':'')+esc(a.title)+'</span>').join('')+(list.length>3?'<small>+'+(list.length-3)+' agenda</small>':'')+'</div>'}el('calendarGrid').innerHTML=h}
let notifiedKeys=new Set();function maybeBrowserNotify(upcoming,shipmentAlerts){if(!('Notification'in window)||Notification.permission!=='granted')return;const now=Date.now();upcoming.forEach(a=>{const dt=agendaDateTime(a),minutes=Number(a.reminder_minutes??60),key='a:'+a.id+':'+a.agenda_date+':'+a.start_time;if(now>=dt.getTime()-minutes*60000&&now<=dt.getTime()+10*60000&&!notifiedKeys.has(key)){new Notification('Rindik Art — Pengingat',{body:a.title+' · '+date(a.agenda_date)+(a.start_time?' '+String(a.start_time).slice(0,5):'')});notifiedKeys.add(key)}});shipmentAlerts.filter(x=>x.days<=2).forEach(x=>{const key='s:'+x.id+':'+x.due_date;if(!notifiedKeys.has(key)){new Notification('Rindik Art — Deadline Pengiriman',{body:(x.order_code||'PO')+' · '+(x.customer_name||'Customer')+' · '+(x.days<0?'Terlambat':x.days===0?'Hari ini':x.days+' hari lagi')});notifiedKeys.add(key)}})}

document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openForm(b.dataset.open));

function qrPayload(artisan){return 'RINDIK-ABSEN|'+artisan.id+'|'+(artisan.artisan_code||'')+'|'+encodeURIComponent(artisan.name||'')}
function showQrForArtisan(id){
  const a=data.artisans.find(x=>String(x.id)===String(id));if(!a)return;
  const box=el('qrCode');box.innerHTML='';
  el('qrTitle').textContent='QR Absensi — '+(a.name||'Pengrajin');
  el('qrSub').textContent=(a.artisan_code||'')+' · Scan untuk check-in / check-out';
  if(window.QRCode)new QRCode(box,{text:qrPayload(a),width:220,height:220,colorDark:'#20362d',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  el('qrModal').hidden=false;
}
let qrScanner=null,scannerRunning=false;
async function stopQrScanner(){
  if(qrScanner&&scannerRunning){try{await qrScanner.stop();await qrScanner.clear()}catch(e){console.warn(e)}}
  qrScanner=null;scannerRunning=false;
}
async function handleAttendanceQr(text){
  const p=String(text||'').split('|');if(p[0]!=='RINDIK-ABSEN'||!p[1]){msg('scanMessage','QR tidak dikenali sebagai QR Absensi Rindik Art.');return}
  const a=data.artisans.find(x=>String(x.id)===String(p[1]));
  if(!a){msg('scanMessage','Data pengrajin untuk QR ini tidak ditemukan.');return}
  msg('scanMessage','Memproses absensi '+a.name+'...');
  const {data:todayRows,error}=await db.from('attendance').select('*').eq('attendance_date',today()).eq('employee_name',a.name).order('created_at',{ascending:false}).limit(1);
  if(error){msg('scanMessage','Gagal membaca absensi: '+error.message);return}
  const open=todayRows?.find(x=>!x.check_out);
  if(open){
    const {error:e}=await db.from('attendance').update({check_out:new Date().toISOString()}).eq('id',open.id);
    if(e)msg('scanMessage','Gagal check-out: '+e.message);else{msg('scanMessage','✓ '+a.name+' berhasil check-out.');await load();setTimeout(()=>{el('scannerModal').hidden=true;stopQrScanner()},700)}
  }else{
    const {error:e}=await db.from('attendance').insert({employee_name:a.name,division:a.division||'',attendance_date:today(),check_in:new Date().toISOString(),status:'Hadir',notes:'Absensi QR'});
    if(e)msg('scanMessage','Gagal check-in: '+e.message);else{msg('scanMessage','✓ '+a.name+' berhasil check-in.');await load();setTimeout(()=>{el('scannerModal').hidden=true;stopQrScanner()},700)}
  }
}
async function startQrScanner(){
  if(typeof Html5Qrcode==='undefined'){msg('scanMessage','Scanner belum termuat. Pastikan internet aktif, lalu coba lagi.');return}
  await stopQrScanner();
  qrScanner=new Html5Qrcode('qr-reader');scannerRunning=true;
  try{
    await qrScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:250}},handleAttendanceQr,()=>{});
  }catch(e){
    scannerRunning=false;msg('scanMessage','Kamera tidak dapat dibuka. Izinkan akses kamera di browser, lalu coba lagi.');
  }
}
el('scanAttendanceBtn')?.addEventListener('click',()=>{el('scannerModal').hidden=false;msg('scanMessage','Arahkan kamera ke QR karyawan.');setTimeout(startQrScanner,150)});
el('closeScanner')?.addEventListener('click',()=>{el('scannerModal').hidden=true;stopQrScanner()});
el('stopScanner')?.addEventListener('click',()=>{el('scannerModal').hidden=true;stopQrScanner()});
el('closeQrModal')?.addEventListener('click',()=>{el('qrModal').hidden=true});
el('printQrBtn')?.addEventListener('click',()=>window.print());

el('closeModal').onclick=()=>{el('modal').hidden=true;editingId=null};
el('prevMonth')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()});
el('nextMonth')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()});
el('requestNotify')?.addEventListener('click',async()=>{if(!('Notification'in window)){alert('Browser tidak mendukung notifikasi.');return}const p=await Notification.requestPermission();alert(p==='granted'?'✓ Notifikasi aktif.':'Notifikasi belum diizinkan.');renderAgenda()});

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const act=b.dataset.action,id=b.dataset.id,table=b.dataset.table;
  if(act==='edit'){
    const key={production_orders:'production',export_shipments:'export',business_targets:'target',orders:'order',customers:'customer',products:'product',artisans:'artisan',attendance:'attendance',invoices:'invoice',expenses:'expense',payments:'payment'}[table];
    const row=data[key]?.find(x=>String(x.id)===String(id));if(row)openForm(key,row);
  }
  if(act==='delete'){
    if(!confirm('Hapus data ini? Tindakan ini tidak dapat dibatalkan.'))return;
    const oldPayment=table==='payments'?data.payments.find(x=>String(x.id)===String(id)):null;
    const {error}=await db.from(table).delete().eq('id',id);
    if(error){alert('Gagal menghapus: '+error.message);return}
    if(oldPayment?.invoice_id)await syncInvoicePayments(oldPayment.invoice_id);
    await load();
  }
  if(act==='checkout'){
    const {error}=await db.from('attendance').update({check_out:new Date().toISOString()}).eq('id',id);
    if(error)alert(error.message);else await load();
  }
  if(act==='print')printInvoice(id);
  if(act==='qr')showQrForArtisan(id);
});

function printInvoice(id){
  const x=data.invoices.find(v=>String(v.id)===String(id));if(!x)return;
  const w=window.open('','_blank','width=900,height=1000');if(!w){alert('Izinkan pop-up untuk mencetak invoice.');return}
  const c=data.customers.find(v=>String(v.id)===String(x.customer_id));
  const o=data.orders.find(v=>String(v.id)===String(x.order_id));
  w.document.write('<!doctype html><html><head><title>'+esc(x.invoice_no)+'</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#20362d;margin:0}.head{display:flex;justify-content:space-between;border-bottom:2px solid #315646;padding-bottom:16px}.logo{width:220px;height:75px;object-fit:contain;object-position:left}.meta{text-align:right;font-size:12px}.title{font-size:28px;letter-spacing:2px;margin:25px 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}.box{border:1px solid #ddd;padding:14px;border-radius:6px}.items{width:100%;border-collapse:collapse;margin-top:20px}.items th,.items td{border-bottom:1px solid #ddd;padding:10px;text-align:left}.total{margin-left:auto;width:330px;margin-top:25px}.total div{display:flex;justify-content:space-between;padding:7px}.grand{font-size:18px;font-weight:bold;border-top:2px solid #315646}.foot{margin-top:70px;border-top:1px solid #ddd;padding-top:15px;font-size:11px;text-align:center;color:#65736a}</style></head><body><div class="head"><img class="logo" src="https://app.rindikartshop.com/rindik-art-logo.svg"><div class="meta"><b>INVOICE</b><br>'+esc(x.invoice_no)+'<br>'+date(x.issue_date)+'<br>Jatuh tempo: '+date(x.due_date)+'</div></div><h1 class="title">INVOICE</h1><div class="grid"><div class="box"><b>BILL TO</b><br>'+esc(c?.name||x.customer_id||'Customer / Buyer')+'<br>'+esc(c?.company_name||'')+'<br>'+esc(c?.country||'')+'</div><div class="box"><b>PESANAN</b><br>'+esc(o?.order_code||x.order_id||'—')+'<br>STATUS: '+esc(x.status||'—')+'</div></div><table class="items"><tr><th>DESKRIPSI</th><th>JUMLAH</th></tr><tr><td>Subtotal</td><td>'+money(x.subtotal)+'</td></tr><tr><td>Ongkir</td><td>'+money(x.shipping_cost)+'</td></tr><tr><td>Diskon</td><td>- '+money(x.discount)+'</td></tr></table><div class="total"><div><span>Total</span><b>'+money(x.total)+'</b></div><div><span>Sudah dibayar</span><span>'+money(x.paid_amount)+'</span></div><div class="grand"><span>Sisa</span><span>'+money(Number(x.total||0)-Number(x.paid_amount||0))+'</span></div></div><div class="foot">PT Dunia Kerajinan Rotan Lombok · Rindik Art<br>Jl. Pendem, Kec. Janapria, Lombok Tengah, NTB · rindikartshop@gmail.com · WhatsApp 0878-5558-3831<br>Crafted With Love & Care</div><script>setTimeout(()=>window.print(),300)</script></body></html>');
  w.document.close();
}

el('settingsForm').onsubmit=async e=>{
  e.preventDefault();msg('settingsMessage','Menyimpan...');
  const {error}=await db.from('app_settings').upsert({id:'company',company_name:el('companyName').value.trim(),admin_name:el('adminName').value.trim(),updated_at:new Date().toISOString()});
  msg('settingsMessage',error?'Gagal: '+error.message:'✓ Pengaturan tersimpan.');if(!error)await load();
};
el('passwordToggle').onclick=()=>{const p=el('password'),show=p.type==='password';p.type=show?'text':'password';el('passwordToggle').textContent=show?'Sembunyikan':'Tampilkan'};
el('authSwitch').onclick=()=>{mode=mode==='login'?'signup':'login';el('authTitle').textContent=mode==='login'?'Masuk ke Rindik Art':'Buat Akun Rindik Art';el('authDescription').textContent=mode==='login'?'Kelola data perusahaan dengan aman dari perangkat mana pun.':'Daftarkan akun untuk mengakses aplikasi operasional.';el('password').autocomplete=mode==='login'?'current-password':'new-password';el('authButton').textContent=mode==='login'?'Masuk':'Daftar';el('authSwitch').textContent=mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk';el('forgotButton').hidden=mode!=='login';msg('authMessage','')};
el('forgotButton').onclick=async()=>{const email=el('email').value.trim().toLowerCase();if(!email){msg('authMessage','Masukkan email terlebih dahulu.');return}msg('authMessage','Mengirim email pemulihan...');const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://app.rindikartshop.com/reset-password'});msg('authMessage',error?error.message:'Email pemulihan dikirim. Periksa inbox/spam.')};
el('authForm').onsubmit=async e=>{e.preventDefault();msg('authMessage','Memproses...');const email=el('email').value.trim().toLowerCase(),password=el('password').value;const r=mode==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password,options:{emailRedirectTo:'https://app.rindikartshop.com/'}});if(r.error){const code=r.error.code||r.error.name||'AUTH_ERROR';const status=r.error.status?' HTTP '+r.error.status:'';console.error(r.error);msg('authMessage','Auth error ['+code+']'+status+': '+(r.error.message||'Permintaan login ditolak.'));el('password').value='';return}if(mode==='signup')msg('authMessage',r.data.session?'Akun berhasil dibuat.':'Periksa email untuk konfirmasi akun, lalu masuk.');else if(r.data?.session)await showApp(r.data.session);else msg('authMessage','Login berhasil tetapi sesi tidak terbentuk.')};
el('recoveryForm').onsubmit=async e=>{e.preventDefault();const p=el('newPassword').value,p2=el('newPassword2').value;if(p.length<8){msg('recoveryMessage','Kata sandi minimal 8 karakter.');return}if(p!==p2){msg('recoveryMessage','Kata sandi tidak sama.');return}msg('recoveryMessage','Menyimpan...');const {error}=await db.auth.updateUser({password:p});if(error){msg('recoveryMessage',error.message);return}msg('recoveryMessage','✓ Kata sandi berhasil diperbarui.');await db.auth.signOut();setTimeout(()=>location.href='/',500)};
async function showApp(s){if(!s)return;el('recoveryScreen').hidden=true;el('authScreen').hidden=true;el('app').hidden=false;el('userEmail').textContent=s.user.email||'';await load()}
async function start(){
  if(starting)return;starting=true;
  try{
    const hash=location.hash||'',expired=/error=access_denied|error_code=otp_expired|error_description=/i.test(hash);
    if(expired){await db.auth.signOut();el('recoveryScreen').hidden=true;el('app').hidden=true;el('authScreen').hidden=false;msg('authMessage','Link pemulihan sudah kedaluwarsa. Minta email reset baru.');history.replaceState(null,'',location.pathname);return}
    const recovery=window.__RINDIK_RECOVERY_ROUTE||location.pathname.replace(/\/$/,'').endsWith('/reset-password')||hash.includes('type=recovery')||hash.includes('update-password')||hash.includes('access_token=');
    if(recovery){el('authScreen').hidden=true;el('app').hidden=true;el('recoveryScreen').hidden=false;msg('recoveryMessage','Siap membuat kata sandi baru.')}
    const {data:{session}}=await db.auth.getSession();if(session&&!recovery)await showApp(session);
  }finally{starting=false}
}
db.auth.onAuthStateChange((event,session)=>{
  const recovery=window.__RINDIK_RECOVERY_ROUTE||location.pathname.replace(/\/$/,'').endsWith('/reset-password')||location.hash.includes('type=recovery')||location.hash.includes('access_token=');
  if(recovery){el('authScreen').hidden=true;el('app').hidden=true;el('recoveryScreen').hidden=false;if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')msg('recoveryMessage','Siap membuat kata sandi baru.');return}
  if(event==='SIGNED_IN'&&session&&el('app').hidden)showApp(session);
});
el('logout').onclick=async()=>{await db.auth.signOut();location.href='/'};
window.addEventListener('load',start);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=20260919-7').catch(console.warn));