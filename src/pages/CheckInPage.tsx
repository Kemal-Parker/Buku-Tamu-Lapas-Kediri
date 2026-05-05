import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import Webcam from 'react-webcam';
import { Camera, CheckCircle2, ChevronRight, Search, FileSignature } from 'lucide-react';

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    instansi: '',
    keperluan: '',
    photoUrl: ''
  });

  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    // Validate token on mount
    const checkToken = async () => {
      try {
        const res = await fetch(`/api/qr/validate?token=${token}`);
        const data = await res.json();
        if (data.valid) {
          setIsValid(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setValidating(false);
      }
    };
    
    if (token) {
      checkToken();
    } else {
      setValidating(false);
    }
  }, [token]);

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setFormData(prev => ({ ...prev, photoUrl: imageSrc }));
      }
    }
  }, [webcamRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/guests/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, token })
      });
      if (res.ok) {
        setStep(2); // Success
      } else {
        try {
          const errData = await res.json();
          alert('Gagal check-in: ' + (errData.error || 'Silakan coba lagi.'));
        } catch(e) {
          alert('Gagal check-in. Silakan coba lagi.');
        }
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Memeriksa QR Code...</div>;
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Search className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">QR Code Tidak Valid</h1>
        <p className="text-gray-500 text-center max-w-sm">QR Code yang Anda pindai sudah kadaluarsa atau tidak valid. Silakan hubungi petugas LAPAS.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 text-white p-6 pb-8 rounded-b-3xl shadow-sm">
          <h1 className="text-xl font-bold flex items-center gap-2">
             <FileSignature className="w-6 h-6" /> Form Buku Tamu
          </h1>
          <p className="text-blue-100 text-sm mt-1">LAPAS Kelas 2A Kediri</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 -mt-4">
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                1. Data Diri
              </h2>
              <form 
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap Sesuai KTP</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="Contoh: Budi Santoso" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Induk Kependudukan (NIK)</label>
                  <input required type="number" value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="16 digit NIK" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instansi / Asal</label>
                  <input required type="text" value={formData.instansi} onChange={e => setFormData({ ...formData, instansi: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="Contoh: Keluarga, Dinas Sosial, dll" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Keperluan</label>
                  <textarea required value={formData.keperluan} onChange={e => setFormData({ ...formData, keperluan: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition h-24 resize-none" 
                    placeholder="Jelaskan tujuan kunjungan Anda" />
                </div>
                <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 mt-6 shadow-sm shadow-blue-200 transition disabled:opacity-70">
                  {submitting ? 'Memproses...' : 'Kirim & Check-in'} <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-in Berhasil!</h2>
              <p className="text-gray-500 mb-8 max-w-[260px] mx-auto">
                Silahkan tunjukkan layar ini kepada petugas jaga LAPAS.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 w-full rounded-2xl p-6 text-left mb-8 shadow-sm">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Nama Tamu</div>
                <div className="font-medium text-gray-900 mb-4">{formData.name}</div>
                
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Instansi/Keperluan</div>
                <div className="font-medium text-gray-900 mb-4">{formData.instansi} - {formData.keperluan}</div>
                
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Waktu Check-in</div>
                <div className="font-medium text-gray-900">{new Date().toLocaleString('id-ID')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
