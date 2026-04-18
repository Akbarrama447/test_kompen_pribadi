import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { nim: { contains: search } },
            { nama: { contains: search } },
            { kelas: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.absensiMahasiswa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { no: "asc" },
      }),
      prisma.absensiMahasiswa.count({ where }),
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
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.absensiMahasiswa.deleteMany();
    return NextResponse.json({ message: "Semua data berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting data:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data" },
      { status: 500 }
    );
  }
}
