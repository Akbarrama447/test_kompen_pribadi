"use client";

import { useState, useEffect } from "react";

interface KompenData {
  id: number;
  nim: string | null;
  semesterId: number | null;
  importId: number | null;
  totalJamWajib: number | null;
  createdAt: string | null;
  mahasiswa: {
    nim: string;
    nama: string | null;
    kelas: {
      namaKelas: string | null;
    } | null;
  } | null;
  semester: {
    nama: string | null;
    tahun: number | null;
    periode: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Home() {
  const [data, setData] = useState<KompenData[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchKelasList = async () => {
    try {
      const res = await fetch("/api/kompen?action=kelas-list");
      const json = await res.json();
      setKelasList(json.kelas || []);
    } catch (error) {
      console.error("Error fetching kelas:", error);
    }
  };

  const fetchData = async (page = 1, searchTerm = "", kelas = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        kelas: kelas,
      });

      const res = await fetch(`/api/kompen?${params}`);
      const json = await res.json();

      setData(json.data);
      setPagination(json.pagination);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKelasList();
    fetchData(1, search, selectedKelas);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1, search, selectedKelas);
  };

  const handleKelasChange = (kelas: string) => {
    setSelectedKelas(kelas);
    fetchData(1, search, kelas);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal upload");
      }

      setMessage({ type: "success", text: json.message });
      fetchData(1, search);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleClearData = async () => {
    if (!confirm("Yakin mau hapus semua data kompen?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/kompen", { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal hapus data");
      }

      setMessage({ type: "success", text: json.message });
      fetchData(1, search);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Import Kompen Mahasiswa
          </h1>
          <p className="text-gray-600 mt-2">
            Upload file Excel kompen dan lihat data jam wajib mahasiswa
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload File Excel
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <span className="block text-sm text-gray-600 mb-2">
                Pilih file Excel (.xlsx, .xls) — Format: Semester, Kelas, NO,
                KELAS, NIM, NAMA, JAM
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50 cursor-pointer"
              />
            </label>
          </div>
          {uploading && (
            <p className="mt-4 text-blue-600">⏳ Sedang mengupload...</p>
          )}
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`rounded-lg p-4 mb-6 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Search & Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Data Kompen Mahasiswa
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Hapus Semua Data
              </button>
              <form onSubmit={handleSearch} className="flex gap-2">
                {/* Filter Kelas */}
                <select
                  value={selectedKelas}
                  onChange={(e) => handleKelasChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k} value={k} className="text-black">
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari NIM atau Nama..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Cari
                </button>
              </form>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        NO
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        KELAS
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        NIM
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        NAMA
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        SEMESTER
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        TOTAL JAM WAJIB
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Belum ada data. Upload file Excel terlebih dahulu.
                        </td>
                      </tr>
                    ) : (
                      data.map((item, index) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-sm text-black">
                            {index + 1 + (pagination.page - 1) * pagination.limit}
                          </td>
                          <td className="px-4 py-3 text-sm text-black">
                            {item.mahasiswa?.kelas?.namaKelas || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-black">
                            {item.mahasiswa?.nim || item.nim || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-black">
                            {item.mahasiswa?.nama || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-black">
                            {item.semester?.nama || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-black">
                            {item.totalJamWajib ?? 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Menampilkan {pagination.total} data
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchData(pagination.page - 1, search, selectedKelas)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>

                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    )
                      .filter((page) => {
                        const current = pagination.page;
                        return (
                          page === 1 ||
                          page === pagination.totalPages ||
                          (page >= current - 1 && page <= current + 1)
                        );
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => fetchData(page, search, selectedKelas)}
                            className={`w-10 h-10 rounded-lg transition ${
                              pagination.page === page
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      ))}

                    <button
                      onClick={() => fetchData(pagination.page + 1, search, selectedKelas)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
