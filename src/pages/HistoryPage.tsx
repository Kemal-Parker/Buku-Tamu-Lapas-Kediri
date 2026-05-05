import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Guest {
  id: string;
  name: string;
  nik: string;
  instansi: string;
  keperluan: string;
  checkIn: string;
  checkOut: string | null;
}

export default function HistoryPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/guests/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setGuests(data);
      } else {
        console.error('Failed to fetch history:', data);
        setGuests([]);
      }
    } catch (err) {
      console.error(err);
      setGuests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.nik.includes(search) ||
    g.instansi.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Kunjungan</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan harian dan bulanan tamu LAPAS.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Cari nama, NIK, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
            Export Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Nama Tamu</th>
                <th className="px-6 py-4">Instansi</th>
                <th className="px-6 py-4">Waktu Masuk</th>
                <th className="px-6 py-4">Waktu Keluar</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada riwayat ditemukan.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{guest.name}</div>
                      <div className="text-xs text-gray-400">NIK: {guest.nik}</div>
                    </td>
                    <td className="px-6 py-4">{guest.instansi}</td>
                    <td className="px-6 py-4">
                      {format(new Date(guest.checkIn), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                    </td>
                    <td className="px-6 py-4">
                      {guest.checkOut 
                        ? format(new Date(guest.checkOut), 'dd MMM yyyy, HH:mm', { locale: idLocale })
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {guest.checkOut ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Aktif
                        </span>
                      )}
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
