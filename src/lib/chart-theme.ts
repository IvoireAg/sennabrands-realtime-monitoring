/**
 * Paleta Ivoire aplicada a charts (Recharts, visx).
 * Regra-mãe: amarelo + preto + neutros. Sem vermelho/azul/verde.
 */
export const ivoireChartTheme = {
  background: 'transparent',
  foreground: '#FAF8F2',
  muted: '#999999',
  grid: '#3E3E3E',
  series: [
    '#FFFF02', // data-1 amarelo (principal)
    '#999999', // data-2 cinza claro (segunda série)
    '#D9CC00', // data-3 amarelo profundo
    '#6E6E6E', // data-4
    '#A8A8A8', // data-5
    '#3A3A3A', // data-6
  ],
  positive: '#2E7D4F',
  negative: '#FAF8F2', // sem vermelho — destaque por ícone, não por cor
}

export const rechartsAxis = {
  stroke: '#999999',
  tick: { fill: '#999999', fontSize: 12, fontFamily: 'var(--ivo-font-title)' },
}

export const rechartsTooltipStyle = {
  background: '#1C1C1C',
  border: '1px solid #3E3E3E',
  borderRadius: 2,
  fontFamily: 'var(--ivo-font-title)',
  fontSize: 13,
  color: '#FAF8F2',
}
