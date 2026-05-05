import { useEffect, useState } from 'react';
import { format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as xlsx from 'xlsx';
import { UserCheck } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  nik: string;
  instansi: string;
  keperluan: string;
  checkIn: string;
  checkOut: string | null;
  photoUrl?: string | null;
}

export default function HistoryPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all'); // all, 1d, 1w, 1m

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

  const getFilteredGuests = () => {
    const now = new Date();
    return guests.filter(g => {
      // Name/NIK/Instansi filter
      const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || 
        g.nik.includes(search) ||
        g.instansi.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      // Period filter
      if (period === 'all') return true;
      
      const checkInDate = new Date(g.checkIn);
      if (period === '1d') {
        return isAfter(checkInDate, subDays(now, 1));
      } else if (period === '1w') {
        return isAfter(checkInDate, subWeeks(now, 1));
      } else if (period === '1m') {
        return isAfter(checkInDate, subMonths(now, 1));
      }
      return true;
    });
  };

  const filteredGuests = getFilteredGuests();

  const handleExport = () => {
    const exportData = filteredGuests.map(g => ({
      'Nama Tamu': g.name,
      'NIK': g.nik,
      'Instansi': g.instansi,
      'Keperluan': g.keperluan,
      'Waktu Masuk': format(new Date(g.checkIn), 'dd MMM yyyy HH:mm', { locale: idLocale }),
      'Waktu Keluar': g.checkOut ? format(new Date(g.checkOut), 'dd MMM yyyy HH:mm', { locale: idLocale }) : 'Masih aktif',
      'Data Foto (Base64)': g.photoUrl ? 'Ada Foto' : 'Tidak Ada',
      'Base64': g.photoUrl || '' // Includes base64 string in a separate column
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DataTamu');
    xlsx.writeFile(workbook, `Laporan_Tamu_${format(new Date(), 'dd_MMM_yyyy')}.xlsx`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Kunjungan</h1>
        <p className="text-sm text-gray-500 mt-1">Laporan harian dan bulanan tamu LAPAS.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari nama, NIK, atau instansi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full sm:w-40 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Semua Waktu</option>
              <option value="1d">1 Hari Terakhir</option>
              <option value="1w">1 Minggu Terakhir</option>
              <option value="1m">1 Bulan Terakhir</option>
            </select>
          </div>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            Export Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Nama Tamu</th>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Instansi</th>
                <th className="px-6 py-4">Waktu Masuk</th>
                <th className="px-6 py-4">Waktu Keluar</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
