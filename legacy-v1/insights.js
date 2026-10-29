import {low,incoming} from './model.js';
export const dayKey=value=>new Date(value).toLocaleDateString('sv-SE');
export function reminders(state,now=new Date()){
 const day=dayKey(now),soon=new Date(now);soon.setDate(soon.getDate()+3);const limit=dayKey(soon),items=[];
 for(const p of state.products)if(low(p)&&!incoming(state,p.id))items.push({id:'stock-'+p.id,title:p.stock?'Пора пополнить запас':'Товар закончился',text:p.name,detail:`Осталось ${p.stock} из ${p.basis} шт.`,action:'order:'+p.id,label:'Заказать',icon:'box',tone:p.stock?'warn':'zero'});
 for(const p of state.purchases)if(p.status==='ordered'&&p.eta<=limit)items.push({id:'delivery-'+p.id,title:p.eta<day?'Поставка задерживается':p.eta===day?'Поставка ожидается сегодня':'Скоро поступление',text:state.products.find(x=>x.id===p.productId)?.name||'Товар',detail:`${p.supplier} · ${p.qty} шт. · ${new Date(p.eta+'T12:00').toLocaleDateString('ru-RU')}`,action:'receive:'+p.id,label:'Принять',icon:'truck',tone:p.eta<day?'zero':'transit'});
 for(const c of state.clients){const sales=state.sales.filter(s=>s.clientId===c.id&&!s.returned&&s.total>s.paid);if(sales.length)items.push({id:'debt-'+c.id,title:'Ожидается оплата',text:c.name,amount:sales.reduce((a,s)=>a+s.total-s.paid,0),detail:'Открытая задолженность. Срок оплаты не задан.',action:'pay:'+sales[0].id,label:'Записать оплату',icon:'wallet',tone:'warn'})}
 for(const task of state.tasks||[])if(!task.done&&new Date(task.due)<=now)items.push({id:'task-'+task.id,title:'Ваше напоминание',text:task.title,detail:new Date(task.due).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),action:'done:'+task.id,label:'Выполнено',icon:'bell',tone:'warn'});
 return items;
}
export function analytics(state,{from='',to='',now=new Date()}={}){
 const sales=state.sales.filter(s=>!s.returned&&(!from||dayKey(s.date)>=from)&&(!to||dayKey(s.date)<=to));
 const revenue=sales.reduce((a,s)=>a+s.total,0),cost=sales.reduce((a,s)=>a+s.cost,0);
 const ranked=state.products.map(p=>{const rows=sales.filter(s=>s.productId===p.id);return{id:p.id,name:p.name,qty:rows.reduce((a,s)=>a+s.qty,0),revenue:rows.reduce((a,s)=>a+s.total,0),profit:rows.reduce((a,s)=>a+s.total-s.cost,0)}}).filter(p=>p.qty).sort((a,b)=>b.revenue-a.revenue).slice(0,5);
 const channels=['Магазин','Сайт','WhatsApp'].map(name=>({name,total:sales.filter(s=>s.channel===name).reduce((a,s)=>a+s.total,0)}));
 let end=to?new Date(to+'T12:00'):new Date(now);if(from&&!to&&dayKey(end)<from)end=new Date(from+'T12:00');const start=new Date(end);start.setDate(start.getDate()-13);const trend=[];
 for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const key=dayKey(d);if(from&&key<from)continue;trend.push({day:key,total:sales.filter(s=>dayKey(s.date)===key).reduce((a,s)=>a+s.total,0)})}
 return{revenue,cost,average:sales.length?Math.round(revenue/sales.length):0,margin:revenue?(revenue-cost)/revenue*100:null,ranked,channels,trend,count:sales.length};
}
