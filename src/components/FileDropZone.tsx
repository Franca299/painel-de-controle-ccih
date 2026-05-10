import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, CheckCircle, XCircle, Loader, FileSpreadsheet } from 'lucide-react';

// =====================================================================
// FileDropZone — Drag & Drop para XLSX/CSV/HL7
// =====================================================================

type DropState = 'idle' | 'dragging' | 'processing' | 'success' | 'error';

interface FileDropZoneProps {
  onFileParsed: (file: File) => Promise<void>;
  supportedFormats?: string[];
}

export default function FileDropZone({
  onFileParsed,
  supportedFormats = ['XLSX', 'CSV', 'JSON', 'HL7'],
}: FileDropZoneProps) {
  const [state, setState] = useState<DropState>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setState('processing');
    setMessage(`Processando ${file.name}...`);
    try {
      await onFileParsed(file);
      setState('success');
      setMessage(`${file.name} importado com sucesso!`);
    } catch (err) {
      setState('error');
      setMessage((err as Error).message || 'Erro ao processar o arquivo.');
    } finally {
      setTimeout(() => setState('idle'), 4000);
    }
  }, [onFileParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState('dragging');
  };

  const handleDragLeave = () => setState('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stateConfig = {
    idle: {
      border: 'border-blue-500/20',
      bg: 'bg-transparent hover:bg-blue-500/[0.03]',
      icon: <Upload className="w-8 h-8 text-blue-400" />,
      title: 'Ingestão de Dados Laboratoriais',
      sub: 'Arraste arquivos Excel, CSV ou exportações HL7 para atualizar os indicadores epidemiológicos instantaneamente.',
      iconBg: 'bg-blue-500/10',
    },
    dragging: {
      border: 'border-blue-400/60',
      bg: 'bg-blue-500/[0.07]',
      icon: <Upload className="w-8 h-8 text-blue-400 animate-bounce" />,
      title: 'Solte o arquivo aqui',
      sub: 'Identificamos seu arquivo — pode soltar!',
      iconBg: 'bg-blue-500/20',
    },
    processing: {
      border: 'border-amber-400/40',
      bg: 'bg-amber-500/[0.04]',
      icon: <Loader className="w-8 h-8 text-amber-400 animate-spin" />,
      title: 'Processando dados...',
      sub: message,
      iconBg: 'bg-amber-500/10',
    },
    success: {
      border: 'border-green-400/50',
      bg: 'bg-green-500/[0.05]',
      icon: <CheckCircle className="w-8 h-8 text-green-400" />,
      title: 'Dados importados!',
      sub: message,
      iconBg: 'bg-green-500/10',
    },
    error: {
      border: 'border-red-400/50',
      bg: 'bg-red-500/[0.05]',
      icon: <XCircle className="w-8 h-8 text-red-400" />,
      title: 'Erro na importação',
      sub: message,
      iconBg: 'bg-red-500/10',
    },
  };

  const cfg = stateConfig[state];

  return (
    <motion.div
      whileHover={state === 'idle' ? { scale: 1.002 } : undefined}
      className="relative"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state === 'idle' && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center
          transition-all duration-300 cursor-pointer
          ${cfg.border} ${cfg.bg}
        `}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 transition-all duration-300 ${cfg.iconBg}`}>
              {cfg.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">{cfg.title}</h3>
            <p className="text-slate-400 max-w-lg text-sm leading-relaxed">{cfg.sub}</p>
          </motion.div>
        </AnimatePresence>

        {state === 'idle' && (
          <div className="mt-8 flex gap-3 flex-wrap justify-center">
            {supportedFormats.map(ext => (
              <span key={ext} className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-md tracking-wide uppercase">
                <FileSpreadsheet className="w-3 h-3" />
                {ext}
              </span>
            ))}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json,.hl7"
        onChange={handleInputChange}
        className="hidden"
      />
    </motion.div>
  );
}
