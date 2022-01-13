#version 140

uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform float iFrameRate;
uniform vec4 iMouse;

in vec2 fragCoord;
out vec4 fragColor;

// Created by Stephane Cuillerdier - Aiekick/2015 (twitter:@aiekick)
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// Tuned via XShade (http://www.funparadigm.com/xshade/)

//#define ANALYSE_RM

#ifdef ANALYSE_RM
/////////////////////////
// GLSL Number Printing - @P_Malin (CCO 1.0)=> https://www.shadertoy.com/view/4sBSWW
float DigitBin(const in int x){
    if(x==0) return 480599.0; if(x==1) return 139810.0; if(x==2) return 476951.0; if(x==3) return 476999.0;	if(x==4) return 350020.0; 
    if(x==5) return 464711.0; if(x==6) return 464727.0; if(x==7) return 476228.0; if(x==8) return 481111.0; if(x==9) return 481095.0; 
    return 0.0;}
float PrintValue(vec2 fragCoord, const in vec2 vPixelCoords, const in vec2 vFontSize, const in float fValue, const in float fMaxDigits, const in float fDecimalPlaces){
    vec2 vStringCharCoords = (fragCoord.xy - vPixelCoords) / vFontSize;
    if ((vStringCharCoords.y < 0.0) || (vStringCharCoords.y >= 1.0)) return 0.0;
	float fLog10Value = log2(abs(fValue)) / log2(10.0);
	float fBiggestIndex = max(floor(fLog10Value), 0.0);
	float fDigitIndex = fMaxDigits - floor(vStringCharCoords.x);
	float fCharBin = 0.0;
	if(fDigitIndex > (-fDecimalPlaces - 1.01)) {
		if(fDigitIndex > fBiggestIndex) {
            if((fValue < 0.0) && (fDigitIndex < (fBiggestIndex+1.5))) fCharBin = 1792.0;} 
        else {		
			if(fDigitIndex == -1.0) {
				if(fDecimalPlaces > 0.0) fCharBin = 2.0;} 
            else {
				if(fDigitIndex < 0.0) fDigitIndex += 1.0;
				float fDigitValue = (abs(fValue / (pow(10.0, fDigitIndex))));
                float kFix = 0.0001;
                fCharBin = DigitBin(int(floor(mod(kFix+fDigitValue, 10.0))));} } }
    return floor(mod((fCharBin / pow(2.0, floor(fract(vStringCharCoords.x) * 4.0) + (floor(vStringCharCoords.y * 5.0) * 4.0))), 2.0));}
vec3 WriteValueToScreenAtPos(vec2 fragCoord, float vValue, vec2 vPixelCoord, vec3 vColour, vec2 vFontSize, float vDigits, float vDecimalPlaces, vec3 vColor){
    float num = PrintValue(fragCoord, vPixelCoord, vFontSize, vValue, vDigits, vDecimalPlaces);
    return mix( vColour, vColor, num);}

/////////////////////////////////////////////////////////////////
#endif

vec2 mo = vec2(0);

float pn( in vec3 x ) // iq noise
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = texture(iChannel0, (uv+ 0.5)/256.0, -100.0 ).yx;
	return -1.0+2.4*mix( rg.x, rg.y, f.z );
}

vec2 path(float t)
{
	return vec2(cos(t*0.2), sin(t*0.2)) * 2.;
}

const mat3 mx = mat3(1,0,0,0,7,0,0,0,7);
const mat3 my = mat3(7,0,0,0,1,0,0,0,7);
const mat3 mz = mat3(7,0,0,0,7,0,0,0,1);

// base on shane tech in shader : One Tweet Cellular Pattern
float func(vec3 p)
{
    p = fract(p/68.6) - .5;
    return min(min(abs(p.x), abs(p.y)), abs(p.z)) + 0.1;
}

vec3 effect(vec3 p)
{
	p *= mz * mx * my * sin(p.zxy); // sin(p.zxy) is based on iq tech from shader (Sculpture III)
	return vec3(min(min(func(p*mx), func(p*my)), func(p*mz))/.6);
}
//

vec4 displacement(vec3 p)
{
    vec3 col = 1.-effect(p*0.8);
   	col = clamp(col, -.5, 1.);
    float dist = dot(col,vec3(0.023));
	col = step(col, vec3(0.82));// black line on shape
    return vec4(dist,col);
}

vec4 map(vec3 p)
{
	p.xy -= path(p.z);
    vec4 disp = displacement(sin(p.zxy*2.)*0.8);
	p += sin(p.zxy*.5)*1.5;
    float l = length(p.xy) - 4.;
    return vec4(max(-l + 0.09, l) - disp.x, disp.yzw);
}

vec3 nor( in vec3 pos, float prec )
{
	vec3 eps = vec3( prec, 0., 0. );
	vec3 nor = vec3(
	    map(pos+eps.xyy).x - map(pos-eps.xyy).x,
	    map(pos+eps.yxy).x - map(pos-eps.yxy).x,
	    map(pos+eps.yyx).x - map(pos-eps.yyx).x );
	return normalize(nor);
}


