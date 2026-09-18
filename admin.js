const cfg=window.RINDIK_SUPABASE;
if(!cfg?.url||!cfg?.publishableKey)throw new Error('Konfigurasi Supabase belum tersedia.');
const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
let mode='login',activeForm='',orders=[],attendance=[],targets=[],starting=false;

const el=id=>document.getElementById(id);
const money=v=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—';
const msg=(id,text)=>{el(id).textContent=text||''};

function setView(view){
  const target=el(view); if(!target)return;
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  target.classList.add('active');
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  history.replaceState(null,'','#'+view);
  document.querySelector('aside')?.classList.remove('open');
}
document.querySelectorAll('[data-view]').forEach(a=>a.onclick=e=>{e.preventDefault();setView(a.dataset.view)});
el('menu').onclick=()=>document.querySelector('aside').classList.toggle('open');

function render(){
  el('salesTotal').textContent=money(orders.reduce((n,o)=>n+Number(o.total_amount||0),0));
  el('ordersTotal').textContent=orders.length;
  const today=new Date().toLocaleDateString('en-CA');
  el('attendanceTotal').textContent=attendance.filter(a=>a.attendance_date===today&&['Hadir','Terlambat'].includes(a.status)).length;
  el('targetsTotal').textContent=targets.length;
  const cells=o=>'<td>'+esc(o.customer_name)+'</td><td>'+esc(o.product_name)+'</td><td>'+money(o.total_amount)+'</td><td><span class="tag">'+esc(o.status)+'</span></td>';
  el('recentOrders').innerHTML=orders.slice(0,5).map(o=>'<tr>'+cells(o)+'</tr>').join('')||'<tr><td colspan="4">Belum ada pesanan.</td></tr>';
  el('ordersRows').innerHTML=orders.map(o=>'<tr><td>'+date(o.order_date)+'</td>'+cells(o)+'</tr>').join('')||'<tr><td colspan="5">Belum ada pesanan.</td></tr>';
  el('attendanceRows').innerHTML=attendance.map(a=>'<tr><td>'+esc(a.employee_name)+'</td><td>'+esc(a.division||'—')+'</td><td>'+date(a.attendance_date)+'</td><td>'+(a.check_in?new Date(a.check_in).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'—')+'</td><td><span class="tag">'+esc(a.status)+'</span></td></tr>').join('')||'<tr><td colspan="5">Belum ada absensi.</td></tr>';
  el('targetsRows').innerHTML=targets.map(t=>{const total=Number(t.target_value||0),current=Number(t.current_value||0),pct=total?Math.min(100,Math.round(current/total*100)):0;return '<article class="panel target"><h3>'+esc(t.title)+'</h3><p>'+money(current)+' dari '+money(total)+' · '+esc(t.period_label||'')+'</p><div class="bar"><i style="width:'+pct+'%"></i></div><p><b>'+pct+'% tercapai</b></p></article>'}).join('')||'<section class="panel"><p>Belum ada target. Tambahkan target pertama Anda.</p></section>';
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

async function load(){
  msg('settingsMessage','Memuat data...');
  const results=await Promise.all([
    db.from('orders').select('*').order('created_at',{ascending:false}),
    db.from('attendance').select('*').order('attendance_date',{ascending:false}),
    db.from('business_targets').select('*').order('created_at',{ascending:false}),
    db.from('app_settings').select('*').eq('id','company').maybeSingle()
  ]);
  const bad=results.find(r=>r.error);
  if(bad){
    console.error('Supabase load error:',bad.error);
    const detail=bad.error?.message||'Kesalahan database';
    alert('Data belum bisa dimuat.\n\n'+detail);
    msg('settingsMessage',detail);
    return false;
  }
  orders=results[0].data||[];attendance=results[1].data||[];targets=results[2].data||[];
  const s=results[3].data;
  if(s){el('companyName').value=s.company_name||'Rindik Art';el('adminName').value=s.admin_name||'';el('headerName').textContent=s.company_name||'Rindik Art'}
  render();msg('settingsMessage','');return true;
}

function openForm(type){
  activeForm=type;el('modal').hidden=false;msg('formMessage','');
  const maps={
    order:['INPUT PESANAN','Tambah Pesanan','<label>Nama pelanggan<input name="customer_name" required></label><label>Produk<input name="product_name" required></label><label>Nilai penjualan<input name="total_amount" type="number" min="0" required></label><label>Status<select name="status"><option>Baru</option><option>Menunggu Pembayaran</option><option>Diproduksi</option><option>Siap Kirim</option><option>Selesai</option></select></label>'],
    attendance:['ABSENSI KARYAWAN','Catat Kehadiran','<label>Nama karyawan<input name="employee_name" required></label><label>Divisi<input name="division"></label><label>Status<select name="status"><option>Hadir</option><option>Terlambat</option><option>Izin</option><option>Sakit</option></select></label>'],
    target:['TARGET BISNIS','Tambah Target','<label>Nama target<input name="title" required></label><label>Nilai target<input name="target_value" type="number" min="1" required></label><label>Realisasi saat ini<input name="current_value" type="number" min="0" value="0" required></label><label>Periode<input name="period_label" value="Bulanan" required></label>']
  };
  const m=maps[type];el('formEyebrow').textContent=m[0];el('formTitle').textContent=m[1];el('formFields').innerHTML=m[2];
}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openForm(b.dataset.open));
el('closeModal').onclick=()=>el('modal').hidden=true;

