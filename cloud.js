/* のみ記録 v6: Supabase クラウド同期（公開可能な publishable key とRLSを利用） */
(function () {
  'use strict';
  const config = window.NOMI_CLOUD_CONFIG || {};
  const $id = id => document.getElementById(id);
  const bar = document.createElement('div');
  bar.className = 'cloud-bar';
  bar.innerHTML = '<span id="cloudStatus" role="status">クラウド接続を確認中…</span><button id="cloudRefresh" type="button">同期を確認</button>';
  document.body.insertBefore(bar, document.body.firstChild);
  const mask = document.createElement('div');
  mask.className = 'cloud-mask';
  mask.innerHTML = '<section class="cloud-panel"><h2>のみ記録 ☁</h2><p id="cloudIntro">飲酒記録をクラウドに保存します。</p><div id="cloudLogin"><input id="cloudEmail" type="email" autocomplete="email" placeholder="メールアドレス"><button class="primary" id="cloudSend" type="button">ログイン用メールを送信</button></div><p class="cloud-error" id="cloudError"></p><p class="cloud-note">メールに届く「Sign in」リンクを開くとログインできます。リンクを開いたブラウザで保存済み表示をご確認ください。</p></section>';
  document.body.append(mask);
  const status = message => { $id('cloudStatus').textContent = message; };
  const error = message => { $id('cloudError').textContent = message || ''; };
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url || '') && !!config.publishableKey;
  if (!valid || !window.supabase) {
    $id('cloudLogin').classList.add('cloud-hidden');
    $id('cloudIntro').textContent = 'クラウド接続の初期設定がまだ完了していません。cloud-config.js を設定してから公開してください。';
    status('クラウド未設定（入力停止中）');
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const queueKey = 'nomikiroku.cloud.queue.v1';
  let queue = [], user = null, syncBusy = false, started = false;
  try { queue = JSON.parse(localStorage.getItem(queueKey)||'[]'); if(!Array.isArray(queue))queue=[]; } catch { queue=[]; }
  const persistQueue = () => localStorage.setItem(queueKey, JSON.stringify(queue));
  const safeEntry = e => ({...e, amount:Number(e.amount)});
  function enqueue(type, entry) {
    const id = entry.id;
    queue = queue.filter(item => item.id !== id);
    queue.push({type,id,entry:type==='upsert'?safeEntry(entry):null});
    persistQueue();
  }
  function readLocal() { try {const rows=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return [];} }
  const originalSave = save;
  save = function () {
    const before = readLocal();
    const ok = originalSave();
    if (!ok) return false;
    const oldMap = new Map(before.map(e=>[e.id,e]));
    const newMap = new Map(entries.map(e=>[e.id,e]));
    for (const e of entries) if (JSON.stringify(oldMap.get(e.id)) !== JSON.stringify(e)) enqueue('upsert',e);
    for (const e of before) if (!newMap.has(e.id)) enqueue('delete',e);
    status('未同期 '+queue.length+'件');
    sync().catch(console.error);
    return true;
  };
  async function uploadQueue() {
    while(queue.length) {
      const item=queue[0];
      let result;
      if(item.type==='delete') result=await client.from('drink_entries').delete().eq('user_id',user.id).eq('id',item.id);
      else result=await client.from('drink_entries').upsert({user_id:user.id,id:item.id,entry:item.entry},{onConflict:'user_id,id'});
      if(result.error) throw result.error;
      // 同期中に同じIDが変更された場合は新しい操作を残す。
      if(queue[0]===item)queue.shift();
      persistQueue();
    }
  }
  async function pull() {
    const {data,error:err}=await client.from('drink_entries').select('entry').eq('user_id',user.id).limit(10000);
    if(err) throw err;
    if(data.length===10000) throw Error('記録が多いため同期を停止しました。サポートが必要です。');
    // 取得中に端末側で記録が追加された場合、未同期の変更を上書きしない。
    if(queue.length) return;
    const cloudEntries=data.map(row=>row.entry).filter(e=>e&&e.id&&e.date&&Number.isFinite(Number(e.amount)));
    entries=cloudEntries;
    if(!originalSave()) throw Error('iPhoneへの一時保存に失敗しました');
    render();
  }
  async function sync() {
    if(syncBusy || !user || !navigator.onLine)return;
    syncBusy=true;
    status(queue.length ? `同期中（残り${queue.length}件）` : 'クラウド確認中…');
    try {
      await uploadQueue();
      await pull();
      status(queue.length ? `⚠ 未同期 ${queue.length}件` : '☁ 保存済み・同期完了');
    } catch(e) {status(`⚠ 未同期 ${queue.length}件`); error('同期できません：'+e.message);} finally {syncBusy=false;if(queue.length&&navigator.onLine)setTimeout(()=>sync().catch(console.error),15000);}
  }
  async function startSession(authUser) {
    if(started && user?.id===authUser.id) return;
    user=authUser;started=true;
    // 最初のログイン時だけ端末に残る記録を移行。以後は削除済み記録を復活させない。
    const migrationKey='nomikiroku.cloud.migrated.'+user.id;
    if(localStorage.getItem(migrationKey)!=='yes') {
      const local=readLocal();
      const pendingIds=new Set(queue.map(item=>item.id));
      for(const e of local) if(!pendingIds.has(e.id)) enqueue('upsert',e);
      localStorage.setItem(migrationKey,'yes');
    }
    mask.classList.add('cloud-hidden');
    error('');
    await sync();
  }
  $id('cloudSend').onclick=async()=>{
    const email=$id('cloudEmail').value.trim();if(!email){error('メールアドレスを入力してください');return;}
    error('');$id('cloudSend').disabled=true;
    try{const {error:err}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});if(err)throw err;$id('cloudIntro').textContent='ログイン用リンクをメールで送信しました。メール内の「Sign in」を開いてください。';}
    catch(e){error(e.message);}finally{$id('cloudSend').disabled=false;}
  };
  $id('cloudRefresh').onclick=()=>sync();
  window.addEventListener('online',()=>sync());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
  client.auth.getSession().then(({data,error:err})=>{if(err)throw err;if(data?.session?.user)startSession(data.session.user);else status('ログイン待ち');}).catch(e=>error(e.message));
})();
