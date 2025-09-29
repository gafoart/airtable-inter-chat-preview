import React, {useMemo} from 'react';
import {render} from 'react-dom';
import {
  initializeBlock,
  TablePickerSynced,
  FieldPickerSynced,
  useBase,
  useGlobalConfig,
  useRecords,
  Box,
  Text,
} from '@airtable/blocks/ui';

/* ---------- Styles (from your HTML) ---------- */
const Styles = () => (
  <style>{`
  :root{
    --bg:#0e1621; --panel:#0b111a; --text:#e6e9ee; --muted:#7e8796;
    --in:#3b82f6; --in-soft:#5aa0ff; --out:#2b3a4a; --out-soft:#3a4c60;
    --radius:22px; --radius-lg:28px; --maxw:760px;
  }
  html,body,#container{height:100%} body{margin:0;background:radial-gradient(1200px 900px at 10% -10%, #182230 0%, var(--bg) 60%);color:var(--text)}
  .app{height:100%;display:grid;grid-template-columns:1fr 360px;gap:24px;max-width:1400px;margin:0 auto;padding:0 16px;}
  @media (max-width:980px){.app{grid-template-columns:1fr}.aside{order:-1}}
  .chat-shell{height:100%;display:flex;flex-direction:column}
  header{position:sticky;top:0;background:linear-gradient(180deg,rgba(14,22,33,.9),rgba(14,22,33,.6));backdrop-filter:blur(6px);border-bottom:1px solid rgba(255,255,255,.06);padding:14px 16px}
  header h1{margin:0;font-size:16px;font-weight:600;color:#cdd6e1}
  header p{margin:2px 0 0;color:var(--muted);font-size:12px}
  .scroll{flex:1;overflow:auto;padding:24px 12px 32px;display:flex;justify-content:center}
  .stream{width:100%;max-width:var(--maxw);display:flex;flex-direction:column;gap:14px}
  .day{align-self:center;color:#a7b0bf;font-size:12px;letter-spacing:.02em;background:#121b27;border:1px solid rgba(255,255,255,.06);padding:6px 10px;border-radius:999px;margin:8px 0 2px}
  .row{display:flex;align-items:flex-end;gap:8px}.row.left{justify-content:flex-start}.row.right{justify-content:flex-end}
  .bubble{position:relative;max-width:min(75ch,72%);padding:14px 16px;line-height:1.45;color:#eaf2ff;hyphens:auto;overflow-wrap:anywhere;word-break:break-word;border:1px solid transparent}
  .left .bubble{background:linear-gradient(180deg,var(--out) 0%,var(--out-soft) 100%);border-radius:var(--radius-lg) var(--radius-lg) var(--radius-lg) 14px;border-color:rgba(255,255,255,.06);color:#dde6f2}
  .right .bubble{background:linear-gradient(180deg,var(--in) 0%,var(--in-soft) 100%);border-radius:var(--radius-lg) var(--radius-lg) 14px var(--radius-lg);color:#f6f9ff;box-shadow:0 8px 24px rgba(59,130,246,.25)}
  .meta{color:var(--muted);font-size:12px;margin-top:6px;width:100%}.meta.left{text-align:left;padding-left:8px}.meta.right{text-align:right;padding-right:8px}
  .meta .check{display:inline-block;vertical-align:-2px;margin-left:6px}.check svg{width:16px;height:16px;stroke:#8fb3ff}
  @media (max-width:640px){.bubble{max-width:85%}.scroll{padding:18px 8px 26px}}
  .aside{display:flex;flex-direction:column;padding:12px 12px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;height:fit-content;align-self:start}
  .aside h2{font-size:14px;letter-spacing:.02em;font-weight:700;margin:4px 0 2px;color:#cfd6e3}
  .aside .sub{margin:0 0 10px;color:#8b94a3;font-size:12px}
  .sched-list{display:flex;flex-direction:column;gap:12px}
  .sched-item{padding:12px 12px 10px;background:rgba(12,18,27,.7);border:1px solid rgba(255,255,255,.06);border-radius:12px}
  .sched-title{font-size:14px;font-weight:650;color:#dfe7f4;margin:0 0 6px;line-height:1.3}
  .sched-time{color:#aeb8c8;font-size:12px;margin-bottom:8px}
  .pills{display:flex;flex-wrap:wrap;gap:8px}
  .pill{padding:4px 8px;font-size:11px;border-radius:999px;color:#eaf2ff;background:rgba(59,130,246,.25);border:1px solid rgba(59,130,246,.35);white-space:nowrap}
  .pill.gray{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#d2dae6}
`}</style>
);

