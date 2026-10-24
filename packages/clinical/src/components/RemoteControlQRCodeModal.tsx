import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  Wifi, 
  Tv, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { authService } from '../services/authService';
import { lanController } from '../services/lanController';

interface RemoteControlQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId?: string;
  roomName?: string;
}

export const RemoteControlQRCodeModal: React.FC<RemoteControlQRCodeModalProps> = ({
  isOpen,
  onClose,
  clinicId = 'ivs',
  roomName = lanController.getPairedRoom()
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isTvOnline, setIsTvOnline] = useState<boolean>(lanController.isTvOnline());

  useEffect(() => {
    if (!isOpen) return;

    const user = authService.getCurrentUser();
    const token = authService.getSessionToken();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://optomed-clinica.onrender.com';
    const effectiveRoom = roomName || lanController.getPairedRoom() || 'Consultório 1';

    let generatedUrl = `${origin}/clinical/?controle=1&room=${encodeURIComponent(effectiveRoom)}&clinic=${encodeURIComponent(clinicId)}`;

    if (token && user) {
      try {
        const authPayload = btoa(unescape(encodeURIComponent(JSON.stringify({ token, user }))));
        generatedUrl += `&auth=${authPayload}`;
      } catch (err) {
        console.warn('[QR Code] Falha ao empacotar auth no link:', err);
      }
    }

    setRemoteUrl(generatedUrl);

    QRCode.toDataURL(generatedUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('[QR Code] Erro ao renderizar:', err));

    const handleTvStatus = (e: any) => {
      if (e.detail?.isTvOnline !== undefined) {
        setIsTvOnline(e.detail.isTvOnline);
      }
    };
    window.addEventListener('optomed_tv_status_changed', handleTvStatus);
    return () => window.removeEventListener('optomed_tv_status_changed', handleTvStatus);
  }, [isOpen, clinicId, roomName]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!remoteUrl) return;
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/25">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              CONTROLE NO CELULAR
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400">
              Aponte a câmera do celular para controlar o optotipo
            </p>
          </div>
        </div>

        {/* Tag de Sala e Status da TV */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-300">Sala Ativa:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
              {roomName || 'Consultório 1'}
            </span>
          </div>
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
            isTvOnline 
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
              : 'bg-rose-950 text-rose-300 border-rose-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTvOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            {isTvOnline ? 'TV ONLINE' : 'TV OFFLINE'}
          </span>
        </div>

        {/* Container do QR Code */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border border-slate-200">
          {qrCodeDataUrl ? (
            <img 
              src={qrCodeDataUrl} 
              alt="QR Code para Controle Remoto" 
              className="w-56 h-56 object-contain rounded-lg"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs font-medium">
              Gerando QR Code de pareamento...
            </div>
          )}
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Login Automático Seguro Incluso</span>
          </div>
        </div>

        {/* Instrução rápida */}
        <p className="text-center text-xs text-slate-400 px-2 leading-relaxed">
          Abra a câmera do seu celular, aponte para o QR Code acima e toque na notificação para abrir o controle já logado e sincronizado.
        </p>

        {/* Link Manual / Copiar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <input
              type="text"
              readOnly
              value={remoteUrl}
              className="bg-transparent text-slate-300 font-mono text-[11px] flex-1 truncate px-1 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer active:scale-95 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
