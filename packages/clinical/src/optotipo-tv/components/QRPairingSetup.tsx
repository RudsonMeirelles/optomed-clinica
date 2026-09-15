import React, { useState, useRef, useEffect } from 'react';
import { saveSettings, loadSettings } from '../services/storageService';
import { lanPairingService } from '../services/lanPairingService';

interface QRPairingSetupProps {
  onClose: () => void;
  onPaired: (url: string) => void;
}

export const QRPairingSetup: React.FC<QRPairingSetupProps> = ({ onClose, onPaired }) => {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [manualUrl, setManualUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentSettings = loadSettings();

  useEffect(() => {
    if (mode === 'qr' && !cameraError) startCamera();
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus('scanning');
        startScanning();
      }
    } catch {
      setCameraError(true);
      setMode('manual');
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const startScanning = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    intervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      try {
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          detector.detect(canvas).then((barcodes: any[]) => {
            if (barcodes.length > 0) handleQRData(barcodes[0].rawValue);
          });
        }
      } catch { /* API nao disponivel */ }
    }, 500);
  };

  const handleQRData = (raw: string) => {
    stopCamera();
    try {
      let url = '';
      let clinicName: string | undefined;
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        url = parsed.serverUrl || parsed.wsUrl || raw;
        clinicName = parsed.clinicName;
      } else if (raw.startsWith('ws') || raw.startsWith('http')) {
        url = raw;
      } else {
        throw new Error('QR invalido');
      }
      applyPairing(url, clinicName);
    } catch {
      setStatus('error');
      setMessage('QR Code invalido. Use o QR exibido no sistema OptoMed.');
    }
  };

  const applyPairing = (url: string, clinicName?: string) => {
    const settings = loadSettings();
    const wsUrl = url.replace(/^https?:\/\//, 'ws://').replace(/\/$/, '') + '/tv';
    saveSettings({ ...settings, serverIp: url, roomName: clinicName || settings.roomName });
    lanPairingService.connect(wsUrl);
    setStatus('success');
    setMessage('Pareado! Conectando em: ' + url);
    setTimeout(() => onPaired(url), 1500);
  };

  const handleManualConnect = () => {
    const url = manualUrl.trim();
    if (!url) return;
    applyPairing(url);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg text-white shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">📡 Parear com Sistema Clinico</h2>
            <p className="text-sm text-gray-400 mt-1">Conecte ao OptoMed para controle remoto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'qr' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          >
            📷 Ler QR Code
          </button>
          <button
            onClick={() => { stopCamera(); setMode('manual'); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'manual' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          >
            ⌨️ Digitar Link
          </button>
        </div>

        <div className="p-6">
          {mode === 'qr' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {status === 'scanning' && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <span className="bg-black/70 rounded-full px-4 py-1 text-sm text-green-400 animate-pulse">
                      🔍 Aponte para o QR Code na tela do sistema...
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-blue-400 rounded-xl opacity-60" />
                </div>
              </div>
              <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 text-sm text-blue-300">
                💡 <strong>Como gerar o QR:</strong> No sistema clinico, va em{' '}
                <strong>Configuracoes → 📱 TV Optotipo / App</strong>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">URL do servidor:</label>
                <input
                  type="text"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="192.168.1.144 ou https://xyz.trycloudflare.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm outline-none"
                />
              </div>
              {currentSettings.serverIp && (
                <button
                  onClick={() => setManualUrl(currentSettings.serverIp)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  ↩ Usar ultima conexao: {currentSettings.serverIp}
                </button>
              )}
              <button
                onClick={handleManualConnect}
                disabled={!manualUrl.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl py-3 font-semibold text-white transition-colors"
              >
                🔗 Conectar
              </button>
              <div className="bg-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-1">
                <p><strong className="text-gray-300">Mesma rede Wi-Fi:</strong> use o IP — ex: <code>192.168.1.144</code></p>
                <p><strong className="text-gray-300">Rede externa:</strong> use o link Cloudflare do sistema</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4 bg-green-900/40 border border-green-600 rounded-xl p-4 text-green-300 text-sm text-center">
              ✅ {message}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 bg-red-900/40 border border-red-600 rounded-xl p-4 text-red-300 text-sm text-center">
              ❌ {message}
              <button onClick={startCamera} className="block mx-auto mt-2 text-xs underline">Tentar novamente</button>
            </div>
          )}

          <div className="mt-4 bg-gray-800/60 rounded-xl p-3 text-xs text-gray-500 text-center">
            📴 <strong>Sem rede?</strong> Todos os 18 testes funcionam 100% offline.
          </div>
        </div>
      </div>
    </div>
  );
};
