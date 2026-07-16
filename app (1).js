let data=[];
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("en-US");
const pc=t=>["buy","watch","sell"].includes(t)?t:"neutral";

function toast(m){
  $("toast").textContent=m;
  $("toast").style.display="block";
  setTimeout(()=>$("toast").style.display="none",2500);
}

const BASE={SPY:690,QQQ:620,NVDA:188,TSLA:345,AAPL:245,AMD:176,META:719,AMZN:235,MSFT:545,PLTR:165};
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));

function mock(symbol){
  const p=BASE[symbol]||100;
  const c=(Math.random()-.47)*4;
  const rv=.8+Math.random()*2.6;
  const call=Math.floor(10000+Math.random()*90000);
  const put=Math.floor(9000+Math.random()*80000);
  return {symbol,price:+(p*(1+c/100)).toFixed(2),change_pct:+c.toFixed(2),relative_volume:+rv.toFixed(2),call_volume:call,put_volume:put,source:"mock"};
}

function analyze(x){
  const f=x.call_volume/Math.max(1,x.call_volume+x.put_volume);
  const trend=clamp(Math.round(55+x.change_pct*8+(x.relative_volume-1)*10));
  const liq=clamp(Math.round(55+(x.relative_volume-1)*18+Math.abs(x.change_pct)*3));
  const inst=clamp(Math.round(trend*.35+liq*.35+f*100*.30));
  const risk=clamp(Math.round(60-x.relative_volume*10+Math.abs(x.change_pct)*5));
  const q=clamp(Math.round(inst*.55+trend*.25+liq*.20-risk*.20));

  let signal="لا دخول",type="neutral";
  if(q>=85&&trend>=80&&liq>=75){signal="شراء الآن";type="buy"}
  else if(q>=72&&trend>=65){signal="مراقبة شراء";type="watch"}
  else if(trend<=35&&liq>=70){signal="بيع / خروج";type="sell"}

  const atr=x.price*Math.max(.008,Math.abs(x.change_pct)/100*.65);
  return {
    ...x,trend,liquidity:liq,institutional:inst,risk,quality:q,signal,type,
    entry:[+(x.price-atr*.15).toFixed(2),+(x.price+atr*.08).toFixed(2)],
    stop:+(x.price-atr*.75).toFixed(2),
    target1:+(x.price+atr*.95).toFixed(2),
    target2:+(x.price+atr*1.65).toFixed(2),
    call_wall:+(x.price*1.015).toFixed(2),
    put_wall:+(x.price*.985).toFixed(2),
    liquidity_magnet:+(x.price*1.01).toFixed(2),
    reasons:[
      `قوة الاتجاه ${trend}%`,
      `تمركز السيولة ${liq}%`,
      `الحجم النسبي ${x.relative_volume}x`,
      `تفوق Call ${Math.round(f*100)}%`
    ],
    blocks:risk>45?["مستوى المخاطرة مرتفع","انتظر تأكيد حركة السعر"]:["لا يوجد مانع حرج حاليًا"]
  };
}

function localData(){
  const syms=["SPY","QQQ","NVDA","TSLA","AAPL","AMD","META","AMZN","MSFT","PLTR"];
  return syms.map(s=>analyze(mock(s))).sort((a,b)=>b.quality-a.quality);
}

async function load(){
  try{
    let provider="بيانات تجريبية محلية";
    let updatedAt=new Date().toISOString();

    if(location.protocol==="file:"){
      data=localData();
    }else{
      try{
        const r=await fetch("/api/scan");
        const j=await r.json();
        data=j.results||[];
        provider=j.provider==="tradier"?"Tradier مباشر":"بيانات تجريبية";
        updatedAt=j.updated_at||updatedAt;
      }catch{
        data=localData();
        provider="بيانات تجريبية احتياطية";
      }
    }

    $("provider").textContent=provider;
    $("updated").textContent=new Date(updatedAt).toLocaleTimeString("ar-SA");
    $("buyCount").textContent=data.filter(x=>x.type==="buy").length;
    $("watchCount").textContent=data.filter(x=>x.type==="watch").length;
    $("best").textContent=data[0]?`${data[0].symbol} ${data[0].quality}%`:"—";

    $("rows").innerHTML=data.map((x,i)=>`
      <tr data-i="${i}">
        <td><b>${x.symbol}</b><br><small>$${x.price}</small></td>
        <td><span class="pill ${pc(x.type)}">${x.signal}</span></td>
        <td>${x.trend}%</td>
        <td>${x.liquidity}%</td>
        <td>${x.institutional}%</td>
        <td>${x.risk}%</td>
        <td><b>${x.quality}%</b></td>
      </tr>`).join("");

    [...$("rows").querySelectorAll("tr")].forEach(r=>r.onclick=()=>select(data[+r.dataset.i]));
    if(data[0]) select(data[0]);
    toast("تم تحديث البيانات");
  }catch(e){
    console.error(e);
    toast("تعذر تحميل البيانات");
  }
}

function select(x){
  $("decision").textContent=x.signal;
  $("quality").textContent=x.quality;
  $("symbol").textContent=x.symbol;
  $("price").textContent=`$${x.price}`;
  $("change").textContent=`${x.change_pct>=0?"+":""}${x.change_pct}%`;
  $("trend").textContent=`${x.trend}%`;
  $("trendText").textContent=x.trend>=80?"قوي":x.trend>=60?"متوسط":"ضعيف";
  $("trendBar").style.width=`${x.trend}%`;
  $("liquidity").textContent=`${x.liquidity}%`;
  $("putWall").textContent=`$${x.put_wall}`;
  $("magnet").textContent=`$${x.liquidity_magnet}`;
  $("callWall").textContent=`$${x.call_wall}`;
  $("inst").textContent=x.institutional;
  $("risk").textContent=x.risk;
  $("callVol").textContent=fmt(x.call_volume);
  $("putVol").textContent=fmt(x.put_volume);
  $("reasons").innerHTML=x.reasons.map((r,i)=>`<div class="reason">${r}<b>${[96,91,88,84][i]||80}%</b></div>`).join("");
  $("blocks").innerHTML=x.blocks.map(r=>`<div class="block">⚠️ ${r}</div>`).join("");
  $("entry").textContent=`$${x.entry[0]} — $${x.entry[1]}`;
  $("stop").textContent=`$${x.stop}`;
  $("t1").textContent=`$${x.target1}`;
  $("t2").textContent=`$${x.target2}`;
}

$("refresh").onclick=load;
load();
setInterval(load,30000);
