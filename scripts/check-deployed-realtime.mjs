// Read only public deployment assets. Never print public keys or response bodies.
const origin = 'https://mawjood-tracker-fcbm.vercel.app';
const runtime = await fetch(`${origin}/api/intake/public/realtime`);
if (runtime.ok) {
  const config = await runtime.json();
  console.log(JSON.stringify({ runtimeConfigurationReady: Boolean(config.url && config.key) }));
  process.exit(0);
}
const html = await (await fetch(`${origin}/order`)).text();
const scripts = [...new Set([...html.matchAll(/src="([^\"]+\.js(?:\?[^\"]*)?)"/g)].map(match => match[1]))];
const bundles = await Promise.all(scripts.map(async path => (await fetch(new URL(path.replaceAll('&amp;', '&'), origin))).text()));
const code = bundles.join('\n');
console.log(JSON.stringify({ scriptsChecked: scripts.length,
  hasSupabaseProjectUrl: /https:\/\/[a-z0-9-]+\.supabase\.co/.test(code),
  unresolvedPublicEnvironmentReferences: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter(name => code.includes(`.${name}`)),
}, null, 2));
