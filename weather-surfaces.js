// Accumulation follows upward-facing geometry rather than floating white boxes.
export function weatherSurface(material,coverage=1){
  const snow={value:0},wet={value:0};
  material.onBeforeCompile=shader=>{
    shader.uniforms.surfaceSnow=snow;shader.uniforms.surfaceWet=wet;
    shader.vertexShader='varying vec3 weatherPosition; varying float weatherUp;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nweatherPosition=(modelMatrix*vec4(position,1.0)).xyz;weatherUp=normalize(mat3(modelMatrix)*normal).y;');
    shader.fragmentShader=`varying vec3 weatherPosition; varying float weatherUp;
      uniform float surfaceSnow;uniform float surfaceWet;
      float weatherHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float weatherNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(weatherHash(i),weatherHash(i+vec2(1,0)),f.x),mix(weatherHash(i+vec2(0,1)),weatherHash(i+vec2(1,1)),f.x),f.y);}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float surfaceUp=smoothstep(.45,.92,weatherUp);
      float drift=weatherNoise(weatherPosition.xz*1.7)*.7+weatherNoise(weatherPosition.xz*8.0)*.3;
      float snowMask=smoothstep(.65-surfaceSnow,.95-surfaceSnow,drift)*surfaceUp*min(1.0,surfaceSnow*3.0);
      diffuseColor.rgb*=1.0-.28*surfaceWet*surfaceUp;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.88),snowMask);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.24,surfaceWet*surfaceUp*.8);roughnessFactor=mix(roughnessFactor,.96,snowMask);');
  };
  material.customProgramCacheKey=()=> 'weather-surface-v1';
  return weather=>{snow.value=weather==='snow'?coverage:0;wet.value=weather==='rain'?1:0;};
}
