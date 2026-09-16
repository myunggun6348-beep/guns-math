
window.expandQuickGameBanks=function({games,C,T}){
  let serial=0;
  const MC=(prompt,correct,wrong,explanation)=>{
    const raw=[String(correct),...wrong.map(String)];
    const shift=(serial++)%raw.length;
    const choices=raw.slice(shift).concat(raw.slice(0,shift));
    return C(prompt,choices,choices.indexOf(String(correct)),explanation);
  };
  const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
  const frac=(a,b)=>{const g=gcd(a,b);return (a/g)+"/"+(b/g)};

  [-3,-2,-1,2,4].forEach((m,i)=>{
    const b=[5,-4,2,1,-3][i];
    games.graph.questions.push(T("직선 y="+m+"x"+(b>=0?"+":"")+b+"의 기울기를 입력하세요.",String(m),"y=mx+b에서 x의 계수 m이 기울기이므로 "+m+"입니다."));
  });
  [[2,1],[-3,2],[1,-4],[-2,-1],[4,3]].forEach(([h,k],i)=>{
    const a=i%2?-1:1;
    games.graph.questions.push(MC("y="+(a<0?"−":"")+"(x"+(h>=0?"−"+h:"+"+Math.abs(h))+")²"+(k>=0?"+":"")+k+"의 꼭짓점은?","("+h+", "+k+")",["("+(-h)+", "+k+")","("+h+", "+(-k)+")","("+k+", "+h+")","("+(-h)+", "+(-k)+")"],"y=a(x−h)²+k의 꼭짓점은 a의 부호와 관계없이 (h,k)입니다."));
  });
  [[2,3],[-3,-2],[4,1],[-2,5],[5,-1]].forEach(([m,r])=>{
    const b=-m*r;
    games.graph.questions.push(T("직선 y="+m+"x"+(b>=0?"+":"")+b+"의 x절편을 입력하세요.",String(r),"y=0을 대입해 풀면 x절편은 "+r+"입니다."));
  });

  [[1,2,-1],[2,-3,2],[-1,4,3],[3,1,-2],[2,5,1]].forEach(([a,b,x])=>{
    const ans=2*a*x+b;
    games.derivative.questions.push(T("f(x)="+a+"x²"+(b>=0?"+":"")+b+"x일 때 f′("+x+")의 값은?",String(ans),"f′(x)="+(2*a)+"x"+(b>=0?"+":"")+b+"이고 x="+x+"을 대입하면 "+ans+"입니다."));
  });
  [1,2,3,4,5].forEach(r=>{
    games.derivative.questions.push(T("f(x)=x³−"+(3*r*r)+"x에서 양수인 극값 후보의 x좌표는?",String(r),"f′(x)=3(x−"+r+")(x+"+r+")이므로 양수인 후보는 "+r+"입니다."));
  });
  [-3,-1,1,2,4].forEach(h=>{
    games.derivative.questions.push(MC("f(x)=x²"+(-2*h>=0?"+":"")+(-2*h)+"x의 감소 구간은?","x<"+h,["x>"+h,"x<"+(-h),"x>"+(-h),"모든 실수"],"f′(x)<0인 범위를 풀면 x<"+h+"입니다."));
  });

  [[4,3,6],[7,-2,5],[-2,5,7],[10,-3,4],[1,6,8]].forEach(([first,d,n])=>{
    const ans=first+(n-1)*d;
    games.sequence.questions.push(T("첫째항이 "+first+", 공차가 "+d+"인 등차수열의 제"+n+"항은?",String(ans),"aₙ=a₁+(n−1)d이므로 답은 "+ans+"입니다."));
  });
  [[1,2,7],[3,2,6],[2,3,5],[5,-2,4],[-1,3,5]].forEach(([first,r,n])=>{
    const ans=first*Math.pow(r,n-1);
    games.sequence.questions.push(T("첫째항이 "+first+", 공비가 "+r+"인 등비수열의 제"+n+"항은?",String(ans),"aₙ=a₁rⁿ⁻¹을 사용하면 "+ans+"입니다."));
  });
  [[2,5],[5,4],[-3,6],[8,-2],[1,7]].forEach(([first,d])=>{
    const ans=first+4*d;
    games.sequence.questions.push(T(first+", "+(first+d)+", "+(first+2*d)+", "+(first+3*d)+", …의 제5항은?",String(ans),"공차가 "+d+"이므로 제5항은 "+ans+"입니다."));
  });

  [[2,3],[4,5],[3,7],[5,3],[6,4]].forEach(([red,blue])=>{
    const ans=frac(red,red+blue);
    games.probability.questions.push(T("빨간 공 "+red+"개와 파란 공 "+blue+"개 중 하나를 꺼낼 때 빨간 공일 확률을 기약분수로 입력하세요.",ans,"전체 "+(red+blue)+"개 중 빨간 공이 "+red+"개이므로 "+ans+"입니다."));
  });
  [2,3,4,5,6].forEach(t=>{
    const ans=frac(7-t,6);
    games.probability.questions.push(T("공정한 주사위에서 "+t+" 이상의 눈이 나올 확률을 기약분수로 입력하세요.",ans,t+" 이상인 눈은 "+(7-t)+"개이므로 확률은 "+ans+"입니다."));
  });
  [0.1,0.2,0.35,0.6,0.75].forEach(p=>{
    const ans=Number((1-p).toFixed(2)).toString();
    games.probability.questions.push(MC("사건 A가 일어날 확률이 "+p+"일 때 A가 일어나지 않을 확률은?",ans,[String(p),String(Number((1+p).toFixed(2))),String(Number((p/2).toFixed(2))),String(Number((1-p/2).toFixed(2)))],"여사건의 확률은 1−P(A)이므로 "+ans+"입니다."));
  });

  [4,5,6,7,8].forEach(n=>{
    games.counting.questions.push(T("서로 다른 "+n+"명 중 회장과 부회장을 뽑는 경우의 수는?",String(n*(n-1)),"직책이 달라 순서가 중요하므로 "+n+"P2="+(n*(n-1))+"입니다."));
  });
  [5,6,7,8,9].forEach(n=>{
    const ans=n*(n-1)/2;
    games.counting.questions.push(T(n+"명 중 대표 2명을 고르는 경우의 수는?",String(ans),"순서 없이 고르므로 "+n+"C2="+ans+"입니다."));
  });
  [[2,4],[3,5],[4,6],[5,3],[6,2]].forEach(([a,b])=>{
    const ans=a*b;
    games.counting.questions.push(MC("상의 "+a+"벌과 하의 "+b+"벌 중 하나씩 골라 입는 경우의 수는?",ans,[a+b,a+b+1,ans+2,Math.abs(a-b)],"곱의 법칙에 따라 "+a+"×"+b+"="+ans+"가지입니다."));
  });

  [1,2,3,4,5].forEach(a=>{
    games.transform.questions.push(MC("y=f(x)를 오른쪽으로 "+a+"만큼 이동한 식은?","y=f(x−"+a+")",["y=f(x+"+a+")","y=f(x)−"+a,"y=f(x)+"+a,"y="+a+"f(x)"],"오른쪽으로 "+a+"만큼 이동하면 x 대신 x−"+a+"를 넣습니다."));
  });
  [1,2,3,4,5].forEach(a=>{
    games.transform.questions.push(MC("y=f(x)를 아래로 "+a+"만큼 이동한 식은?","y=f(x)−"+a,["y=f(x)+"+a,"y=f(x−"+a+")","y=f(x+"+a+")","y=−f(x)"],"아래로 "+a+"만큼 이동하면 함수값 전체에서 "+a+"를 뺍니다."));
  });
  [[2,-1],[-3,4],[1,5],[-2,-4],[4,2]].forEach(([h,k])=>{
    games.transform.questions.push(T("y=x²을 "+(h>0?"오른쪽":"왼쪽")+"으로 "+Math.abs(h)+", "+(k>0?"위":"아래")+"로 "+Math.abs(k)+"만큼 이동했을 때 꼭짓점의 x좌표는?",String(h),"원래 꼭짓점 (0,0)이 ("+h+","+k+")로 이동하므로 x좌표는 "+h+"입니다."));
  });

  [[2,3,1],[4,-1,2],[-3,5,-2],[5,2,3],[-2,-4,4]].forEach(([a,b,x])=>{
    const ans=a*x+b;
    games.limit.questions.push(T("lim(x→"+x+") ("+a+"x"+(b>=0?"+":"")+b+")의 값은?",String(ans),"일차함수는 연속이므로 x="+x+"을 대입하면 "+ans+"입니다."));
  });
  [[2,1],[3,2],[-4,2],[5,-1],[-6,-3]].forEach(([a,b])=>{
    const ans=a/b;
    games.limit.questions.push(T("lim(x→∞) ("+a+"x+1)/("+b+"x−2)의 값은?",String(ans),"분자와 분모가 같은 차수이므로 최고차항 계수의 비는 "+ans+"입니다."));
  });
  [-3,-1,2,4,5].forEach(a=>{
    const ans=2*a;
    games.limit.questions.push(T("lim(x→"+a+") (x²−"+(a*a)+")/(x"+(a>=0?"−"+a:"+"+Math.abs(a))+")의 값은?",String(ans),"분자를 인수분해해 공통인 인수를 약분하면 극한값은 "+ans+"입니다."));
  });

  [[3,4],[5,12],[8,15],[7,24],[9,40]].forEach(([x,y])=>{
    const ans=Math.sqrt(x*x+y*y);
    games.vector.questions.push(T("벡터 ("+x+", "+y+")의 크기는?",String(ans),"√("+x+"²+"+y+"²)="+ans+"입니다."));
  });
  [[1,2,3,4],[2,-1,-3,5],[-2,4,1,3],[5,2,2,-1],[3,-4,-2,-5]].forEach(([a,b,c,d])=>{
    const ans=a*c+b*d;
    games.vector.questions.push(T("a=("+a+","+b+"), b=("+c+","+d+")일 때 a·b의 값은?",String(ans),"성분끼리 곱해 더하면 "+ans+"입니다."));
  });
  [["양수","예각"],["0","직각"],["음수","둔각"],["양수","예각"],["음수","둔각"]].forEach(([sign,angle])=>{
    const others=["예각","직각","둔각","평각","판단 불가"].filter(x=>x!==angle).slice(0,4);
    games.vector.questions.push(MC("영벡터가 아닌 두 벡터의 내적이 "+sign+"일 때 사잇각은?",angle,others,"내적의 부호는 cosθ의 부호와 같으므로 사잇각은 "+angle+"입니다."));
  });

  [[2,0,3],[3,1,5],[-2,-1,2],[4,2,6],[5,0,2]].forEach(([height,a,b])=>{
    const ans=height*(b-a);
    games.integral.questions.push(T("구간 ["+a+", "+b+"]에서 ∫ "+height+" dx의 값은?",String(ans),"높이 "+height+", 폭 "+(b-a)+"인 직사각형의 부호 있는 넓이는 "+ans+"입니다."));
  });
  [[0,4],[1,3],[-2,2],[2,6],[-3,1]].forEach(([a,b])=>{
    const ans=(b*b-a*a)/2;
    games.integral.questions.push(T("구간 ["+a+", "+b+"]에서 ∫ x dx의 값은?",String(ans),"원시함수 x²/2에 양 끝값을 대입하면 "+ans+"입니다."));
  });
  [[2,3],[3,4],[4,2],[5,6],[6,5]].forEach(([base,height])=>{
    const ans=base*height/2;
    games.integral.questions.push(MC("x축 위에 있는 밑변 "+base+", 높이 "+height+"인 삼각형 영역의 정적분 값은?",ans,[ans+1,ans+2,ans*2,Math.max(0,ans-1)],"삼각형의 넓이는 "+base+"×"+height+"÷2="+ans+"입니다."));
  });

  [
    ["(x+2)²=x²+4","(x+2)²=x²+4x+4"],
    ["(x−3)²=x²−9","(x−3)²=x²−6x+9"],
    ["√(x²)=x","√(x²)=|x|"],
    ["1/(a+b)=1/a+1/b","일반적으로 1/(a+b)는 1/a+1/b가 아니다"],
    ["(a−b)(a+b)=a²+b²","(a−b)(a+b)=a²−b²"]
  ].forEach(([bad,fix])=>games.error.questions.push(MC("다음 중 잘못된 식은?",bad,[fix,"a+0=a","a×1=a","a−a=0"],bad+"은 성립하지 않습니다. "+fix+"입니다.")));
  [
    ["(x³)′=3x","(x³)′=3x²"],
    ["(sin x)′=−cos x","(sin x)′=cos x"],
    ["상수 7의 도함수는 7이다","상수의 도함수는 0이다"],
    ["(2x²)′=2x","(2x²)′=4x"],
    ["f′(a)=0이면 언제나 극댓값이다","f′(a)=0만으로 극값 여부를 확정할 수 없다"]
  ].forEach(([bad,fix])=>games.error.questions.push(MC("다음 중 미분에 관한 잘못된 주장은?",bad,[fix,"도함수는 순간변화율을 나타낸다","f′(x)>0이면 그 구간에서 증가한다","접선의 기울기는 도함숫값이다"],bad+"라는 주장이 잘못되었습니다. "+fix+".")));
  [
    ["서로 배반인 두 사건은 동시에 일어날 수 있다","서로 배반인 두 사건의 교집합 확률은 0이다"],
    ["P(A)가 1보다 클 수 있다","확률은 0 이상 1 이하이다"],
    ["독립이면 P(A∩B)=P(A)+P(B)이다","독립이면 P(A∩B)=P(A)P(B)이다"],
    ["모든 자료의 평균은 반드시 자료 중 하나이다","평균이 실제 자료값과 일치할 필요는 없다"],
    ["분산은 음수가 될 수 있다","분산은 항상 0 이상이다"]
  ].forEach(([bad,fix])=>games.error.questions.push(MC("다음 중 확률·통계에 관한 잘못된 주장은?",bad,[fix,"확률 0은 불가능 사건을 나타낸다","상대도수는 전체 횟수에 대한 비율이다","표준편차는 분산의 음이 아닌 제곱근이다"],bad+"라는 주장이 잘못되었습니다. "+fix+".")));
};
