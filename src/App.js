import { useState, useEffect, useRef } from "react";

/* ================================================================
   HYDROBOT — Gmail OAuth + Real Email Sending
   SETUP:
   1. console.cloud.google.com → New Project → Enable Gmail API
   2. OAuth consent screen → External → fill app name
   3. Credentials → OAuth Client ID → Web App
   4. Authorized JS Origins + Redirect URIs → http://localhost:3000
   5. Create .env file → REACT_APP_GOOGLE_CLIENT_ID=your_client_id
   ================================================================ */

const CLIENT_ID   = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES      = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";
const LOVE_MSG    = "I love you n miss you so much 💙";
const DEFAULT_MSG = `Hey! 💧 Time to drink water!\n\nStay hydrated & healthy today.\n\n${LOVE_MSG}`;
const INTERVAL    = 5 * 60; // 5 minutes in seconds

/* ── utils ── */
const uid  = () => Math.random().toString(36).slice(2, 8);
const hue  = s  => { let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))%360; return h; };
const ini  = s  => s.trim().slice(0,2).toUpperCase()||"??";

// ✅ FIX 1: Correct fmtT — was using 300 instead of total seconds
const fmtT = s => {
  if(!s && s!==0) return "--:--:--";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(n => String(n).padStart(2,"0")).join(":");
};

