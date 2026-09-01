'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiPhoneOff, FiSend, FiPaperclip,
  FiMessageSquare, FiFile, FiImage, FiFileText, FiX
} from 'react-icons/fi';
import { io, Socket } from 'socket.io-client';

/* reuse the same CSS (served from public via Next.js module resolution) */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={18} />;
  if (type.includes('pdf')) return <FiFileText size={18} />;
  return <FiFile size={18} />;
}

/* Inline styles for doctor portal (no patient CSS import) */
const S = {
  shell: { display:'flex', flexDirection:'column' as const, height:'calc(100vh - 0px)', background:'#0a0f1e', color:'#f1f5f9', overflow:'hidden' },
  topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 as const },
  body: { position:'relative' as const, flex:1, minHeight:0, overflow:'hidden' },
  videoSide: { position:'absolute' as const, inset:0, display:'flex', flexDirection:'column' as const, background:'#0a0f1e', overflow:'hidden' },
  videoMain: { flex:1, position:'relative' as const, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' },
  selfVid: { position:'absolute' as const, bottom:110, right:32, width:160, height:116, borderRadius:14, overflow:'hidden', border:'2px solid rgba(16,185,129,0.5)', boxShadow:'0 8px 24px rgba(0,0,0,0.4)', background:'#1e293b', cursor:'pointer', zIndex:10 },
  controls: { position:'absolute' as const, bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', justifyContent:'center', gap:14, padding:'12px 24px', background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:10 },
  chatSide: { position:'absolute' as const, top:0, bottom:0, right:0, width:340, display:'flex', flexDirection:'column' as const, background:'#0f172a', borderLeft:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', zIndex:20, boxShadow:'-4px 0 32px rgba(0,0,0,0.5)', transition:'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' },
  chatHead: { padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'#e2e8f0', flexShrink:0 },
  chatMsgs: { flex:1, overflowY:'auto' as const, padding:'14px 14px 8px', display:'flex', flexDirection:'column' as const, gap:10, scrollBehavior:'smooth' as const },
  chatInput: { padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 },
};

export default function DoctorCallRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const [room, setRoom]         = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText]         = useState('');
  const [callStatus, setCallStatus] = useState<'idle'|'connecting'|'connected'|'ended'>('idle');
  const [micOn, setMicOn]   = useState(true);
  const [camOn, setCamOn]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [err, setErr]           = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const localVid   = useRef<HTMLVideoElement>(null);
  const remoteVid  = useRef<HTMLVideoElement>(null);
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const socketRef  = useRef<Socket | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  
  const answered   = useRef(false);
  const chatEnd    = useRef<HTMLDivElement>(null);
  const fileInput  = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('doctor_token') ?? '' : '';
  const H = { Authorization: `Bearer ${token}` };

  // fixed auto-scroll
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const fetchInitialMsgs = useCallback(async () => {
    const res = await fetch(`/api/consultations/${roomId}/messages`, { headers: H });
    if (!res.ok) return;
    const list: any[] = await res.json();
    setMessages(list);
  }, [roomId]);

  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      socketRef.current?.emit('signal', { roomId, type: 'ice-candidate', payload: e.candidate, senderRole: 'DOCTOR' });
    };
    pc.ontrack = (e) => {
      if (remoteVid.current) { remoteVid.current.srcObject = e.streams[0]; setCallStatus('connected'); }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setCallStatus('ended');
    };
    return pc;
  }, [roomId]);

  const initSocket = useCallback(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;
    
    socket.emit('join-room', roomId);
    
    socket.on('signal', async (data) => {
      if (data.senderRole === 'DOCTOR') return; // Ignore own
      if (data.type === 'offer' && !answered.current) {
        answered.current = true;
        setCallStatus('connecting');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
          streamRef.current = stream;
          if (localVid.current) localVid.current.srcObject = stream;
          const pc = buildPC(); pcRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('signal', { roomId, type: 'answer', payload: answer, senderRole: 'DOCTOR' });
        } catch {
          setErr('Could not access camera/microphone.');
          setCallStatus('idle'); answered.current = false;
        }
      } else if (data.type === 'ice-candidate' && pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.payload)); } catch { /**/ }
      }
    });

    socket.on('chat-message', (msg) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setShowChat((prevShowChat) => {
        if (!prevShowChat) setUnreadCount((c) => c + 1);
        return prevShowChat;
      });
    });

    socket.on('typing', (data) => {
      if (data.role !== 'DOCTOR') {
        setIsOtherTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsOtherTyping(false), 2000);
      }
    });
  }, [roomId, buildPC]);

  useEffect(() => {
    if (!token) { router.replace('/doctor/login'); return; }
    
    initSocket();

    fetch(`/api/consultations/${roomId}`, { headers:H }).then(r => r.ok ? r.json() : null).then(data => {
      if (!data) { router.replace('/doctor'); return; }
      setRoom(data);
      fetchInitialMsgs();
    });
    
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, [roomId, initSocket]);

  const toggleMic = () => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMicOn(v => !v); };
  const toggleCam = () => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setCamOn(v => !v); };

  const endCall = async () => {
    await fetch(`/api/consultations/${roomId}`, {
      method:'PATCH', headers:{ ...H,'Content-Type':'application/json' },
      body: JSON.stringify({ status:'ENDED' }),
    });
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    router.push('/doctor');
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true); setText('');
    try {
      const res = await fetch(`/api/consultations/${roomId}/messages`, {
        method:'POST', headers:{ ...H,'Content-Type':'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const m = await res.json();
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
        socketRef.current?.emit('chat-message', { roomId, message: m });
      }
    } catch { /**/ } finally { setSending(false); }
  };

  const uploadFile = async (file: File) => {
    if (file.size > 10*1024*1024) { setErr('Max file size is 10 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await fetch('/api/upload', { method:'POST', headers:H, body:fd });
      if (!up.ok) { setErr('Upload failed'); return; }
      const { url, fileName, fileType } = await up.json();
      const res = await fetch(`/api/consultations/${roomId}/messages`, {
        method:'POST', headers:{ ...H,'Content-Type':'application/json' },
        body: JSON.stringify({ fileUrl:url, fileName, fileType }),
      });
      if (res.ok) {
        const m = await res.json();
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
        socketRef.current?.emit('chat-message', { roomId, message: m });
      }
    } catch { setErr('Upload failed'); } finally { setUploading(false); }
  };

  const isEnded = !room || room.status === 'ENDED' || room.status === 'DECLINED' || callStatus === 'ended';
  const myRole = 'DOCTOR';
  const patientName = room ? `${room.patient?.firstName} ${room.patient?.lastName}` : '…';
  const [showMedical, setShowMedical] = useState(false);
  const [patientDetail, setPatientDetail] = useState<any>(null);
  useEffect(() => {
    if (!room?.patientId) return;
    fetch(`/api/patients/${room.patientId}`, { headers: H })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPatientDetail(data); })
      .catch(() => {});
  }, [room?.patientId]);

  if (!room) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:14,color:'#94a3b8',background:'#0a0f1e' }}>
      <div style={{ width:44,height:44,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.1)',borderTopColor:'#10b981',animation:'spin 0.9s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize:14 }}>Loading consultation…</span>
    </div>
  );

  const ctrl = (active: boolean, onClick: ()=>void, icon: React.ReactNode, danger=false, big=false) => (
    <button onClick={onClick} style={{ width:big?64:56, height:big?64:56, borderRadius:big?20:16, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0, background: danger ? '#ef4444' : active ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.25)', color: danger ? '#fff' : active ? '#f1f5f9' : '#f87171', fontSize:20 }}>
      {icon}
    </button>
  );

  const handleToggleChat = () => {
    setShowChat(prev => !prev);
    if (!showChat) setUnreadCount(0);
  };

  return (
    <div style={S.shell}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff' }}>
            {room.patient?.firstName?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'#f1f5f9' }}>{patientName}
              {room.patient?.relation && room.patient.relation !== 'SELF' && <span style={{ fontSize:11,color:'#34d399',marginLeft:6,fontWeight:700 }}>({room.patient.relation})</span>}
            </div>
            <div style={{ fontSize:12,color:'#64748b',marginTop:1 }}>Video Consultation</div>
          </div>
        </div>
        <button onClick={() => router.push('/doctor/consultation')} style={{ padding:'7px 14px',borderRadius:10,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',fontSize:12,fontWeight:600,cursor:'pointer' }}>
          ← Back
        </button>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Video */}
        <div style={S.videoSide}>
          <div style={S.videoMain}>
            {callStatus === 'connected' || callStatus === 'connecting' ? (
              <>
                <video ref={remoteVid} autoPlay playsInline style={{ width:'100%',height:'100%',objectFit:'cover',background:'#1e293b' }} />
                {callStatus === 'connecting' && (
                  <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(10,15,30,0.7)',backdropFilter:'blur(4px)',flexDirection:'column',gap:14 }}>
                    <div style={{ width:44,height:44,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.1)',borderTopColor:'#10b981',animation:'spin 0.9s linear infinite' }} />
                    <span style={{ color:'#94a3b8',fontSize:14 }}>Connecting…</span>
                  </div>
                )}
                <div style={{ ...S.selfVid, right: showChat ? 372 : 32, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}><video ref={localVid} autoPlay playsInline muted style={{ width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)' }} /></div>
              </>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12,color:'#475569',padding:40,textAlign:'center' }}>
                <div style={{ width:88,height:88,borderRadius:28,background:'rgba(16,185,129,0.1)',border:'2px solid rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:'#34d399' }}>
                  {room.patient?.firstName?.charAt(0)}
                </div>
                <p style={{ color:'#94a3b8',margin:0,fontSize:15,fontWeight:600 }}>{isEnded ? 'Call ended' : 'Waiting for patient video…'}</p>
                {isEnded && <button onClick={() => router.push('/doctor')} style={{ marginTop:12,padding:'10px 24px',borderRadius:12,background:'#10b981',color:'#fff',border:'none',fontWeight:700,cursor:'pointer' }}>Dashboard</button>}
              </div>
            )}
          </div>
          {err && <div style={{ margin:'0 16px 12px',padding:'10px 14px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:12,color:'#f87171',fontSize:13 }}>{err}</div>}
          {!isEnded && (
            <div style={{ ...S.controls, left: showChat ? 'calc(50% - 170px)' : '50%', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              {ctrl(micOn, toggleMic, micOn ? <FiMic size={20}/> : <FiMicOff size={20}/>)}
              {ctrl(true, endCall, <FiPhoneOff size={22}/>, true, true)}
              {ctrl(camOn, toggleCam, camOn ? <FiVideo size={20}/> : <FiVideoOff size={20}/>)}
            </div>
          )}
        </div>

        {/* Chat */}
        <div style={{ ...S.chatSide, transform: showChat ? 'translateX(0)' : 'translateX(100%)' }} onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files?.[0];if(f)uploadFile(f);}}>
          <div style={S.chatHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMessageSquare size={15}/> Chat — {patientName}
              {room.patient?.relation && room.patient.relation !== 'SELF' && <span style={{ fontSize:11,color:'#34d399',marginLeft:4,fontWeight:700 }}>({room.patient.relation})</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={() => setShowMedical((v:boolean) => !v)} style={{ padding:'4px 10px',borderRadius:8,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',color:'#34d399',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                {showMedical ? 'Hide' : 'Medical Info'}
              </button>
              <button onClick={() => setShowChat(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#94a3b8', width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <FiX size={16} />
              </button>
            </div>
          </div>
          {showMedical && patientDetail && (
            <div style={{ padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(16,185,129,0.06)',flexShrink:0 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#34d399',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Patient Medical Info</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8 }}>
                {[
                  { l:'Blood Group', v:patientDetail.bloodGroup||'—' },
                  { l:'Gender', v:patientDetail.gender||'—' },
                  { l:'Age', v:patientDetail.dateOfBirth?`${Math.floor((Date.now()-new Date(patientDetail.dateOfBirth).getTime())/(365.25*24*3600*1000))} yrs`:'—' },
                  { l:'Height / Weight', v:`${patientDetail.heightCm||'—'} cm / ${patientDetail.weightKg||'—'} kg` },
                ].map(({l,v}) => (
                  <div key={l} style={{ padding:'6px 10px',background:'rgba(255,255,255,0.05)',borderRadius:8 }}>
                    <div style={{ fontSize:9,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em' }}>{l}</div>
                    <div style={{ fontSize:12,fontWeight:700,color:'#e2e8f0' }}>{v}</div>
                  </div>
                ))}
              </div>
              {patientDetail.medicalNotes && (
                <div style={{ padding:'8px 12px',background:'rgba(16,185,129,0.1)',borderRadius:10,border:'1px solid rgba(16,185,129,0.2)',fontSize:12,color:'#6ee7b7',lineHeight:1.5,marginBottom:8 }}>
                  <span style={{ fontWeight:700,color:'#34d399' }}>Condition: </span>{patientDetail.medicalNotes}
                </div>
              )}
              {Array.isArray(patientDetail.medicalFiles) && patientDetail.medicalFiles.length > 0 && (
                <div>
                  <div style={{ fontSize:9,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Reports ({patientDetail.medicalFiles.length})</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                    {patientDetail.medicalFiles.map((f:any,i:number) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'rgba(255,255,255,0.08)',borderRadius:8,textDecoration:'none',color:'#6ee7b7',fontSize:12,fontWeight:600,border:'1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize:14 }}>{f.type?.startsWith('image/')?'🖼️':f.type?.includes('pdf')?'📄':'📝'}</span>
                        <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize:10,opacity:0.6 }}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={S.chatMsgs}>
            {messages.length===0 && <div style={{ textAlign:'center',padding:'32px 12px',color:'#475569',fontSize:13 }}>No messages yet.</div>}
            {messages.map((msg) => {
              const mine = msg.senderRole === myRole;
              return (
                <div key={msg.id} style={{ display:'flex',flexDirection:'column',alignItems:mine?'flex-end':'flex-start' }}>
                  <div style={{ fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4,padding:'0 4px' }}>{mine ? 'You' : patientName}</div>
                  {msg.fileUrl ? (
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:14,textDecoration:'none',maxWidth:'88%',background:mine?'linear-gradient(135deg,#10b981,#059669)':'rgba(255,255,255,0.08)',color:mine?'#fff':'#e2e8f0',border:mine?'none':'1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{fileIcon(msg.fileType)}</div>
                      <div><div style={{ fontSize:12.5,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140 }}>{msg.fileName||'File'}</div><div style={{ fontSize:10,opacity:0.7 }}>Tap to open</div></div>
                    </a>
                  ) : (
                    <div style={{ maxWidth:'88%',padding:'10px 14px',borderRadius:18,fontSize:13.5,lineHeight:1.45,wordBreak:'break-word',background:mine?'linear-gradient(135deg,#10b981,#059669)':'rgba(255,255,255,0.08)',color:mine?'#fff':'#e2e8f0',border:mine?'none':'1px solid rgba(255,255,255,0.07)',borderBottomRightRadius:mine?5:18,borderBottomLeftRadius:mine?18:5 }}>
                      {msg.content}
                    </div>
                  )}
                  <div style={{ fontSize:10,color:'#475569',padding:'2px 4px',marginTop:3 }}>{new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              );
            })}
            <div ref={chatEnd} style={{ height:1 }} />
          </div>

          {isOtherTyping && (
            <div style={{ padding: '0 14px 10px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
              {patientName} is typing<span className="typing-dots" />
              <style>{`@keyframes typingDots { 0% { content: "."; } 33% { content: ".."; } 66% { content: "..."; } } .typing-dots::after { content: "."; animation: typingDots 1.5s infinite; }`}</style>
            </div>
          )}

          {!isEnded && (
            <div style={S.chatInput}>
              {dragging && <div style={{ border:'2px dashed rgba(16,185,129,0.4)',borderRadius:14,padding:'14px 12px',marginBottom:10,textAlign:'center',color:'#10b981',fontSize:13,fontWeight:600,background:'rgba(16,185,129,0.05)' }}>Drop file here</div>}
              {uploading && <div style={{ marginBottom:8,fontSize:11,color:'#10b981',fontWeight:600 }}>Uploading…</div>}
              <div style={{ display:'flex',alignItems:'flex-end',gap:8 }}>
                <textarea
                  rows={2}
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    socketRef.current?.emit('typing', { roomId, role: 'DOCTOR' });
                  }}
                  onKeyDown={(e)=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
                  style={{ flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'10px 14px',color:'#f1f5f9',fontSize:13.5,resize:'none',outline:'none',fontFamily:'inherit',maxHeight:100,lineHeight:1.4 }}
                />
                <button onClick={()=>fileInput.current?.click()} style={{ width:40,height:40,borderRadius:12,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.08)',color:'#94a3b8',flexShrink:0 }}><FiPaperclip size={17}/></button>
                <button onClick={send} disabled={sending||!text.trim()} style={{ width:40,height:40,borderRadius:12,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',flexShrink:0,opacity:(sending||!text.trim())?0.4:1 }}><FiSend size={16}/></button>
              </div>
              <input ref={fileInput} type="file" style={{ display:'none' }} accept="image/*,.pdf,.doc,.docx" onChange={(e)=>{const f=e.target.files?.[0];if(f)uploadFile(f);e.target.value='';}} />
            </div>
          )}
        </div>

        {/* Floating Chat Toggle Button */}
        {!isEnded && room.status === 'ACTIVE' && (
          <button 
            onClick={handleToggleChat} 
            title="Toggle Chat"
            style={{ position:'absolute', bottom:32, right:32, width:60, height:60, borderRadius:'50%', background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 24px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#f1f5f9', fontSize:24, zIndex:10, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', opacity: showChat ? 0 : 1, transform: showChat ? 'translateX(100px)' : 'none', pointerEvents: showChat ? 'none' : 'auto' }}
          >
            <FiMessageSquare />
            {unreadCount > 0 && <div style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'white', fontSize:11, fontWeight:'bold', borderRadius:12, padding:'2px 6px', minWidth:20, textAlign:'center', boxShadow:'0 2px 8px rgba(239,68,68,0.5)', border:'2px solid #0f172a' }}>{unreadCount}</div>}
          </button>
        )}
      </div>
    </div>
  );
}
