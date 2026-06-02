import { createClient } from '@supabase/supabase-js';

// Dit dwingt Vercel om NOOIT de database-status te cachen
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Ultra-strikte headers om caching in de browser en op Vercel te vernietigen
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (!id) {
    return Response.json({ error: 'Geen ID meegegeven' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // Haal de rij op
    const { data, error } = await supabase
      .from('scans_research')
      .select('*') 
      .eq('id', parseInt(id))
      .maybeSingle();

    if (error) {
      return Response.json({ ready: true, error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json(
        { ready: false, message: 'Record wordt geïnitialiseerd...' },
        { headers: noCacheHeaders }
      );
    }

    // ROBUUSTE CHECK: Is er AL iéts ingevuld door n8n?
    // We kijken of left_pta of right_pta niet meer null (of undefined/leeg) zijn.
    const isN8nKlaar = data.left_pta !== null && data.left_pta !== undefined;

    if (isN8nKlaar) {
      return Response.json({
        ready: true,
        success: true,
        data: data
      }, { headers: noCacheHeaders });
    }

    // Als de rij bestaat, maar n8n heeft de cijfers er nog niet in gepusht
    return Response.json({
      ready: false,
      message: 'Wachten op database update...'
    }, { headers: noCacheHeaders });

  } catch (err: any) {
    return Response.json({ ready: true, error: err.message }, { status: 500 });
  }
}