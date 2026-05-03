import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, semester: true } });
    const exams = await prisma.exam.findMany({ take: 1, orderBy: { createdAt: 'desc' }, include: { semester: true } });
    return NextResponse.json({ users, latestExam: exams[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
