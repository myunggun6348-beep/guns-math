const crypto=require("crypto");
const {준비됨,명령}=require("./_redis");
const {clean,publicItem}=require("./_problem_schema");
const KEY="problem-bank",MAX_ITEMS=500,MAX_BATCH=100;
const fingerprint=item=>[item.surface,item.type,item.track,item.gameKey,String(item.prompt||"").trim().toLowerCase().replace(/\s+/g,"")].join("|");
function passwordMatches(value){const expected=process.env.ADMIN_PASSWORD||"";if(!expected)return false;const a=Buffer.from(String(value||"")),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function body(req){if(typeof req.body==="string")return JSON.parse(req.body||"{}");return req.body||{}}
async function all(){const flat=(await 명령("HGETALL",KEY))||[],items=[];for(let i=0;i<flat.length;i+=2){try{items.push({id:flat[i],...JSON.parse(flat[i+1])})}catch{}}return items.sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))}
module.exports=async(req,res)=>{
  if(req.method==="GET"){
    res.setHeader("Cache-Control","no-store");
    if(!준비됨)return res.status(200).json({items:[],storage:false});
    try{
      const q=req.query||{},surface=String(q.surface||""),grade=String(q.grade||""),track=String(q.track||""),game=String(q.game||"");
      const items=(await all()).filter(x=>x.published!==false)
        .filter(x=>!surface||(surface==="today"?(x.surface==="today"||x.surface==="both"):(x.surface==="game"||x.surface==="both")))
        .filter(x=>surface!=="today"||(!grade||x.grade===grade)&&(!track||x.track===track))
        .filter(x=>surface!=="game"||!game||x.gameKey===game)
        .map(x=>publicItem(x.id,x));
      return res.status(200).json({items,storage:true});
    }catch{return res.status(500).json({error:"문항을 불러오지 못했습니다."})}
  }
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"지원하지 않는 방식입니다."})}
  let data;try{data=body(req)}catch{return res.status(400).json({error:"요청 내용을 읽을 수 없습니다."})}
  if(!passwordMatches(data.password))return res.status(401).json({error:"관리자 암호가 맞지 않습니다."});
  if(!준비됨)return res.status(503).json({error:"문항 저장소가 아직 준비되지 않았습니다."});
  try{
    if(data.action==="list")return res.status(200).json({items:await all()});
    if(data.action==="save"){
      const id=String(data.id||"");let previous={};
      if(id){const raw=await 명령("HGET",KEY,id);if(!raw)return res.status(404).json({error:"수정할 문항이 없습니다."});previous=JSON.parse(raw)}
      else if(Number(await 명령("HLEN",KEY))>=MAX_ITEMS)return res.status(400).json({error:`문항은 ${MAX_ITEMS}개까지 저장할 수 있습니다.`});
      const item=clean(data.item,previous),savedId=id||String(Date.now()*1000+Math.floor(Math.random()*1000));
      await 명령("HSET",KEY,savedId,JSON.stringify(item));return res.status(200).json({id:savedId,...item});
    }
    if(data.action==="bulkSave"){
      if(!Array.isArray(data.items)||!data.items.length)return res.status(400).json({error:"등록할 문항을 확인해 주세요."});
      if(data.items.length>MAX_BATCH)return res.status(400).json({error:`한 번에 ${MAX_BATCH}문항까지 등록할 수 있습니다.`});
      const existing=await all();
      if(existing.length+data.items.length>MAX_ITEMS)return res.status(400).json({error:`전체 문항은 ${MAX_ITEMS}개까지 저장할 수 있습니다.`});
      const saved=data.items.map(input=>clean(input)),known=new Set(existing.map(fingerprint)),seen=new Set();
      const duplicate=saved.findIndex(item=>{const value=fingerprint(item),found=known.has(value)||seen.has(value);seen.add(value);return found});
      if(duplicate>=0)return res.status(409).json({error:`${duplicate+2}행은 이미 같은 문항이 있습니다.`});
      const base=Date.now()*1000,args=["HSET",KEY];
      const result=saved.map((item,index)=>{const id=String(base+index);args.push(id,JSON.stringify(item));return{id,...item}});
      await 명령(...args);return res.status(200).json({items:result});
    }
    if(data.action==="delete"){
      const id=String(data.id||"");if(!id)return res.status(400).json({error:"삭제할 문항을 확인해 주세요."});
      await 명령("HDEL",KEY,id);return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:"작업을 확인해 주세요."});
  }catch(error){const expected=/입력|선택|지정|맞지|저장할/.test(error.message||"");return res.status(expected?400:500).json({error:expected?error.message:"문항 저장 중 문제가 생겼습니다."})}
};
