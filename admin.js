const cfg=window.RINDIK_SUPABASE;
if(!cfg?.url||!cfg?.publishableKey)throw new Error('Konfigurasi Supabase belum tersedia.');
const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
let mode='login',activeForm='',starting=false;
const data={orders:[],attendance:[],targets:[],customers:[],products:[],production:[],artisans:[],invoices:[],exportShipments:[],expenses:[],payments:[]};
const el=id=>document.getElementById(id);
const money=v=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const msg=(id,text)=>{const x=el(id);if(x)x.textContent=text||''};
function today(){return new Date().toLocaleDateString('en-CA')}
function setView(view){const target=el(view);if(!target)return;document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));target.classList.add('active');document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));history.replaceState(null,'','#'+view);document.querySelector('aside')?.classList.remove('open')}
document.querySelectorAll('[data-view]').forEach(a=>a.onclick=e=>{e.preventDefault();setView(a.dataset.view)});
el('menu').onclick=()=>document.querySelector('aside').classList.toggle('open');

const forms={
 customer:{table:'customers',title:'Customer / Buyer',eyebrow:'CRM',fields:[
  ['customer_code','Kode customer','text'],['name','Nama customer','text',true],['company_name','Perusahaan','text'],['country','Negara','text'],['city','Kota','text'],['phone','WhatsApp / Telepon','text'],['email','Email','email'],
  ['customer_type','Tipe','select',['Retail','Wholesale','B2B','Export']],['status','Status','select',['Prospek','Aktif','Tidak Aktif']],['notes','Catatan','text']
 ]},
 product:{table:'products',title:'Produk',eyebrow:'INVENTORY',fields:[
  ['sku','SKU','text',true],['name','Nama produk','text',true],['category','Kategori','text'],['material','Material','text'],['unit','Satuan','text'],['cost_price','Harga modal','number'],['selling_price','Harga jual','number'],['stock','Stok awal','number'],['min_stock','Minimum stok','number'],['notes','Catatan','text']
 ]},
 order:{table:'orders',title:'Pesanan / PO',eyebrow:'PENJUALAN',fields:[
  ['order_code','Kode PO / Pesanan','text'],['customer_name','Nama customer','text',true],['product_name','Produk','text',true],['sku','SKU','text'],['quantity','Qty','number'],['unit_price','Harga per pcs','number'],['total_amount','Total penjualan','number',true],['dp_amount','DP','number'],
  ['status','Status','select',['Baru','Menunggu Pembayaran','Diproduksi','Siap Kirim','Selesai','Batal']],['payment_status','Pembayaran','select',['Belum Lunas','DP','Lunas']],['currency','Mata uang','select',['IDR','USD']],['notes','Catatan','text']
 ]},
 production:{table:'production_orders',title:'Produksi',eyebrow:'PRODUKSI',fields:[
  ['production_code','Kode produksi','text',true],['product_id','ID produk (opsional)','text'],['order_id','ID pesanan (opsional)','text'],['qty_planned','Qty rencana','number',true],['qty_completed','Qty selesai','number'],['start_date','Mulai','date'],['due_date','Jatuh tempo','date'],['status','Status','select',['Rencana','Diproses','QC','Selesai','Batal']],['notes','Catatan','text']
 ]},
 artisan:{table:'artisans',title:'Pengrajin',eyebrow:'PENGRAJIN',fields:[
  ['artisan_code','Kode pengrajin','text'],['name','Nama pengrajin','text',true],['division','Divisi','text'],['phone','Telepon','text'],['address','Alamat','text'],['skill','Keahlian','text'],['status','Status','select',['Aktif','Nonaktif']],['joined_date','Tanggal bergabung','date'],['daily_capacity','Kapasitas/hari','number'],['notes','Catatan','text']
 ]},
 attendance:{table:'attendance',title:'Absensi',eyebrow:'SDM',fields:[
  ['employee_name','Nama karyawan','text',true],['division','Divisi','text'],['status','Status','select',['Hadir','Terlambat','Izin','Sakit']],['notes','Catatan','text']
 ]},
 invoice:{table:'invoices',title:'Invoice',eyebrow:'TAGIHAN',fields:[
  ['invoice_no','Nomor invoice','text',true],['order_id','ID pesanan (opsional)','text'],['customer_id','ID customer (opsional)','text'],['issue_date','Tanggal invoice','date'],['due_date','Jatuh tempo','date'],['subtotal','Subtotal','number'],['shipping_cost','Ongkir','number'],['discount','Diskon','number'],['total','Total','number',true],['paid_amount','Sudah dibayar','number'],['status','Status','select',['Draft','Terkirim','Sebagian','Lunas','Batal']],['notes','Catatan','text']
 ]},
 export:{table:'export_shipments',title:'Export Shipment & FOB',eyebrow:'EXPORT',fields:[
  ['shipment_code','Kode shipment','text',true],['customer_id','ID customer (opsional)','text'],['country','Negara tujuan','text'],['destination','Pelabuhan / kota tujuan','text'],['shipment_date','Tanggal kirim','date'],['incoterm','Incoterm','select',['FOB','EXW','CIF']],['cbm','CBM','number'],['carton_count','Jumlah karton','number'],['piece_count','Jumlah pcs','number'],['fob_total','Total FOB','number'],['currency','Mata uang','select',['USD','IDR']],['status','Status','select',['Rencana','Booking','Dokumen','Dikirim','Selesai']],['notes','Catatan','text']
 ]},
 expense:{table:'expenses',title:'Pengeluaran',eyebrow:'KEUANGAN',fields:[
  ['expense_date','Tanggal','date'],['category','Kategori','text',true],['description','Keterangan','text',true],['amount','Jumlah','number',true],['payment_method','Metode pembayaran','select',['Cash','Transfer','Bank','Lainnya']],['notes','Catatan','text']
 ]},
 target:{table:'business_targets',title:'Target Bisnis',eyebrow:'TARGET',fields:[
  ['title','Nama target','text',true],['target_value','Nilai target','number',true],['current_value','Realisasi saat ini','number'],['unit','Satuan','select',['Rp','pcs','%','order']],['period_label','Periode','text']
 ]}
};

