uniform float width_coefficient;
uniform vec3 camera_position;
uniform mat3 rotation_matrix;
uniform float time;

in vec2 coord;
out vec4 output_color;

// a study on raymarching, soft-shadows, ao, etc
// borrowed heavy from others, esp @cabbibo and @iquilezles and more
// by @eddietree

const float MAX_TRACE_DISTANCE = 10.0;
const float INTERSECTION_PRECISION = 0.01;
const int NUM_OF_TRACE_STEPS = 70;



vec3 projOnPlane( vec3 pos, vec3 planePt , vec3 normal){
    
    return pos - dot(pos - planePt, normal) * normal;
}

// Taken from https://www.shadertoy.com/view/4ts3z2
float tri(in float x){return abs(fract(x)-.5);}
vec3 tri3(in vec3 p){return vec3( tri(p.z+tri(p.y*1.)), tri(p.z+tri(p.x*1.)), tri(p.y+tri(p.x*1.)));}

float triNoise3D(vec3 p, float spd)
{
    float z=10.4;
	float rz = 0.;
    vec3 bp = p;
	for (float i=0.; i<=3.; i++ )
	{
        vec3 dg = tri3(bp*2.);
        p += (dg+iTime*.1*spd);

        bp *= 1.8;
		z *= 1.5;
		p *= 1.2;
        //p.xz*= m2;
        
        rz+= (tri(p.z+tri(p.x+tri(p.y))))/z;
        bp += 0.14;
	}
	return rz;
}

vec3 hsv(float h, float s, float v)
{
  return mix( vec3( 1.0 ), clamp( ( abs( fract(
    h + vec3( 3.0, 2.0, 1.0 ) / 3.0 ) * 6.0 - 3.0 ) - 1.0 ), 0.0, 1.0 ), s ) * v;
}

void buildBasis( in vec3 dir , in vec3 up , out vec3 x , out vec3 y , out vec3 z ){
    

 //vec3( 0. , 1. , 0. );
  //vec3  upVector = normalize( centerOfCircle );// vec3( 0. , 1. , 0. );
  float upVectorProj = dot( up , dir );
  vec3  upVectorPara = upVectorProj * dir;
  vec3  upVectorPerp = up - upVectorPara;

  vec3 basisX = normalize( upVectorPerp );
  vec3 basisY = cross( dir , basisX );
    
    
  x = basisX;
  y = basisY;
  z = dir;
}


float udBox( vec3 p, vec3 b )
{
  return length(max(abs(p)-b,0.0));
}


float udRoundBox( vec3 p, vec3 b, float r )
{
  return length(max(abs(p)-b,0.0))-r;
}

float distSphere(vec3 p, float radius) {
    return length(p) - radius;
}


float sdPlane( vec3 p, vec4 n )
{
  // n must be normalized
  return dot(p,n.xyz) + n.w;
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xy)-t.x,p.z);
  return length(q)-t.y;
}

