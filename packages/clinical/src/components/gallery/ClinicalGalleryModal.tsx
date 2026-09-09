import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Eye, 
  BookOpen, 
  Sparkles, 
  X, 
  Plus, 
  Check, 
  PenTool,
  ZoomIn,
  Download
} from 'lucide-react';
import { OphthalmicImageRecord, EyeDrawingData } from '@optotipo/shared';
import { OPHTHALMIC_ATLAS, OphthalmicCondition } from '../../services/ophthalmicAtlasDb';
import { EyeDrawingCanvas } from './EyeDrawingCanvas';
import { generateUUID } from '../../services/offlineDb';

interface ClinicalGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images?: OphthalmicImageRecord[];
  eyeDrawing?: EyeDrawingData;
  onUpdateImages: (images: OphthalmicImageRecord[]) => void;
  onUpdateEyeDrawing: (drawing: EyeDrawingData) => void;
  patientName: string;
}

export const ClinicalGalleryModal: React.FC<ClinicalGalleryModalProps> = ({
  isOpen,
  onClose,
  images = [],
  eyeDrawing,
  onUpdateImages,
  onUpdateEyeDrawing,
  patientName
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'photos' | 'atlas'>('draw');
  const [selectedAtlasCondition, setSelectedAtlasCondition] = useState<OphthalmicCondition>(OPHTHALMIC_ATLAS[0]);
  const [atlasCategoryFilter, setAtlasCategoryFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Estados para novo upload
  const [uploadEye, setUploadEye] = useState<'OD' | 'OE' | 'AO'>('OD');
  const [uploadCategory, setUploadCategory] = useState<OphthalmicImageRecord['category']>('anterior_segment');
  const [uploadTitle, setUploadTitle] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newImg: OphthalmicImageRecord = {
        id: generateUUID(),
        encounterId: '',
        category: uploadCategory,
        eye: uploadEye,
        title: uploadTitle || file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
        createdAt: new Date().toISOString()
      };
      onUpdateImages([...images, newImg]);
      setUploadTitle('');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = (id: string) => {
    onUpdateImages(images.filter(img => img.id !== id));
  };

  const filteredAtlas = atlasCategoryFilter === 'all' 
    ? OPHTHALMIC_ATLAS 
    : OPHTHALMIC_ATLAS.filter(c => c.category === atlasCategoryFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Top Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/40">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                GALERIA CLÍNICA, ATLAS & DESENHO ANATÔMICO
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  HD
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Paciente: <strong className="text-white">{patientName}</strong> • Documentação Diagnóstica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Abas */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'draw' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Desenho Anatômico</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'photos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Fotos do Paciente ({images.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('atlas')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'atlas' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Atlas de Patologias & Ametropias</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo da Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900">
          {/* 1. ABA DE DESENHO ANATÔMICO OCULAR */}
          {activeTab === 'draw' && (
            <EyeDrawingCanvas
              initialData={eyeDrawing}
              patientName={patientName}
              onSave={(savedData) => {
                onUpdateEyeDrawing(savedData);
                alert('Desenho anatômico e laudo salvos com sucesso no prontuário!');
              }}
            />
          )}

          {/* 2. ABA DE FOTOS E EXAMES DO PACIENTE */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Card de Novo Upload */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  Anexar Foto de Lâmpada de Fenda, Retinografia ou Exame
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Olho Testado:</label>
                    <select
                      value={uploadEye}
                      onChange={(e) => setUploadEye(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="OD">OD (Olho Direito)</option>
                      <option value="OE">OE (Olho Esquerdo)</option>
                      <option value="AO">AO (Ambos os Olhos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Categoria:</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="anterior_segment">Biomicroscopia / Córnea / Íris</option>
                      <option value="retina">Retinografia / Fundo de Olho</option>
                      <option value="exam_upload">Laudo Externo / Topografia / OCT</option>
                      <option value="other">Outros Registros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Título / Descrição:</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Ex: Ceratite pontuada pós-lente"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-600/30">
                      <Upload className="w-4 h-4" />
                      <span>Selecionar Imagem</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Grid de Fotos Anexadas */}
              {images.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhuma foto ou imagem anexada ainda</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Você pode tirar foto pelo celular/tablet ou enviar imagens da lâmpada de fenda para o prontuário.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map(img => (
                    <div 
                      key={img.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col group hover:border-slate-700 transition-all"
                    >
                      <div className="relative aspect-4/3 bg-slate-900 overflow-hidden">
                        <img 
                          src={img.dataUrl} 
                          alt={img.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                          img.eye === 'OD' ? 'bg-emerald-600 text-white' : img.eye === 'OE' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {img.eye}
                        </span>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(img.dataUrl)}
                            className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-xl backdrop-blur-xs transition-colors"
                            title="Ampliar Foto"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl backdrop-blur-xs transition-colors"
                            title="Remover Imagem"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3">
                        <h4 className="font-bold text-xs text-white truncate">{img.title}</h4>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                          <span>{new Date(img.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span className="capitalize">{img.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ABA DO ATLAS DE PATOLOGIAS & AMETROPIAS */}
          {activeTab === 'atlas' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda: Lista de Condições com Filtro */}
              <div className="lg:col-span-4 flex flex-col gap-3">
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'ametropia', label: 'Ametropias' },
                    { id: 'cornea', label: 'Córnea' },
                    { id: 'cristalino', label: 'Cristalino' },
                    { id: 'glaucoma', label: 'Glaucoma' },
                    { id: 'retina', label: 'Retina' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAtlasCategoryFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                        atlasCategoryFilter === f.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
                  {filteredAtlas.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAtlasCondition(item)}
                      className={`w-full p-3 rounded-2xl text-left border transition-all flex flex-col cursor-pointer ${
                        selectedAtlasCondition.id === item.id
                          ? 'bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-white">{item.name}</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 italic mt-0.5 truncate">{item.scientificName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coluna Direita: Ilustração Realista e Explicação Didática para o Paciente */}
              <div className="lg:col-span-8 bg-slate-950 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white">{selectedAtlasCondition.name}</h3>
                      <p className="text-xs text-blue-400 italic font-semibold">{selectedAtlasCondition.scientificName}</p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/40">
                      {selectedAtlasCondition.category}
                    </span>
                  </div>

                  {/* Renderização do SVG Anatômico Realista */}
                  <div 
                    className="w-full flex items-center justify-center p-2 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-inner"
                    dangerouslySetInnerHTML={{ __html: selectedAtlasCondition.svgIllustration }}
                  />

                  {/* Informações Clínicas */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Mecanismo Fisiopatológico:</h4>
                      <p className="text-slate-300 leading-relaxed mt-0.5">{selectedAtlasCondition.shortDescription}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="font-bold text-amber-400 text-[11px] uppercase block mb-1">Sintomas Típicos:</span>
                        <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                          {selectedAtlasCondition.symptoms.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="font-bold text-emerald-400 text-[11px] uppercase block mb-1">Achados no Exame:</span>
                        <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                          {selectedAtlasCondition.findings.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800/60">
                      <span className="font-bold text-blue-300 text-[11px] uppercase block mb-0.5">Conduta e Manejo Clínico:</span>
                      <p className="text-blue-100 text-[11px]">{selectedAtlasCondition.management}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Zoom da Imagem */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img 
            src={previewImage} 
            alt="Preview Ampliada" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
