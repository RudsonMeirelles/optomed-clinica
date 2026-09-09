import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Video, 
  Image as ImageIcon, 
  Type, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  Eye, 
  Save, 
  Sparkles,
  Info
} from 'lucide-react';
import { 
  WaitingRoomMediaService, 
  WaitingRoomSettings, 
  WaitingRoomMediaItem 
} from '../services/waitingRoomMediaService';

export const WaitingRoomMediaManager: React.FC = () => {
  const [settings, setSettings] = useState<WaitingRoomSettings>(WaitingRoomMediaService.getSettings());
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemType, setItemType] = useState<'video' | 'image' | 'text'>('video');
  const [itemTitle, setItemTitle] = useState<string>('');
  const [itemUrl, setItemUrl] = useState<string>('');
  const [itemTextContent, setItemTextContent] = useState<string>('');
  const [itemDuration, setItemDuration] = useState<number>(15);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdated = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };
    window.addEventListener('optomed_media_settings_updated', handleUpdated);
    return () => window.removeEventListener('optomed_media_settings_updated', handleUpdated);
  }, []);

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 2500);
  };

  const handleSaveMarquee = (e: React.FormEvent) => {
    e.preventDefault();
    WaitingRoomMediaService.saveSettings(settings);
    showNotification('Texto de rodapé e configurações salvas!');
  };

  const handleToggleMedia = (enabled: boolean) => {
    const updated = { ...settings, enabledMedia: enabled };
    setSettings(updated);
    WaitingRoomMediaService.saveSettings(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle) return;

    WaitingRoomMediaService.addMediaItem({
      type: itemType,
      title: itemTitle,
      url: itemUrl.trim(),
      textContent: itemTextContent.trim(),
      durationSeconds: Number(itemDuration) || 15,
      active: true
    });

    setSettings(WaitingRoomMediaService.getSettings());
    setShowAddModal(false);
    setItemTitle('');
    setItemUrl('');
    setItemTextContent('');
    showNotification('Nova propaganda/mídia anexada à TV com sucesso!');
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Deseja remover esta mídia do painel da TV?')) {
      WaitingRoomMediaService.removeMediaItem(id);
      setSettings(WaitingRoomMediaService.getSettings());
      showNotification('Mídia removida.');
    }
  };

  const handleToggleItemActive = (id: string) => {
    WaitingRoomMediaService.toggleMediaItem(id);
    setSettings(WaitingRoomMediaService.getSettings());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo / Configuração Geral */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Painel Multimídia de Propaganda & Apoio da TV
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                Sala de Espera
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Exiba vídeos educativos (YouTube/MP4), carrossel de fotos, banners de promoções e textos informativos na TV enquanto chama pacientes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.enabledMedia} 
                onChange={(e) => handleToggleMedia(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-200">
                {settings.enabledMedia ? 'Mídia Ativa na TV' : 'Mídia Oculta'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Anexar Nova Mídia
            </button>
          </div>
        </div>

        {/* Rodapé Letreiro Digital (Marquee) */}
        <form onSubmit={handleSaveMarquee} className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block">
            Letreiro de Notícias / Texto Corrente no Rodapé da TV (Marquee):
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={settings.marqueeText}
              onChange={(e) => setSettings({ ...settings, marqueeText: e.target.value })}
              placeholder="Digite aqui aviso da clínica, promoções ou dicas de saúde ocular..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Rodapé
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Mídias Cadastradas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-sm font-black text-slate-200">
            Mídias & Propagandas em Exibição ({settings.items.length})
          </h4>
          <span className="text-[11px] text-slate-400">
            Alternam automaticamente na TV da Sala de Espera
          </span>
        </div>

        {settings.items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <Video className="w-12 h-12 mx-auto text-slate-700" />
            <p className="text-sm font-bold">Nenhuma propaganda ou mídia cadastrada.</p>
            <p className="text-xs text-slate-600">
              Clique no botão "Anexar Nova Mídia" para incluir vídeos do YouTube, imagens promocionais ou mensagens institucionais.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings.items.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  item.active 
                    ? 'bg-slate-950/80 border-slate-800 shadow-lg' 
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 ${
                      item.type === 'video' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      item.type === 'image' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {item.type === 'video' && <Video className="w-3 h-3" />}
                      {item.type === 'image' && <ImageIcon className="w-3 h-3" />}
                      {item.type === 'text' && <Type className="w-3 h-3" />}
                      {item.type.toUpperCase()}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      ⏱ {item.durationSeconds}s
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-white line-clamp-1">
                    {item.title}
                  </h5>

                  {item.type === 'text' && item.textContent && (
                    <p className="text-xs text-slate-400 line-clamp-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      {item.textContent}
                    </p>
                  )}

                  {item.type === 'video' && item.url && (
                    <div className="text-[11px] text-blue-400 truncate bg-slate-900 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{item.url}</span>
                    </div>
                  )}

                  {item.type === 'image' && item.url && (
                    <div className="h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleToggleItemActive(item.id)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                      item.active 
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {item.active ? 'Ativo na TV' : 'Pausado'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Excluir Mídia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Adicionar Nova Mídia */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-slate-100 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Anexar Mídia / Propaganda na TV
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Tipo de Mídia */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Tipo de Conteúdo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType('video')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      itemType === 'video'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Vídeo
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemType('image')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      itemType === 'image'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> Imagem / Banner
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemType('text')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      itemType === 'text'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Type className="w-4 h-4" /> Texto / Dica
                  </button>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Título da Propaganda / Identificação:
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Ex: Vídeo Institucional, Promoção de Armações, Dica de Visão..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Campos específicos por tipo */}
              {itemType === 'video' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Link do Vídeo (YouTube ou link direto MP4):
                  </label>
                  <input
                    type="text"
                    required
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>Suporta links normais do YouTube ou links curtos (youtu.be)</span>
                  </div>
                </div>
              )}

              {itemType === 'image' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 block">
                    Upload de Imagem ou Link URL:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    placeholder="Ou cole uma URL de imagem (https://...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {itemType === 'text' && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Conteúdo do Texto / Anúncio:
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={itemTextContent}
                    onChange={(e) => setItemTextContent(e.target.value)}
                    placeholder="Digite a mensagem que será exibida com destaque na TV da sala de espera..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Duração em Segundos */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tempo de Exibição na TV (Segundos):
                </label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={itemDuration}
                  onChange={(e) => setItemDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  Confirmar e Exibir na TV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
