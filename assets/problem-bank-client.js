(function(){
  "use strict";
  const cache=new Map();
  async function load(query={}){
    const params=new URLSearchParams(query),key=params.toString();
    if(cache.has(key))return cache.get(key);
    const pending=fetch("/api/problem-bank?"+key,{headers:{Accept:"application/json"}}).then(async response=>{
      if(!response.ok)throw new Error("문항을 불러오지 못했습니다.");
      const data=await response.json();return Array.isArray(data.items)?data.items:[];
    }).catch(()=>[]);
    cache.set(key,pending);return pending;
  }
  function clear(){cache.clear()}
  window.ProblemBank={load,clear};
})();
