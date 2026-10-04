import process from 'node:process'
import console from 'node:console'
import { performance } from 'node:perf_hooks'
import { TextEncoder } from 'node:util'

const base = process.env.API_URL || 'http://127.0.0.1:8787/api'
const paths = ['/products?pageSize=20', '/inventory?pageSize=20', '/receipts?pageSize=20', '/issues?pageSize=20', '/transfers?pageSize=20', '/writeoffs?pageSize=20', '/stock-movements?pageSize=20', '/sales?pageSize=20', '/sale-returns?pageSize=20', '/customers?pageSize=20', '/dashboard/summary?days=7', '/dashboard/chart?days=30']
for (const path of paths) {
  const samples = []
  let bytes = 0
  for (let i = 0; i < 5; i++) {
    const started = performance.now()
    const response = await globalThis.fetch(base + path)
    const body = await response.text()
    bytes = new TextEncoder().encode(body).length
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
    samples.push(performance.now() - started)
  }
  samples.sort((a, b) => a - b)
  console.log(`${path.padEnd(32)} median ${samples[2].toFixed(1)} ms, max ${samples[4].toFixed(1)} ms, ${bytes} B`)
}
