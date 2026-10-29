(() => {
  const loading=document.querySelector('#loading');
  if(!loading)return;
  loading.style.position='fixed';loading.style.zIndex='100';
  if(matchMedia('(max-width:680px)').matches)document.querySelector('#controlPanel')?.classList.add('is-collapsed');
  document.body.classList.add('scene-is-loading');
  loading.setAttribute('role','status');loading.setAttribute('aria-live','polite');
  const decoration=document.createElement('div');decoration.className='loading-street';decoration.setAttribute('aria-hidden','true');decoration.innerHTML='<i></i><i></i><i></i><b></b>';loading.prepend(decoration);
  const meter=document.createElement('progress');meter.max=1;meter.value=0;loading.append(meter);
  const label=loading.querySelector('span');
  const details=document.createElement('small');details.className='texture-progress-details';loading.append(details);
  const actions=document.createElement('div');actions.className='texture-loading-actions';actions.hidden=true;loading.append(actions);
  const retryTexture=document.createElement('button');retryTexture.className='texture-retry';retryTexture.textContent='重试未完成贴图';retryTexture.onclick=()=>{retryTexture.disabled=true;document.querySelector('#retryTextures')?.click();setTimeout(()=>retryTexture.disabled=false,1000);};actions.append(retryTexture);
  const sourceButton=document.createElement('button');const desktop=new URLSearchParams(location.search).get('textures')==='desktop';sourceButton.textContent=desktop?'切回压缩贴图':'试用电脑版贴图';sourceButton.onclick=()=>{const url=new URL(location.href);if(desktop)url.searchParams.delete('textures');else url.searchParams.set('textures','desktop');url.searchParams.set('restart',String(Date.now()));window.sceneStopTextureLoading?.();location.replace(url.href);};actions.append(sourceButton);
  const diagnostic=document.createElement('button');diagnostic.textContent='复制加载详情';diagnostic.onclick=async()=>{const value=JSON.stringify(window.sceneTextureDiagnostics?.()||window.sceneBoot?.state,null,2);try{await navigator.clipboard.writeText(value);diagnostic.textContent='详情已复制';}catch{let field=loading.querySelector('textarea');if(!field){field=document.createElement('textarea');field.readOnly=true;loading.append(field);}field.value=value;field.focus();field.select();diagnostic.textContent='请长按下方文字复制';}};actions.append(diagnostic);
  const describe=detail=>{
    if(!detail||!rendered)return;
    const steps={downloading:'下载',decoding:'解析',applying:'绘制'};
    if(detail.current?.length)details.textContent=detail.current.slice(0,3).map(item=>(steps[item.stage]||'处理')+'：'+item.name+(item.bytes?' · '+Math.ceil(item.bytes/1024)+' KB':' · 等待响应')+' · '+item.seconds+' 秒').join('\n');
    else if(detail.failures?.length)details.textContent=detail.failures.slice(0,3).map(item=>item.name+'：'+(({'download-timeout':'下载超时',network:'连接失败',decode:'图片解析失败','decode-timeout':'图片处理超时','not-found':'文件未找到',canvas:'图片内存不足',http:'服务器响应异常',processing:'图片处理失败'})[item.reason]||'未完成')).join('\n');
    else details.textContent=detail.pending?'正在安排剩余图片…':'图片就绪，正在显示街区…';
  };
  let lastProgress=Date.now(),reported=false,ticker;
  let rendered=false,settle,latestTextures;
  const state={stage:'downloading',message:'正在下载三维程序…',started:Date.now(),ready:false,error:null};
  const phase=message=>{if(state.ready)return;state.stage='building';state.message=message;lastProgress=Date.now();if(label&&!reported)label.textContent=message;};
  const fail=detail=>{
    if(state.ready||reported)return;
    reported=true;state.error=String(detail);clearInterval(ticker);
    loading.classList.add('load-failed');
    const spinner=loading.querySelector('.loader');if(spinner)spinner.style.display='none';
    if(label)label.textContent='街区启动未完成';
    const description=document.createElement('small');
    description.textContent='停在：'+state.message+' '+String(detail).slice(0,160);
    loading.append(description);
    const retry=document.createElement('button');retry.type='button';retry.textContent='重新打开街区';
    retry.onclick=()=>{const url=new URL(location.href);url.searchParams.set('restart',String(Date.now()));window.sceneStopTextureLoading?.();location.replace(url.href);};
    loading.append(retry);
  };
  const finish=()=>{state.ready=true;state.stage='ready';state.elapsed=Date.now()-state.started;clearInterval(ticker);document.body.classList.remove('scene-is-loading');loading.classList.add('load-complete');state.error=null;setTimeout(()=>loading.remove(),500);};
  const check=detail=>{
    latestTextures=detail;
    if(state.ready)return;
    clearTimeout(settle);lastProgress=Date.now();
    meter.max=Math.max(1,detail.total);meter.value=detail.ready;
    if(rendered){actions.hidden=false;describe(detail);state.stage='textures';state.message='正在铺好街区贴图 '+detail.ready+' / '+detail.total;if(label&&!reported)label.textContent=state.message;}
    if(rendered&&!detail.pending){
      if(detail.failed.length){
        if(label)label.textContent=detail.failed.length+' 张贴图未下载完成';
        retryTexture.textContent='重试未完成贴图';
      }else settle=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(finish)),650);
    }
  };
  window.addEventListener('scene-textures',event=>check(event.detail));
  const ready=()=>{rendered=true;lastProgress=Date.now();state.stage='textures';if(label)label.textContent='正在铺好街区贴图…';actions.hidden=false;if(latestTextures)check(latestTextures);};
  window.sceneBoot={phase,fail,ready,state,deferTextures:true};
  if(label)label.textContent=state.message;
  window.addEventListener('error',event=>{
    if(event.target?.tagName==='SCRIPT')fail('三维程序未下载成功，请点击下方重试。');
    else if(event.target===window&&event.message)fail(event.message);
  },true);
  window.addEventListener('unhandledrejection',event=>fail(event.reason?.message||event.reason||'初始化失败'));
  ticker=setInterval(()=>{if(rendered){describe(window.sceneTextureDiagnostics?.().textures||latestTextures);return;}if(Date.now()-lastProgress>25000)fail('等待超过 25 秒，请点击下方重试。');},1000);
})();