/* ---------- Helpers ---------- */
const isRight = (u) => (u || '').toLowerCase() === 'cesar';
const fmtDT = (iso) =>
  new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));
const dayKey = (iso) => { const d=new Date(iso); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const dayLabel = (iso) =>
  new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(iso));
const fmtDateOnly = (iso) =>
  new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(iso));

/* ---------- Config keys ---------- */
const K = {
  chatTable:'chatTable', userField:'userField', timeField:'timeField', contentField:'contentField',
  schedTable:'schedTable', schedName:'schedName', schedDate:'schedDate', schedTime:'schedTime',
  schedChannel:'schedChannel', schedCategory:'schedCategory', schedSubcat:'schedSubcat',
};

/* ---------- Settings UI ---------- */
function Settings() {
  const base = useBase();
  const gc = useGlobalConfig();
  const chatTbl = base.getTableByIdIfExists(gc.get(K.chatTable));
  const schedTbl = base.getTableByIdIfExists(gc.get(K.schedTable));

  return (
    <Box padding={3} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12}}>
      <Text size="xlarge" textColor="light">⚙️ Configuración</Text>

      <Box marginTop={2}>
        <Text textColor="light">Tabla: Chat</Text>
        <TablePickerSynced globalConfigKey={K.chatTable}/>
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2} marginTop={2}>
          <FieldPickerSynced table={chatTbl} globalConfigKey={K.userField} placeholder="User"/>
          <FieldPickerSynced table={chatTbl} globalConfigKey={K.timeField} placeholder="Time"/>
          <FieldPickerSynced table={chatTbl} globalConfigKey={K.contentField} placeholder="Content"/>
        </Box>
      </Box>

      <Box marginTop={3}>
        <Text textColor="light">Tabla: Schedule</Text>
        <TablePickerSynced globalConfigKey={K.schedTable}/>
        <Box display="grid" gridTemplateColumns="repeat(6,1fr)" gap={2} marginTop={2}>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedName} placeholder="Name"/>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedDate} placeholder="Date"/>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedTime} placeholder="Time"/>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedChannel} placeholder="Channel"/>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedCategory} placeholder="Category"/>
          <FieldPickerSynced table={schedTbl} globalConfigKey={K.schedSubcat} placeholder="Subcategory"/>
        </Box>
      </Box>
    </Box>
  );
}

