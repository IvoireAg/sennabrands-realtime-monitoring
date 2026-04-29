import { BetaAnalyticsDataClient } from '@google-analytics/data'

type ClientOptions = ConstructorParameters<typeof BetaAnalyticsDataClient>[0]

function getClientOptions(): ClientOptions {
  // Forçar transporte REST: o gRPC do Node 24 às vezes falha sem mensagem.
  // REST é mais lento (10-20ms a mais por chamada) mas robusto.
  const base: ClientOptions = { fallback: 'rest' }

  // Produção (Vercel): JSON inteiro como string env var
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (json && json.trim().startsWith('{')) {
    try {
      const credentials = JSON.parse(json)
      console.log('[ga4] Using inline JSON credentials (client_email=%s)', credentials.client_email)
      return { ...base, credentials }
    } catch (e) {
      console.error('[ga4] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e)
    }
  }

  // Local dev: caminho do arquivo
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyFilename) {
    console.log('[ga4] Using keyFilename: %s (transport=rest)', keyFilename)
    return { ...base, keyFilename }
  }

  console.warn('[ga4] No credentials configured — falling back to ADC')
  return base
}

let cached: BetaAnalyticsDataClient | null = null

export function ga4(): BetaAnalyticsDataClient {
  if (!cached) {
    cached = new BetaAnalyticsDataClient(getClientOptions())
  }
  return cached
}

export const PROPERTY_PATH = `properties/${process.env.GA4_PROPERTY_ID ?? '343005835'}`
