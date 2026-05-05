import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { UserCheck, Clock, UserX } from 'lucide-react';
import { io } from 'socket.io-client';

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

  useEffect(() => {
    fetchGuests();

    const socket = io(); // Connects to same port
    
    socket.on('guest:checked-in', (newGuest: Guest) => {
      setGuests((prev) => [newGuest, ...prev]);
    });

    socket.on('guest:checked-out', (updatedGuest: Guest) => {
      setGuests((prev) => prev.filter(g => g.id !== updatedGuest.id));
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
                      <button
                        onClick={() => handleCheckout(guest.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Check-out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
