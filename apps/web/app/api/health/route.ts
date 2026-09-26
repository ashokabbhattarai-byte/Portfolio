export async function GET() {
  return Response.json(
    {
      status: 'ok',
      service: 'web',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