function render(){
 const o=data.orders;
 el('salesTotal').textContent=money(o.reduce((n,x)=>n+Number(x.total_amount||0),0));
 el('ordersTotal').textContent=o.length;
 el('attendanceTotal').textContent=data.attendance.filter(a=>a.attendance_date===today()&&['Hadir','Terlambat'].includes(a.status)).length;
 el('targetsTotal').textContent=data.targets.length;
 if(el('productsTotal'))el('productsTotal').textContent=data.products.filter(x=>x.active!==false).length;
 if(el('customersTotal'))el('customersTotal').textContent=data.customers.length;
 if(el('productionTotal'))el('productionTotal').textContent=data.production.filter(x=>['Diproses','QC'].includes(x.status)).length;
 if(el('invoicesTotal'))el('invoicesTotal').textContent=data.invoices.length;
 if(el('expensesTotal'))el('expensesTotal').textContent=money(data.expenses.reduce((n,x)=>n+Number(x.amount||0),0));
 if(el('paymentsTotal'))el('paymentsTotal').textContent=money(data.payments.reduce((n,x)=>n+Number(x.amount||0),0));
 const orderCells=x=>'<td>'+date(x.order_date)+'</td><td>'+esc(x.customer_name)+'</td><td>'+esc(x.product_name)+'</td><td>'+Number(x.quantity||0)+'</td><td>'+money(x.total_amount)+'</td><td><span class="tag">'+esc(x.status)+'</span></td><td>'+esc(x.payment_status||'Belum Lunas')+'</td>';
 el('recentOrders').innerHTML=o.slice(0,5).map(x=>'<tr>'+orderCells(x).replace('<td>'+date(x.order_date)+'</td>','')+'</tr>').join('')||'<tr><td colspan="5">Belum ada pesanan.</td></tr>';
 el('ordersRows').innerHTML=o.map(x=>'<tr>'+orderCells(x)+'</tr>').join('')||'<tr><td colspan="7">Belum ada pesanan.</td></tr>';
 el('customersRows').innerHTML=data.customers.map(x=>'<tr><td>'+esc(x.customer_code||'—')+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.company_name||'—')+'</td><td>'+esc(x.country||'Indonesia')+'</td><td>'+esc(x.customer_type)+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="6">Belum ada customer.</td></tr>';
 el('productsRows').innerHTML=data.products.map(x=>'<tr><td>'+esc(x.sku)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.category||'—')+'</td><td>'+money(x.selling_price)+'</td><td>'+Number(x.stock||0)+'</td><td>'+Number(x.min_stock||0)+'</td></tr>').join('')||'<tr><td colspan="6">Belum ada produk.</td></tr>';
 el('productionRows').innerHTML=data.production.map(x=>'<tr><td>'+esc(x.production_code)+'</td><td>'+esc(x.product_id||'—')+'</td><td>'+Number(x.qty_planned||0)+' / '+Number(x.qty_completed||0)+'</td><td>—</td><td>'+date(x.due_date)+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="6">Belum ada produksi.</td></tr>';
 el('artisansRows').innerHTML=data.artisans.map(x=>'<tr><td>'+esc(x.artisan_code||'—')+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.skill||'—')+'</td><td>'+Number(x.daily_capacity||0)+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="5">Belum ada pengrajin.</td></tr>';
 el('attendanceRows').innerHTML=data.attendance.map(x=>'<tr><td>'+esc(x.employee_name)+'</td><td>'+esc(x.division||'—')+'</td><td>'+date(x.attendance_date)+'</td><td>'+time(x.check_in)+'</td><td>'+time(x.check_out)+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="6">Belum ada absensi.</td></tr>';
 el('invoicesRows').innerHTML=data.invoices.map(x=>'<tr><td>'+esc(x.invoice_no)+'</td><td>'+date(x.issue_date)+'</td><td>'+date(x.due_date)+'</td><td>'+money(x.total)+'</td><td>'+money(x.paid_amount)+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="6">Belum ada invoice.</td></tr>';
 el('exportRows').innerHTML=data.exportShipments.map(x=>'<tr><td>'+esc(x.shipment_code)+'</td><td>'+esc(x.country||'—')+'</td><td>'+esc(x.destination||'—')+'</td><td>'+Number(x.cbm||0)+'</td><td>'+Number(x.carton_count||0)+'</td><td>'+Number(x.piece_count||0)+'</td><td>'+Number(x.fob_total||0)+' '+esc(x.currency||'USD')+'</td><td><span class="tag">'+esc(x.status)+'</span></td></tr>').join('')||'<tr><td colspan="8">Belum ada shipment.</td></tr>';
 el('expensesRows').innerHTML=data.expenses.slice(0,20).map(x=>'<tr><td>'+date(x.expense_date)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.payment_method||'—')+'</td><td>'+money(x.amount)+'</td></tr>').join('')||'<tr><td colspan="5">Belum ada pengeluaran.</td></tr>';
 el('targetsRows').innerHTML=data.targets.map(t=>{const total=Number(t.target_value||0),current=Number(t.current_value||0),pct=total?Math.min(100,Math.round(current/total*100)):0;return '<article class="panel target"><h3>'+esc(t.title)+'</h3><p>'+money(current)+' dari '+money(total)+' · '+esc(t.unit||'Rp')+' · '+esc(t.period_label||'')+'</p><div class="bar"><i style="width:'+pct+'%"></i></div><p><b>'+pct+'% tercapai</b></p></article>'}).join('')||'<section class="panel"><p>Belum ada target.</p></section>';
}
function time(v){return v?new Date(v).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'—'}

async function load(){
 msg('settingsMessage','Memuat data...');
 const queries={
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
  settings:db.from('app_settings').select('*').eq('id','company').maybeSingle()
 };
 const entries=Object.entries(queries);const results=await Promise.all(entries.map(([,q])=>q));
 const firstBad=results.find(r=>r.error);
 if(firstBad){console.error('Supabase load error',firstBad.error);msg('settingsMessage',firstBad.error.message||'Data belum bisa dimuat.');return false}
 entries.forEach(([k],i)=>{if(k!=='settings')data[k]=results[i].data||[]});
 const st=results[entries.findIndex(x=>x[0]==='settings')].data;
 if(st){el('companyName').value=st.company_name||'Rindik Art';el('adminName').value=st.admin_name||'';el('headerName').textContent=st.company_name||'Rindik Art'}
 render();msg('settingsMessage','');return true;
}

function openForm(type){
 activeForm=type;const f=forms[type];if(!f)return;
 el('modal').hidden=false;el('formEyebrow').textContent=f.eyebrow;el('formTitle').textContent=f.title;msg('formMessage','');
 el('formFields').innerHTML=f.fields.map(([name,label,type,required,opts])=>{
  const req=required?' required':'';
  if(type==='select')return '<label>'+label+'<select name="'+name+'"'+req+'>'+opts.map(o=>'<option>'+o+'</option>').join('')+'</select></label>';
  const val=(name==='quantity'||name==='qty_planned')?'1':(name==='order_date'||name==='expense_date'||name==='issue_date'||name==='start_date'||name==='joined_date')?today():'';
  return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+val+'"'+req+'></label>';
 }).join('');
}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openForm(b.dataset.open));
el('closeModal').onclick=()=>el('modal').hidden=true;

