import {
  AMBITO_BASE_URL,
  AMBITO_ROUTE_BY_HOUSE,
  HOUSE_DISPLAY_NAMES,
  type HouseName,
} from '@bluehouse/shared/constants'

export type HttpMethod = 'GET' | 'POST'

export interface DocField {
  name: string
  type: string
  required?: boolean
  description: string
}

export interface DocParameter extends DocField {
  defaultValue: string
}

export interface EndpointDoc {
  slug: string
  title: string
  group: 'BlueHouse API' | 'Ámbito reference'
  method: HttpMethod
  path: string
  summary: string
  status?: 'live' | 'stub' | 'upstream'
  parameters?: DocParameter[]
  requestFields?: DocField[]
  defaultBody?: string
  responseFields: DocField[]
  responseExample: unknown
  notes?: string[]
  ambitoHouse?: HouseName
}

const rateFields: DocField[] = [
  { name: 'currency', type: '"USD"', description: 'Currency represented by the quote.' },
  { name: 'provider', type: '"dolarapi" | "ambito"', description: 'Source used for this observation.' },
  { name: 'name', type: 'string', description: 'Stable house identifier.' },
  { name: 'buy', type: 'string | null', description: 'Buy quote, returned as an exact PostgreSQL numeric string.' },
  { name: 'sell', type: 'string | null', description: 'Sell quote, returned as an exact PostgreSQL numeric string.' },
  { name: 'createdAt', type: 'ISO 8601 string', description: 'Timestamp reported by the upstream source.' },
]

const collectionFields: DocField[] = [
  { name: 'pollRuns', type: 'PollRun[]', description: 'Recorded live and historical collection runs.' },
  { name: 'rateObservations', type: 'RateObservation[]', description: 'Stored rate observations.' },
  { name: 'queryTime', type: 'number', description: 'Database query duration in milliseconds.' },
]

const collectionExample = {
  pollRuns: [],
  rateObservations: [],
  queryTime: 4,
}

export const apiDocs: EndpointDoc[] = [
  {
    slug: 'api/health',
    title: 'Health check',
    group: 'BlueHouse API',
    method: 'GET',
    path: '/api/health',
    summary: 'Confirms that the web service is available. This check does not query the database.',
    status: 'live',
    responseFields: [
      { name: 'status', type: '"ok"', description: 'Service availability state.' },
      { name: 'timestamp', type: 'ISO 8601 string', description: 'Time at which the response was generated.' },
    ],
    responseExample: { status: 'ok', timestamp: '2026-07-30T15:04:05.000Z' },
  },
  {
    slug: 'api/dashboard',
    title: 'Dashboard data',
    group: 'BlueHouse API',
    method: 'GET',
    path: '/api',
    summary: 'Returns the complete collection data currently used by the public dashboard.',
    status: 'live',
    responseFields: [
      ...collectionFields,
      { name: 'runCounts', type: 'number', description: 'Number of returned collection runs.' },
      { name: 'observationCounts', type: 'number', description: 'Number of returned observations.' },
    ],
    responseExample: { ...collectionExample, runCounts: 0, observationCounts: 0 },
    notes: ['This internal dashboard endpoint is unpaginated. Prefer the versioned API for integrations.'],
  },
  {
    slug: 'api/rates',
    title: 'Current rates',
    group: 'BlueHouse API',
    method: 'GET',
    path: '/api/v1/rates',
    summary: 'Returns the most recently observed quote for every supported house.',
    status: 'live',
    responseFields: [
      { name: 'data', type: 'CurrentRate[]', description: 'Latest quote for each house.' },
      ...rateFields,
      { name: 'queryTime', type: 'number', description: 'Database query duration in milliseconds.' },
    ],
    responseExample: {
      data: [{ currency: 'USD', provider: 'dolarapi', name: 'blue', buy: '1400.0000', sell: '1420.0000', createdAt: '2026-07-30T14:30:00.000Z' }],
      queryTime: 3,
    },
  },
  ...[
    ['api/rate', 'Rate by type', '/api/v1/rates/{type}', 'Returns data for a requested rate type.'],
    ['api/history', 'Rate history', '/api/v1/rates/{type}/history', 'Returns the recorded history for a requested rate type.'],
    ['api/change', 'Rate change', '/api/v1/rates/{type}/change', 'Returns change data for a requested rate type.'],
  ].map(([slug, title, path, summary]) => ({
    slug: slug!,
    title: title!,
    group: 'BlueHouse API' as const,
    method: 'GET' as const,
    path: path!,
    summary: summary!,
    status: 'live' as const,
    parameters: [{ name: 'type', type: 'HouseName', required: true, defaultValue: 'blue', description: 'One of: oficial, blue, bolsa, contadoconliqui, mayorista, cripto, tarjeta.' }],
    responseFields: collectionFields,
    responseExample: collectionExample,
    notes: ['The current handler returns the complete collection and does not yet filter by type. The tester shows that implementation as it exists today.'],
  })),
  {
    slug: 'api/compare',
    title: 'Compare rates',
    group: 'BlueHouse API',
    method: 'GET',
    path: '/api/v1/rates/compare',
    summary: 'Returns the data used to compare rate types.',
    status: 'live',
    responseFields: collectionFields,
    responseExample: collectionExample,
    notes: ['The current handler returns the complete collection. Comparison query parameters are not implemented yet.'],
  },
  {
    slug: 'api/convert',
    title: 'Convert an amount',
    group: 'BlueHouse API',
    method: 'POST',
    path: '/api/v1/convert',
    summary: 'Converts one peso amount using a rate at a requested date and time.',
    status: 'stub',
    requestFields: [
      { name: 'amount', type: 'number', required: true, description: 'Amount in Argentine pesos.' },
      { name: 'currency', type: 'HouseName', required: true, description: 'Rate type used for conversion.' },
      { name: 'side', type: '"buy" | "sell"', required: true, description: 'Quote side used in the calculation.' },
      { name: 'datetime', type: 'ISO 8601 string', required: true, description: 'Point in time used to select the rate.' },
    ],
    defaultBody: JSON.stringify({ amount: 125000, currency: 'blue', side: 'sell', datetime: '2026-07-15T14:32:00-03:00' }, null, 2),
    responseFields: [
      { name: 'status', type: '"stub"', description: 'Indicates that conversion logic is not implemented.' },
      { name: 'endpoint', type: '"convert"', description: 'Handler identifier.' },
      { name: 'body', type: 'unknown', description: 'Request body echoed by the current handler.' },
    ],
    responseExample: { status: 'stub', endpoint: 'convert', body: { amount: 125000, currency: 'blue', side: 'sell', datetime: '2026-07-15T14:32:00-03:00' } },
    notes: ['The request contract shown here is the intended contract. The current endpoint only echoes the submitted body.'],
  },
  {
    slug: 'api/convert-batch',
    title: 'Convert a batch',
    group: 'BlueHouse API',
    method: 'POST',
    path: '/api/v1/convert/batch',
    summary: 'Converts several dated peso amounts with the same rate type and quote side.',
    status: 'stub',
    requestFields: [
      { name: 'currency', type: 'HouseName', required: true, description: 'Rate type used for every item.' },
      { name: 'side', type: '"buy" | "sell"', required: true, description: 'Quote side used for every item.' },
      { name: 'items', type: 'ConversionItem[]', required: true, description: 'Items containing id, amount, and either date or datetime.' },
    ],
    defaultBody: JSON.stringify({ currency: 'blue', side: 'sell', items: [{ id: 'invoice-123', date: '2026-07-15', amount: 125000 }, { id: 'subscription-456', datetime: '2026-07-22T14:32:00-03:00', amount: 39990 }] }, null, 2),
    responseFields: [
      { name: 'status', type: '"stub"', description: 'Indicates that conversion logic is not implemented.' },
      { name: 'endpoint', type: '"convert/batch"', description: 'Handler identifier.' },
      { name: 'body', type: 'unknown', description: 'Request body echoed by the current handler.' },
    ],
    responseExample: { status: 'stub', endpoint: 'convert/batch', body: { currency: 'blue', side: 'sell', items: [] } },
    notes: ['The request contract shown here is the intended contract. The current endpoint only echoes the submitted body.'],
  },
]

