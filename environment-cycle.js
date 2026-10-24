// Lighting is independent of the UI palette: a blue palette must not turn
// night back into daytime, and overcast weather must remain dark after sunset.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function lightingAt(time,weather='clear'){
  const day=1-smooth(20,58,time),night=smooth(62,94,time),dusk=1-day-night;
  const overcast=['cloudy','rain','snow'].includes(weather);
  return {day,night,dusk,overcast,
    sun:(day*3.1+dusk*1.05)*(overcast?.2:1),
    ambient:(day*1.05+dusk*.34+night*.075)*(overcast?.82:1),
    fill:day*.42+dusk*.19+night*.055,
    lamps:.12*day+.85*dusk+1.25*night,
    windowGlow:.04*day+.55*dusk+1.1*night,
    bloom:.12*day+.32*dusk+.43*night,
    exposure:1.03,
    label:day>.5?'白天 · 12:30':night>.5?'夜晚 · 21:10':'黄昏 · 18:05'
  };
}