/* ── Gmail API ── */
const buildEmail = (to, toName, from, subject, body) => {
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:32px;background:#030f1e;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;background:linear-gradient(135deg,#041428,#062040);border:1px solid rgba(56,189,248,0.25);border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0369a1,#0ea5e9);padding:28px;text-align:center;">
      <div style="font-size:56px;margin-bottom:8px;">💧</div>
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px;">Time to Drink Water!</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#7dd3fc;font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${toName},</p>
      <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.18);border-radius:12px;padding:18px 20px;margin-bottom:20px;">
        <p style="color:#bae6fd;font-size:15px;line-height:1.85;margin:0;white-space:pre-line;">${body}</p>
      </div>
      <p style="color:rgba(186,230,253,0.4);font-size:11px;text-align:center;margin:0;">Sent with 💙 by HydroBot</p>
    </div>
  </div></body></html>`;

  const mime = [
    `From: HydroBot <${from}>`,
    `To: ${toName} <${to}>`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ].join("\r\n");

  return btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};

const sendGmail = async (token, fromEmail, toEmail, toName, subject, body) => {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method:"POST",
    headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body: JSON.stringify({ raw: buildEmail(toEmail, toName, fromEmail, subject, body) }),
  });
  if(!res.ok){ const e=await res.json(); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
  return res.json();
};

/* ── Design tokens ── */
const C = {
  bg:"#020c18", panel:"rgba(3,18,36,0.97)", border:"rgba(56,189,248,0.12)",
  accent:"#38bdf8", accentDim:"rgba(56,189,248,0.13)",
  text:"#e0f2fe", sub:"rgba(186,230,253,0.52)", muted:"rgba(56,189,248,0.28)",
  green:"#34d399", greenBg:"rgba(52,211,153,0.09)", greenBd:"rgba(52,211,153,0.28)",
  red:"#f87171",   redBg:"rgba(248,113,113,0.09)",  redBd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberBg:"rgba(251,191,36,0.07)", amberBd:"rgba(251,191,36,0.22)",
};
const mono  = "'JetBrains Mono',monospace";
const serif = "'Playfair Display',Georgia,serif";
const sans  = "'DM Sans',sans-serif";

/* ── Tiny components ── */
const Lbl = ({children}) => (
  <div style={{fontFamily:mono,fontSize:9,letterSpacing:3,color:C.muted,textTransform:"uppercase",marginBottom:7}}>{children}</div>
);

const Btn = ({children, onClick, variant="primary", style:sx={}, disabled, full}) => {
  const vs = {
    primary:{background:"linear-gradient(135deg,#0369a1,#0ea5e9)",color:"#fff",border:"none",boxShadow:"0 0 22px rgba(14,165,233,0.22)"},
    ghost:  {background:"transparent",color:C.sub,border:`1px solid ${C.border}`},
    danger: {background:C.redBg,color:C.red,border:`1px solid ${C.redBd}`},
    success:{background:C.greenBg,color:C.green,border:`1px solid ${C.greenBd}`},
    google: {background:"#fff",color:"#1f2937",border:"none",boxShadow:"0 2px 12px rgba(0,0,0,0.28)"},
  };
  return (
    <button disabled={disabled} onClick={onClick}
      style={{borderRadius:12,padding:"12px 20px",fontSize:13,fontFamily:sans,fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",transition:"all 0.18s",
        display:"flex",alignItems:"center",justifyContent:"center",gap:7,
        opacity:disabled?0.42:1,width:full?"100%":undefined,...vs[variant],...sx}}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.opacity="0.8";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}}>
      {children}
    </button>
  );
};

const Ripple = ({x,y}) => (
  <div style={{position:"fixed",left:x-60,top:y-60,width:120,height:120,borderRadius:"50%",
    border:"1.5px solid rgba(56,189,248,0.3)",animation:"rpl 1s ease-out forwards",
    pointerEvents:"none",zIndex:9999}}/>
);

/* ── Google Strip ── */
const GoogleStrip = ({user, onLogin, onLogout}) => (
  <div style={{background:C.panel,border:`1px solid ${user?C.greenBd:C.border}`,borderRadius:16,
    padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12,transition:"border-color 0.3s"}}>
    {user ? (
      <>
        {user.picture
          ? <img src={user.picture} alt="" style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${C.green}`,flexShrink:0}}/>
          : <div style={{width:36,height:36,borderRadius:"50%",background:C.accentDim,border:`2px solid ${C.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:13,color:C.accent,flexShrink:0}}>{ini(user.name||"U")}</div>
        }
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
          <div style={{fontFamily:mono,fontSize:9,color:C.green,letterSpacing:1}}>✓ Gmail connected</div>
        </div>
        <Btn onClick={onLogout} variant="ghost" style={{padding:"7px 12px",fontSize:11,flexShrink:0}}>Sign out</Btn>
      </>
    ) : (
      <>
        <div style={{flex:1}}>
          <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600,marginBottom:2}}>Connect Gmail to send emails</div>
          <div style={{fontFamily:mono,fontSize:9,color:C.muted,letterSpacing:1}}>One click · Uses your Gmail account</div>
        </div>
        <Btn onClick={onLogin} variant="google" style={{padding:"9px 16px",fontSize:12,flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </Btn>
      </>
    )}
  </div>
);

/* ── Friend Card ── */
const FriendCard = ({friend, onRemove, onSend, sending, sent, error}) => {
  const h = hue(friend.name);
  return (
    <div style={{background:"rgba(4,18,36,0.85)",border:`1px solid ${error?C.redBd:sent?C.greenBd:C.border}`,borderRadius:14,padding:"13px 15px",transition:"border-color 0.3s"}}>
      <div style={{display:"flex",alignItems:"center",gap:11}}>
        <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,background:`hsl(${h},55%,18%)`,
          border:`2px solid hsl(${h},65%,42%)`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:13,fontWeight:700,color:`hsl(${h},80%,75%)`,fontFamily:mono}}>
          {ini(friend.name)}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:sans,fontSize:14,color:C.text,fontWeight:600}}>{friend.name}</div>
          <div style={{fontFamily:mono,fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{friend.email}</div>
        </div>
        <div style={{display:"flex",gap:7,flexShrink:0}}>
          <button onClick={()=>onSend(friend)} disabled={sending}
            style={{background:sent?C.greenBg:sending?"rgba(56,189,248,0.07)":C.accentDim,
              border:`1px solid ${sent?C.greenBd:C.border}`,borderRadius:9,padding:"7px 13px",
              color:sent?C.green:C.accent,fontSize:11,fontFamily:mono,
              cursor:sending?"wait":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>
            {sending?"⏳":sent?"✓ Sent":"✉️ Send"}
          </button>
          <button onClick={()=>onRemove(friend.id)}
            style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:9,
              padding:"7px 10px",color:C.red,fontSize:13,cursor:"pointer"}}>🗑</button>
        </div>
      </div>
      {error && (
        <div style={{marginTop:9,fontFamily:sans,fontSize:11,color:C.red,background:C.redBg,
          border:`1px solid ${C.redBd}`,borderRadius:8,padding:"8px 11px",lineHeight:1.65}}>❌ {error}</div>
      )}
      {sent && <div style={{marginTop:7,fontFamily:sans,fontSize:11,color:C.green}}>✅ Delivered to {friend.email}</div>}
    </div>
  );
};

/* ── Alert Modal ── */
function AlertModal({alertCount, friends, message, user, onDismiss}) {
  const [vis,    setVis]    = useState(false);
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  useEffect(()=>{ setTimeout(()=>setVis(true),20); },[]);
  const dismiss = ()=>{ setVis(false); setTimeout(onDismiss,380); };

  const send = async (friend) => {
    if(!user?.token) return;
    setStatus(s=>({...s,[friend.id]:"sending"}));
    setErrors(e=>({...e,[friend.id]:null}));
    try {
      await sendGmail(user.token, user.email, friend.email, friend.name, "Drink Water Reminder!", message);
      setStatus(s=>({...s,[friend.id]:"sent"}));
    } catch(e) {
      setStatus(s=>({...s,[friend.id]:"err"}));
      setErrors(er=>({...er,[friend.id]:e.message}));
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(2,8,18,0.95)",backdropFilter:"blur(18px)",
      zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,
      opacity:vis?1:0,transition:"opacity 0.35s"}}>
      <div style={{background:"linear-gradient(150deg,#030e1c,#051726)",
        border:"1px solid rgba(56,189,248,0.22)",borderRadius:28,padding:"36px 28px",
        maxWidth:480,width:"100%",maxHeight:"92vh",overflowY:"auto",
        boxShadow:"0 0 100px rgba(56,189,248,0.1),0 40px 80px rgba(0,0,0,0.7)",
        transform:vis?"scale(1) translateY(0)":"scale(0.9) translateY(22px)",
        transition:"transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",position:"relative"}}>

        <div style={{position:"absolute",top:-70,left:"50%",transform:"translateX(-50%)",
          width:300,height:160,background:"radial-gradient(ellipse,rgba(56,189,248,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>

        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:70,display:"inline-block",animation:"dropB 0.8s ease infinite alternate",
            filter:"drop-shadow(0 0 28px #38bdf8)"}}>💧</div>
          <div style={{marginTop:8,marginBottom:6}}>
            <span style={{fontFamily:mono,fontSize:9,letterSpacing:4,color:C.accent,
              border:`1px solid ${C.accent}40`,borderRadius:4,padding:"3px 9px",textTransform:"uppercase"}}>
              Reminder #{alertCount}
            </span>
          </div>
          <h2 style={{fontFamily:serif,fontSize:28,color:C.text,fontWeight:700,marginBottom:14}}>
            Time to Drink Water!
          </h2>
          <div style={{background:"rgba(56,189,248,0.05)",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 20px"}}>
            <p style={{fontFamily:serif,fontSize:16,color:"#7dd3fc",fontStyle:"italic",lineHeight:1.85,margin:0,whiteSpace:"pre-line"}}>
              {message}
            </p>
          </div>
        </div>

        {friends.length>0 && user && (
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <Lbl>Notify Friends ({friends.length})</Lbl>
              {friends.length>1 && (
                <button onClick={()=>friends.forEach(f=>send(f))}
                  style={{background:C.accentDim,border:`1px solid ${C.border}`,borderRadius:8,
                    padding:"5px 13px",color:C.accent,fontSize:10,fontFamily:mono,cursor:"pointer"}}>
                  ⚡ Notify All
                </button>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {friends.map(f=>{
                const st=status[f.id]; const err=errors[f.id];
                return (
                  <div key={f.id} style={{background:"rgba(4,18,36,0.85)",
                    border:`1px solid ${err?C.redBd:st==="sent"?C.greenBd:C.border}`,
                    borderRadius:14,padding:"12px 14px",transition:"border-color 0.3s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",
                        background:`hsl(${hue(f.name)},55%,18%)`,
                        border:`2px solid hsl(${hue(f.name)},65%,42%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:700,color:`hsl(${hue(f.name)},80%,75%)`,fontFamily:mono,flexShrink:0}}>
                        {ini(f.name)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600}}>{f.name}</div>
                        <div style={{fontFamily:mono,fontSize:9,color:C.muted}}>{f.email}</div>
                      </div>
                      <button onClick={()=>send(f)} disabled={st==="sending"}
                        style={{background:st==="sent"?C.greenBg:st==="err"?"rgba(56,189,248,0.06)":C.accentDim,
                          border:`1px solid ${st==="sent"?C.greenBd:st==="err"?C.redBd:C.border}`,
                          borderRadius:10,padding:"7px 13px",
                          color:st==="sent"?C.green:st==="err"?C.red:C.accent,
                          fontSize:11,fontFamily:mono,cursor:st==="sending"?"wait":"pointer",
                          flexShrink:0,transition:"all 0.25s"}}>
                        {st==="sending"?"⏳":st==="sent"?"✓ Sent":st==="err"?"↺ Retry":"✉️ Send"}
                      </button>
                    </div>
                    {err && <div style={{marginTop:8,fontFamily:sans,fontSize:11,color:C.red,background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:"7px 10px",lineHeight:1.6}}>❌ {err}</div>}
                    {st==="sent" && <div style={{marginTop:6,fontFamily:sans,fontSize:11,color:C.green}}>✅ Delivered to {f.email}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {friends.length>0 && !user && (
          <div style={{background:C.amberBg,border:`1px solid ${C.amberBd}`,borderRadius:12,
            padding:"12px 14px",marginBottom:16,display:"flex",gap:8,alignItems:"center"}}>
            <span>⚠️</span>
            <span style={{fontFamily:sans,fontSize:12,color:C.amber}}>Connect Gmail in the Friends tab to send emails.</span>
          </div>
        )}

        <Btn onClick={dismiss} variant="primary" full style={{fontSize:15,padding:"15px"}}>💧 I Drank It!</Btn>
        <p style={{textAlign:"center",fontSize:10,color:C.muted,marginTop:12,fontFamily:mono}}>Next reminder in 5 minutes</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════ */
export default function App() {
  const [active,     setActive]     = useState(false);
  const [nextIn,     setNextIn]     = useState(INTERVAL);
  const [alertCount, setAlertCount] = useState(0);
  const [showAlert,  setShowAlert]  = useState(false);
  const [message,    setMessage]    = useState(DEFAULT_MSG);
  const [msgDraft,   setMsgDraft]   = useState(DEFAULT_MSG);
  const [msgSaved,   setMsgSaved]   = useState(false);
  const [friends,    setFriends]    = useState([]);
  const [newName,    setNewName]    = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [user,       setUser]       = useState(null);
  const [tab,        setTab]        = useState("home");
  const [ripples,    setRipples]    = useState([]);
  const [log,        setLog]        = useState([]);
  const [sendStatus, setSendStatus] = useState({});
  const [sendErrors, setSendErrors] = useState({});

  const timerRef   = useRef(null);
  const countRef   = useRef(null);

  // ✅ FIX 2: Use refs for user/friends/message so triggerAlert always has latest values
  const userRef    = useRef(user);
  const friendsRef = useRef(friends);
  const messageRef = useRef(message);

  useEffect(()=>{ userRef.current    = user;    },[user]);
  useEffect(()=>{ friendsRef.current = friends; },[friends]);
  useEffect(()=>{ messageRef.current = message; },[message]);

  /* ── Parse OAuth token ── */
  useEffect(()=>{
    const hash = window.location.hash;
    if(!hash.includes("access_token")) return;
    const params = new URLSearchParams(hash.replace("#","?"));
    const token  = params.get("access_token");
    if(!token) return;
    window.history.replaceState({},"",window.location.pathname);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json())
      .then(info=>setUser({token,email:info.email,name:info.name,picture:info.picture}))
      .catch(()=>setUser({token,email:"user@gmail.com",name:"User"}));
  },[]);

  // ✅ FIX 3: triggerAlert reads from refs — always fresh, no stale closure
  const triggerAlert = () => {
    const currentUser    = userRef.current;
    const currentFriends = friendsRef.current;
    const currentMessage = messageRef.current;

    setAlertCount(c=>{
      const n = c+1;
      setLog(p=>[{id:uid(), time:new Date().toLocaleTimeString(), n},...p.slice(0,19)]);
      return n;
    });
    setShowAlert(true);
    setNextIn(INTERVAL);

    // ✅ Auto-send emails to all friends
    if(currentUser?.token && currentFriends.length > 0){
      currentFriends.forEach(async (friend) => {
        try {
          await sendGmail(
            currentUser.token,
            currentUser.email,
            friend.email,
            friend.name,
            "Drink Water Reminder!",
            currentMessage
          );
          console.log(`✅ Auto-sent to ${friend.name}`);
        } catch(e){
          console.error(`❌ Failed to send to ${friend.name}:`, e.message);
        }
      });
    }
  };

  // ✅ FIX 4: Use ref for triggerAlert so startBot always calls the latest version
  const triggerRef = useRef(triggerAlert);
  useEffect(()=>{ triggerRef.current = triggerAlert; });

  const startBot = () => {
    if(active) return;
    setActive(true);
    setNextIn(INTERVAL);
    // ✅ Always call via ref so we get the latest triggerAlert
    timerRef.current = setInterval(()=> triggerRef.current(), INTERVAL * 1000);
    countRef.current = setInterval(()=> setNextIn(p => p <= 1 ? INTERVAL : p - 1), 1000);
  };

  const stopBot = () => {
    setActive(false);
    setNextIn(INTERVAL);
    clearInterval(timerRef.current);
    clearInterval(countRef.current);
  };

  useEffect(()=>()=>{
    clearInterval(timerRef.current);
    clearInterval(countRef.current);
  },[]);

  /* ── Auth ── */
  const loginGoogle = () => {
    const redirectUri = window.location.origin;
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}`;
  };

  /* ── Friends ── */
  const addFriend = () => {
    if(!newName.trim()||!newEmail.includes("@")) return;
    setFriends(f=>[...f,{id:uid(),name:newName.trim(),email:newEmail.trim()}]);
    setNewName(""); setNewEmail("");
  };
  const removeFriend = id => setFriends(f=>f.filter(x=>x.id!==id));

  const sendToFriend = async (friend) => {
    if(!user?.token){ alert("Connect Gmail first!"); return; }
    setSendStatus(s=>({...s,[friend.id]:"sending"}));
    setSendErrors(e=>({...e,[friend.id]:null}));
    try {
      await sendGmail(user.token,user.email,friend.email,friend.name,"Drink Water Reminder!",message);
      setSendStatus(s=>({...s,[friend.id]:"sent"}));
      setTimeout(()=>setSendStatus(s=>({...s,[friend.id]:null})),4000);
    } catch(e){
      setSendStatus(s=>({...s,[friend.id]:"err"}));
      setSendErrors(er=>({...er,[friend.id]:e.message}));
    }
  };
  const sendToAll = () => friends.forEach(sendToFriend);

  /* ── Ripple ── */
  const handleClick = e => {
    if(["BUTTON","INPUT","TEXTAREA","A","SELECT"].includes(e.target.tagName)) return;
    const id=uid();
    setRipples(r=>[...r,{id,x:e.clientX,y:e.clientY}]);
    setTimeout(()=>setRipples(r=>r.filter(rp=>rp.id!==id)),1100);
  };

  const TABS = [
    {id:"home",    label:"💧 Bot"},
    {id:"friends", label:`👥 Friends${friends.length>0?` (${friends.length})`:""}`},
    {id:"message", label:"✏️ Message"},
    {id:"log",     label:`📋 Log${log.length>0?` (${log.length})`:""}`},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020c18;-webkit-font-smoothing:antialiased;}
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-18px) rotate(2deg);}}
        @keyframes dropB{0%{transform:translateY(0) scale(1);}100%{transform:translateY(-11px) scale(1.1);}}
        @keyframes rpl{0%{transform:scale(0.1);opacity:0.9;}100%{transform:scale(4);opacity:0;}}
        @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.35;}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        input:focus,textarea:focus{border-color:rgba(56,189,248,0.45)!important;outline:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(56,189,248,0.2);border-radius:2px;}
      `}</style>

      {ripples.map(r=><Ripple key={r.id} x={r.x} y={r.y}/>)}
      {showAlert && <AlertModal alertCount={alertCount} friends={friends} message={message} user={user} onDismiss={()=>setShowAlert(false)}/>}

      <div onClick={handleClick} style={{minHeight:"100vh",background:"linear-gradient(170deg,#020c18 0%,#031628 55%,#020c18 100%)",
        display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:52,position:"relative",overflow:"hidden"}}>

        <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(56,189,248,0.017) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.017) 1px,transparent 1px)",backgroundSize:"72px 72px",pointerEvents:"none"}}/>
        <div style={{position:"fixed",top:-120,left:"20%",width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(56,189,248,0.04) 0%,transparent 70%)",pointerEvents:"none"}}/>
        {[...Array(5)].map((_,i)=>(
          <div key={i} style={{position:"fixed",fontSize:10+i*3,left:`${8+i*16}%`,top:`${12+Math.sin(i*1.3)*58}%`,opacity:0.02+i*0.005,animation:`float ${5+i*0.7}s ease-in-out ${i*0.4}s infinite`,pointerEvents:"none",zIndex:0}}>💧</div>
        ))}

        {/* HEADER */}
        <div style={{width:"100%",maxWidth:540,padding:"26px 20px 0",display:"flex",alignItems:"center",
          justifyContent:"space-between",position:"relative",zIndex:2}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <span style={{fontSize:24}}>💧</span>
            <div>
              <div style={{fontFamily:serif,fontSize:20,color:C.text,fontWeight:700,lineHeight:1}}>HydroBot</div>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:3,color:C.muted,textTransform:"uppercase"}}>Gmail Reminder</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {user && (
              <div style={{display:"flex",alignItems:"center",gap:6,background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:100,padding:"5px 10px"}}>
                {user.picture
                  ? <img src={user.picture} alt="" style={{width:18,height:18,borderRadius:"50%"}}/>
                  : <span style={{fontFamily:mono,fontSize:9,color:C.green}}>{ini(user.name||"U")}</span>
                }
                <span style={{fontFamily:mono,fontSize:9,color:C.green,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name?.split(" ")[0]}</span>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:7,background:active?C.greenBg:C.accentDim,
              border:`1px solid ${active?C.greenBd:C.border}`,borderRadius:100,padding:"6px 13px"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:active?C.green:C.muted,
                boxShadow:active?`0 0 8px ${C.green}`:"none",display:"inline-block",
                animation:active?"blink 1.8s ease infinite":"none"}}/>
              <span style={{fontFamily:mono,fontSize:10,letterSpacing:2,color:active?C.green:C.muted}}>
                {active?"ACTIVE":"OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:2,background:"rgba(56,189,248,0.03)",border:`1px solid ${C.border}`,
          borderRadius:14,padding:3,margin:"16px 0 0",position:"relative",zIndex:2,
          overflowX:"auto",maxWidth:"calc(100vw - 32px)"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{background:tab===t.id?C.accentDim:"transparent",
                border:`1px solid ${tab===t.id?C.accent+"55":"transparent"}`,
                borderRadius:10,padding:"8px 15px",color:tab===t.id?C.accent:C.muted,
                fontSize:11,fontFamily:mono,cursor:"pointer",transition:"all 0.2s",
                whiteSpace:"nowrap",flexShrink:0}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{maxWidth:540,width:"100%",padding:"14px 16px 0",position:"relative",zIndex:2}}>

          {/* HOME TAB */}
          {tab==="home" && (
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:24,
              padding:"36px 28px 28px",boxShadow:"0 0 60px rgba(56,189,248,0.05)",
              textAlign:"center",position:"relative",overflow:"hidden",animation:"slideUp 0.4s ease"}}>
              <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",
                width:320,height:170,background:"radial-gradient(ellipse,rgba(56,189,248,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>

              <div style={{fontSize:80,display:"inline-block",
                animation:active?"dropB 0.85s ease infinite alternate":"float 3.5s ease-in-out infinite",
                filter:active?"drop-shadow(0 0 30px #38bdf8) drop-shadow(0 0 60px #0284c7)":"drop-shadow(0 0 16px rgba(56,189,248,0.38))",
                marginBottom:18}}>💧</div>

              <h1 style={{fontFamily:serif,fontSize:32,fontWeight:700,color:C.text,marginBottom:6}}>HydroBot</h1>
              <p style={{fontFamily:serif,fontSize:15,color:C.sub,fontStyle:"italic",marginBottom:28}}>
                5-min reminders, sent with love 💙
              </p>

              <div style={{background:"rgba(56,189,248,0.03)",border:`1px solid ${C.border}`,
                borderRadius:20,padding:"24px 20px",marginBottom:24}}>
                <Lbl>Next Alert In</Lbl>
                <div style={{fontFamily:mono,fontSize:46,fontWeight:500,letterSpacing:6,
                  color:active?C.accent:"rgba(56,189,248,0.16)",
                  background:active?"linear-gradient(90deg,#38bdf8,#e0f2fe,#38bdf8)":"none",
                  backgroundSize:"200% auto",
                  WebkitBackgroundClip:active?"text":undefined,
                  WebkitTextFillColor:active?"transparent":undefined,
                  animation:active?"shimmer 3s linear infinite":"none",marginBottom:14}}>
                  {fmtT(active ? nextIn : null)}
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:28}}>
                  {[["Alerts",alertCount,C.accent],["Friends",friends.length,C.accent],["Gmail",user?"ON":"OFF",user?C.green:C.muted]].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:mono,fontSize:20,color:c,fontWeight:600}}>{v}</div>
                      <div style={{fontFamily:mono,fontSize:8,letterSpacing:2,color:C.muted,textTransform:"uppercase"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <Btn onClick={active?stopBot:startBot} variant={active?"danger":"primary"} full style={{padding:"16px",fontSize:15,fontWeight:700}}>
                  {active?"⛔  Stop Bot":"🚀  Start Bot"}
                </Btn>
                <Btn onClick={()=>triggerRef.current()} variant="ghost" full style={{fontSize:13}}>💧 Preview Alert</Btn>
                {friends.length>0 && user && (
                  <Btn onClick={sendToAll} variant="success" full style={{fontSize:13}}>✉️ Email All Friends Now</Btn>
                )}
              </div>
            </div>
          )}

          {/* FRIENDS TAB */}
          {tab==="friends" && (
            <div style={{animation:"slideUp 0.4s ease"}}>
              <GoogleStrip user={user} onLogin={loginGoogle} onLogout={()=>setUser(null)}/>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:24,padding:"24px 22px"}}>
                <h2 style={{fontFamily:serif,fontSize:22,color:C.text,fontWeight:700,marginBottom:4}}>My Friends 👥</h2>
                <p style={{fontFamily:sans,fontSize:12,color:C.muted,marginBottom:20}}>They'll receive your water reminder every 5 minutes</p>
                <div style={{background:"rgba(56,189,248,0.03)",border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",marginBottom:18}}>
                  <Lbl>Add a Friend</Lbl>
                  <div style={{display:"flex",gap:9,marginBottom:10,flexWrap:"wrap"}}>
                    <input value={newName} onChange={e=>setNewName(e.target.value)}
                      placeholder="Name" style={{flex:"1 1 120px",minWidth:100,background:"rgba(56,189,248,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:13,fontFamily:sans,outline:"none"}}/>
                    <input value={newEmail} onChange={e=>setNewEmail(e.target.value)}
                      placeholder="friend@gmail.com" type="email"
                      style={{flex:"2 1 180px",minWidth:140,background:"rgba(56,189,248,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:13,fontFamily:sans,outline:"none"}}
                      onKeyDown={e=>e.key==="Enter"&&addFriend()}/>
                  </div>
                  <Btn onClick={addFriend} disabled={!newName.trim()||!newEmail.includes("@")} variant="primary" full>+ Add Friend</Btn>
                </div>
                {friends.length===0 ? (
                  <div style={{textAlign:"center",padding:"36px 20px",background:"rgba(56,189,248,0.02)",border:`1px dashed ${C.border}`,borderRadius:16}}>
                    <div style={{fontSize:42,marginBottom:10}}>👥</div>
                    <p style={{fontFamily:serif,fontSize:15,color:C.muted,fontStyle:"italic",lineHeight:1.7}}>No friends yet.<br/>Add someone above!</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:9}}>
                    {friends.map(f=>(
                      <FriendCard key={f.id} friend={f}
                        onRemove={removeFriend} onSend={sendToFriend}
                        sending={sendStatus[f.id]==="sending"}
                        sent={sendStatus[f.id]==="sent"}
                        error={sendErrors[f.id]}/>
                    ))}
                    {friends.length>1 && user && (
                      <Btn onClick={sendToAll} variant="success" full style={{marginTop:4}}>✉️ Email All Friends Now</Btn>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSAGE TAB */}
          {tab==="message" && (
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:24,padding:"26px 22px",animation:"slideUp 0.4s ease"}}>
              <h2 style={{fontFamily:serif,fontSize:22,color:C.text,fontWeight:700,marginBottom:4}}>✏️ Reminder Message</h2>
              <p style={{fontFamily:sans,fontSize:12,color:C.muted,marginBottom:20}}>This is what your friends receive</p>
              <Lbl>Your Message</Lbl>
              <textarea value={msgDraft} onChange={e=>{setMsgDraft(e.target.value);setMsgSaved(false);}} rows={7}
                style={{width:"100%",background:"rgba(56,189,248,0.04)",border:`1px solid ${C.border}`,borderRadius:10,
                  padding:"12px 14px",color:C.text,fontSize:13,fontFamily:serif,fontStyle:"italic",
                  outline:"none",resize:"vertical",lineHeight:1.85,display:"block",marginBottom:14}}/>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <Btn onClick={()=>{setMessage(msgDraft);setMsgSaved(true);setTimeout(()=>setMsgSaved(false),2500);}}
                  variant="primary" style={{flex:2}}>{msgSaved?"✓ Saved!":"Save Message"}</Btn>
                <Btn onClick={()=>{setMsgDraft(DEFAULT_MSG);setMessage(DEFAULT_MSG);}} variant="ghost" style={{flex:1}}>Reset</Btn>
              </div>
              <div style={{background:"rgba(56,189,248,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
                <Lbl>Preview</Lbl>
                <p style={{fontFamily:serif,fontSize:13,color:C.sub,fontStyle:"italic",lineHeight:1.85,margin:0,whiteSpace:"pre-line"}}>"{message}"</p>
              </div>
            </div>
          )}

          {/* LOG TAB */}
          {tab==="log" && (
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:24,padding:"26px 22px",animation:"slideUp 0.4s ease"}}>
              <h2 style={{fontFamily:serif,fontSize:22,color:C.text,fontWeight:700,marginBottom:4}}>📋 Alert History</h2>
              <p style={{fontFamily:sans,fontSize:12,color:C.muted,marginBottom:20}}>Every reminder fired this session</p>
              {log.length===0 ? (
                <div style={{textAlign:"center",padding:"36px",background:"rgba(56,189,248,0.02)",border:`1px dashed ${C.border}`,borderRadius:16}}>
                  <div style={{fontSize:36,marginBottom:10}}>📋</div>
                  <p style={{fontFamily:serif,fontSize:14,color:C.muted,fontStyle:"italic"}}>No alerts yet. Start the bot!</p>
                </div>
              ) : (
                <div>
                  {log.map((e,i)=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                      borderBottom:i<log.length-1?`1px solid ${C.border}`:"none"}}>
                      <span style={{fontSize:16}}>💧</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600}}>Alert fired</div>
                        <div style={{fontFamily:mono,fontSize:10,color:C.muted}}>{e.time}</div>
                      </div>
                      <span style={{fontFamily:mono,fontSize:10,color:C.accent,
                        border:`1px solid ${C.accent}40`,borderRadius:5,padding:"3px 9px"}}>#{e.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{marginTop:32,fontSize:9,color:"rgba(56,189,248,0.1)",fontFamily:mono,
          letterSpacing:2,position:"relative",zIndex:2,textAlign:"center",
          textTransform:"uppercase",padding:"0 16px"}}>
          Click anywhere for ripples · Drink water · Stay healthy
        </p>
      </div>
    </>
  );
}