import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { UserCheck, Clock, UserX, Camera, X } from 'lucide-react';
import { io } from 'socket.io-client';
import Webcam from 'react-webcam';

interface Guest {
  id: string;
  name: string;
  nik: string;
  instansi: string;
  keperluan: string;
  checkIn: string;
  checkOut: string | null;
  photoUrl: string | null;
}

export default function DashboardPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [takingPhotoFor, setTakingPhotoFor] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    fetchGuests();

    const socket = io(); // Connects to same port
    
    socket.on('guest:checked-in', (newGuest: Guest) => {
      setGuests((prev) => {
        // Prevent duplicates
        if (prev.some(g => g.id === newGuest.id)) return prev;
        return [newGuest, ...prev];
      });
    });

    socket.on('guest:checked-out', (updatedGuest: Guest) => {
      setGuests((prev) => prev.filter(g => g.id !== updatedGuest.id));
    });

    socket.on('guest:photo-updated', (updatedGuest: Guest) => {
      setGuests((prev) => prev.map(g => g.id === updatedGuest.id ? { ...g, photoUrl: updatedGuest.photoUrl } : g));
    });

    // Fallback polling every 5 seconds
    const interval = setInterval(() => {
      fetchGuests();
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchGuests = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/guests/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setGuests(data);
      } else {
        console.error('Failed to fetch guests:', data);
        setGuests([]);
      }
    } catch (err) {
      console.error(err);
      setGuests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (guestId: string) => {
    if (!window.confirm('Proses check-out untuk tamu ini?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/guests/${guestId}/checkout`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setGuests(prev => prev.filter(g => g.id !== guestId));
      } else {
        alert('Gagal checkout');
      }
    } catch (err) {
      alert('Gagal checkout');
    }
  };

  const handleCapturePhoto = useCallback(async () => {
    if (!takingPhotoFor || !webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      alert("Gagal mengambil gambar. Pastikan kamera terhubung.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/guests/${takingPhotoFor}/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ photoUrl: imageSrc })
      });
      
      if (res.ok) {
        setTakingPhotoFor(null);
      } else {
        alert('Gagal menyimpan foto');
      }
    } catch(e) {
      alert('Gagal menyimpan foto');
    } finally {
      setUploadingPhoto(false);
    }
  }, [takingPhotoFor, webcamRef]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Real-time</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor tamu yang saat ini berada di dalam area LAPAS.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tamu Aktif</p>
            <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Tamu Aktif</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Nama Tamu</th>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Instansi</th>
                <th className="px-6 py-4">Keperluan</th>
                <th className="px-6 py-4">Waktu Masuk</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada tamu aktif saat ini.
                  </td>
                </tr>
              ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{guest.name}</div>
                      <div className="text-xs text-gray-400">NIK: {guest.nik}</div>
                    </td>
                    <td className="px-6 py-4">
                      {guest.photoUrl ? (
                        <img src={guest.photoUrl} alt="Foto Tamu" className="w-12 h-12 rounded object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                          <UserCheck className="w-6 h-6" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{guest.instansi}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{guest.keperluan}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {format(new Date(guest.checkIn), 'HH:mm (dd MMM yyyy)', { locale: idLocale })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {!guest.photoUrl && (
                          <button
                            onClick={() => setTakingPhotoFor(guest.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-medium transition-colors w-fit"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Ambil Foto
                          </button>
                        )}
                        <button
                          onClick={() => handleCheckout(guest.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors w-fit"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Check-out
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {takingPhotoFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Ambil Foto Pengunjung</h3>
              <button 
                onClick={() => setTakingPhotoFor(null)}
                className="text-gray-400 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-[4/3] relative min-h-[250px]">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setTakingPhotoFor(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCapturePhoto}
                disabled={uploadingPhoto}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-70 flex items-center gap-2"
              >
                {uploadingPhoto ? 'Menyimpan...' : (
                  <>
                    <Camera className="w-4 h-4" />
                    Simpan Foto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