el('dataForm').onsubmit=async e=>{
 e.preventDefault();msg('formMessage','Menyimpan...');
 const f=forms[activeForm];const raw=Object.fromEntries(new FormData(e.target));
 Object.keys(raw).forEach(k=>{if(raw[k]==='')delete raw[k]});
 if(activeForm==='order'){raw.order_date=today();if(!raw.total_amount)raw.total_amount=Number(raw.quantity||1)*Number(raw.unit_price||0)}
 if(activeForm==='attendance'){raw.attendance_date=today();if(['Hadir','Terlambat'].includes(raw.status))raw.check_in=new Date().toISOString()}
 if(activeForm==='target'&&!raw.unit)raw.unit='Rp';
 if(activeForm==='invoice'){raw.issue_date=raw.issue_date||today();raw.total=Number(raw.total||0)}
 if(activeForm==='expense')raw.expense_date=raw.expense_date||today();
 const {error}=await db.from(f.table).insert(raw);
 if(error){console.error(error);msg('formMessage',error.message);return}
 el('modal').hidden=true;e.target.reset();await load();
};

el('settingsForm').onsubmit=async e=>{e.preventDefault();msg('settingsMessage','Menyimpan...');const {error}=await db.from('app_settings').upsert({id:'company',company_name:el('companyName').value.trim(),admin_name:el('adminName').value.trim(),updated_at:new Date().toISOString()});msg('settingsMessage',error?error.message:'✓ Pengaturan tersimpan.');if(!error)await load()};

