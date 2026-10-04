import { Hono } from 'hono'
import { ApiError, currentOrganizationId } from '../catalog/common'
import type { Bindings } from '../types'

export const dashboardRoutes = new Hono<{ Bindings: Bindings }>()
dashboardRoutes.get('/summary', async c => {
  const org=await currentOrganizationId(c.env),days=Number(new URL(c.req.url).searchParams.get('days')||7)
  if(![7,30,90].includes(days))throw new ApiError('INVALID_PERIOD','Допустимо 7, 30 или 90 дней')
  const from=Date.now()-days*86400000
  const row=await c.env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM sales WHERE organization_id=? AND status='POSTED' AND posted_at>=?) salesCount,
    (SELECT COALESCE(SUM(total_minor),0) FROM sales WHERE organization_id=? AND status='POSTED' AND posted_at>=?) salesAmountMinor,
    (SELECT COALESCE(SUM(gross_profit_minor),0) FROM sales WHERE organization_id=? AND status='POSTED' AND posted_at>=?) saleProfitMinor,
    (SELECT COALESCE(SUM(total_minor),0) FROM sale_returns WHERE organization_id=? AND status='POSTED' AND posted_at>=?) returnsAmountMinor,
    (SELECT COALESCE(SUM(gross_profit_minor),0) FROM sale_returns WHERE organization_id=? AND status='POSTED' AND posted_at>=?) returnsProfitMinor`).bind(org,from,org,from,org,from,org,from,org,from).first<{salesCount:number;salesAmountMinor:number;saleProfitMinor:number;returnsAmountMinor:number;returnsProfitMinor:number}>()
  return c.json({days,salesCount:row?.salesCount??0,netRevenueMinor:(row?.salesAmountMinor??0)-(row?.returnsAmountMinor??0),grossProfitMinor:(row?.saleProfitMinor??0)-(row?.returnsProfitMinor??0),returnsAmountMinor:row?.returnsAmountMinor??0})
})
dashboardRoutes.get('/chart', async c => {
  const org=await currentOrganizationId(c.env),days=Number(new URL(c.req.url).searchParams.get('days')||7)
  if(![7,30,90].includes(days))throw new ApiError('INVALID_PERIOD','Допустимо 7, 30 или 90 дней')
  const start=new Date();start.setUTCHours(0,0,0,0);start.setUTCDate(start.getUTCDate()-days+1)
  const rows=await c.env.DB.prepare(`SELECT day,SUM(revenue) revenueMinor,SUM(profit) grossProfitMinor FROM (
    SELECT date(posted_at/1000,'unixepoch') day,total_minor revenue,gross_profit_minor profit FROM sales WHERE organization_id=? AND status='POSTED' AND posted_at>=?
    UNION ALL SELECT date(posted_at/1000,'unixepoch') day,-total_minor revenue,-gross_profit_minor profit FROM sale_returns WHERE organization_id=? AND status='POSTED' AND posted_at>=?
  ) GROUP BY day ORDER BY day`).bind(org,start.getTime(),org,start.getTime()).all<{day:string;revenueMinor:number;grossProfitMinor:number}>()
  const values=new Map(rows.results.map(row=>[row.day,row]))
  return c.json({days,points:Array.from({length:days},(_,i)=>{const day=new Date(start.getTime()+i*86400000).toISOString().slice(0,10),value=values.get(day);return {day,revenueMinor:value?.revenueMinor??0,grossProfitMinor:value?.grossProfitMinor??0}})})
})
