import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';

import { ESTADOS_OPCIONES } from './clientConstants.js';

const FORM_INICIAL = {
  nombreCompleto: '',
  telefono: '',
  vehiculo: '',
  vin: '',
  lote: '',
  costoTotalPactado: '',
  estadoAuto: 'USA',
};

const MAX_PHOTOS = 10;
const MAX_SIZE_MB = 8;

function VehiclePhotoUpload({ photos, onAdd, onRemove, disabled }) {
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const valid = incoming
      .filter((file) => file.type.startsWith('image/'))
      .filter((file) => file.size <= MAX_SIZE_MB * 1024 * 1024)
      .slice(0, remaining);

    valid.forEach((file) => {
      onAdd({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    });
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Fotos del vehículo
      </label>
      <p className="mb-3 text-xs text-slate-500">
        Sube hasta {MAX_PHOTOS} imágenes (JPG, PNG, WEBP). Máx. {MAX_SIZE_MB} MB c/u.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled || photos.length >= MAX_PHOTOS}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        disabled={disabled || photos.length >= MAX_PHOTOS}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus className="h-8 w-8 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">
          {photos.length >= MAX_PHOTOS ? 'Límite de fotos alcanzado' : 'Seleccionar fotos del vehículo'}
        </span>
        <span className="text-xs text-slate-500">Toca para elegir desde tu dispositivo</span>
      </button>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={photo.preview}
                alt="Vista previa del vehículo"
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(photo.id)}
                className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white transition hover:bg-red-600 disabled:opacity-50"
                aria-label="Quitar foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RegisterClientModal({ open, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (open) {
      setForm({ ...FORM_INICIAL });
      setPhotos([]);
      return undefined;
    }

    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    return undefined;
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddPhoto = (photo) => {
    setPhotos((prev) => [...prev, photo]);
  };

  const handleRemovePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      costoTotalPactado: Number(form.costoTotalPactado),
      photoFiles: photos.map((p) => p.file),
    });
  };

  return (
    <ModalShell title="Registrar Cliente" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertError message={error} />}

        <Field label="Nombre *" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange} required />
        <Field label="Teléfono *" name="telefono" type="tel" value={form.telefono} onChange={handleChange} required />
        <Field label="Vehículo" name="vehiculo" value={form.vehiculo} onChange={handleChange} placeholder="Toyota Corolla 2022" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="VIN *" name="vin" value={form.vin} onChange={handleChange} required />
          <Field label="Lote *" name="lote" value={form.lote} onChange={handleChange} required />
        </div>

        <VehiclePhotoUpload
          photos={photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
          disabled={submitting}
        />

        <Field label="Costo total pactado (USD) *" name="costoTotalPactado" type="number" min="0" step="0.01" value={form.costoTotalPactado} onChange={handleChange} required />

        <div>
          <label htmlFor="estadoAuto" className="mb-1.5 block text-sm font-medium text-foreground">
            Estado del auto *
          </label>
          <select id="estadoAuto" name="estadoAuto" value={form.estadoAuto} onChange={handleChange} className="app-input !mt-0 w-full">
            {ESTADOS_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Registrar cliente" />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder, min, step }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={step}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="app-input !mt-0 w-full"
      />
    </div>
  );
}

function AlertError({ message }) {
  return <div role="alert" className="app-alert">{message}</div>;
}

function ModalActions({ onClose, submitting, submitLabel }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="app-btn-secondary min-h-11">
        Cancelar
      </button>
      <button type="submit" disabled={submitting} className="app-btn-block sm:w-auto sm:min-w-[160px]">
        {submitting ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
