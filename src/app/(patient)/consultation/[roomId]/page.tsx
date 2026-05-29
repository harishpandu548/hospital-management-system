'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiPhoneOff, FiSend, FiPaperclip,
  FiMessageSquare, FiFile, FiImage, FiFileText,
} from 'react-icons/fi';
import '@/styles/patient/call-room.css';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
const POLL_MS = 1500;

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={18} />;
  if (type.includes('pdf')) return <FiFileText size={18} />;
  return <FiFile size={18} />;
}

export default function PatientCallRoom() {
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

  const localVid  = useRef<HTMLVideoElement>(null);
  const remoteVid = useRef<HTMLVideoElement>(null);
  const pcRef     = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSigId = useRef('');
  const lastMsgId = useRef('');
  const sigTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEnd   = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') ?? '' : '';
  const H = { Authorization: `Bearer ${token}` };

  // ── auto-scroll chat (fixed: runs only when messages change) ──────
  useEffect(() => {
    if (chatEnd.current) {
      chatEnd.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // ── fetch room ─────────────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/consultations/${roomId}`, { headers: H });
    if (!res.ok) { router.replace('/consultation'); return null; }
    const data = await res.json();
    setRoom(data);
    return data;
  }, [roomId]);

  // ── poll messages ──────────────────────────────────────────────────
  const pollMsgs = useCallback(async () => {
    const res = await fetch(`/api/consultations/${roomId}/messages?afterId=${lastMsgId.current}`, { headers: H });
    if (!res.ok) return;
    const list: any[] = await res.json();
    if (!list.length) return;
    lastMsgId.current = list[list.length - 1].id;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...list.filter((m) => !seen.has(m.id))];
    });
  }, [roomId]);

  // ── WebRTC (patient = offerer) ─────────────────────────────────────
  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = async (e) => {
      if (!e.candidate) return;
      await fetch(`/api/consultations/${roomId}/signal`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ice-candidate', payload: e.candidate }),
      });
    };
    pc.ontrack = (e) => {
      if (remoteVid.current) { remoteVid.current.srcObject = e.streams[0]; setCallStatus('connected'); }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setCallStatus('ended');
    };
    return pc;
  }, [roomId]);

  const startCall = useCallback(async () => {
    if (pcRef.current) return; // already started
    setCallStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVid.current) localVid.current.srcObject = stream;
      const pc = buildPC(); pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await fetch(`/api/consultations/${roomId}/signal`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', payload: offer }),
      });
    } catch {
      setErr('Camera/microphone access denied. Please allow permissions and refresh.');
      setCallStatus('idle');
    }
  }, [roomId, buildPC]);

  const pollSignals = useCallback(async () => {
    const res = await fetch(`/api/consultations/${roomId}/signal?lastId=${lastSigId.current}&myRole=PATIENT`, { headers: H });
    if (!res.ok) return;
    const sigs: any[] = await res.json();
    if (!sigs.length) return;
    lastSigId.current = sigs[sigs.length - 1].id;
    for (const s of sigs) {
      const payload = JSON.parse(s.payload);
      const pc = pcRef.current;
      if (!pc) continue;
      if (s.type === 'answer' && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (s.type === 'ice-candidate') {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch { /**/ }
      }
    }
  }, [roomId]);

  const stopPolling = useCallback(() => {
    if (sigTimer.current)  { clearInterval(sigTimer.current);  sigTimer.current  = null; }
    if (msgTimer.current)  { clearInterval(msgTimer.current);  msgTimer.current  = null; }
    if (roomTimer.current) { clearInterval(roomTimer.current); roomTimer.current = null; }
  }, []);

  // ── init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchRoom().then((data) => {
      if (!data) return;
      pollMsgs(); // initial load
      // Only start signal polling if room is active/pending
      if (data.status === 'PENDING' || data.status === 'ACTIVE') {
        sigTimer.current = setInterval(pollSignals, POLL_MS);
        msgTimer.current = setInterval(pollMsgs, POLL_MS);
      }
    });
    return () => {
      stopPolling();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, [roomId]);

  // Watch room status — start/stop polling appropriately
  useEffect(() => {
    if (!room) return;
    if (room.status === 'ACTIVE' && callStatus === 'idle') startCall();

    if (room.status === 'ENDED' || room.status === 'DECLINED') {
      setCallStatus('ended');
      stopPolling(); // STOP all polling when call ends
      streamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      return;
    }

    if (room.status === 'PENDING') {
      // Poll room status every 4s to detect when doctor accepts
      if (!roomTimer.current) {
        roomTimer.current = setInterval(fetchRoom, 4000);
      }
      // Start signal+msg polling if not already running
      if (!sigTimer.current) sigTimer.current = setInterval(pollSignals, POLL_MS);
      if (!msgTimer.current) msgTimer.current = setInterval(pollMsgs, POLL_MS);
    } else if (room.status === 'ACTIVE') {
      // Stop the room-status poll once active
      if (roomTimer.current) { clearInterval(roomTimer.current); roomTimer.current = null; }
      if (!sigTimer.current) sigTimer.current = setInterval(pollSignals, POLL_MS);
      if (!msgTimer.current) msgTimer.current = setInterval(pollMsgs, POLL_MS);
    }
  }, [room?.status]);

  // ── controls ───────────────────────────────────────────────────────
  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  };
  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((v) => !v);
  };
  const endCall = async () => {
    await fetch(`/api/consultations/${roomId}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ENDED' }),
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    router.push('/consultation');
  };

  // ── send message ───────────────────────────────────────────────────
  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true); setText('');
    try {
      const res = await fetch(`/api/consultations/${roomId}/messages`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const m = await res.json();
        setMessages((prev) => prev.find((x) => x.id === m.id) ? prev : [...prev, m]);
        lastMsgId.current = m.id;
      }
    } catch { /**/ } finally { setSending(false); }
  };

  // ── upload file ────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setErr('Max file size is 10 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', headers: H, body: fd });
      if (!up.ok) { setErr('Upload failed'); return; }
      const { url, fileName, fileType } = await up.json();
      const res = await fetch(`/api/consultations/${roomId}/messages`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url, fileName, fileType }),
      });
      if (res.ok) {
        const m = await res.json();
        setMessages((prev) => prev.find((x) => x.id === m.id) ? prev : [...prev, m]);
        lastMsgId.current = m.id;
      }
    } catch { setErr('Upload failed. Try again.'); } finally { setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f);
  };

  if (!room) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 68px)', flexDirection:'column', gap:16, background:'#0a0f1e', color:'#94a3b8' }}>
      <div className="call-spinner" />
      <span style={{ fontSize:14 }}>Loading consultation…</span>
    </div>
  );

  const isEnded = room.status === 'ENDED' || room.status === 'DECLINED' || callStatus === 'ended';
  const STATUS_CLASSES: Record<string,string> = { PENDING:'pill-pending', ACTIVE:'pill-active', ENDED:'pill-ended', DECLINED:'pill-declined' };
  const statusClass = STATUS_CLASSES[room.status as string] ?? 'pill-ended';
  const myRole = 'PATIENT';

  return (
    <div className="call-room-shell">
      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="call-topbar">
        <div className="call-topbar-info">
          <div className="call-doctor-avatar">{room.doctor?.fullname?.charAt(0)}</div>
          <div>
            <div className="call-doctor-name">Dr. {room.doctor?.fullname}</div>
            <div className="call-doctor-spec">{room.doctor?.specialization}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className={`call-status-pill ${statusClass}`}>
            {(room.status === 'PENDING' || room.status === 'ACTIVE') && (
              <div className="call-status-dot" style={{ background: room.status === 'ACTIVE' ? '#22c55e' : '#fbbf24' }} />
            )}
            {room.status}
          </div>
          <button
            onClick={() => router.push('/consultation')}
            style={{ padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ───────────────────────────────────────── */}
      <div className="call-body">
        {/* VIDEO */}
        <div className="call-video-side">
          <div className="call-video-main">
            {callStatus === 'connected' || callStatus === 'connecting' ? (
              <>
                <video ref={remoteVid} autoPlay playsInline style={{ width:'100%', height:'100%', objectFit:'cover', background:'#1e293b' }} />
                {callStatus === 'connecting' && (
                  <div className="call-video-overlay">
                    <div className="call-spinner" />
                    <span style={{ color:'#94a3b8', fontSize:14 }}>Establishing connection…</span>
                  </div>
                )}
                <div className="call-video-self">
                  <video ref={localVid} autoPlay playsInline muted />
                </div>
              </>
            ) : room.status === 'PENDING' ? (
              <div className="call-waiting">
                <div className="call-waiting-ring" />
                <p style={{ color:'#e2e8f0', fontWeight:700, fontSize:18, margin:0 }}>Waiting for Doctor</p>
                <p style={{ color:'#64748b', fontSize:14, margin:0 }}>Dr. {room.doctor?.fullname} will join shortly</p>
                {room.slot?.startTime && (
                  <div style={{ marginTop:8, padding:'8px 16px', borderRadius:20, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)', fontSize:13, color:'#818cf8', fontWeight:600 }}>
                    Scheduled: {new Date(room.slot.startTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                )}
              </div>
            ) : (
              <div className="call-video-placeholder">
                <div className="call-placeholder-avatar">{room.doctor?.fullname?.charAt(0)}</div>
                <p style={{ color:'#94a3b8', margin:0, fontSize:15, fontWeight:600 }}>
                  {isEnded ? (room.status === 'DECLINED' ? 'Doctor declined this consultation' : 'Call ended') : 'Starting…'}
                </p>
                {isEnded && (
                  <button onClick={() => router.push('/consultation')} style={{ marginTop:16, padding:'10px 24px', borderRadius:12, background:'#6366f1', color:'#fff', border:'none', fontWeight:700, cursor:'pointer' }}>
                    Back to Consultations
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          {!isEnded && room.status === 'ACTIVE' && (
            <div className="call-controls">
              <button className={`ctrl ${!micOn ? 'off' : ''}`} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
                {micOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
              </button>
              <button className="ctrl end" onClick={endCall} title="End call">
                <FiPhoneOff size={22} />
              </button>
              <button className={`ctrl ${!camOn ? 'off' : ''}`} onClick={toggleCam} title={camOn ? 'Camera off' : 'Camera on'}>
                {camOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
              </button>
            </div>
          )}

          {err && (
            <div style={{ margin:'0 16px 12px', padding:'10px 14px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, color:'#f87171', fontSize:13 }}>
              {err}
            </div>
          )}
        </div>

        {/* CHAT */}
        <div
          className="call-chat-side"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="chat-head">
            <FiMessageSquare size={15} />
            Chat with Dr. {room.doctor?.fullname}
          </div>

          <div className="chat-msgs">
            {messages.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 12px', color:'#475569', fontSize:13 }}>
                No messages yet. Say hello!
              </div>
            )}
            {messages.map((msg) => {
              const mine = msg.senderRole === myRole;
              const cls = mine ? 'mine' : 'theirs';
              return (
                <div key={msg.id} className={`msg-wrap ${cls}`}>
                  <div className="msg-sender">{mine ? 'You' : `Dr. ${room.doctor?.fullname}`}</div>
                  {msg.fileUrl ? (
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`msg-file ${cls}`}>
                      <div className="msg-file-icon">{fileIcon(msg.fileType)}</div>
                      <div>
                        <div className="msg-file-name">{msg.fileName || 'File'}</div>
                        <div className="msg-file-size">Click to open</div>
                      </div>
                    </a>
                  ) : (
                    <div className={`msg-bubble ${cls}`}>{msg.content}</div>
                  )}
                  <div className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              );
            })}
            <div ref={chatEnd} style={{ height: 1 }} />
          </div>

          {!isEnded && (
            <div className="chat-input-area">
              {/* Drag & drop zone */}
              <div
                className={`chat-drop-zone ${dragging ? 'dragging visible' : ''}`}
                onClick={() => fileInput.current?.click()}
              >
                Drop file here or click to upload
              </div>

              {uploading && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:'#6366f1', fontWeight:600, marginBottom:4 }}>Uploading…</div>
                  <div className="upload-progress"><div className="upload-progress-bar" /></div>
                </div>
              )}

              <div className="chat-input-row">
                <textarea
                  className="chat-textarea"
                  rows={2}
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="chat-btn attach" onClick={() => fileInput.current?.click()} title="Attach file" disabled={uploading}>
                  <FiPaperclip size={17} />
                </button>
                <button className="chat-btn send" onClick={send} disabled={sending || !text.trim()} title="Send">
                  <FiSend size={16} />
                </button>
              </div>
              <input ref={fileInput} type="file" style={{ display:'none' }} accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
