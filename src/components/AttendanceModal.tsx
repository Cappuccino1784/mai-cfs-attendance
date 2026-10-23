import { useState, useEffect, useRef } from 'react';
import type { Member, Hangout } from '../types';

interface Props {
  date: string;
  hangout: Hangout | null;
  members: Member[];
  error?: string | null;
  onClose: () => void;
  onSave: (
    date: string,
    attendance: { person_name: string; present: boolean }[],
    label?: string,
    photo?: File | null,
    removePhoto?: boolean
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AttendanceModal({ date, hangout, members, error, onClose, onSave, onDelete }: Props) {
  const [label, setLabel] = useState(hangout?.label ?? '');
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);       // newly chosen file
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); // preview URL
  const [removePhoto, setRemovePhoto] = useState(false);               // flag to delete existing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize presence & photo
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    if (hangout) {
      for (const a of hangout.attendance) initial[a.person_name] = a.present === 1;
    }
    for (const m of members) if (!(m.name in initial)) initial[m.name] = false;
    setPresent(initial);
    setLabel(hangout?.label ?? '');
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
  }, [hangout, members]);

  // Clean up object URLs
  useEffect(() => {
    return () => { if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const toggle = (name: string) => setPresent(p => ({ ...p, [name]: !p[name] }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Resolve what photo to display in the preview area
  const displayPhoto = photoPreview ?? (removePhoto ? null : hangout?.photo_url ?? null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const attendance = members.map(m => ({ person_name: m.name, present: present[m.name] ?? false }));
      await onSave(date, attendance, label || undefined, photoFile, removePhoto);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hangout) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await onDelete(hangout.id); }
    finally { setDeleting(false); }
  };

  const attendingCount = Object.values(present).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(249, 168, 212, 0.25)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl shadow-pink-100 w-full max-w-md border border-pink-100 overflow-hidden animate-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-peach-100 px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl mb-1">🌸</div>
              <h3 className="font-bold text-purple-600 text-lg leading-tight">{formatDate(date)}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-purple-300 hover:text-purple-500 text-2xl leading-none transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50"
            >
              ×
            </button>
          </div>

          {/* Label input */}
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Add a note... (e.g. 'Cafe run ☕')"
            className="mt-3 w-full bg-white/70 rounded-xl px-3 py-2 text-sm text-purple-600 placeholder-purple-300 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* ── Photo section ─────────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-purple-400 mb-2">Hangout photo 📷</p>

            {displayPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-pink-200 shadow-md">
                <img
                  src={displayPhoto}
                  alt="Hangout"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {/* Replace button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/80 backdrop-blur-sm text-purple-500 text-xs font-semibold px-2.5 py-1 rounded-full shadow hover:bg-white transition-all"
                  >
                    ✏️ Change
                  </button>
                  {/* Remove button */}
                  <button
                    onClick={handleRemovePhoto}
                    className="bg-white/80 backdrop-blur-sm text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full shadow hover:bg-white transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 hover:bg-pink-100/60 transition-colors flex flex-col items-center justify-center gap-2 text-pink-400"
              >
                <span className="text-3xl">🖼️</span>
                <span className="text-xs font-medium">Click to add a photo</span>
                <span className="text-[10px] text-pink-300">JPG, PNG, WEBP — up to 10 MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* ── Attendance section ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-purple-400">Who came? 🎀</p>
              <span className="text-xs bg-pink-100 text-pink-500 font-bold px-2 py-0.5 rounded-full">
                {attendingCount}/{members.length}
              </span>
            </div>

            {members.length === 0 ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">
                No members loaded. Check the Turso environment variables and reload the page.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
              {members.map(m => (
                <button
                  key={m.name}
                  onClick={() => toggle(m.name)}
                  className={`
                    flex items-center gap-3 rounded-2xl px-4 py-3 transition-all border-2 text-left
                    ${present[m.name]
                      ? 'border-transparent shadow-sm'
                      : 'border-transparent bg-gray-50 opacity-60 hover:opacity-80'
                    }
                  `}
                  style={present[m.name] ? { backgroundColor: m.color + '33', borderColor: m.color + '66' } : {}}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className={`font-medium text-sm flex-1 ${present[m.name] ? 'text-gray-700' : 'text-gray-400'}`}>
                    {m.name}
                  </span>
                  <span className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all
                    ${present[m.name] ? 'bg-green-400 text-white' : 'bg-gray-200 text-gray-400'}
                  `}>
                    {present[m.name] ? '✓' : ''}
                  </span>
                </button>
              ))}
              </div>
            )}
            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 pt-3 flex gap-2 flex-shrink-0 border-t border-pink-50">
          {hangout && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`
                flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${confirmDelete
                  ? 'bg-red-400 text-white'
                  : 'bg-red-50 text-red-400 hover:bg-red-100'
                }
              `}
            >
              {deleting ? '...' : confirmDelete ? '✕ Confirm' : '🗑'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-semibold py-2.5 rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all shadow-md shadow-pink-200 disabled:opacity-60"
          >
            {saving ? '✨ Saving...' : hangout ? '✨ Update' : '✨ Record Hangout'}
          </button>
        </div>
      </div>
    </div>
  );
}
