import React from 'react';
import {createRoot} from 'react-dom/client';
import {buildReport,defaultRates,type LedgerRow} from '../src/domain';
import {AuditView,WidgetView} from '../src/ui/views';
import {styles} from '../src/ui/styles';
const titles=['Build the onboarding flow','Audit the API permissions','Research pricing options','Fix dashboard sorting','Write the launch announcement','Review the import pipeline'];
const rows:LedgerRow[]=Array.from({length:32},(_,i)=>({id:`sample-event-${i}`,runId:`sample-run-${i}`,issueId:`sample-task-${i%6}`,identifier:`DEMO-${104+i%6}`,title:titles[i%6]!,agentId:'sample-agent',agent:i%2?'Engineer':'Researcher',provider:i%3?'openai':'anthropic',model:i%3?'gpt-5.4':'claude-sonnet-4-6',billingType:'subscription',costStatus:'reported',inputTokens:140000+i*38171,cachedInputTokens:90000+i*11023,outputTokens:6000+i*2829,costCents:0,occurredAt:`2026-10-${String(1+i%8).padStart(2,'0')}T10:00:00.000Z`,status:i%7?'succeeded':'failed'}));
const report=buildReport(rows,defaultRates,'2026-10-01','2026-10-08');
function Preview(){return <div className="preview-layout"><section className="tc" id="audit"><style>{styles}</style><header className="head"><div><p className="eyebrow">Token Clip / Usage intelligence</p><h1>Every task has a token cost.</h1><p className="muted">See the usage. Price the work. Compare your setup.</p></div><span className="badge">Illustrative data</span></header><AuditView report={report} taskHref={()=> '#audit'}/></section><div className="preview-widget"><p style={{fontSize:12,color:'#999',marginBottom:12}}>Dashboard card · illustrative data</p><WidgetView report={report} loading={false} href="#audit" onRetry={()=>{}}/></div></div>}
createRoot(document.getElementById('root')!).render(<Preview/>);
