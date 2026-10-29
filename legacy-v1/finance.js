export const accounts={cash:'Касса',bank:'Расчётный счёт',unknown:'Счёт не указан'};
export const expenseCategories=['Аренда','Зарплата','Налоги','Реклама','Комиссия банка','Хозяйственные расходы','Прочее'];
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const cents=v=>{const n=Number(v);assert(v!==''&&Number.isFinite(n)&&n>=0&&n<=1e8,'Укажите сумму от 0 до 100 000 000 ₽');return Math.round(n*100)};
export function entry(s,{account='unknown',amount,category,note='',date=new Date().toISOString(),ref='',legacy=false,kind='flow'}){
 assert(Object.hasOwn(accounts,account),'Выберите счёт');assert(Number.isSafeInteger(amount),'Некорректная сумма');
 if(!amount)return;
 s.finance.entries.push({id:crypto.randomUUID(),account,amount,category,note,date,ref,legacy,kind});
}
// Older backups have cumulative paid totals, but no dates/accounts of individual payments.
export function ensureFinance(s){
 if(s.finance)return s.finance;
 s.finance={entries:[],reconciled:{}};
 for(const x of s.sales){entry(s,{amount:x.paid,category:'Оплата продажи',note:x.name,date:x.date,ref:x.id,legacy:true});if(x.returned)entry(s,{amount:-(x.refunded??x.paid),category:'Возврат покупателю',note:x.name,date:x.returnedAt||x.date,ref:x.id,legacy:true})}
 for(const x of s.purchases){entry(s,{amount:-x.qty*x.cost,category:'Закупка товара',note:x.supplier,date:x.date,ref:x.id,legacy:true});if(x.freight)entry(s,{amount:-x.freight,category:'Доставка',note:x.supplier,date:x.receivedAt||x.date,ref:x.id,legacy:true})}
 return s.finance;
}
export function validateFinance(s){
 if(s.finance===undefined)return;
 const f=s.finance;assert(f&&Array.isArray(f.entries)&&f.entries.length<=100000&&f.reconciled&&typeof f.reconciled==='object','Повреждён финансовый учёт');
 const ids=new Set();for(const x of f.entries){assert(x&&typeof x.id==='string'&&!ids.has(x.id)&&Object.hasOwn(accounts,x.account)&&Number.isSafeInteger(x.amount)&&['flow','transfer','adjustment'].includes(x.kind)&&typeof x.legacy==='boolean'&&Number.isFinite(Date.parse(x.date))&&['category','note','ref'].every(k=>typeof x[k]==='string'&&x[k].length<=1000),'Повреждена денежная операция');ids.add(x.id)}
 for(const [k,v]of Object.entries(f.reconciled))assert(['cash','bank'].includes(k)&&Number.isFinite(Date.parse(v)),'Повреждена сверка счёта');
}
export function financials(s,{from='',to='',account=''}={}){
 const f=ensureFinance(structuredClone(s)),balances={cash:0,bank:0,unknown:0};
 for(const x of f.entries)balances[x.account]+=x.amount;
 const rows=f.entries.filter(x=>{const d=new Date(x.date).toLocaleDateString('sv-SE');return (!from||d>=from)&&(!to||d<=to)&&(!account||x.account===account)}).sort((a,b)=>new Date(b.date)-new Date(a.date));
 const flows=rows.filter(x=>x.kind==='flow');
 return {rows,balances,reconciled:f.reconciled,income:flows.filter(x=>x.amount>0).reduce((a,x)=>a+x.amount,0),expense:flows.filter(x=>x.amount<0).reduce((a,x)=>a-x.amount,0),legacy:rows.some(x=>x.legacy)};
}
export function manualMoney(s,f){
 ensureFinance(s);const amount=cents(f.amount);assert(amount>0,'Сумма должна быть больше нуля');assert(['cash','bank'].includes(f.account),'Выберите счёт');assert(['income','expense','transfer'].includes(f.type),'Выберите вид операции');assert(typeof f.note==='string'&&f.note.trim()&&f.note.length<=250,'Укажите назначение (до 250 символов)');assert(/^\d{4}-\d{2}-\d{2}$/.test(f.date)&&Number.isFinite(Date.parse(f.date)),'Укажите дату');
 assert(f.date<=new Date().toLocaleDateString('sv-SE'),'Будущая оплата ещё не произошла: выберите сегодняшнюю или прошлую дату');
 const date=new Date(f.date+'T12:00:00').toISOString(),ref=crypto.randomUUID();
 if(f.type==='transfer'){const target=f.account==='cash'?'bank':'cash';entry(s,{account:f.account,amount:-amount,category:'Перевод между счетами',note:f.note,date,ref,kind:'transfer'});entry(s,{account:target,amount,category:'Перевод между счетами',note:f.note,date,ref,kind:'transfer'});return}
 assert(f.type!=='expense'||expenseCategories.includes(f.category),'Выберите статью расхода');
 entry(s,{account:f.account,amount:f.type==='expense'?-amount:amount,category:f.type==='expense'?f.category:'Прочее поступление',note:f.note,date,ref});
}
export function reconcile(s,f){
 ensureFinance(s);assert(['cash','bank'].includes(f.account),'Выберите счёт');const amount=cents(f.amount),current=s.finance.entries.filter(x=>x.account===f.account).reduce((a,x)=>a+x.amount,0),date=new Date().toISOString();
 entry(s,{account:f.account,amount:amount-current,category:'Сверка остатка',note:'Фактический остаток на момент сверки',kind:'adjustment',date});s.finance.reconciled[f.account]=date;
}