vec4 light(vec3 ro, vec3 rd, float d, vec3 lightpos, vec3 lc)
{
	vec3 p = ro + rd * d;
	
	// original normale
	vec3 n = nor(p, 0.1);
	
	vec3 lightdir = lightpos - p;
	float lightlen = length(lightpos - p);
	lightdir /= lightlen;
    
	float amb = 0.6;
	float diff = clamp( dot( n, lightdir ), 0.0, 1.0 );
	    
	vec3 brdf = vec3(0);
	brdf += amb * vec3(0.2,0.5,0.3); // color mat
	brdf += diff * 0.6;
	
	brdf = mix(brdf, map(p).yzw, 0.5);// merge light and black line pattern
		
	return vec4(brdf, lightlen);
}

vec3 stars(vec2 uv, vec3 rd, float d, vec2 s, vec2 g)
{
	uv *= 800. * s.x/s.y;
	float k = fract( cos(uv.y * 0.0001 + uv.x) * 90000.);
	float var = sin(pn(d*0.6+rd*182.14))*0.5+0.5;// thank to klems for the variation in my shader subluminic
	vec3 col = vec3(mix(0., 1., var*pow(k, 200.)));// come from CBS Shader "Simplicity" : https://www.shadertoy.com/view/MslGWN
	return col;
}

////////MAIN///////////////////////////////
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 s = iResolution.xy;
    vec2 g = fragCoord;
    
#ifdef ANALYSE_RM
    vec2 uvn = (fragCoord*2.-s)/s.y*vec2(1.,5.);
	if (iMouse.z > 0.)
		g = iMouse.xy;
#else
	if (iMouse.z > 0.)
		mo = (iMouse.xy*2. - s) / s.y*10.;
#endif
    
	float time = iTime*1.;
    float cam_a = time; // angle z
    
    float cam_e = 3.2; // elevation
    float cam_d = 4.; // distance to origin axis
    
    float maxd = 40.; // ray marching distance max
    
    vec2 uv = (g*2.-s)/s.y;
    
    vec3 col = vec3(0.);

    vec3 ro = vec3(path(time)+mo,time);
  	vec3 cv = vec3(path(time+0.1)+mo,time+0.1);
    
	vec3 cu=vec3(0,1,0);
  	vec3 rov = normalize(cv-ro);
    vec3 u = normalize(cross(cu,rov));
  	vec3 v = cross(rov,u);
  	vec3 rd = normalize(rov + uv.x*u + uv.y*v);
    
    vec3 curve0 = vec3(0);
	vec3 curve1 = vec3(0);
    vec3 curve2 = vec3(0);
    float outStep = 0.;
    
    float ao = 0.; // ao low cost :)
    
    float st = 0.;
    float d = 0.;
    for(int i=0;i<250;i++)
    {      
        
#ifdef ANALYSE_RM
        if (iMouse.z > 0. && abs(fragCoord.x - float(i)*4.) < 1.)
		{
			curve0 += 0.048 * vec3(1,1,0) / length(uvn.y - st * 0.6);
			curve1 += 0.048 * vec3(0.48,0,0.48) / length(uvn.y - 0.025*log(d*d/st/1e5));
            if(d>maxd)
            	curve2 += vec3(0,0,1) - smoothstep( 1., 2., uvn.x );
            else if(st < 0.025*log(d*d/st/1e5))
            	curve2 += vec3(1,0,1) - smoothstep( 1., 2., uvn.x );
        }
#endif
        
        if (st<0.025*log(d*d/st/1e5)||d>maxd) break;// special break condition for low thickness object
        st = map(ro+rd*d).x;
        d += st * 0.6; // the 0.6 is selected according to the 1e5 and the 0.025 of the break condition for good result
        ao++;
        
#ifdef ANALYSE_RM
    	outStep++;
#endif
        
    }
	
#ifdef ANALYSE_RM
    if (iMouse.z > 0.)
    {	
        fragColor = vec4(curve0 + curve1 + curve2,1);
    	fragColor.rgb = WriteValueToScreenAtPos(fragCoord, outStep, vec2(20,s.y-20.), 
                                                fragColor.rgb, vec2(12.0, 15.0), 1., 0., vec3(0.9));
    }
	else
    {
#endif
        if (d < maxd)
        {
            vec4 li = light(ro, rd, d, ro, vec3(0));// point light on the cam
            col = li.xyz/(li.w*0.2);// cheap light attenuation
            
           	col = mix(vec3(1.-ao/100.), col, 0.5);// low cost ao :)
        	fragColor.rgb = mix( col, vec3(0), 1.0-exp( -0.003*d*d ) );
		}
        else
        {
          	fragColor.rgb = stars(uv, rd, d, s, fragCoord);// stars bg
        }
        
        
        // vignette
        vec2 q = fragCoord/s;
        fragColor.rgb *= 0.5 + 0.5*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.25 ); // iq vignette
        
#ifdef ANALYSE_RM
    }
#endif
}