el('authSwitch').onclick=()=>{mode=mode==='login'?'signup':'login';el('authTitle').textContent=mode==='login'?'Masuk ke Rindik Art':'Buat Akun Rindik Art';el('authDescription').textContent=mode==='login'?'Kelola data perusahaan dengan aman dari perangkat mana pun.':'Daftarkan akun untuk mengakses aplikasi operasional.';el('password').autocomplete=mode==='login'?'current-password':'new-password';el('authButton').textContent=mode==='login'?'Masuk':'Daftar';el('authSwitch').textContent=mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk';el('forgotButton').hidden=mode!=='login';msg('authMessage','')};
el('forgotButton').onclick=async()=>{const email=el('email').value.trim().toLowerCase();if(!email){msg('authMessage','Masukkan email terlebih dahulu.');el('email').focus();return}msg('authMessage','Mengirim email pemulihan...');const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://app.rindikartshop.com/reset-password'});msg('authMessage',error?error.message:'Email pemulihan telah dikirim. Periksa inbox/spam.')};
el('authForm').onsubmit=async e=>{e.preventDefault();msg('authMessage','Memproses...');const email=el('email').value.trim().toLowerCase(),password=el('password').value;if(mode==='login'&&(!email||!password)){msg('authMessage','Email dan kata sandi wajib diisi.');return}const result=mode==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password,options:{emailRedirectTo:'https://app.rindikartshop.com/'}});if(result.error){const l=String(result.error.message||'').toLowerCase();msg('authMessage',l.includes('invalid login credentials')?'Email atau kata sandi tidak cocok. Periksa akun produksi Rindik Art.':result.error.message);return}if(mode==='signup'){msg('authMessage',result.data.session?'Akun berhasil dibuat.':'Periksa email untuk konfirmasi akun, lalu masuk.')}else{msg('authMessage','Berhasil masuk.');await showApp(result.data.session)}};
el('recoveryForm').onsubmit=async e=>{e.preventDefault();const p=el('newPassword').value,p2=el('newPassword2').value;if(p.length<8){msg('recoveryMessage','Kata sandi minimal 8 karakter.');return}if(p!==p2){msg('recoveryMessage','Kata sandi tidak sama.');return}msg('recoveryMessage','Menyimpan...');const {error}=await db.auth.updateUser({password:p});if(error){msg('recoveryMessage',error.message);return}msg('recoveryMessage','✓ Kata sandi berhasil diperbarui. Silakan masuk kembali.');await db.auth.signOut();setTimeout(()=>location.href='/',700)};

async function showApp(session){if(!session)return;el('recoveryScreen').hidden=true;el('authScreen').hidden=true;el('app').hidden=false;el('userEmail').textContent=session.user.email||'';await load();const requested=location.hash.slice(1);if(requested&&el(requested))setView(requested)}
async function start(){
 if(starting)return;starting=true;
 try{
  const recovery=location.pathname.endsWith('/reset-password')||location.hash.includes('type=recovery')||location.hash.includes('update-password');
  if(recovery){el('authScreen').hidden=true;el('recoveryScreen').hidden=false}
  const {data:{session}}=await db.auth.getSession();
  if(session&&!recovery)await showApp(session);
 }finally{starting=false}
}
db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){el('authScreen').hidden=true;el('app').hidden=true;el('recoveryScreen').hidden=false} else if(event==='SIGNED_IN'&&session&&!el('app').hidden===false){showApp(session)}});
el('logout').onclick=async()=>{await db.auth.signOut();location.href='/'};
window.addEventListener('load',start);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=20260918-3').catch(console.warn));