const ambitoResponseFields: DocField[] = [
  { name: '[0]', type: 'string[]', description: 'Header row. Usually Fecha plus Compra/Venta or a single Referencia/Venta column.' },
  { name: '[1…n]', type: 'string[]', description: 'Historical rows using DD/MM/YYYY dates and localized decimal strings.' },
]

export const ambitoDocs: EndpointDoc[] = (Object.entries(AMBITO_ROUTE_BY_HOUSE) as [HouseName, string][]).map(([house, route]) => {
  const singleValue = house === 'bolsa' || house === 'contadoconliqui' || house === 'tarjeta'
  return {
    slug: `ambito/${house}`,
    title: `${HOUSE_DISPLAY_NAMES[house]} history`,
    group: 'Ámbito reference',
    method: 'GET',
    path: `${AMBITO_BASE_URL}/${route}/historico-general/{startDate}/{endDate}`,
    summary: `Returns Ámbito's historical ${HOUSE_DISPLAY_NAMES[house].toLocaleLowerCase('es-AR')} series for an inclusive date range.`,
    status: 'upstream',
    parameters: [
      { name: 'startDate', type: 'DD-MM-YYYY', required: true, defaultValue: '01-06-2026', description: 'Inclusive first date in Ámbito’s URL format.' },
      { name: 'endDate', type: 'DD-MM-YYYY', required: true, defaultValue: '12-06-2026', description: 'Inclusive last date in Ámbito’s URL format.' },
    ],
    responseFields: ambitoResponseFields,
    responseExample: singleValue
      ? [['Fecha', house === 'tarjeta' ? 'Venta' : 'Referencia'], ['12/06/2026', '1.452,55']]
      : [['Fecha', 'Compra', 'Venta'], ['12/06/2026', '1.401,62', '1.452,55']],
    notes: [
      'This is an undocumented third-party endpoint and may change without notice.',
      ...(house === 'bolsa' || house === 'contadoconliqui' ? ['Ámbito expects the date segments in end/start order for this house. The tester handles that reversal.'] : []),
      'Dates in the response use Buenos Aires calendar days. BlueHouse normalizes them to ISO timestamps before storage.',
    ],
    ambitoHouse: house,
  }
})

export const endpointDocs = [...apiDocs, ...ambitoDocs]

export function getEndpointDoc(slug: string): EndpointDoc | undefined {
  return endpointDocs.find(doc => doc.slug === slug)
}