float sdTriPrism( vec3 p, vec2 h )
{
    vec3 q = abs(p);
    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float sdTriPrismMod( vec3 p, vec2 h, vec3 c )
{
    vec3 q = mod(p,c)-0.5*c;
    return sdTriPrism( q, h );
}

float sdCone( vec3 p, vec2 c )
{
    // c must be normalized
    float q = length(p.xy);
    return dot(c,vec2(q,p.z));
}


//----
// Camera Stuffs
//----
mat3 calcLookAtMatrix( in vec3 ro, in vec3 ta, in float roll )
{
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(sin(roll),cos(roll),0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
    return mat3( uu, vv, ww );
}

void doCamera( out vec3 camPos, out vec3 camTar, in float time, in float mouseX )
{
    float an = 0.3 + 10.0*mouseX + iTime*0.3;
	camPos = vec3(5.0*sin(an),1.5,5.0*cos(an));
    camTar = vec3(0.0,0.5,0.0);
}

// ROTATION FUNCTIONS TAKEN FROM
//https://www.shadertoy.com/view/XsSSzG
mat3 xrotate(float t) {
	return mat3(1.0, 0.0, 0.0,
                0.0, cos(t), -sin(t),
                0.0, sin(t), cos(t));
}

mat3 yrotate(float t) {
	return mat3(cos(t), 0.0, -sin(t),
                0.0, 1.0, 0.0,
                sin(t), 0.0, cos(t));
}

mat3 zrotate(float t) {
    return mat3(cos(t), -sin(t), 0.0,
                sin(t), cos(t), 0.0,
                0.0, 0.0, 1.0);
}


float opRep( vec3 p, vec3 c )
{
    vec3 q = mod(p,c)-0.5*c;
    return sdTorus( q, vec2(1.0,0.1) );
}

float smin( float a, float b, float k )
{
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}

float opS( float d1, float d2 )
{
    return max(-d1,d2);
}

float opU( float d1, float d2 )
{
    return min(d1,d2);
}

mat3 fullRotate( vec3 r ){
 
   return xrotate( r.x ) * yrotate( r.y ) * zrotate( r.z );
    
}

float rotatedBox( vec3 p , vec3 rot , vec3 size , float rad ){
    
    vec3 q = fullRotate( rot ) * p;
    return udRoundBox( q , size , rad );
    
    
}



// checks to see which intersection is closer
// and makes the y of the vec2 be the proper id
vec2 opU( vec2 d1, vec2 d2 ){
	return (d1.x<d2.x) ? d1 : d2; 
}

float opI( float d1, float d2 )
{
    return max(d1,d2);
}

//--------------------------------
// Modelling 
//--------------------------------
vec2 map( vec3 pos ){  
   
    // using super thin cube as plane
    vec3 size = vec3( 5.0, .1 , 5.0 );
   // vec3 rot = vec3( iTime * .1 , iTime * .4 , -iTime * .3 );
    vec3 rot = vec3( 0.,0.,0. );
    
   	vec2 res = vec2( 1.0, 1.0 );
    
    float sphere = distSphere(pos, 0.25);
    float box = rotatedBox( pos - vec3(0.0,-0.5,0.0), rot , size , .001 );
   
    float t1 = box;
    
    for ( int i = 0; i < 12; i+=1 )
    {
        float i_f = float(i);

        vec3 pos0 = xrotate( iTime*0.2 + sin(i_f)*50.0 ) * pos;
		//pos0 = pos0 * zrotate( iTime + i_f );                                   
        pos0 = pos0 + vec3(0.0 + cos(iTime*0.1+i_f*0.3)*0.5,-0.1 + sin(iTime + i_f * 50.0),2.2 + sin(iTime*0.3 + i_f));
        float prism = sdTriPrism( pos0, vec2(0.2 + cos(iTime + i_f*0.1)*0.1,0.7) );
        //float prism = sdCone( pos0, vec2(0.3, 0.25) );

        t1 = smin( prism, t1, 6.0 );
        //t1 = min( prism, t1 );
    }
    //t1 = box;
    
    t1  = opS(sdTorus( pos * yrotate( 3.14159*0.5), vec2(2.36 + sin(iTime*0.1)*0.5,0.2 + cos(iTime*0.5)*0.2) ), t1 );
    t1  = smin(sdTorus( (pos+vec3(0.0,-0.6,0.0)) * yrotate( 3.14159*0.5), vec2(2.5,0.02 + cos(iTime*5.0 + pos.y*2.0)*0.01) ), t1, 6.0 );
    t1  = smin(sdTorus( (pos+ vec3( 0.0,-0.6,sin(iTime*0.3))) * yrotate( 3.14159*0.5), vec2(1.75,0.05 + sin(pos.y*3.0 + iTime)*0.2) ), t1, 10.0 );
    t1  = smin(sdTorus( pos * yrotate( 3.14159*0.5), vec2(1.5,0.1) ), t1, 5.0 );
    
    
   
    res.x = t1;
    
   	
    

   	return res;
    
}


float shadow( in vec3 ro, in vec3 rd )
{
    const float k = 2.0;
    
    const int maxSteps = 50;
    float t = 0.0;
    float res = 1.0;
    
    for(int i = 0; i < maxSteps; ++i) {
        
        float d = map(ro + rd*t).x;
            
        if(d < INTERSECTION_PRECISION) {
            
            return 0.0;
        }
        
        res = min( res, k*d/t );
        t += d;
    }
    
    return res;
}


float ambientOcclusion( in vec3 ro, in vec3 rd )
{
    const int maxSteps = 7;
    const float stepSize = 0.05;
    
    float t = 0.0;
    float res = 0.0;
    
    // starting d
    float d0 = map(ro).x;
    
    for(int i = 0; i < maxSteps; ++i) {
        
        float d = map(ro + rd*t).x;
		float diff = max(d-d0, 0.0);
        
        res += diff;
        
        t += stepSize;
    }
    
    return res;
}

// Calculates the normal by taking a very small distance,
// remapping the function, and getting normal for that
vec3 calcNormal( in vec3 pos ){
    
	vec3 eps = vec3( 0.001, 0.0, 0.0 );
	vec3 nor = vec3(
	    map(pos+eps.xyy).x - map(pos-eps.xyy).x,
	    map(pos+eps.yxy).x - map(pos-eps.yxy).x,
	    map(pos+eps.yyx).x - map(pos-eps.yyx).x );
	return normalize(nor);
}

bool renderRayMarch(vec3 rayOrigin, vec3 rayDirection, out vec3 color ) {
    const int maxSteps = NUM_OF_TRACE_STEPS;
        
    float t = 0.0;
    
    vec3 lightDir = normalize(vec3(1.0,0.4,0.0));
    
    for(int i = 0; i < maxSteps; ++i) {
        
        vec3 currPos = rayOrigin + rayDirection * t;
        float d = map(currPos).x;
        if(d < INTERSECTION_PRECISION) {
            
            vec3 normal = calcNormal( currPos ) ;;
            float shadowVal = shadow( currPos - rayDirection* 0.01, lightDir  );
            float ao = ambientOcclusion( currPos - normal*0.01, normal );
            
            float ndotl = abs(dot( -rayDirection, normal ));
            float rim = pow(1.0-ndotl, 1.5);
            //color = hsv( rim*5.0+0.1, 2.0, 1.0);
            //color = vec3(rim);
            
            
            //color = texture (iChannel0, normal).xyz;
            
            color = vec3( 1.0);
            //color = vec3( step( 0.5, sin(currPos.y*20.0 )) );
            color = mix( vec3(0.7,0.6,0.5), color, rim*0.3 );
            //color = normal;
            color *= vec3(mix(0.2,1.0,shadowVal));
            color *= vec3(mix(0.2,1.0,ao));
            
            
            return true;
        }
        
        
        t += d;
    }
    return false;
        
}


void main( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 p = (-iResolution.xy + 2.0*fragCoord.xy)/iResolution.y;
    vec2 m = iMouse.xy/iResolution.xy;
    
    // camera movement
    vec3 ro, ta;
    doCamera( ro, ta, iTime, m.x );

    // camera matrix
    mat3 camMat = calcLookAtMatrix( ro, ta, 0.0 );  // 0.0 is the camera roll
    
	// create view ray
	vec3 rd = normalize( camMat * vec3(p.xy,2.0) ); // 2.0 is the lens length
    
    // calc color
    vec3 col = vec3(0.7,0.6,0.5) * 0.7;
    //vec3 col = texture (iChannel0, rd).xyz;
    renderRayMarch( ro, rd, col );
    
    fragColor = vec4( col , 1. );
    
}