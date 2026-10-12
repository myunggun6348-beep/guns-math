const crypto=require("crypto");
function 새PIN문제(value){
  const v=String(value||"");
  if(!/^\d{6,12}$/.test(v))return "비밀번호는 숫자 6~12자리로 만들어 주세요.";
  if(/^(\d)\1+$/.test(v))return "같은 숫자만 쓰면 너무 쉽게 뚫립니다. 다르게 만들어 주세요.";
  const difference=[...v].slice(1).map((digit,index)=>Number(digit)-Number(v[index]));
  if(difference.every(value=>value===1)||difference.every(value=>value===-1))return "1234 처럼 이어지는 숫자는 쓸 수 없습니다. 다르게 만들어 주세요.";
  return "";
}
const digest=(pin,salt)=>crypto.scryptSync(String(pin),salt,32).toString("hex");
module.exports={새PIN문제,digest};
