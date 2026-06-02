import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

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

    // We trekken de VOLLEDIGE rij los uit de database om te zien wat n8n heeft gedaan
    const { data, error } = await supabase
      .from('scans_research')
      .select('*') 
      .eq('id', parseInt(id))
      .maybeSingle();

    if (error) {
      return Response.json({ ready: true, error: error.message }, { status: 500 });
    }

    // Als de rij er niet is
    if (!data) {
      return Response.json({ ready: false, message: 'Record zoeken in database...' }, { headers: noCacheHeaders });
    }

    // --- DIT GAAT JE HET ANTWOORD GEVEN ---
    // Open je terminal/Vercel logs en kijk wat hier geprint wordt!
    console.log("=== LIVE DATABASE CHECK VOOR ID " + id + " ===");
    console.log(data);
    console.log("================================================");

    // CONTROLE: Is er AL iéts ingevuld door n8n?
    // We checken of left_pta, right_pta, óf ai_confidence niet meer leeg zijn.
    const isN8nKlaar = data.left_pta !== null || data.right_pta !== null || data.ai_confidence !== null;

    if (isN8nKlaar) {
      return Response.json({
        ready: true,
        success: true,
        data: data
      }, { headers: noCacheHeaders });
    }

    // Als de rij er is, maar alle AI kolommen zijn nog exact null
    return Response.json({
      ready: false,
      message: 'Wachten op n8n database update...'
    }, { headers: noCacheHeaders });

  } catch (err: any) {
    return Response.json({ ready: true, error: err.message }, { status: 500 });
  }
}