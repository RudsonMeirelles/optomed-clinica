import React, { useState, useEffect } from 'react';

function generateQRUrl(data: string): string {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(data);
}

export const TVOptotipoSettings: React.FC = () => {
  const localIp = window.location.hostname || '192.168.1.144';
  const [serverUrl, setServerUrl] = useState(localIp);
  const [clinicName, setClinicName] = useState('Clinica Meirelles');
  const [qrImage, setQrImage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateQR();
  }, [serverUrl, clinicName]);

  const generateQR = () => {
    const payload = JSON.stringify({
      serverUrl: serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`,
      clinicName,
      wsPort: 8765,
      version: '1.0'
    });
    setQrImage(generateQRUrl(payload));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(serverUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📱</span>
          <div>
            <h2 className="text-xl font-black">TV Optotipo — App Android</h2>
            <p className="text-purple-200 text-sm">Gere o QR Code para parear o app com este sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 uppercase text-sm">⚙️ Configuração do QR</h3>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">IP ou Link do Servidor:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:border-purple-500 outline-none"
              placeholder="192.168.1.144 ou https://xxx.trycloudflare.com"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setServerUrl(localIp)}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              >
                📶 IP Local ({localIp})
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Nome da Clínica:</label>
            <input
              type="text"
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:border-purple-500 outline-none"
            />
          </div>

          <button
            onClick={generateQR}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 font-bold text-sm transition-colors"
          >
            🔄 Atualizar QR Code
          </button>

          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">📌 Como usar:</p>
            <p>1. Abra o app <strong>OptoMed — Testes Visuais</strong> no Android</p>
            <p>2. Toque em <strong>"📡 Parear com sistema clínico"</strong></p>
            <p>3. Selecione <strong>"📷 Ler QR Code"</strong></p>
            <p>4. Aponte a câmera para o QR ao lado</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center gap-4">
          <h3 className="font-black text-slate-900 uppercase text-sm self-start">📲 QR Code de Pareamento</h3>

          {qrImage && (
            <div className="bg-white p-4 rounded-2xl border-4 border-purple-600 shadow-xl">
              <img
                src={qrImage}
                alt="QR Code Pareamento OptoMed"
                className="w-64 h-64"
              />
            </div>
          )}

          <p className="text-xs text-slate-500 text-center max-w-xs">
            Aponte a câmera do Android para este QR Code para conectar automaticamente
          </p>

          <button
            onClick={copyLink}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
              copied ? 'bg-green-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {copied ? '✅ Copiado!' : '📋 Copiar link manualmente'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🏪</span>
          <div>
            <h3 className="font-black text-green-900 mb-1">App na Google Play Store</h3>
            <p className="text-sm text-green-700">
              O app <strong>OptoMed — Testes Visuais</strong> estará disponível gratuitamente na Play Store.
              Após instalar, use o QR Code acima para parear com este sistema em segundos.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">✅ Offline completo</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">📡 Pareamento QR</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold">🆓 Gratuito</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">📺 Android TV + Tablet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
