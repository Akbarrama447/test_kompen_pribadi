import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Tidak ada file yang diupload" },
        { status: 400 }
      );
    }

    // Baca file Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Parse multi-blok format
    const kompenData: Array<{
      nim: string;
      nama: string;
      kelas: string;
      semester: string;
      totalJamWajib: number;
    }> = [];

    let currentKelas = "";
    let currentSemester = "";

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Cek metadata rows
      if (row[0] === "Semester:") {
        currentSemester = String(row[1] || "").trim();
        continue;
      }
      if (row[0] === "Kelas:") {
        currentKelas = String(row[1] || "").trim();
        continue;
      }

      // Skip header row dan baris kosong
      if (
        row[0] === "NO" ||
        row[0] === undefined ||
        row[0] === null ||
        row[0] === ""
      ) {
        continue;
      }

      // Cek apakah ini data row (NO harus angka)
      const no = row[0];
      if (isNaN(parseFloat(no))) {
        continue;
      }

      // Ambil data
      const nim = String(row[2] || "").trim();
      const nama = String(row[3] || "").trim();
      const kelas = String(row[1] || currentKelas).trim();
      const jam = parseFloat(row[4]) || 0;

      if (nim && nama) {
        kompenData.push({
          nim,
          nama,
          kelas,
          semester: currentSemester,
          totalJamWajib: jam,
        });
      }
    }

    if (kompenData.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data valid di file Excel" },
        { status: 400 }
      );
    }

    // Buat import_log
    const importLog = await prisma.importLog.create({
      data: {
        namaFile: file.name,
        totalBaris: kompenData.length,
        suksesBaris: 0,
        createdAt: new Date(),
      },
    });

    let suksesCount = 0;
    const errors: Array<{ nim: string; error: string }> = [];

    // Proses setiap row
    for (const item of kompenData) {
      try {
        // Cari atau buat mahasiswa
        let mahasiswa = await prisma.mahasiswa.findUnique({
          where: { nim: item.nim },
        });

        if (!mahasiswa) {
          // Cari atau buat kelas
          let kelasRecord = await prisma.kelas.findFirst({
            where: { namaKelas: item.kelas },
          });

          if (!kelasRecord) {
            // Default: tanpa prodi, nanti bisa diupdate manual
            kelasRecord = await prisma.kelas.create({
              data: { namaKelas: item.kelas },
            });
          }

          mahasiswa = await prisma.mahasiswa.create({
            data: {
              nim: item.nim,
              nama: item.nama,
              kelasId: kelasRecord.id,
            },
          });
        }

        // Cari atau buat semester
        let semesterRecord = await prisma.semester.findFirst({
          where: { nama: item.semester },
        });

        if (!semesterRecord) {
          semesterRecord = await prisma.semester.create({
            data: {
              nama: item.semester,
              tahun: parseInt(item.semester.substring(0, 4)) || 2025,
              periode: item.semester.substring(4) === "1" ? "Ganjil" : "Genap",
            },
          });
        }

        // Simpan kompen_awal
        await prisma.kompenAwal.create({
          data: {
            nim: item.nim,
            semesterId: semesterRecord.id,
            importId: importLog.id,
            totalJamWajib: item.totalJamWajib,
          },
        });

        suksesCount++;
      } catch (err: any) {
        errors.push({ nim: item.nim, error: err.message });
      }
    }

    // Update import_log
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        suksesBaris: suksesCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      },
    });

    return NextResponse.json({
      message: `Berhasil mengimport ${suksesCount} dari ${kompenData.length} data`,
      count: suksesCount,
      total: kompenData.length,
      errors: errors.length,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Gagal mengimport data: " + error.message },
      { status: 500 }
    );
  }
}
