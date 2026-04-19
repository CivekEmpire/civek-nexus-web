import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'civek-nexus-web',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    sprint: 15,
    philosophy: 'CIVEK OS PRIMERO — SIEMPRE'
  });
}