/* ---------- Main UI ---------- */
function ChatView() {
  const base = useBase();
  const gc = useGlobalConfig();

  const chatTable = base.getTableByIdIfExists(gc.get(K.chatTable));
  const schedTable = base.getTableByIdIfExists(gc.get(K.schedTable));

  const fU = chatTable?.getFieldByIdIfExists(gc.get(K.userField));
  const fT = chatTable?.getFieldByIdIfExists(gc.get(K.timeField));
  const fC = chatTable?.getFieldByIdIfExists(gc.get(K.contentField));

  const fSN = schedTable?.getFieldByIdIfExists(gc.get(K.schedName));
  const fSD = schedTable?.getFieldByIdIfExists(gc.get(K.schedDate));
  const fST = schedTable?.getFieldByIdIfExists(gc.get(K.schedTime));
  const fSCH = schedTable?.getFieldByIdIfExists(gc.get(K.schedChannel));
  const fSC = schedTable?.getFieldByIdIfExists(gc.get(K.schedCategory));
  const fSS = schedTable?.getFieldByIdIfExists(gc.get(K.schedSubcat));

  const chatRecs = useRecords(chatTable ?? null);
  const schedRecs = useRecords(schedTable ?? null);

  // Data from Airtable or sample fallback
  const chat = useMemo(()=>{
    if(chatRecs && fU && fT && fC){
      return chatRecs.map(r=>({
        user:r.getCellValueAsString(fU),
        time:r.getCellValue(fT),
        content:r.getCellValueAsString(fC),
      })).sort((a,b)=> new Date(a.time)-new Date(b.time)); // old -> new
    }
    // Fallback sample
    return [
      {user:'BOT', time:'2025-09-25T18:34:39.052Z', content:'Epale César, revisé la guía...'},
      {user:'Cesar', time:'2025-09-29T13:26:06.890Z', content:'Hola que me recomiendas para ver este mes'},
    ];
  },[chatRecs,fU,fT,fC]);

  const schedule = useMemo(()=>{
    if(schedRecs && fSN){
      return schedRecs.map(r=>({
        Name:r.getCellValueAsString(fSN),
        Date:fSD? r.getCellValue(fSD):null,
        Time:fST? r.getCellValueAsString(fST):'',
        Channel:fSCH? r.getCellValueAsString(fSCH):'',
        Category:fSC? r.getCellValueAsString(fSC):'',
        Subcategory:fSS? r.getCellValueAsString(fSS):'',
      }));
    }
    // Fallback sample
    return [
      {Name:'BRASIL VS CHINA', Date:'2025-10-14', Time:'1:00 P.M', Channel:'DSPORT', Category:'VOLLEYBALL', Subcategory:"VOLLEYBALL MEN'S WORLD CHAMPIONSHIP 2025"},
      {Name:'ISRAEL VS ITALIA', Date:'2025-10-08', Time:'2:30 P.M', Channel:'ESPN', Category:'FUTBOL', Subcategory:'EUROPEAN QUALIFIERS'},
    ];
  },[schedRecs,fSN,fSD,fST,fSCH,fSC,fSS]);

  return (
    <>
      <Styles/>
      <div className="app">
        <div className="chat-shell">
          <header>
            <h1>Inter • Chat Preview</h1>
            <p>Demo rendering of your Airtable data</p>
          </header>
          <div className="scroll">
            <div className="stream" role="log" aria-live="polite">
              {chat.map((msg, i, arr)=>{
                const prev = arr[i-1];
                const showDay = !prev || dayKey(prev.time) !== dayKey(msg.time);
                const side = isRight(msg.user) ? 'right' : 'left';
                return (
                  <React.Fragment key={i}>
                    {showDay && <div className="day">{dayLabel(msg.time)}</div>}
                    <div className={`row ${side}`}><div className="bubble">{msg.content}</div></div>
                    <div className={`meta ${side}`}>
                      {fmtDT(msg.time)}
                      <span className="check" title="Delivered" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                          <path d="M3 13l4 4L17 7" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="aside">
          <h2>Agendados para notificar</h2>
          <p className="sub">Lista de shows que el usuario ha pedido ser notificado</p>
          <div className="sched-list">
            {schedule.map((ev, i)=>(
              <div className="sched-item" key={i}>
                <div className="sched-title">{ev.Name || 'Evento'}</div>
                <div className="sched-time">
                  {(ev.Date ? fmtDateOnly(ev.Date) : 'Fecha por definir')}{ev.Time ? ` · ${ev.Time}` : ''}
                </div>
                <div className="pills">
                  {ev.Channel ? <span className="pill">{ev.Channel}</span> : null}
                  {ev.Category ? <span className="pill">{ev.Category}</span> : null}
                  {ev.Subcategory ? <span className="pill gray">{ev.Subcategory}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function App(){
  const gc = useGlobalConfig();
  const required = [K.chatTable,K.userField,K.timeField,K.contentField,K.schedTable,K.schedName];
  const configured = required.every(k => !!gc.get(k));
  return (
    <Box padding={2}>
      {!configured && <Settings/>}
      {configured && <ChatView/>}
    </Box>
  );
}

initializeBlock(() => render(<App/>, document.getElementById('container')));
