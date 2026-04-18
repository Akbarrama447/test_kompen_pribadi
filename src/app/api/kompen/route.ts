import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Kalau ada params action=kelas-list, return list kelas
    if (searchParams.get("action") === "kelas-list") {
      const kelasList = await prisma.kelas.findMany({
        where: {
          mahasiswa: {
            some: {
              kompenAwal: { some: {} },
            },
          },
        },
        orderBy: { namaKelas: "asc" },
        select: { namaKelas: true },
        distinct: ["namaKelas"],
      });

      return NextResponse.json({
        kelas: kelasList.map((k) => k.namaKelas).filter(Boolean),
      });
    }

    // Kalau nggak, return data kompen
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const kelasFilter = searchParams.get("kelas") || "";

    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by kelas
    if (kelasFilter) {
      where.mahasiswa = {
        ...where.mahasiswa,
        kelas: { namaKelas: kelasFilter },
      };
    }

    // Filter by search
    if (search) {
      const searchFilter = {
        OR: [
          { mahasiswa: { nim: { contains: search } } },
          { mahasiswa: { nama: { contains: search } } },
        ],
      };

      if (kelasFilter) {
        where.AND = [where, searchFilter];
      } else {
        Object.assign(where, searchFilter);
      }
    }

    const [data, total] = await Promise.all([
      prisma.kompenAwal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "asc" },
        include: {
          mahasiswa: {
            include: {
              kelas: true,
            },
          },
          semester: true,
        },
      }),
      prisma.kompenAwal.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.kompenAwal.deleteMany();
    return NextResponse.json({ message: "Semua data kompen berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting data:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data" },
      { status: 500 }
    );
  }
}
