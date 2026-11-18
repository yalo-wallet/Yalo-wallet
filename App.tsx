import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, ChevronDown, CircleHelp, Coins, Copy, CreditCard, Globe, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, Sparkles, TrendingUp, Wallet, X } from "lucide-react";
import { copy, type Lang } from "./i18n";

type Section = "dashboard"|"wallet"|"markets"|"swap"|"trade"|"p2p"|"earn"|"history"|"settings";
const nav: {id:Section; icon:any}[] = [
  {id:"dashboard",icon:LayoutDashboard},{id:"wallet",icon:Wallet},{id:"markets",icon:TrendingUp},
  {id:"swap",icon:ArrowLeftRight},{id:"trade",icon:Activity},{id:"p2p",icon:CreditCard},
  {id:"earn",icon:Coins},{id:"history",icon:Activity},{id:"settings",icon:Settings}
];
const chains = ["Ethereum","Base","Solana","Polygon","Arbitrum","Optimism","Avalanche","BNB Chain"];
const short = (s:string) => s.length > 15 ? `${s.slice(0,7)}...${s.slice(-5)}` : s;

export default function App() {
  const {ready, authenticated, login, logout, user} = usePrivy();
  const {wallets} = useWallets();
  const [lang,setLang] = useState<Lang>("ha");
  const [section,setSection] = useState<Section>("dashboard");
  const [mobile,setMobile] = useState(false);
  const [chain,setChain] = useState("Ethereum");
  const [notice,setNotice] = useState<any>(null);
  const [toast,setToast] = useState("");
  const t = copy[lang];
  const address = wallets?.[0]?.address || user?.wallet?.address || "";
  const initials = user?.email?.address?.slice(0,1).toUpperCase() || "Y";

  useEffect(()=>{ fetch("/api/announcements").then(r=>r.ok?r.json():null).then(d=>{if(d?.items?.length)setNotice(d.items[0])}).catch(()=>{}); },[]);
  const title = t[section as keyof typeof t] || t.dashboard;
  const notify = (s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),2200)};
  const doCopy = async (value:string)=>{if(!value)return; await navigator.clipboard.writeText(value);notify(t.copied);};
  const pageTitle = useMemo(()=>title,[title]);

  if (window.location.pathname.startsWith("/secure-panel")) return <AdminGate />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobile?"show":""}`}>
      <div className="brand"><span className="brand-mark">Y</span><span>YALO<span className="brand-light"> Wallet</span></span><button className="icon-btn close-mobile" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="side-caption">{t.overview}</div>
      <nav>{nav.map(({id,icon:Icon})=><button key={id} className={`nav-item ${section===id?"active":""}`} onClick={()=>{setSection(id);setMobile(false)}}><Icon size={18}/><span>{t[id]}</span>{id==="p2p"||id==="earn"?<small>{t.coming}</small>:null}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-card"><ShieldCheck size={19}/><div><b>{t.security}</b><span>Privy protected</span></div></div><div className="side-foot">YALO Wallet · 1.0.0</div></div>
    </aside>
    {mobile&&<div className="scrim" onClick={()=>setMobile(false)} />}
    <main className="main">
      <header className="topbar">
        <div className="top-left"><button className="icon-btn menu-btn" onClick={()=>setMobile(true)}><Menu/></button><div><div className="eyebrow">YALO WALLET</div><h1>{pageTitle}</h1></div></div>
        <div className="top-actions">
          <button className="language" onClick={()=>setLang(lang==="ha"?"en":"ha")}><Globe size={16}/>{lang==="ha"?"HA":"EN"}<ChevronDown size={14}/></button>
          <button className="icon-btn notification" onClick={()=>notice?setNotice(notice):notify(t.empty)}><Bell size={18}/></button>
          {authenticated?<div className="user-pill"><span className="avatar">{initials}</span><span className="user-email">{user?.email?.address||short(address)}</span><button className="icon-btn" onClick={()=>logout()} title={t.logout}><LogOut size={16}/></button></div>:<button className="primary-btn" disabled={!ready} onClick={login}>{t.login}</button>}
        </div>
      </header>
      {notice&&<div className="announcement"><span className="announce-icon"><Bell size={16}/></span><div><b>{notice.title}</b><p>{notice.message}</p></div><button className="icon-btn" onClick={()=>setNotice(null)}><X size={17}/></button></div>}
      <div className="content">
        {!authenticated ? <div className="login-panel"><div className="login-symbol"><Wallet size={30}/></div><h2>{t.loginHint}</h2><p>YALO Wallet — sarrafa kadarorinka a wuri guda.</p><button className="primary-btn large" disabled={!ready} onClick={login}>{t.connect}</button><div className="trust-line"><ShieldCheck size={15}/> Secure wallet access powered by Privy</div></div> :
        <>
          {section==="dashboard"&&<Dashboard t={t} address={address} chain={chain} setChain={setChain} onCopy={doCopy} onGo={setSection}/>}
          {section==="wallet"&&<WalletPage t={t} address={address} chain={chain} setChain={setChain} onCopy={doCopy}/>}
          {section==="markets"&&<Coming title={t.markets} message={t.marketNote}/>}
          {section==="swap"&&<Coming title={t.swap} message={t.swapNote}/>}
          {section==="trade"&&<Coming title={t.trade} message={t.tradingNote}/>}
          {section==="p2p"&&<Coming title={t.p2p} message={t.p2pNote}/>}
          {section==="earn"&&<Coming title={t.earn} message={t.earnNote}/>}
          {section==="history"&&<History t={t}/>}
          {section==="settings"&&<SettingsPage t={t} lang={lang} setLang={setLang} logout={logout}/>}
        </>}
      </div>
      <footer><span>© 2026 YALO Wallet</span><span><ShieldCheck size={14}/> Non-custodial wallet experience</span></footer>
    </main>
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Dashboard({t,address,chain,setChain,onCopy,onGo}:any){
 return <><div className="welcome-row"><div><h2>{t.portfolio}</h2><p>Ga taƙaitaccen bayanin walat ɗinka.</p></div><div className="chain-select"><span>{t.network}</span><select value={chain} onChange={e=>setChain(e.target.value)}>{chains.map(c=><option key={c}>{c}</option>)}</select></div></div>
 <div className="stats-grid"><div className="stat-card balance-card"><div className="stat-head">{t.total}<span className="stat-icon"><Wallet size={18}/></span></div><div className="balance-value">— <small>USD</small></div><div className="muted-line">{t.available}: — USD</div><div className="balance-actions"><button onClick={()=>onGo("wallet")}><ArrowDownLeft size={16}/>{t.receive}</button><button onClick={()=>onGo("wallet")}><ArrowUpRight size={16}/>{t.send}</button></div></div><div className="stat-card"><div className="stat-head">{t.pnl}<span className="stat-icon"><TrendingUp size={18}/></span></div><div className="stat-value">—</div><p className="muted-line">{t.empty}</p></div><div className="stat-card"><div className="stat-head">{t.assets}<span className="stat-icon"><Coins size={18}/></span></div><div className="stat-value">—</div><p className="muted-line">{t.empty}</p></div></div>
 <div className="section-grid"><section className="panel"><div className="panel-head"><div><h3>{t.wallet}</h3><p>{t.address}</p></div><span className="live-dot">● {t.live}</span></div><div className="address-box"><span>{address?short(address):"—"}</span><button className="icon-btn" onClick={()=>onCopy(address)}><Copy size={16}/></button></div><div className="chain-row"><span className="chain-logo">Ξ</span><div><b>{chain}</b><small>{t.network}</small></div><span className="right-muted">—</span></div><button className="outline-btn full" onClick={()=>onGo("wallet")}>{t.viewAll}</button></section><section className="panel"><div className="panel-head"><div><h3>{t.recent}</h3><p>{t.history}</p></div><button className="text-btn" onClick={()=>onGo("history")}>{t.viewAll}</button></div><div className="empty-state"><div className="empty-icon"><Activity size={22}/></div><b>{t.noTx}</b><span>{t.empty}</span></div></section></div>
 <div className="quick-grid">{[{icon:ArrowUpRight,label:t.send,go:"wallet"},{icon:ArrowDownLeft,label:t.receive,go:"wallet"},{icon:ArrowLeftRight,label:t.swap,go:"swap"},{icon:TrendingUp,label:t.markets,go:"markets"}].map(({icon:Icon,label,go})=><button className="quick-card" key={label} onClick={()=>onGo(go)}><span><Icon size={19}/></span><b>{label}</b><span className="quick-arrow">↗</span></button>)}</div></>;
}
function WalletPage({t,address,chain,setChain,onCopy}:any){
 return <><div className="page-intro"><div><h2>{t.wallet}</h2><p>Karɓa da sarrafa kadarorin crypto naka.</p></div><span className="coming-chip">{t.coming}</span></div><div className="wallet-layout"><section className="panel"><div className="panel-head"><div><h3>{t.receive}</h3><p>{t.address}</p></div><span className="chain-logo">Ξ</span></div><label className="field-label">{t.selectChain}</label><select className="select-field" value={chain} onChange={e=>setChain(e.target.value)}>{chains.map(c=><option key={c}>{c}</option>)}</select><div className="address-full">{address||"Shiga domin ganin adireshinka"}</div><button className="primary-btn full" onClick={()=>onCopy(address)} disabled={!address}><Copy size={16}/>{t.copy}</button><div className="info-note"><ShieldCheck size={17}/><span>Ka tabbatar network ɗin da ka zaɓa ya yi daidai da network ɗin wanda zai turo maka crypto.</span></div></section><section className="panel"><div className="panel-head"><div><h3>{t.send}</h3><p>{t.withdraw}</p></div><ArrowUpRight/></div><Coming title={t.sendSoon} message="Aikin aika crypto zai kunna bayan an kammala gwajin transaction, network fees da tabbatar da adireshi."/></section></div></>;
}
function History({t}:any){return <section className="panel history-panel"><div className="panel-head"><div><h3>{t.history}</h3><p>{t.recent}</p></div><Activity/></div><div className="empty-state"><div className="empty-icon"><Activity size={22}/></div><b>{t.noTx}</b></div></section>}
function Coming({title,message}:any){return <div className="coming-panel"><div className="coming-art"><Sparkles size={26}/></div><span className="coming-chip">Coming Soon</span><h2>{title}</h2><p>{message}</p></div>}
function SettingsPage({t,lang,setLang,logout}:any){return <div className="settings-layout"><section className="panel"><h3>{t.preferences}</h3><label className="field-label">{t.language}</label><select className="select-field" value={lang} onChange={e=>setLang(e.target.value)}><option value="ha">Hausa</option><option value="en">English</option></select></section><section className="panel"><h3>{t.security}</h3><p className="muted-line">An kare shiga walat ta hanyar Privy.</p><div className="secure-row"><ShieldCheck/><span>Privy authentication</span><b className="status-ready">Enabled</b></div><button className="outline-btn" onClick={logout}>{t.logout}</button></section></div>}
function AdminGate(){
 const [password,setPassword]=useState(""); const [authed,setAuthed]=useState(false); const [items,setItems]=useState<any[]>([]); const [title,setTitle]=useState(""); const [message,setMessage]=useState(""); const [start,setStart]=useState(""); const [end,setEnd]=useState(""); const [error,setError]=useState("");
 async function call(path:string,body?:any){const r=await fetch(path,{method:body?"POST":"GET",headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined,credentials:"include"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d;}
 async function login(e:any){e.preventDefault();try{await call("/api/private/login",{password});setAuthed(true);setError("");load();}catch(err:any){setError(err.message)}}
 async function load(){try{const d=await call("/api/private/announcements");setItems(d.items||[])}catch(err:any){setError(err.message)}}
 async function create(e:any){e.preventDefault();try{await call("/api/private/announcements",{title,message,startAt:start||null,endAt:end||null});setTitle("");setMessage("");load()}catch(err:any){setError(err.message)}}
 async function remove(id:string){try{await call("/api/private/announcements/delete",{id});load()}catch(err:any){setError(err.message)}}
 async function toggleMaintenance(enabled:boolean){try{await call("/api/private/maintenance",{enabled});setError("")}catch(err:any){setError(err.message)}}
 async function signout(){try{await call("/api/private/logout",{})}catch{}setAuthed(false)}
 if(!authed)return <div className="admin-screen"><form className="admin-card" onSubmit={login}><div className="brand-mark">Y</div><h2>Secure access</h2><p>Shiga domin sarrafa tsarin.</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Admin password" required/><button className="primary-btn full">Log in</button>{error&&<p className="error">{error}</p>}</form></div>;
 return <div className="admin-screen"><div className="admin-wrap"><header><div><span className="eyebrow">YALO PRIVATE CONTROL</span><h1>Management</h1></div><button className="outline-btn" onClick={signout}>Log out</button></header><div className="admin-grid"><form className="panel" onSubmit={create}><h3>Publish announcement</h3><label className="field-label">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} required/><label className="field-label">Message</label><textarea value={message} onChange={e=>setMessage(e.target.value)} required/><label className="field-label">Start date (optional)</label><input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/><label className="field-label">End date (optional)</label><input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/><button className="primary-btn full">Publish</button></form><section className="panel"><h3>Announcements</h3>{items.map(x=><div className="admin-ann" key={x.id}><div><b>{x.title}</b><p>{x.message}</p></div><button className="outline-btn danger" onClick={()=>remove(x.id)}>Delete</button></div>)}{!items.length&&<p className="muted-line">No announcements.</p>}<h3 className="mt">Maintenance mode</h3><p className="muted-line">Wannan yana dakatar da endpoints da aka haɗa da wannan yanayin; ba ya hana blockchain transactions kai tsaye.</p><div className="row-actions"><button className="outline-btn" onClick={()=>toggleMaintenance(true)}>Enable</button><button className="outline-btn" onClick={()=>toggleMaintenance(false)}>Disable</button></div></section></div>{error&&<p className="error">{error}</p>}</div></div>;
}