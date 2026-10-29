// Older iOS versions support the scene but lack Canvas roundRect().
if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r=0){
    if(w<0){x+=w;w=-w;}if(h<0){y+=h;h=-h;}
    r=Math.min(Math.max(0,Number(Array.isArray(r)?r[0]:r)||0),w/2,h/2);
    this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.quadraticCurveTo(x+w,y,x+w,y+r);
    this.lineTo(x+w,y+h-r);this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    this.lineTo(x+r,y+h);this.quadraticCurveTo(x,y+h,x,y+h-r);
    this.lineTo(x,y+r);this.quadraticCurveTo(x,y,x+r,y);this.closePath();
  };
}
