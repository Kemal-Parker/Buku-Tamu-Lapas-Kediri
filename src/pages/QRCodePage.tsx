import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, MonitorPlay } from 'lucide-react';

export default function QRCodePage() {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validUntil, setValidUntil] = useState<string>('');
  
  const qrRef = useRef<SVGSVGElement>(null);

  const baseUrl = window.location.origin;
  const qrUrl = token ? `${baseUrl}/checkin?token=${token}` : '';

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ validHours: 24 })
      });
      const data = await res.json();
      setToken(data.token);
      setValidUntil(data.expiredAt);
    } catch (err) {
      alert('Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    
    // Simple SVG download logic
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_BukuTamu_${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDisplay = () => {
    window.open(`/checkin?token=${token}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Check-in</h1>
        <p className="text-sm text-gray-500 mt-1">Generate QR Code untuk dipindai oleh tamu di pintu masuk.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        {!token ? (
          <div className="py-12 flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Belum ada QR Code aktif</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto mb-8">
              Generate QR code baru. URL QR ini dapat discan menggunakan kamera HP tamu untuk otomatis diarahkan ke form pengisian.
            </p>
            <button
              onClick={generateToken}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-70"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Generate QR Baru
            </button>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center">
            <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl inline-block mb-6">
              <QRCodeSVG
                value={qrUrl}
                size={256}
                level="H"
                includeMargin={true}
                ref={qrRef}
              />
            </div>
            
            <p className="text-sm text-gray-500 font-mono bg-gray-50 px-3 py-1.5 rounded-md mb-6 break-all max-w-md">
              {qrUrl}
            </p>
            
            <p className="text-sm font-medium text-green-600 mb-8">
              Aktif s.d: {new Date(validUntil).toLocaleString('id-ID')}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                <Download className="w-4 h-4" />
                Download SVG
              </button>
              <button
                onClick={openDisplay}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition"
              >
                <MonitorPlay className="w-4 h-4" />
                Buka Layar Penuh
              </button>
              <button
                onClick={generateToken}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-blue-600 font-medium hover:bg-blue-50 transition rounded-lg"
              >
                Generate Ulang
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