el('dataForm').onsubmit=async e=>{
  e.preventDefault();msg('formMessage','Menyimpan...');
  const data=Object.fromEntries(new FormData(e.target));let table=activeForm;
  if(table==='target')table='business_targets';
  if(activeForm==='attendance'){data.attendance_date=new Date().toLocaleDateString('en-CA');if(['Hadir','Terlambat'].includes(data.status))data.check_in=new Date().toISOString()}
  if(activeForm==='order')data.order_date=new Date().toLocaleDateString('en-CA');
  const {error}=await db.from(table).insert(data);
  if(error){console.error(error);msg('formMessage',error.message);return}
  el('modal').hidden=true;e.target.reset();await load();
};

el('settingsForm').onsubmit=async e=>{
  e.preventDefault();msg('settingsMessage','Menyimpan...');
  const {error}=await db.from('app_settings').upsert({id:'company',company_name:el('companyName').value.trim(),admin_name:el('adminName').value.trim(),updated_at:new Date().toISOString()});
  msg('settingsMessage',error?error.message:'✓ Pengaturan tersimpan.');if(!error)await load();
};

el('authSwitch').onclick=()=>{
  mode=mode==='login'?'signup':'login';
  el('authTitle').textContent=mode==='login'?'Masuk ke Rindik Art':'Buat Akun Rindik Art';
  el('authDescription').textContent=mode==='login'?'Kelola data perusahaan dengan aman dari perangkat mana pun.':'Daftarkan akun untuk mengakses aplikasi operasional.';
  el('password').autocomplete=mode==='login'?'current-password':'new-password';
  el('authButton').textContent=mode==='login'?'Masuk':'Daftar';
  el('authSwitch').textContent=mode==='login'?'Belum punya akun? Daftar':'Sudah punya akun? Masuk';
  el('forgotButton').hidden=mode!=='login';msg('authMessage','');
};

el('forgotButton').onclick=async()=>{
  const email=el('email').value.trim();
  if(!email){msg('authMessage','Masukkan email terlebih dahulu.');el('email').focus();return}
  msg('authMessage','Mengirim email pemulihan...');
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://app.rindikartshop.com/reset-password'});
  msg('authMessage',error?error.message:'Email pemulihan telah dikirim. Periksa inbox/spam.');
};

el('authForm').onsubmit=async e=>{
  e.preventDefault();msg('authMessage','Memproses...');
  const email=el('email').value.trim().toLowerCase(),password=el('password').value;
  if(mode==='login' && (!email || !password)){msg('authMessage','Email dan kata sandi wajib diisi.');return}
  const result=mode==='login'
    ? await db.auth.signInWithPassword({email,password})
    : await db.auth.signUp({email,password,options:{emailRedirectTo:'https://app.rindikartshop.com/'}});
  if(result.error){
    const e=String(result.error.message||'');
    const l=e.toLowerCase();
    if(l.includes('invalid login credentials')) msg('authMessage','Email atau kata sandi tidak cocok pada akun produksi Rindik Art. Gunakan password akun produksi terbaru.');
    else msg('authMessage',e);
    return;
  }
  if(mode==='signup'){
    msg('authMessage',result.data.session?'Akun berhasil dibuat.':'Periksa email untuk konfirmasi akun, lalu masuk.');
  }else{
    msg('authMessage','Berhasil masuk.');
    await showApp(result.data.session);
  }
};

el('recoveryForm').onsubmit=async e=>{
  e.preventDefault();
  const p=el('newPassword').value,p2=el('newPassword2').value;
  if(p!==p2){msg('recoveryMessage','Kata sandi tidak sama.');return}
  msg('recoveryMessage','Menyimpan...');
  const {error}=await db.auth.updateUser({password:p});
  if(error){msg('recoveryMessage',error.message);return}
  msg('recoveryMessage','✓ Kata sandi berhasil diperbarui. Silakan masuk kembali.');
  setTimeout(()=>{history.replaceState(null,'','/');location.reload()},900);
};

async function showApp(session){
  if(!session)return;
  el('recoveryScreen').hidden=true;el('authScreen').hidden=true;el('app').hidden=false;
  el('userEmail').textContent=session.user.email||'';await load();
  const requested=location.hash.slice(1);if(requested&&el(requested))setView(requested);
}
async function start(){
  if(starting)return;starting=true;
  try{
    const hash=location.hash;
    if(location.pathname.endsWith('/reset-password')||hash.includes('type=recovery')){el('authScreen').hidden=true;el('recoveryScreen').hidden=false;await new Promise(r=>setTimeout(r,100));}
    const {data:{session}}=await db.auth.getSession();
    if(session&&(!el('recoveryScreen').hidden||location.pathname.endsWith('/reset-password')))return;
    if(session)await showApp(session);
  }finally{starting=false}
}
db.auth.onAuthStateChange(async(event,session)=>{
  if(event==='PASSWORD_RECOVERY'){el('authScreen').hidden=true;el('recoveryScreen').hidden=false;return}
  if(event==='SIGNED_IN'&&session&&!el('app').hidden===false)await showApp(session);
});
el('logout').onclick=async()=>{await db.auth.signOut();location.href='/';};
window.addEventListener('load',start);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=20260918-2').catch(console.warn));
